import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    // Build conditions
    const conditions = [eq(agentOutputs.agentType, "legal")];

    if (clientId) {
      conditions.push(eq(agentOutputs.clientId, clientId));
    }

    const results = await db
      .select({
        id: agentOutputs.id,
        clientId: agentOutputs.clientId,
        clientName: clients.name,
        inputPayload: agentOutputs.inputPayload,
        outputContent: agentOutputs.outputContent,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
      })
      .from(agentOutputs)
      .innerJoin(clients, eq(agentOutputs.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(agentOutputs.createdAt))
      .limit(50);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("Legal history error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch contract history";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
