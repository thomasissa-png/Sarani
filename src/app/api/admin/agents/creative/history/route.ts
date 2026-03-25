import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, clients } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const whereConditions = clientId
      ? and(
          eq(agentOutputs.agentType, "creative"),
          eq(agentOutputs.clientId, clientId)
        )
      : eq(agentOutputs.agentType, "creative");

    const results = await db
      .select({
        id: agentOutputs.id,
        clientId: agentOutputs.clientId,
        clientName: clients.name,
        clientIndustry: clients.industry,
        inputPayload: agentOutputs.inputPayload,
        outputContent: agentOutputs.outputContent,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
      })
      .from(agentOutputs)
      .innerJoin(clients, eq(agentOutputs.clientId, clients.id))
      .where(whereConditions)
      .orderBy(desc(agentOutputs.createdAt))
      .limit(50);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("Creative history error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch history";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
