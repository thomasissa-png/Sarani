import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { aryaVerificationLog, inboxItems } from "@/lib/db/schema";
import type { VerificationCriteria } from "@/lib/db/schema";
import { getTask } from "@/lib/integrations/clickup";
import { CLIENT_MAPPINGS } from "@/lib/integrations/config";
import { callClaudeJSON } from "@/lib/ai/claude";
import {
  addTaskComment,
  updateTaskStatus,
} from "@/lib/integrations/clickup";
import { getUserFromSession } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VerificationResult {
  criteria: VerificationCriteria;
  passed: boolean;
  failureReasons: string[];
}

interface LLMVerificationOutput {
  briefCoverage: { passed: boolean; detail: string };
  formatCompliance: { passed: boolean; detail: string };
  versionConsistency: { passed: boolean; detail: string };
  completeness: { passed: boolean; detail: string };
  clientReadyQuality: { passed: boolean; detail: string };
}

// ─── Validation ─────────────────────────────────────────────────────────────

const verifySchema = z.object({
  clickupTaskId: z.string().min(1, "clickupTaskId is required"),
  taskName: z.string().optional(),
  brief: z.string().optional(),
  deliverableLinks: z.array(z.string()).optional(),
});

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const LLM_TIMEOUT_MS = 30_000;

// ─── LLM Verification ──────────────────────────────────────────────────────

async function runLLMVerification(
  brief: string,
  deliverableLinks: string[],
  taskName: string
): Promise<LLMVerificationOutput> {
  const systemPrompt = `You are Arya, a quality assurance AI for a creative agency. You verify deliverables against project briefs on 5 strict criteria. Return a JSON object with exactly these 5 keys, each containing { "passed": boolean, "detail": string }.

Criteria:
1. briefCoverage — All brief requirements are addressed (no missing item)
2. formatCompliance — File formats match specs (dimensions, resolution, naming conventions)
3. versionConsistency — Deliverable version matches last approved brief revision
4. completeness — No placeholder, TODO, or empty section in deliverables
5. clientReadyQuality — No visible artefact, watermark, or draft label

If a criterion cannot be assessed due to missing information, mark it as passed with detail explaining why it was assumed.

Return ONLY valid JSON, no markdown fences.`;

  const userMessage = `Project: ${taskName}

Brief:
${brief || "[No brief provided — flag briefCoverage as FAIL]"}

Deliverable links:
${deliverableLinks.length > 0 ? deliverableLinks.map((l, i) => `${i + 1}. ${l}`).join("\n") : "[No deliverable links provided — flag completeness as FAIL]"}

Evaluate each criterion and return the JSON result.`;

  const { data } = await callClaudeJSON<LLMVerificationOutput>({
    systemPrompt,
    userMessage,
    model: "claude-haiku-4-5-20241022",
    maxTokens: 1024,
    timeout: LLM_TIMEOUT_MS,
  });

  return data;
}

function parseVerificationOutput(
  output: LLMVerificationOutput
): VerificationResult {
  const criteria: VerificationCriteria = {
    briefCoverage: output.briefCoverage.passed,
    formatCompliance: output.formatCompliance.passed,
    versionConsistency: output.versionConsistency.passed,
    completeness: output.completeness.passed,
    clientReadyQuality: output.clientReadyQuality.passed,
  };

  const failureReasons: string[] = [];
  if (!criteria.briefCoverage)
    failureReasons.push(`Brief coverage: ${output.briefCoverage.detail}`);
  if (!criteria.formatCompliance)
    failureReasons.push(`Format compliance: ${output.formatCompliance.detail}`);
  if (!criteria.versionConsistency)
    failureReasons.push(
      `Version consistency: ${output.versionConsistency.detail}`
    );
  if (!criteria.completeness)
    failureReasons.push(`Completeness: ${output.completeness.detail}`);
  if (!criteria.clientReadyQuality)
    failureReasons.push(
      `Client-ready quality: ${output.clientReadyQuality.detail}`
    );

  const passed = failureReasons.length === 0;

  return { criteria, passed, failureReasons };
}

// ─── POST /api/admin/arya/verify-deliverables ───────────────────────────────

