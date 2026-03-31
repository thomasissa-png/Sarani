import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectTeams,
  teamSteps,
  teamDeliverables,
  inboxItems,
} from "@/lib/db/schema";
import { eq, and, lt, asc, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai/claude";
import { buildStepPrompt } from "@/lib/teams/prompts";
import { AGENT_TYPE_LABELS, type AgentType } from "@/lib/teams/templates";
import type { TemplateType } from "@/lib/teams/quality-gates";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AUTO_REVIEW_ROUNDS = 3;

// ─── POST /api/admin/teams/[id]/steps/[stepId]/execute ──────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, stepId } = await params;

    // Validate UUID format
    if (!UUID_REGEX.test(teamId) || !UUID_REGEX.test(stepId)) {
      return NextResponse.json(
        { error: "Invalid team ID or step ID format" },
        { status: 400 }
      );
    }

    // Fetch team
    const [team] = await db
      .select()
      .from(projectTeams)
      .where(eq(projectTeams.id, teamId))
      .limit(1);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Fetch the target step
    const [step] = await db
      .select()
      .from(teamSteps)
      .where(and(eq(teamSteps.id, stepId), eq(teamSteps.teamId, teamId)))
      .limit(1);

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    if (step.status === "running") {
      return NextResponse.json(
        { error: "Step is already running" },
        { status: 409 }
      );
    }

    if (step.status === "completed") {
      return NextResponse.json(
        { error: "Step is already completed. Use the rerun endpoint to re-execute." },
        { status: 409 }
      );
    }

    // Fetch previous steps (single query — used for both gate check and output gathering)
    const previousSteps = step.stepOrder > 1
      ? await db
          .select()
          .from(teamSteps)
          .where(
            and(
              eq(teamSteps.teamId, teamId),
              lt(teamSteps.stepOrder, step.stepOrder)
            )
          )
          .orderBy(asc(teamSteps.stepOrder))
      : [];

    // Verify all previous steps are completed (manual approval gate)
    if (step.stepOrder > 1) {
      const allPreviousCompleted = previousSteps.every(
        (s) => s.status === "completed"
      );

      if (!allPreviousCompleted) {
        return NextResponse.json(
          {
            error:
              "Previous steps must be completed before executing this step",
          },
          { status: 400 }
        );
      }
    }

    const previousOutputs = previousSteps
      .filter((s) => s.output)
      .map((s) => ({
        label: s.label,
        agentType:
          AGENT_TYPE_LABELS[s.agentType as AgentType] ?? s.agentType,
        output: s.output as string,
      }));

    // Atomically claim the step — prevents race conditions
    const [claimed] = await db
      .update(teamSteps)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(
        and(
          eq(teamSteps.id, stepId),
          eq(teamSteps.status, "pending")
        )
      )
      .returning({ id: teamSteps.id });

    if (!claimed) {
      return NextResponse.json(
        { error: "Step is no longer pending — it may have been claimed by another request" },
        { status: 409 }
      );
    }

    // Update team status to in_progress if still draft
    if (team.status === "draft") {
      await db
        .update(projectTeams)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(projectTeams.id, teamId));
    }

    // Build prompt and call Claude
    const { systemPrompt, userMessage } = buildStepPrompt(
      step.agentType as AgentType,
      team.brief,
      step.label,
      previousOutputs,
      undefined,
      (team.templateType as TemplateType) ?? undefined
    );

    try {
      const result = await callClaude({
        systemPrompt,
        userMessage,
        maxTokens: 8192,
        timeout: previousOutputs.length > 0 ? 120_000 : undefined,
      });

      const totalTokens = result.usage.inputTokens + result.usage.outputTokens;

      // Save step output
      await db
        .update(teamSteps)
        .set({
          status: "completed",
          output: result.content,
          input: {
            brief: team.brief,
            previousStepCount: previousOutputs.length,
          },
          tokenCost: totalTokens,
          completedAt: new Date(),
        })
        .where(eq(teamSteps.id, stepId));

      // Create deliverable record
      await db.insert(teamDeliverables).values({
        stepId,
        name: step.label,
        content: result.content,
        format: "markdown",
        version: 1,
      });

      // ── Auto-review loop ───────────────────────────────────────────────
      // If this is a QA step and the result contains "REVISION NEEDED",
      // automatically re-execute the previous step with feedback, up to MAX_AUTO_REVIEW_ROUNDS.
      let autoReviewResult: AutoReviewResult | null = null;

      if (step.agentType === "qa" && result.content.includes("REVISION NEEDED")) {
        autoReviewResult = await runAutoReviewLoop({
          teamId,
          team,
          qaStepId: stepId,
          qaStepOrder: step.stepOrder,
          qaOutput: result.content,
          templateType: (team.templateType as TemplateType) ?? undefined,
        });
      }

      // Check if all steps are now completed
      const allSteps = await db
        .select({ status: teamSteps.status })
        .from(teamSteps)
        .where(eq(teamSteps.teamId, teamId));

      const allCompleted = allSteps.every((s) => s.status === "completed");
      if (allCompleted) {
        await db
          .update(projectTeams)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(projectTeams.id, teamId));
      }

      return NextResponse.json({
        output: result.content,
        tokenCost: totalTokens,
        usage: result.usage,
        stepStatus: "completed",
        ...(autoReviewResult ? { autoReview: autoReviewResult } : {}),
      });
    } catch (aiError: unknown) {
      // Mark step as failed on AI error
      await db
        .update(teamSteps)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(teamSteps.id, stepId));

      throw aiError;
    }
  } catch (error: unknown) {
    console.error("Execute step error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to execute step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Auto-review loop ──────────────────────────────────────────────────────
// When a QA step detects "REVISION NEEDED", this function re-executes the
// upstream step with the QA feedback injected, then re-runs QA — up to
// MAX_AUTO_REVIEW_ROUNDS iterations. If it doesn't converge, it marks the
// step as needs_human_review and creates an inbox_item for the PM.

interface AutoReviewResult {
  rounds: number;
  converged: boolean;
  finalVerdict: "ALL GATES PASS" | "REVISION NEEDED" | "needs_human_review";
}

/**
 * Extract the failed gates feedback from a QA output to inject into the
 * upstream agent's rerun prompt.
 */
function extractQaFeedback(qaOutput: string): string {
  // Try to extract the section after "REVISION NEEDED"
  const revisionIdx = qaOutput.indexOf("REVISION NEEDED");
  if (revisionIdx === -1) return qaOutput;

  // Take everything after the REVISION NEEDED marker — the failed gates list
  const feedback = qaOutput.slice(revisionIdx);
  // Limit to 3000 chars to stay within prompt budget
  return feedback.slice(0, 3000);
}

async function runAutoReviewLoop(params: {
  teamId: string;
  team: { brief: string; templateType: string | null };
  qaStepId: string;
  qaStepOrder: number;
  qaOutput: string;
  templateType?: TemplateType;
}): Promise<AutoReviewResult> {
  const { teamId, team, qaStepId, qaStepOrder, templateType } = params;
  let currentQaOutput = params.qaOutput;

  // Find the step immediately before the QA step
  const [upstreamStep] = await db
    .select()
    .from(teamSteps)
    .where(
      and(
        eq(teamSteps.teamId, teamId),
        eq(teamSteps.stepOrder, qaStepOrder - 1)
      )
    )
    .limit(1);

  if (!upstreamStep) {
    // No upstream step to re-execute — nothing to do
    return { rounds: 0, converged: false, finalVerdict: "REVISION NEEDED" };
  }

  for (let round = 1; round <= MAX_AUTO_REVIEW_ROUNDS; round++) {
    console.log(
      `[Auto-Review] Round ${round}/${MAX_AUTO_REVIEW_ROUNDS} — re-executing step "${upstreamStep.label}" with QA feedback`
    );

    // ── Re-execute the upstream step with QA feedback ──────────────────
    const feedback = extractQaFeedback(currentQaOutput);

    // Gather outputs from steps before the upstream step
    const priorSteps = upstreamStep.stepOrder > 1
      ? await db
          .select()
          .from(teamSteps)
          .where(
            and(
              eq(teamSteps.teamId, teamId),
              lt(teamSteps.stepOrder, upstreamStep.stepOrder)
            )
          )
          .orderBy(asc(teamSteps.stepOrder))
      : [];

    const priorOutputs = priorSteps
      .filter((s) => s.output)
      .map((s) => ({
        label: s.label,
        agentType:
          AGENT_TYPE_LABELS[s.agentType as AgentType] ?? s.agentType,
        output: s.output as string,
      }));

    // Build prompt with feedback as rerun comment
    const { systemPrompt: upstreamSystem, userMessage: upstreamUser } =
      buildStepPrompt(
        upstreamStep.agentType as AgentType,
        team.brief,
        upstreamStep.label,
        priorOutputs,
        `AUTO-REVIEW ROUND ${round}/${MAX_AUTO_REVIEW_ROUNDS} — QA found issues:\n${feedback}`,
        templateType
      );

    // Mark upstream step as running
    await db
      .update(teamSteps)
      .set({ status: "running", startedAt: new Date(), completedAt: null })
      .where(eq(teamSteps.id, upstreamStep.id));

    let upstreamResult;
    try {
      upstreamResult = await callClaude({
        systemPrompt: upstreamSystem,
        userMessage: upstreamUser,
        maxTokens: 8192,
        timeout: 120_000,
      });
    } catch (err) {
      // If the upstream call fails, mark as failed and bail
      await db
        .update(teamSteps)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(teamSteps.id, upstreamStep.id));
      console.error(`[Auto-Review] Upstream step failed on round ${round}:`, err);
      return { rounds: round, converged: false, finalVerdict: "needs_human_review" };
    }

    const upstreamTokens =
      upstreamResult.usage.inputTokens + upstreamResult.usage.outputTokens;

    // Save upstream step result
    await db
      .update(teamSteps)
      .set({
        status: "completed",
        output: upstreamResult.content,
        tokenCost: (upstreamStep.tokenCost ?? 0) + upstreamTokens,
        completedAt: new Date(),
      })
      .where(eq(teamSteps.id, upstreamStep.id));

    // Get the current max version for the upstream deliverable
    const [latestUpstreamDel] = await db
      .select({ version: teamDeliverables.version })
      .from(teamDeliverables)
      .where(eq(teamDeliverables.stepId, upstreamStep.id))
      .orderBy(desc(teamDeliverables.version))
      .limit(1);

    await db.insert(teamDeliverables).values({
      stepId: upstreamStep.id,
      name: upstreamStep.label,
      content: upstreamResult.content,
      format: "markdown",
      version: (latestUpstreamDel?.version ?? 0) + 1,
      rerunComment: `Auto-review round ${round}`,
    });

    // ── Re-execute the QA step ─────────────────────────────────────────
    // Rebuild previous outputs including the updated upstream step
    const allPriorForQa = await db
      .select()
      .from(teamSteps)
      .where(
        and(
          eq(teamSteps.teamId, teamId),
          lt(teamSteps.stepOrder, qaStepOrder)
        )
      )
      .orderBy(asc(teamSteps.stepOrder));

    const qaInputOutputs = allPriorForQa
      .filter((s) => s.output)
      .map((s) => ({
        label: s.label,
        agentType:
          AGENT_TYPE_LABELS[s.agentType as AgentType] ?? s.agentType,
        output: s.output as string,
      }));

    const { systemPrompt: qaSystem, userMessage: qaUser } = buildStepPrompt(
      "qa" as AgentType,
      team.brief,
      "Quality Assurance Review",
      qaInputOutputs,
      `Auto-review round ${round} — re-evaluate after upstream corrections.`,
      templateType
    );

    await db
      .update(teamSteps)
      .set({ status: "running", startedAt: new Date(), completedAt: null })
      .where(eq(teamSteps.id, qaStepId));

    let qaResult;
    try {
      qaResult = await callClaude({
        systemPrompt: qaSystem,
        userMessage: qaUser,
        maxTokens: 8192,
        timeout: 120_000,
      });
    } catch (err) {
      await db
        .update(teamSteps)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(teamSteps.id, qaStepId));
      console.error(`[Auto-Review] QA step failed on round ${round}:`, err);
      return { rounds: round, converged: false, finalVerdict: "needs_human_review" };
    }

    const qaTokens =
      qaResult.usage.inputTokens + qaResult.usage.outputTokens;
    currentQaOutput = qaResult.content;

    // Read current QA step state for cumulative token cost
    const [currentQaStep] = await db
      .select({ tokenCost: teamSteps.tokenCost, input: teamSteps.input })
      .from(teamSteps)
      .where(eq(teamSteps.id, qaStepId))
      .limit(1);

    // Save QA step result
    await db
      .update(teamSteps)
      .set({
        status: "completed",
        output: qaResult.content,
        tokenCost: (currentQaStep?.tokenCost ?? 0) + qaTokens,
        completedAt: new Date(),
        input: {
          ...(typeof currentQaStep?.input === "object" && currentQaStep?.input !== null ? currentQaStep.input : {}),
          autoReviewRound: round,
        },
      })
      .where(eq(teamSteps.id, qaStepId));

    // Get current max version for QA deliverable
    const [latestQaDel] = await db
      .select({ version: teamDeliverables.version })
      .from(teamDeliverables)
      .where(eq(teamDeliverables.stepId, qaStepId))
      .orderBy(desc(teamDeliverables.version))
      .limit(1);

    await db.insert(teamDeliverables).values({
      stepId: qaStepId,
      name: "Quality Assurance Review",
      content: qaResult.content,
      format: "markdown",
      version: (latestQaDel?.version ?? 0) + 1,
      rerunComment: `Auto-review round ${round}`,
    });

    // ── Check if QA now passes ─────────────────────────────────────────
    if (qaResult.content.includes("ALL GATES PASS")) {
      console.log(
        `[Auto-Review] Converged after ${round} round(s) — ALL GATES PASS`
      );
      return { rounds: round, converged: true, finalVerdict: "ALL GATES PASS" };
    }
  }

  // Max rounds exhausted without convergence — escalate to human
  console.warn(
    `[Auto-Review] ${MAX_AUTO_REVIEW_ROUNDS} rounds exhausted without convergence — escalating to PM`
  );

  // Create an inbox_item for PM review
  await db.insert(inboxItems).values({
    type: "qa_gates_pass", // reusing type for QA-related items
    status: "pending",
    title: `Auto-review failed after ${MAX_AUTO_REVIEW_ROUNDS} rounds — needs human review`,
    summary: JSON.stringify({
      teamId,
      qaStepId,
      upstreamStepId: upstreamStep.id,
      rounds: MAX_AUTO_REVIEW_ROUNDS,
      lastQaOutput: currentQaOutput.slice(0, 2000),
    }),
    sourceId: teamId,
    sourceType: "ai_team",
    priority: "high",
  });

  return {
    rounds: MAX_AUTO_REVIEW_ROUNDS,
    converged: false,
    finalVerdict: "needs_human_review",
  };
}
