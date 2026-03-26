import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectTeams,
  teamSteps,
  clients,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { getTemplate, type TemplateType } from "@/lib/teams/templates";
import { z } from "zod";

// ─── Validation ─────────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(200),
  clientId: z.string().uuid("Invalid client ID"),
  templateType: z.string().optional(),
  brief: z.string().min(1, "Brief is required"),
  steps: z
    .array(
      z.object({
        agentType: z.string().min(1),
        stepOrder: z.number().int().positive(),
        label: z.string().min(1),
      })
    )
    .optional(),
});

// ─── POST /api/admin/teams ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, clientId, templateType, brief, steps: customSteps } = parsed.data;

    // Verify client exists
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Determine steps: from template or custom
    let stepsToCreate: Array<{
      stepOrder: number;
      agentType: string;
      label: string;
    }>;

    if (templateType && templateType !== "custom") {
      const template = getTemplate(templateType);
      if (!template) {
        return NextResponse.json(
          { error: `Unknown template type: ${templateType}` },
          { status: 400 }
        );
      }
      stepsToCreate = template.steps;
    } else if (customSteps && customSteps.length > 0) {
      stepsToCreate = customSteps;
    } else {
      return NextResponse.json(
        {
          error:
            "Either a valid templateType or custom steps array is required",
        },
        { status: 400 }
      );
    }

    // Create team
    const [team] = await db
      .insert(projectTeams)
      .values({
        name,
        clientId,
        templateType: (templateType as TemplateType) ?? null,
        brief,
        status: "draft",
      })
      .returning();

    // Create steps
    const createdSteps = await db
      .insert(teamSteps)
      .values(
        stepsToCreate.map((step) => ({
          teamId: team.id,
          stepOrder: step.stepOrder,
          agentType: step.agentType,
          label: step.label,
          status: "pending" as const,
        }))
      )
      .returning();

    return NextResponse.json(
      {
        team: {
          ...team,
          steps: createdSteps,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create team error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET /api/admin/teams ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const clientIdFilter = searchParams.get("clientId");

    // Build conditions
    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(projectTeams.status, statusFilter));
    }
    if (clientIdFilter) {
      conditions.push(eq(projectTeams.clientId, clientIdFilter));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Get teams with client name and step counts
    const teams = await db
      .select({
        id: projectTeams.id,
        name: projectTeams.name,
        clientId: projectTeams.clientId,
        clientName: clients.name,
        templateType: projectTeams.templateType,
        brief: projectTeams.brief,
        status: projectTeams.status,
        createdAt: projectTeams.createdAt,
        updatedAt: projectTeams.updatedAt,
        totalSteps: sql<number>`count(${teamSteps.id})::int`,
        completedSteps: sql<number>`count(case when ${teamSteps.status} = 'completed' then 1 end)::int`,
      })
      .from(projectTeams)
      .innerJoin(clients, eq(projectTeams.clientId, clients.id))
      .leftJoin(teamSteps, eq(projectTeams.id, teamSteps.teamId))
      .where(whereClause)
      .groupBy(projectTeams.id, clients.name)
      .orderBy(desc(projectTeams.createdAt));

    return NextResponse.json({ teams });
  } catch (error: unknown) {
    console.error("List teams error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list teams";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
