import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { quotes, inboxItems, clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaudeJSON } from "@/lib/ai/claude";
import {
  buildQuoteExtractorSystemPrompt,
  buildQuoteExtractorUserMessage,
  QuoteDraftSchema,
  PRICING_GRID,
  type QuoteDraft,
} from "@/lib/ai/prompts/quote-extractor";
import { logSync } from "@/lib/integrations/cache";

// ─── Validation ─────────────────────────────────────────────────────────────

const AutoQuoteRequestSchema = z.object({
  clientName: z.string().min(1),
  projectName: z.string().min(1),
  briefText: z.string().min(1),
  contactEmail: z.string().email(),
  clickupTaskId: z.string().optional(),
  clickupSpaceId: z.string().optional(),
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

// ─── POST /api/admin/inbox/auto-quote ───────────────────────────────────────
// Step 4 of the auto-quote pipeline: LLM extracts deliverables, estimates
// pricing, inserts a draft quote row, and creates an inbox item.

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof AutoQuoteRequestSchema>;
  try {
    const rawBody: unknown = await request.json();
    body = AutoQuoteRequestSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Resolve client language and payment terms from DB
  let clientLang: "FR" | "EN" = "EN";
  let paymentTermsDays = 30;
  try {
    const [clientRecord] = await db
      .select({
        primaryLanguage: clients.primaryLanguage,
        paymentTermsDays: clients.paymentTermsDays,
      })
      .from(clients)
      .where(eq(clients.name, body.clientName))
      .limit(1);

    if (clientRecord) {
      clientLang = clientRecord.primaryLanguage === "FR" ? "FR" : "EN";
      paymentTermsDays = clientRecord.paymentTermsDays ?? 30;
    }
  } catch {
    // Non-critical — use defaults
  }

  // ─── Call LLM for quote extraction ──────────────────────────────────────

  let quoteDraft: QuoteDraft;
  try {
    const systemPrompt = buildQuoteExtractorSystemPrompt(PRICING_GRID);
    const userMessage = buildQuoteExtractorUserMessage({
      clientName: body.clientName,
      projectName: body.projectName,
      briefText: body.briefText,
      paymentTermsDays,
    });

    const { data } = await callClaudeJSON<QuoteDraft>({
      systemPrompt,
      userMessage,
      model: "claude-3-5-haiku-20241022",
      maxTokens: 800,
      timeout: 30_000,
    });

    // Validate output with Zod
    quoteDraft = QuoteDraftSchema.parse(data);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown LLM error";
    console.error("[Auto-Quote] LLM extraction failed:", errMsg);

    // Create a failed inbox item so PM knows to build quote manually
    try {
      await db.insert(inboxItems).values({
        type: "auto_quote_failed",
        status: "pending",
        title: `Auto-quote failed — ${body.clientName} / ${body.projectName}`,
        summary: JSON.stringify({
          clientName: body.clientName,
          projectName: body.projectName,
          error: errMsg,
          contactEmail: body.contactEmail,
        }),
        sourceType: "auto_quote",
        priority: "medium",
      });
    } catch (inboxErr) {
      console.error("[Auto-Quote] Failed to create failure inbox item:", inboxErr);
    }

    await logSync({
      source: "arya",
      action: "auto_quote_extract",
      status: "error",
      error: errMsg,
      payload: { clientName: body.clientName, projectName: body.projectName },
    });

    return NextResponse.json(
      { error: "LLM extraction failed", detail: errMsg },
      { status: 502 }
    );
  }

  // ─── Insert draft quote row ─────────────────────────────────────────────

  const quoteNumber = await generateQuoteNumber();
  const subtotal = quoteDraft.items.reduce((sum, item) => sum + (item.total ?? 0), 0);

  // Convert items to QuoteLineItem[] format (null unitPrice → 0 for DB storage)
  const quoteItems = quoteDraft.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? 0,
    total: item.total ?? 0,
  }));

  let savedQuote: { id: string };
  try {
    const [row] = await db
      .insert(quotes)
      .values({
        quoteNumber,
        clientName: body.clientName,
        projectName: body.projectName,
        items: quoteItems,
        total: String(subtotal),
        currency: "EUR",
        status: "draft",
        purposeOfWork: quoteDraft.purposeOfWork,
        lang: quoteDraft.lang,
        paymentTermsDays: quoteDraft.paymentTermsDays,
        estimationConfidence: quoteDraft.estimationConfidence,
        unpricedItems: quoteDraft.unpricedItems.length > 0 ? quoteDraft.unpricedItems : null,
        clickupTaskId: body.clickupTaskId ?? null,
        createdBy: session.userId,
      })
      .returning({ id: quotes.id });
    savedQuote = row;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown DB error";
    console.error("[Auto-Quote] DB insert failed:", errMsg);
    return NextResponse.json(
      { error: "Failed to save draft quote", detail: errMsg },
      { status: 500 }
    );
  }

  // ─── Create inbox item for PM review ────────────────────────────────────

  try {
    await db.insert(inboxItems).values({
      type: "auto_quote_ready",
      status: "pending",
      title: `Auto-quote ready — ${body.clientName} / ${body.projectName}`,
      summary: JSON.stringify({
        quoteId: savedQuote.id,
        quoteNumber,
        clientName: body.clientName,
        projectName: body.projectName,
        contactEmail: body.contactEmail,
        total: subtotal,
        itemCount: quoteDraft.items.length,
        estimationConfidence: quoteDraft.estimationConfidence,
        lang: quoteDraft.lang,
        clickupTaskId: body.clickupTaskId ?? null,
      }),
      sourceType: "auto_quote",
      priority: quoteDraft.estimationConfidence === "low" ? "high" : "medium",
    });
  } catch (err) {
    console.error("[Auto-Quote] Failed to create inbox item:", err);
    // Quote is still saved — PM can access it from the quotes list
  }

  await logSync({
    source: "arya",
    action: "auto_quote_extract",
    entityId: savedQuote.id,
    payload: {
      quoteNumber,
      clientName: body.clientName,
      projectName: body.projectName,
      confidence: quoteDraft.estimationConfidence,
      itemCount: quoteDraft.items.length,
      total: subtotal,
    },
  });

  return NextResponse.json({
    success: true,
    quoteId: savedQuote.id,
    quoteNumber,
    estimationConfidence: quoteDraft.estimationConfidence,
    total: subtotal,
  });
}
