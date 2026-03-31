import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientKnowledge, clients } from "@/lib/db/schema";
import { eq, and, desc, asc, isNull, SQL, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Constants ────────────────────────────────────────────────────────────

const KNOWLEDGE_CATEGORIES = [
  "tone",
  "preference",
  "positive_feedback",
  "improvement",
  "guideline",
  "workflow",
] as const;

const CONFIDENCE_LEVELS = ["confirmed", "observed", "hypothesized"] as const;

// ─── Validation schemas ──────────────────────────────────────────────────

const GetFiltersSchema = z.object({
  category: z.enum(KNOWLEDGE_CATEGORIES).optional(),
  division: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

const CreateKnowledgeSchema = z.object({
  division: z.string().max(255).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  category: z.enum(KNOWLEDGE_CATEGORIES),
  knowledgeText: z.string().min(5).max(5000),
  source: z.string().min(3).max(1000),
  confidence: z.enum(CONFIDENCE_LEVELS).default("observed"),
  // Thomas's relevance check — optional note explaining why this knowledge
  // changes how we treat the next project for this client.
  // Rule: "Does this info change the way we handle the next project for this client?"
  relevanceCheck: z.string().max(500).optional(),
});

const PatchKnowledgeSchema = z
  .object({
    division: z.string().max(255).optional(),
    contactName: z.string().max(255).optional(),
    contactEmail: z.string().email().max(255).optional(),
    category: z.enum(KNOWLEDGE_CATEGORIES).optional(),
    knowledgeText: z.string().min(5).max(5000).optional(),
    source: z.string().min(3).max(1000).optional(),
    confidence: z.enum(CONFIDENCE_LEVELS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ─── GET — List knowledge for a client ───────────────────────────────────

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

    // Validate client exists
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

    // Parse query filters
    const url = new URL(request.url);
    const filtersParsed = GetFiltersSchema.safeParse({
      category: url.searchParams.get("category") ?? undefined,
      division: url.searchParams.get("division") ?? undefined,
      contactEmail: url.searchParams.get("contactEmail") ?? undefined,
      confidence: url.searchParams.get("confidence") ?? undefined,
      isActive: url.searchParams.get("isActive") ?? undefined,
    });

    if (!filtersParsed.success) {
      return NextResponse.json(
        { error: "Invalid filters", details: filtersParsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = filtersParsed.data;

    // Build WHERE conditions
    const conditions: SQL[] = [eq(clientKnowledge.clientId, clientId)];

    // Default to active only unless explicitly overridden
    const showActive = filters.isActive !== "false";
    if (showActive) {
      conditions.push(eq(clientKnowledge.isActive, true));
    }

    if (filters.category) {
      conditions.push(eq(clientKnowledge.category, filters.category));
    }
    if (filters.division) {
      conditions.push(eq(clientKnowledge.division, filters.division));
    }
    if (filters.contactEmail) {
      conditions.push(eq(clientKnowledge.contactEmail, filters.contactEmail));
    }
    if (filters.confidence) {
      conditions.push(eq(clientKnowledge.confidence, filters.confidence));
    }

    const rows = await db
      .select()
      .from(clientKnowledge)
      .where(and(...conditions))
      .orderBy(
        asc(clientKnowledge.category),
        asc(clientKnowledge.division),
        desc(clientKnowledge.createdAt)
      );

    return NextResponse.json({ knowledge: rows, total: rows.length });
  } catch (error) {
    console.error("[Client Knowledge GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client knowledge" },
      { status: 500 }
    );
  }
}

// ─── POST — Add a knowledge entry ───────────────────────────────────────
// RELEVANCE RULE (Thomas): every entry must pass the test
// "Does this info change the way we handle the next project for this client?"
// The optional `relevanceCheck` field lets the PM document why.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit("client-knowledge-create", 30, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { id: clientId } = await params;

    // Validate client exists
    const [client] = await db
      .select({ id: clients.id, primaryContactName: clients.primaryContactName })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = CreateKnowledgeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for active duplicate (same client + division + contact + category + text)
    const duplicateConditions: SQL[] = [
      eq(clientKnowledge.clientId, clientId),
      eq(clientKnowledge.category, data.category),
      eq(clientKnowledge.knowledgeText, data.knowledgeText),
      eq(clientKnowledge.isActive, true),
    ];

    if (data.division) {
      duplicateConditions.push(eq(clientKnowledge.division, data.division));
    } else {
      duplicateConditions.push(isNull(clientKnowledge.division));
    }

    if (data.contactEmail) {
      duplicateConditions.push(
        eq(clientKnowledge.contactEmail, data.contactEmail)
      );
    } else {
      duplicateConditions.push(isNull(clientKnowledge.contactEmail));
    }

    const [existing] = await db
      .select({ id: clientKnowledge.id })
      .from(clientKnowledge)
      .where(and(...duplicateConditions))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          error: "Duplicate active knowledge entry already exists",
          existingId: existing.id,
        },
        { status: 409 }
      );
    }

    // If contactEmail provided but no contactName, attempt to resolve from client record
    let resolvedContactName = data.contactName;
    if (data.contactEmail && !data.contactName && client.primaryContactName) {
      // Simple heuristic: if the email matches the client's primary contact, use their name
      const [existingContact] = await db
        .select({ contactName: clientKnowledge.contactName })
        .from(clientKnowledge)
        .where(
          and(
            eq(clientKnowledge.contactEmail, data.contactEmail),
            sql`${clientKnowledge.contactName} IS NOT NULL`
          )
        )
        .limit(1);

      if (existingContact?.contactName) {
        resolvedContactName = existingContact.contactName;
      }
    }

    const [created] = await db
      .insert(clientKnowledge)
      .values({
        clientId,
        division: data.division ?? null,
        contactName: resolvedContactName ?? null,
        contactEmail: data.contactEmail ?? null,
        category: data.category,
        knowledgeText: data.knowledgeText,
        source: data.source,
        confidence: data.confidence,
      })
      .returning();

    return NextResponse.json({ knowledge: created }, { status: 201 });
  } catch (error) {
    console.error("[Client Knowledge POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create client knowledge" },
      { status: 500 }
    );
  }
}

// ─── PATCH — Update or deactivate a knowledge entry ─────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    // The knowledgeId comes from the request body or a query param
    const url = new URL(request.url);
    const knowledgeId = url.searchParams.get("knowledgeId");

    if (!knowledgeId) {
      return NextResponse.json(
        { error: "knowledgeId query parameter is required" },
        { status: 400 }
      );
    }

    // Validate client exists
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

    // Validate knowledge exists
    const [existing] = await db
      .select()
      .from(clientKnowledge)
      .where(eq(clientKnowledge.id, knowledgeId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Knowledge entry not found" },
        { status: 404 }
      );
    }

    // Ensure the knowledge belongs to this client
    if (existing.clientId !== clientId) {
      return NextResponse.json(
        { error: "Knowledge entry does not belong to this client" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = PatchKnowledgeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const [updated] = await db
      .update(clientKnowledge)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(clientKnowledge.id, knowledgeId))
      .returning();

    return NextResponse.json({ knowledge: updated });
  } catch (error) {
    console.error("[Client Knowledge PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update client knowledge" },
      { status: 500 }
    );
  }
}
