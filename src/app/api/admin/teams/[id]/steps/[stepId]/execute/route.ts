import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectTeams,
  teamSteps,
  teamDeliverables,
} from "@/lib/db/schema";
import { eq, and, lt, asc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { callClaude } from "@/lib/ai/claude";
import { buildStepPrompt } from "@/lib/teams/prompts";
import { AGENT_TYPE_LABELS, type AgentType } from "@/lib/teams/templates";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      previousOutputs
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
