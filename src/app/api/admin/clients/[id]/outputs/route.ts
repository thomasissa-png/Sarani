import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const outputs = await db
      .select()
      .from(agentOutputs)
      .where(eq(agentOutputs.clientId, id))
      .orderBy(desc(agentOutputs.createdAt));

    return NextResponse.json(outputs);
  } catch (error) {
    console.error("Error fetching outputs:", error);
    return NextResponse.json(
      { error: "Failed to fetch outputs" },
      { status: 500 }
    );
  }
}
