import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, agentOutputs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { dispatchSchema } from "@/lib/validations/pm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = dispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, briefSummary, deadline, priority, tasks } = parsed.data;

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

    // Create one AgentOutput per dispatched task
    const insertedOutputs = await db
      .insert(agentOutputs)
      .values(
        tasks.map((task) => ({
          clientId,
          agentType: task.agent,
          inputPayload: {
            briefSummary,
            taskTitle: task.title,
            taskDescription: task.description,
            complexity: task.complexity,
            deadline: deadline || null,
            priority,
          },
          status: "pending" as const,
          createdBy: "admin",
        }))
      )
      .returning({
        id: agentOutputs.id,
        agentType: agentOutputs.agentType,
        status: agentOutputs.status,
      });

    return NextResponse.json(
      {
        dispatched: insertedOutputs.length,
        tasks: insertedOutputs,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("PM dispatch error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to dispatch tasks";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
