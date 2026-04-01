// SSR — server-side global search across clients, projects, and inbox items
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, agentOutputs, inboxItems } from "@/lib/db/schema";
import { ilike, or, desc, eq, sql } from "drizzle-orm";

// ─── Validation ────────────────────────────────────────────────────────────

const SearchParamsSchema = z.object({
  q: z.string().min(1).max(200),
});

// ─── Rate limiting (simple in-memory per IP) ───────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Prune expired entries periodically (every 100 checks)
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ─── Result types ──────────────────────────────────────────────────────────

interface SearchResult {
  type: "client" | "project" | "inbox";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

interface SearchResponse {
  results: {
    client: SearchResult[];
    project: SearchResult[];
    inbox: SearchResult[];
  };
  query: string;
}

// ─── GET /api/admin/search?q=xxx ───────────────────────────────────────────

const MAX_PER_CATEGORY = 5;

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Validate query
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = SearchParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search query", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { q } = parsed.data;
  const pattern = `%${q}%`;

  try {
    // Run all three searches in parallel
    const [clientResults, projectResults, inboxResults] = await Promise.all([
      // ── Clients: search by name or primary contact email ──
      db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.primaryContactEmail,
          industry: clients.industry,
        })
        .from(clients)
        .where(
          or(
            ilike(clients.name, pattern),
            ilike(clients.primaryContactEmail, pattern),
          ),
        )
        .orderBy(desc(clients.updatedAt))
        .limit(MAX_PER_CATEGORY),

      // ── Projects: search by brief summary in agentOutputs input payload ──
      // Projects are derived from agentOutputs grouped by client+brief.
      // We search on inputPayload text cast and client name.
      db
        .select({
          id: agentOutputs.id,
          clientId: agentOutputs.clientId,
          clientName: clients.name,
          inputPayload: agentOutputs.inputPayload,
          agentType: agentOutputs.agentType,
        })
        .from(agentOutputs)
        .innerJoin(clients, eq(agentOutputs.clientId, clients.id))
        .where(
          or(
            ilike(sql`${agentOutputs.inputPayload}::text`, pattern),
            ilike(clients.name, pattern),
          ),
        )
        .orderBy(desc(agentOutputs.createdAt))
        .limit(20), // fetch more to deduplicate by project

      // ── Inbox items: search by title or summary ──
      db
        .select({
          id: inboxItems.id,
          title: inboxItems.title,
          summary: inboxItems.summary,
          type: inboxItems.type,
          status: inboxItems.status,
          priority: inboxItems.priority,
        })
        .from(inboxItems)
        .where(
          or(
            ilike(inboxItems.title, pattern),
            ilike(sql`${inboxItems.summary}::text`, pattern),
          ),
        )
        .orderBy(desc(inboxItems.createdAt))
        .limit(MAX_PER_CATEGORY),
    ]);

    // ── Format client results ──
    const formattedClients: SearchResult[] = clientResults.map((c): SearchResult => ({
      type: "client",
      id: c.id,
      title: c.name,
      subtitle: c.email ?? c.industry,
      href: `/admin/clients/${c.id}`,
    }));

    // ── Deduplicate and format project results ──
    // Group by client+briefSummary (same logic as projects API)
    const seenProjects = new Map<string, SearchResult>();
    for (const row of projectResults) {
      const payload = row.inputPayload as Record<string, unknown> | null;
      const briefSummary =
        (payload?.briefSummary as string) ||
        (payload?.brief as string)?.slice(0, 100) ||
        (payload?.topic as string) ||
        (payload?.title as string) ||
        "Untitled project";
      const key = `${row.clientId}::${briefSummary}`;

      if (!seenProjects.has(key)) {
        const compositeId = encodeURIComponent(
          `${row.clientName}::${briefSummary}`,
        );
        seenProjects.set(key, {
          type: "project",
          id: key,
          title: briefSummary.length > 80 ? briefSummary.slice(0, 80) + "…" : briefSummary,
          subtitle: row.clientName,
          href: `/admin/projects/${compositeId}`,
        });
      }

      if (seenProjects.size >= MAX_PER_CATEGORY) break;
    }
    const formattedProjects = Array.from(seenProjects.values());

    // ── Format inbox results ──
    const formattedInbox: SearchResult[] = inboxResults.map((item): SearchResult => ({
      type: "inbox",
      id: item.id,
      title: item.title ?? "Untitled",
      subtitle: [item.type?.replace(/_/g, " "), item.priority]
        .filter(Boolean)
        .join(" · "),
      href: "/admin",  // Inbox is on the main admin page
    }));

    const response: SearchResponse = {
      results: {
        client: formattedClients,
        project: formattedProjects,
        inbox: formattedInbox,
      },
      query: q,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
