import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const results = await db
      .select({
        id: agentOutputs.id,
        inputPayload: agentOutputs.inputPayload,
        outputContent: agentOutputs.outputContent,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
      })
      .from(agentOutputs)
      .where(eq(agentOutputs.agentType, "proposal"))
      .orderBy(desc(agentOutputs.createdAt))
      .limit(50);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("Proposal history error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch history";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
