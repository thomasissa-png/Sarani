import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType");
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const conditions = [eq(agentOutputs.clientId, id)];

    if (agentType) {
      conditions.push(eq(agentOutputs.agentType, agentType));
    }

    const outputs = await db
      .select({
        id: agentOutputs.id,
        agentType: agentOutputs.agentType,
        status: agentOutputs.status,
        createdAt: agentOutputs.createdAt,
        updatedAt: agentOutputs.updatedAt,
        createdBy: agentOutputs.createdBy,
      })
      .from(agentOutputs)
      .where(and(...conditions))
      .orderBy(desc(agentOutputs.createdAt))
      .limit(limit);

    return NextResponse.json(outputs);
  } catch (error) {
    console.error("Error fetching client outputs:", error);
    return NextResponse.json(
      { error: "Failed to fetch outputs" },
      { status: 500 }
    );
  }
}
