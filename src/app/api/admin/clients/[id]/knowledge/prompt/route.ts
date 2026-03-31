import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientKnowledge, clients } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { buildClientKnowledgePrompt } from "@/lib/arya/knowledge-loader";

// ─── Validation ──────────────────────────────────────────────────────────

const QuerySchema = z.object({
  contactEmail: z.string().email().optional(),
  division: z.string().max(255).optional(),
  categories: z.string().max(500).optional(), // comma-separated
});

// ─── GET — Build injectable prompt block ─────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Validate client exists and get name
    const [client] = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const queryParsed = QuerySchema.safeParse({
      contactEmail: url.searchParams.get("contactEmail") ?? undefined,
      division: url.searchParams.get("division") ?? undefined,
      categories: url.searchParams.get("categories") ?? undefined,
    });

    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryParsed.error.flatten() },
        { status: 400 }
      );
    }

    const query = queryParsed.data;

    // Parse categories filter
    const categoryFilter = query.categories
      ? query.categories.split(",").map((c) => c.trim())
      : undefined;

    // Build the prompt using the knowledge-loader utility
    const promptBlock = await buildClientKnowledgePrompt(
      client.name,
      query.contactEmail,
      {
        division: query.division,
        categories: categoryFilter,
        clientId,
      }
    );

    // Count entries included
    const allActive = await db
      .select({ id: clientKnowledge.id })
      .from(clientKnowledge)
      .where(
        and(
          eq(clientKnowledge.clientId, clientId),
          eq(clientKnowledge.isActive, true)
        )
      );

    return NextResponse.json({
      promptBlock,
      knowledgeCount: allActive.length,
      clientName: client.name,
    });
  } catch (error) {
    console.error("[Client Knowledge Prompt GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to build knowledge prompt" },
      { status: 500 }
    );
  }
}
