import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    // Fetch all dispatched tasks (any agent type) grouped by client
    const conditions = [];

    if (clientId) {
      conditions.push(eq(agentOutputs.clientId, clientId));
    }
    if (status && status !== "all") {
      conditions.push(eq(agentOutputs.status, status));
    }

    const results = await db
      .select({
        id: agentOutputs.id,
        clientId: agentOutputs.clientId,
        clientName: clients.name,
        agentType: agentOutputs.agentType,
        inputPayload: agentOutputs.inputPayload,
        outputContent: agentOutputs.outputContent,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
        updatedAt: agentOutputs.updatedAt,
      })
      .from(agentOutputs)
      .innerJoin(clients, eq(agentOutputs.clientId, clients.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agentOutputs.createdAt))
      .limit(100);

    // Group by briefSummary + clientId to form "projects"
    type ProjectTask = (typeof results)[number];

    const projectMap = new Map<
      string,
      {
        clientId: string | null;
        clientName: string;
        briefSummary: string;
        tasks: ProjectTask[];
        latestDate: Date;
      }
    >();

    for (const row of results) {
      const payload = row.inputPayload as Record<string, unknown> | null;
      const briefSummary =
        (payload?.briefSummary as string) || "Untitled project";
      const key = `${row.clientId}::${briefSummary}`;

      if (!projectMap.has(key)) {
        projectMap.set(key, {
          clientId: row.clientId,
          clientName: row.clientName,
          briefSummary,
          tasks: [],
          latestDate: row.createdAt,
        });
      }

      const project = projectMap.get(key)!;
      project.tasks.push(row);

      if (row.createdAt > project.latestDate) {
        project.latestDate = row.createdAt;
      }
    }

    // Convert to array, sorted by latest date
    const projects = Array.from(projectMap.values())
      .map((p) => ({
        clientId: p.clientId,
        clientName: p.clientName,
        briefSummary: p.briefSummary,
        taskCount: p.tasks.length,
        agents: [...new Set(p.tasks.map((t) => t.agentType))],
        statuses: {
          pending: p.tasks.filter((t) => t.status === "pending").length,
          processing: p.tasks.filter((t) => t.status === "processing").length,
          done: p.tasks.filter((t) => t.status === "done").length,
          error: p.tasks.filter((t) => t.status === "error").length,
        },
        overallStatus: deriveOverallStatus(p.tasks),
        createdAt: p.latestDate,
        tasks: p.tasks.map((t) => ({
          id: t.id,
          agentType: t.agentType,
          title: (t.inputPayload as Record<string, unknown> | null)?.taskTitle as string || t.agentType,
          status: t.status,
          createdAt: t.createdAt,
        })),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching PM projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

function deriveOverallStatus(
  tasks: { status: string }[]
): "pending" | "processing" | "done" | "error" {
  if (tasks.some((t) => t.status === "error")) return "error";
  if (tasks.every((t) => t.status === "done")) return "done";
  if (tasks.some((t) => t.status === "processing" || t.status === "done"))
    return "processing";
  return "pending";
}
