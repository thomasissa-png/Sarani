import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs } from "@/lib/db/schema";
import { sql, isNotNull } from "drizzle-orm";

/**
 * GET /api/admin/agents/outputs-by-project
 *
 * Returns a map of clickupTaskId -> output count + agent types.
 * Used by the tracker page to show AI output badges inline.
 */
export async function GET() {
  try {
    const results = await db
      .select({
        clickupTaskId: agentOutputs.clickupTaskId,
        count: sql<number>`count(*)`,
        agents: sql<string>`string_agg(distinct ${agentOutputs.agentType}, ',')`,
      })
      .from(agentOutputs)
      .where(isNotNull(agentOutputs.clickupTaskId))
      .groupBy(agentOutputs.clickupTaskId);

    // Build a map: clickupTaskId -> { count, agents[] }
    const outputsByProject: Record<
      string,
      { count: number; agents: string[] }
    > = {};

    for (const row of results) {
      if (!row.clickupTaskId) continue;
      outputsByProject[row.clickupTaskId] = {
        count: Number(row.count),
        agents: row.agents ? row.agents.split(",") : [],
      };
    }

    return NextResponse.json(outputsByProject);
  } catch (error) {
    console.error("Error fetching outputs by project:", error);
    return NextResponse.json(
      { error: "Failed to fetch outputs by project" },
      { status: 500 }
    );
  }
}
