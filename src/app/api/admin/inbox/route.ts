import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";

// ─── Validation schemas ───────────────────────────────────────────────────

const InboxFiltersSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "dismissed"]).optional(),
  type: z
    .enum(["email_classified", "ai_team_complete", "qa_gates_pass", "followup_alert"])
    .optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const PatchInboxItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "done", "dismissed"]),
  pmId: z.string().optional(),
});

// ─── GET — List inbox items ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  let filters: z.infer<typeof InboxFiltersSchema>;
  try {
    filters = InboxFiltersSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filters", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  try {
    const conditions: SQL[] = [];
    if (filters.status) {
      conditions.push(eq(inboxItems.status, filters.status));
    }
    if (filters.type) {
      conditions.push(eq(inboxItems.type, filters.type));
    }
    if (filters.priority) {
      conditions.push(eq(inboxItems.priority, filters.priority));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select()
      .from(inboxItems)
      .where(whereClause)
      .orderBy(desc(inboxItems.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error("[Inbox API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inbox items" }, { status: 500 });
  }
}

// ─── PATCH — Update inbox item status ─────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof PatchInboxItemSchema>;
  try {
    const rawBody = await request.json();
    body = PatchInboxItemSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const processedAt =
      body.status === "done" || body.status === "dismissed" ? new Date() : null;

    const [updated] = await db
      .update(inboxItems)
      .set({
        status: body.status,
        pmId: body.pmId,
        processedAt,
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("[Inbox API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update inbox item" }, { status: 500 });
  }
}
