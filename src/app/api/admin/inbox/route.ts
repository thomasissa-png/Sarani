import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq, ne, desc, and, SQL } from "drizzle-orm";

// ─── Validation schemas ───────────────────────────────────────────────────

const InboxFiltersSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "dismissed"]).optional(),
  type: z
    .enum(["email_classified", "ai_team_complete", "qa_gates_pass", "followup_alert", "noise"])
    .optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  includeNoise: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const PatchInboxItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "done", "dismissed"]),
  pmId: z.string().optional(),
  // Approval/dismissal metadata — set automatically based on status
  approvedBy: z.string().optional(),
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

    // Exclude noise items by default unless explicitly requested
    if (!filters.includeNoise && filters.type !== "noise") {
      conditions.push(ne(inboxItems.type, "noise"));
    }

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
    const now = new Date();
    const isTerminal = body.status === "done" || body.status === "dismissed";
    const processedAt = isTerminal ? now : null;

    const [updated] = await db
      .update(inboxItems)
      .set({
        status: body.status,
        pmId: body.pmId,
        processedAt,
        updatedAt: now,
      })
      .where(eq(inboxItems.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    // ─── Approval chain logging ─────────────────────────────────────
    // When an item is approved (done) or dismissed, log the action
    // with protocol-specific context for future v2 automation.

    const approvalMeta: Record<string, unknown> = {};

    if (body.status === "done") {
      approvalMeta.approvedAt = now.toISOString();
      approvalMeta.approvedBy = body.approvedBy ?? body.pmId ?? session.userId;

      // Protocol-specific logging for v2 chaining
      if (updated.protocol === "PROTO-EMAIL-INTAKE") {
        // TODO v2: trigger POST /api/admin/integrations/create-project
        // with the structured brief from this inbox item
        console.log(
          `[Inbox API] Approved EMAIL-INTAKE item ${updated.id} — v2: chain to create-project`
        );
      } else if (updated.protocol === "PROTO-CLIENT-REPLY") {
        // TODO v2: trigger POST /api/admin/emails/draft to create
        // the Outlook draft from the approved content
        console.log(
          `[Inbox API] Approved CLIENT-REPLY item ${updated.id} — v2: chain to draft Outlook`
        );
      } else if (updated.protocol === "PROTO-QUOTE") {
        // TODO v2: trigger POST /api/admin/quotes/generate
        // to produce the PDF from the approved quote data
        console.log(
          `[Inbox API] Approved QUOTE item ${updated.id} — v2: chain to quotes/generate`
        );
      }
    } else if (body.status === "dismissed") {
      approvalMeta.dismissedAt = now.toISOString();
      approvalMeta.dismissedBy = body.approvedBy ?? body.pmId ?? session.userId;
    }

    return NextResponse.json({ item: updated, ...approvalMeta });
  } catch (error) {
    console.error("[Inbox API] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update inbox item" }, { status: 500 });
  }
}
