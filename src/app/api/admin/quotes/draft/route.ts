import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Validation ─────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const saveDraftSchema = z.object({
  /** If provided, update existing draft. Otherwise create new. */
  draftId: z.string().uuid().optional(),
  clientName: z.string().min(1, "Client name is required"),
  contactName: z.string().optional().default(""),
  projectName: z.string().min(1, "Project name is required"),
  description: z.string().optional().default(""),
  scope: z.string().optional().default(""),
  items: z.array(lineItemSchema).default([]),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  vatRate: z.number().min(0).max(100).nullable().default(null),
  validUntil: z.string().optional(),
  language: z.enum(["en", "fr"]).default("en"),
  paymentTermsDays: z.number().min(0).max(365).default(45),
});

// ─── Quote Number Generator ─────────────────────────────────────────────────

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SAR-${year}-`;

  const result = await db.execute(
    sql`SELECT "quote_number" FROM "quotes" WHERE "quote_number" LIKE ${prefix + "%"} ORDER BY "quote_number" DESC LIMIT 1`
  );

  const rows = result as unknown as Array<{ quote_number: string }>;
  let nextSeq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].quote_number;
    const seq = parseInt(lastNum.split("-").pop() ?? "0", 10);
    nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// ─── POST /api/admin/quotes/draft — Save or update a quote draft ────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = saveDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const totalAmount = data.items.reduce((sum, item) => sum + item.total, 0);

    // If updating an existing draft
    if (data.draftId) {
      const [existing] = await db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.id, data.draftId),
            eq(quotes.status, "draft")
          )
        )
        .limit(1);

      if (!existing) {
        return NextResponse.json(
          { error: "Draft not found or already finalized" },
          { status: 404 }
        );
      }

      // S-03: non-admin users can only update their own drafts
      if (session.role !== "admin" && existing.createdBy !== session.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await db
        .update(quotes)
        .set({
          clientName: data.clientName,
          projectName: data.projectName,
          items: data.items.length > 0 ? data.items : [],
          total: String(totalAmount),
          currency: data.currency,
          purposeOfWork: data.description || null,
          lang: data.language.toUpperCase() as "EN" | "FR",
          paymentTermsDays: data.paymentTermsDays,
        })
        .where(eq(quotes.id, data.draftId));

      return NextResponse.json({
        success: true,
        draftId: data.draftId,
        quoteNumber: existing.quoteNumber,
        isNew: false,
      });
    }

    // Create a new draft
    const quoteNumber = await generateQuoteNumber();

    const [savedDraft] = await db
      .insert(quotes)
      .values({
        quoteNumber,
        clientName: data.clientName,
        projectName: data.projectName,
        items: data.items.length > 0 ? data.items : [],
        total: String(totalAmount),
        currency: data.currency,
        status: "draft",
        purposeOfWork: data.description || null,
        lang: data.language.toUpperCase() as "EN" | "FR",
        paymentTermsDays: data.paymentTermsDays,
        createdBy: session.userId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      draftId: savedDraft.id,
      quoteNumber,
      isNew: true,
    });
  } catch (error) {
    console.error("[Quotes Draft] Save failed:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}
