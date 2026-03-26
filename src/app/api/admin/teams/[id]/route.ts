import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projectTeams,
  teamSteps,
  teamDeliverables,
  clients,
} from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";

// ─── GET /api/admin/teams/[id] ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch team with client info
    const [team] = await db
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
      })
      .from(projectTeams)
      .innerJoin(clients, eq(projectTeams.clientId, clients.id))
      .where(eq(projectTeams.id, id))
      .limit(1);

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Fetch steps ordered by stepOrder
    const steps = await db
      .select()
      .from(teamSteps)
      .where(eq(teamSteps.teamId, id))
      .orderBy(asc(teamSteps.stepOrder));

    // Fetch all deliverables for these steps
    const stepIds = steps.map((s) => s.id);
    let deliverables: Array<typeof teamDeliverables.$inferSelect> = [];

    if (stepIds.length > 0) {
      deliverables = await db
        .select()
        .from(teamDeliverables)
        .where(inArray(teamDeliverables.stepId, stepIds))
        .orderBy(asc(teamDeliverables.createdAt));
    }

    // Group deliverables by stepId
    const deliverablesByStep = new Map<
      string,
      Array<typeof teamDeliverables.$inferSelect>
    >();
    for (const d of deliverables) {
      const list = deliverablesByStep.get(d.stepId) ?? [];
      list.push(d);
      deliverablesByStep.set(d.stepId, list);
    }

    // Assemble response
    const stepsWithDeliverables = steps.map((step) => ({
      ...step,
      deliverables: deliverablesByStep.get(step.id) ?? [],
    }));

    return NextResponse.json({
      team: {
        ...team,
        steps: stepsWithDeliverables,
      },
    });
  } catch (error: unknown) {
    console.error("Get team detail error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
