import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentOutputs, clients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { seoHistorySchema } from "@/lib/validations/seo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = seoHistorySchema.safeParse({
      clientId: searchParams.get("clientId") || undefined,
      limit: searchParams.get("limit") || 20,
      offset: searchParams.get("offset") || 0,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, limit, offset } = parsed.data;

    // Build conditions
    const conditions = [eq(agentOutputs.agentType, "seo")];

    if (clientId) {
      conditions.push(eq(agentOutputs.clientId, clientId));
    }

    // Fetch outputs with client name joined
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
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error("SEO history error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch SEO history";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
