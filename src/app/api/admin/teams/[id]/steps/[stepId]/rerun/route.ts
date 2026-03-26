import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectTeams,
  teamSteps,
  teamDeliverables,
} from "@/lib/db/schema";
import { eq, and, lt, asc, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai/claude";
import { buildStepPrompt } from "@/lib/teams/prompts";
import { AGENT_TYPE_LABELS, type AgentType } from "@/lib/teams/templates";
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rerunSchema = z.object({
  comment: z.string().min(1, "Comment is required for a rerun"),
});

// ─── POST /api/admin/teams/[id]/steps/[stepId]/rerun ────────────────────────

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = rerunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { comment } = parsed.data;

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
        { error: "Step is currently running" },
        { status: 409 }
      );
    }

    if (step.status === "pending") {
      return NextResponse.json(
        { error: "Step has not been executed yet. Use the execute endpoint first." },
        { status: 400 }
      );
    }

    // Get the current max version for this step's deliverables
    const [latestDeliverable] = await db
      .select({ version: teamDeliverables.version })
      .from(teamDeliverables)
      .where(eq(teamDeliverables.stepId, stepId))
      .orderBy(desc(teamDeliverables.version))
      .limit(1);

    const nextVersion = (latestDeliverable?.version ?? 0) + 1;

    // Gather outputs from completed previous steps
    const completedPreviousSteps = await db
      .select()
      .from(teamSteps)
      .where(
        and(
          eq(teamSteps.teamId, teamId),
          lt(teamSteps.stepOrder, step.stepOrder)
        )
      )
      .orderBy(asc(teamSteps.stepOrder));

    const previousOutputs = completedPreviousSteps
      .filter((s) => s.output)
      .map((s) => ({
        label: s.label,
        agentType:
          AGENT_TYPE_LABELS[s.agentType as AgentType] ?? s.agentType,
        output: s.output as string,
      }));

    // Mark step as running
    await db
      .update(teamSteps)
      .set({
        status: "running",
        startedAt: new Date(),
        completedAt: null,
      })
      .where(eq(teamSteps.id, stepId));

    // Build prompt with rerun comment
    const { systemPrompt, userMessage } = buildStepPrompt(
      step.agentType as AgentType,
      team.brief,
      step.label,
      previousOutputs,
      comment
    );

    try {
      const result = await callClaude({
        systemPrompt,
        userMessage,
        maxTokens: 8192,
      });

      const totalTokens = result.usage.inputTokens + result.usage.outputTokens;

      // Update step with new output
      await db
        .update(teamSteps)
        .set({
          status: "completed",
          output: result.content,
          tokenCost: (step.tokenCost ?? 0) + totalTokens,
          completedAt: new Date(),
        })
        .where(eq(teamSteps.id, stepId));

      // Create new deliverable version (previous versions preserved)
      await db.insert(teamDeliverables).values({
        stepId,
        name: step.label,
        content: result.content,
        format: "markdown",
        version: nextVersion,
        rerunComment: comment,
      });

      return NextResponse.json({
        output: result.content,
        tokenCost: totalTokens,
        usage: result.usage,
        version: nextVersion,
        stepStatus: "completed",
      });
    } catch (aiError: unknown) {
      // Mark step as failed on AI error, restore previous output
      await db
        .update(teamSteps)
        .set({
          status: "completed", // Keep completed since we have previous output
          completedAt: new Date(),
        })
        .where(eq(teamSteps.id, stepId));

      throw aiError;
    }
  } catch (error: unknown) {
    console.error("Rerun step error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to rerun step";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
