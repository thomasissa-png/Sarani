import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const agentType = searchParams.get("agent");

    // Build conditions
    const conditions = [];

    if (clientId) {
      conditions.push(eq(agentOutputs.clientId, clientId));
    }
    if (status && status !== "all") {
      conditions.push(eq(agentOutputs.status, status));
    }
    if (agentType && agentType !== "all") {
      conditions.push(eq(agentOutputs.agentType, agentType));
    }

    const results = await db
      .select({
        id: agentOutputs.id,
        clientId: agentOutputs.clientId,
        clientName: clients.name,
        agentType: agentOutputs.agentType,
        inputPayload: agentOutputs.inputPayload,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
      })
      .from(agentOutputs)
      .innerJoin(clients, eq(agentOutputs.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentOutputs.createdAt))
      .limit(200);

    // Group by client + briefSummary to form "projects"
    type OutputRow = (typeof results)[number];

    const projectMap = new Map<
      string,
      {
        clientId: string | null;
        clientName: string;
        briefSummary: string;
        outputs: OutputRow[];
        latestDate: Date;
      }
    >();

    for (const row of results) {
      const payload = row.inputPayload as Record<string, unknown> | null;
      // Try multiple fields that could contain the brief summary
      const briefSummary =
        (payload?.briefSummary as string) ||
        (payload?.brief as string)?.slice(0, 100) ||
        (payload?.topic as string) ||
        (payload?.title as string) ||
        "Untitled project";
      const key = `${row.clientId}::${briefSummary}`;

      if (!projectMap.has(key)) {
        projectMap.set(key, {
          clientId: row.clientId,
          clientName: row.clientName,
          briefSummary,
          outputs: [],
          latestDate: row.createdAt,
        });
      }

      const project = projectMap.get(key)!;
      project.outputs.push(row);

      if (row.createdAt > project.latestDate) {
        project.latestDate = row.createdAt;
      }
    }

    // Convert to response format
    const projects = Array.from(projectMap.values())
      .map((p) => ({
        clientId: p.clientId,
        clientName: p.clientName,
        briefSummary:
          p.briefSummary.length > 100
            ? p.briefSummary.slice(0, 100) + "..."
            : p.briefSummary,
        outputCount: p.outputs.length,
        agents: [...new Set(p.outputs.map((o) => o.agentType))],
        statuses: {
          pending: p.outputs.filter((o) => o.status === "pending").length,
          processing: p.outputs.filter((o) => o.status === "processing").length,
          done: p.outputs.filter((o) => o.status === "done").length,
          error: p.outputs.filter((o) => o.status === "error").length,
        },
        overallStatus: deriveOverallStatus(p.outputs),
        createdAt: p.latestDate,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    // Also fetch unique clients for the filter dropdown
    const clientList = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .innerJoin(agentOutputs, eq(agentOutputs.clientId, clients.id))
      .groupBy(clients.id, clients.name)
      .orderBy(clients.name);

    return NextResponse.json({ projects, clients: clientList });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

function deriveOverallStatus(
  outputs: { status: string }[]
): "pending" | "processing" | "done" | "error" {
  if (outputs.some((o) => o.status === "error")) return "error";
  if (outputs.every((o) => o.status === "done")) return "done";
  if (outputs.some((o) => o.status === "processing" || o.status === "done"))
    return "processing";
  return "pending";
}
