import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { clientKnowledge, teamKnowledge, clients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── GET /api/admin/knowledge ────────────────────────────────────────────────
// Returns all knowledge base entries grouped by client + team knowledge.
// Auth required. Rate limited: 30 req/min.

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`knowledge-get-${ip}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    // Fetch all client knowledge entries joined with client names
    const clientEntries = await db
      .select({
        id: clientKnowledge.id,
        clientId: clientKnowledge.clientId,
        clientName: clients.name,
        division: clientKnowledge.division,
        contactName: clientKnowledge.contactName,
        category: clientKnowledge.category,
        knowledgeText: clientKnowledge.knowledgeText,
        source: clientKnowledge.source,
        confidence: clientKnowledge.confidence,
        isActive: clientKnowledge.isActive,
        createdAt: clientKnowledge.createdAt,
        updatedAt: clientKnowledge.updatedAt,
      })
      .from(clientKnowledge)
      .innerJoin(clients, eq(clientKnowledge.clientId, clients.id))
      .orderBy(desc(clientKnowledge.updatedAt));

    // Group by client
    const clientMap = new Map<
      string,
      {
        clientName: string;
        entries: Array<{
          id: string;
          category: string;
          content: string;
          division: string | null;
          contactName: string | null;
          source: string;
          confidence: string | null;
          isActive: boolean | null;
          createdAt: Date;
        }>;
      }
    >();

    for (const entry of clientEntries) {
      const key = entry.clientId;
      if (!clientMap.has(key)) {
        clientMap.set(key, { clientName: entry.clientName, entries: [] });
      }
      clientMap.get(key)!.entries.push({
        id: entry.id,
        category: entry.category,
        content: entry.knowledgeText,
        division: entry.division,
        contactName: entry.contactName,
        source: entry.source,
        confidence: entry.confidence,
        isActive: entry.isActive,
        createdAt: entry.createdAt,
      });
    }

    const clientsResult = Array.from(clientMap.entries()).map(
      ([, { clientName, entries }]) => ({
        clientName,
        entries,
        count: entries.length,
      })
    );

    // Fetch team knowledge
    const teamEntries = await db
      .select({
        id: teamKnowledge.id,
        category: teamKnowledge.category,
        content: teamKnowledge.knowledgeText,
        memberName: teamKnowledge.teamMemberName,
        role: teamKnowledge.role,
        source: teamKnowledge.source,
        confidence: teamKnowledge.confidence,
        isActive: teamKnowledge.isActive,
        createdAt: teamKnowledge.createdAt,
      })
      .from(teamKnowledge)
      .orderBy(desc(teamKnowledge.updatedAt));

    return NextResponse.json({
      clients: clientsResult,
      team: teamEntries,
    });
  } catch (error) {
    console.error("[GET /api/admin/knowledge] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}
