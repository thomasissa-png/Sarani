// ─── Quote Extractor Prompt ──────────────────────────────────────────────
// Used by the auto-quote pipeline (Step 4) to extract deliverables and
// estimate pricing from a project brief.
// Model: Haiku (fast, cheap, sufficient for structured extraction).

import { z } from "zod";

// ─── Output Schema ─────────────────────────────────────────────────────────

export const QuoteLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nullable(),
  total: z.number().nullable(),
});

export const QuoteDraftSchema = z.object({
  lang: z.enum(["FR", "EN"]),
  purposeOfWork: z.string(),
  paymentTermsDays: z.number().int().min(1),
  estimationConfidence: z.enum(["high", "medium", "low"]),
  unpricedItems: z.array(z.string()),
  items: z.array(QuoteLineItemSchema),
});

export type QuoteDraft = z.infer<typeof QuoteDraftSchema>;
export type QuoteDraftLineItem = z.infer<typeof QuoteLineItemSchema>;

// ─── Pricing Grid ─────────────────────────────────────────────────────────
// Source of truth: docs/product/pricing-strategy.md + Excel pricing sheet.
// Hardcoded here as a flat text for LLM injection (avoids fs reads in prod).

export const PRICING_GRID = `
Static Banner (1 master): 150 EUR
Banner Adaptation (per additional size): 35 EUR
Presentation Slide: 30 EUR
Print Page (brochure, flyer): 100 EUR
Basic Video Edit: 85 EUR
Social Media Video 30s: 360 EUR
Motion Graphic 15s: 900 EUR
Sizzle / Recap Video: 900 EUR
Landing Page (design + dev): 650 EUR
Translation (per word): 0.12 EUR
Copywriting (per word): 0.25 EUR
Art Direction / Creative Direction (per project): 1200 EUR
Social Ads Management: 8% of ad spend
3D Video: 5000 EUR (minimum)
Production Day Package: 2000 EUR (minimum)
Social Network Management: 2500 EUR/month
Part-Time CMO: 1000 EUR/day
Icons / Buttons: 15 EUR each
`.trim();

// ─── System Prompt ─────────────────────────────────────────────────────────

export function buildQuoteExtractorSystemPrompt(pricingGrid: string): string {
  return `You are Arya, back-office assistant for Sarani, a creative agency.
Your task: analyse a project brief and produce a structured quote draft.
Output ONLY valid JSON. No prose, no markdown, no explanation outside the JSON.
Language for all text fields: match the brief language (FR or EN).

Pricing reference (use these unit prices — do not invent others):
${pricingGrid}

Rules:
- Map each deliverable to the closest pricing category. If no match, set unitPrice: null.
- quantity must be an integer >= 1.
- purposeOfWork MUST be exactly 2 sentences: sentence 1 = what the client is trying to achieve (their business goal), sentence 2 = how Sarani's deliverables serve that goal specifically. Never copy the project title verbatim. Never write a single generic sentence.
- paymentTermsDays: use the value provided if available, else 30.
- If a deliverable cannot be priced with confidence (unitPrice: null), set estimationConfidence: "low".
- total for each item = quantity * unitPrice (or null if unitPrice is null).

Output schema:
{
  "lang": "FR" | "EN",
  "purposeOfWork": "<sentence 1>. <sentence 2>.",
  "paymentTermsDays": <integer>,
  "estimationConfidence": "high" | "medium" | "low",
  "unpricedItems": ["<item description>", ...],
  "items": [
    { "description": "<deliverable label in lang>", "quantity": <n>, "unitPrice": <number|null>, "total": <number|null> }
  ]
}`;
}

// ─── User Message Builder ──────────────────────────────────────────────────

export function buildQuoteExtractorUserMessage(params: {
  clientName: string;
  projectName: string;
  briefText: string;
  paymentTermsDays: number;
}): string {
  return `Client: ${params.clientName}
Project: ${params.projectName}
Payment terms: ${params.paymentTermsDays} days
Brief:
${params.briefText}`;
}