export async function POST(request: NextRequest) {
  // Support both session auth (PM calling directly) and internal cron auth
  const internalCronHeader = request.headers.get("x-internal-cron");
  const cronSecret = process.env.CRON_SECRET;
  const isInternalCall =
    !!cronSecret && !!internalCronHeader && internalCronHeader === cronSecret;

  if (!isInternalCall) {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clickupTaskId, taskName, brief, deliverableLinks } = parsed.data;

  // Resolve client name from ClickUp task space (non-blocking)
  let clientName = "";
  try {
    const task = await getTask(clickupTaskId);
    const spaceId = task.space?.id;
    if (spaceId) {
      const mapping = CLIENT_MAPPINGS.find((m) => m.clickupSpaceId === spaceId);
      clientName = mapping?.clickupSpaceName ?? "";
    }
  } catch { /* non-blocking */ }

  try {
    // Determine current attempt number from existing logs
    const existingLogs = await db
      .select({ attempt: aryaVerificationLog.attempt })
      .from(aryaVerificationLog)
      .where(eq(aryaVerificationLog.clickupTaskId, clickupTaskId))
      .orderBy(desc(aryaVerificationLog.attempt))
      .limit(1);

    const currentAttempt =
      existingLogs.length > 0 ? existingLogs[0].attempt + 1 : 1;

    if (currentAttempt > MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: "Max verification attempts reached",
          attempt: currentAttempt,
          escalated: true,
        },
        { status: 409 }
      );
    }

    // Run LLM verification
    let verificationResult: VerificationResult;
    try {
      const llmOutput = await runLLMVerification(
        brief ?? "",
        deliverableLinks ?? [],
        taskName ?? clickupTaskId
      );
      verificationResult = parseVerificationOutput(llmOutput);
    } catch (error) {
      // LLM timeout or error — treat as failed attempt (E2 edge case)
      const reason =
        error instanceof Error ? error.message : "LLM verification failed";
      verificationResult = {
        criteria: {
          briefCoverage: false,
          formatCompliance: false,
          versionConsistency: false,
          completeness: false,
          clientReadyQuality: false,
        },
        passed: false,
        failureReasons: [`LLM error: ${reason}`],
      };
    }

    // Write verification log
    const [logEntry] = await db
      .insert(aryaVerificationLog)
      .values({
        clickupTaskId,
        attempt: currentAttempt,
        criteria: verificationResult.criteria,
        passed: verificationResult.passed,
        failureReasons: verificationResult.failureReasons,
      })
      .returning();

    if (verificationResult.passed) {
      // PASS — create inbox item for PM validation
      const [inboxItem] = await db
        .insert(inboxItems)
        .values({
          type: "review_ai_ready",
          status: "pending",
          title: `AI Review Ready — pre-verified by Arya (${taskName ?? clickupTaskId})`,
          summary: JSON.stringify({
            clickupTaskId,
            clientName,
            attempt: currentAttempt,
            criteria: verificationResult.criteria,
          }),
          sourceId: clickupTaskId,
          sourceType: "arya",
          protocol: "PROTO-REVIEW-INTAKE",
          projectId: clickupTaskId,
          priority: "medium",
          verificationAttempt: currentAttempt,
          aryaReport: verificationResult as unknown as Record<string, unknown>,
        })
        .returning();

      // Link log entry to inbox item
      await db
        .update(aryaVerificationLog)
        .set({ inboxItemId: inboxItem.id })
        .where(eq(aryaVerificationLog.id, logEntry.id));

      return NextResponse.json({
        passed: true,
        attempt: currentAttempt,
        criteria: verificationResult.criteria,
        inboxItemId: inboxItem.id,
      });
    }

    // FAIL handling
    const failReport = [
      `Arya pre-verification FAILED (attempt ${currentAttempt}/${MAX_ATTEMPTS})`,
      "",
      "Failed criteria:",
      ...verificationResult.failureReasons.map((r) => `- ${r}`),
      "",
      currentAttempt >= MAX_ATTEMPTS
        ? "Maximum attempts reached. Escalating to PM for manual review."
        : "Please address the issues above and re-submit to Review.",
    ].join("\n");

    // Post comment to ClickUp
    try {
      await addTaskComment(clickupTaskId, failReport);
    } catch (commentError) {
      console.error(
        "[Arya Verify] Failed to post ClickUp comment:",
        commentError
      );
    }

    if (currentAttempt >= MAX_ATTEMPTS) {
      // Escalate to PM
      const [escalationItem] = await db
        .insert(inboxItems)
        .values({
          type: "review_escalated",
          status: "pending",
          title: `AI project blocked after ${MAX_ATTEMPTS} verification rounds — manual review required (${taskName ?? clickupTaskId})`,
          summary: JSON.stringify({
            clickupTaskId,
            totalAttempts: currentAttempt,
            lastFailureReasons: verificationResult.failureReasons,
          }),
          sourceId: clickupTaskId,
          sourceType: "arya",
          protocol: "PROTO-REVIEW-INTAKE",
          projectId: clickupTaskId,
          priority: "high",
          verificationAttempt: currentAttempt,
          aryaReport: verificationResult as unknown as Record<string, unknown>,
        })
        .returning();

      await db
        .update(aryaVerificationLog)
        .set({ inboxItemId: escalationItem.id })
        .where(eq(aryaVerificationLog.id, logEntry.id));

      return NextResponse.json({
        passed: false,
        attempt: currentAttempt,
        escalated: true,
        criteria: verificationResult.criteria,
        failureReasons: verificationResult.failureReasons,
        inboxItemId: escalationItem.id,
      });
    }

    // Not yet at max — reset task to In Progress, notify AI team
    try {
      await updateTaskStatus(clickupTaskId, "In Progress");
    } catch (statusError) {
      console.error(
        "[Arya Verify] Failed to update ClickUp status:",
        statusError
      );
    }

    const [reworkItem] = await db
      .insert(inboxItems)
      .values({
        type: "ai_rework_required",
        status: "pending",
        title: `AI rework required — verification failed (attempt ${currentAttempt}/${MAX_ATTEMPTS}) (${taskName ?? clickupTaskId})`,
        summary: JSON.stringify({
          clickupTaskId,
          clientName,
          attempt: currentAttempt,
          failureReasons: verificationResult.failureReasons,
        }),
        sourceId: clickupTaskId,
        sourceType: "arya",
        protocol: "PROTO-REVIEW-INTAKE",
        projectId: clickupTaskId,
        priority: "medium",
        verificationAttempt: currentAttempt,
        aryaReport: verificationResult as unknown as Record<string, unknown>,
      })
      .returning();

    await db
      .update(aryaVerificationLog)
      .set({ inboxItemId: reworkItem.id })
      .where(eq(aryaVerificationLog.id, logEntry.id));

    return NextResponse.json({
      passed: false,
      attempt: currentAttempt,
      escalated: false,
      criteria: verificationResult.criteria,
      failureReasons: verificationResult.failureReasons,
      inboxItemId: reworkItem.id,
    });
  } catch (error) {
    console.error("[Arya Verify] Error:", error);
    const message =
      error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
