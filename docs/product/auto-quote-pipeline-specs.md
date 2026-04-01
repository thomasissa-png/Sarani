# Auto-Quote Pipeline — Specs
*Produced by @product-manager — 2026-04-01*
*Follows: docs/product/auto-brief-pipeline-specs.md (Steps 1–3)*

---

## 1. Flow Overview

Steps 1–3 (email → brief → project creation) are defined in `docs/product/auto-brief-pipeline-specs.md`.
This document specifies Steps 4–6 only.

```
[Step 3 complete: ClickUp task + SharePoint folder + tracker row created]
        ↓
[Step 4] Arya analyses brief → extracts line items → maps to pricing grid
        ↓
        → INSERT quotes row (status: draft, pdfUrl: null)
        → INSERT inbox item (type: auto_quote_ready, payload: quoteId)
        ↓
[Step 5] PM opens inbox → reviews/edits quote → clicks "Generate PDF & Send"
        ↓
[Step 6] Generate PDF → upload SharePoint → create Outlook draft → post ClickUp comment → update tracker
```

Trigger: `POST /api/admin/inbox/auto-quote` called by the auto-brief pipeline after step 3 succeeds.
Fallback: if step 4 fails (LLM error, pricing gap), inbox item is created with `type: auto_quote_failed`
and PM is prompted to build the quote manually.

---

## 2. LLM Prompt — Deliverable Extraction + Price Estimation

**Model:** GPT-4o (existing ia layer). Temperature: 0. Max tokens: 800.

```
System:
You are Arya, back-office assistant for Sarani, a creative agency.
Your task: analyse a project brief and produce a structured quote draft.
Output ONLY valid JSON. No prose, no markdown, no explanation outside the JSON.
Language for all text fields: {{lang}} (FR or EN, match the brief language).

Pricing reference (use these unit prices — do not invent others):
{{pricingGrid}}   ← injected at runtime from docs/product/pricing-strategy.md parsed section

Rules:
- Map each deliverable to the closest pricing category. If no match, set unitPrice: null.
- quantity must be an integer >= 1.
- purposeOfWork MUST be exactly 2 sentences: sentence 1 = what the client is trying to achieve
  (their business goal), sentence 2 = how Sarani's deliverables serve that goal specifically.
  Never copy the project title verbatim. Never write a single generic sentence.
- paymentTermsDays: use {{clientPaymentTerms}} if available, else 30.
- If a deliverable cannot be priced with confidence (unitPrice: null), set estimationConfidence: "low".

User:
Client: {{clientName}}
Project: {{projectName}}
Brief: {{briefText}}

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
}
```

Runtime injection values:
- `{{lang}}`: derived from `clients.primaryLanguage` (FR → "FR", else "EN")
- `{{clientPaymentTerms}}`: `clients.paymentTermsDays` (DB field, default 45 per schema — override to 30 if null)
- `{{pricingGrid}}`: flat text of unit prices parsed from `docs/product/pricing-strategy.md`
- `{{briefText}}`: the brief generated in step 2 of the auto-brief pipeline

---

## 3. User Stories

**US-AQ1 — Auto-generate quote after project creation**
GIVEN a project has been created in ClickUp + SharePoint (step 3 complete)
WHEN the auto-brief pipeline calls `POST /api/admin/inbox/auto-quote`
THEN Arya calls the LLM, inserts a `quotes` row (status: draft), and creates an inbox item
  `{ type: "auto_quote_ready", quoteId, clientName, projectName, total, estimationConfidence }`
  within 30 seconds; if LLM fails, inbox item type is `auto_quote_failed` with error detail.

**US-AQ2 — PM reviews and edits the draft quote**
GIVEN an inbox item of type `auto_quote_ready` exists
WHEN the PM opens it in the inbox
THEN the UI shows the quote card (see §4) with editable line items, purposeOfWork field,
  paymentTermsDays, and a warning banner if `estimationConfidence === "low"`;
  PM can add/remove/edit any line before validating.

**US-AQ3 — PM validates: generate PDF and send**
GIVEN the PM has reviewed the quote and clicks "Generate PDF & Send"
WHEN the system processes the request
THEN: PDF generated → uploaded to SharePoint `/Clients/[Client]/[Project]/Quote_[YYYY-MM-DD].pdf`
  → `quotes.pdfUrl` updated → Outlook draft created with PDF attachment → ClickUp comment posted
  → tracker Excel updated (quote status column) → inbox item dismissed automatically.

**US-AQ4 — PM dismisses without sending**
GIVEN an inbox item of type `auto_quote_ready` exists
WHEN the PM clicks "Dismiss"
THEN the inbox item is marked dismissed, the draft `quotes` row is soft-deleted (status: dismissed),
  no PDF is generated, no email is created; action is logged in sync_logs.

---

## 4. Inbox Item Wireframe — auto_quote_ready

```
┌─────────────────────────────────────────────────────────────┐
│  [!] Auto-quote ready — Sony Music / Campagne Été 2026      │
│  Confidence: HIGH  ·  Language: FR  ·  3 line items         │
├─────────────────────────────────────────────────────────────┤
│  Purpose of Work                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Sony Music cherche à lancer sa campagne été 2026 avec │  │
│  │ un territoire visuel fort sur les réseaux sociaux.    │  │
│  │ Sarani livrera 12 visuels statiques et 3 motion       │  │
│  │ graphics pour alimenter les 6 semaines de diffusion.  │  │
│  └───────────────────────────────────────────────────────┘  │
│  [edit pencil]                                              │
├──────────────────────┬──────────┬────────────┬─────────────┤
│  Deliverable         │  Qty     │  Unit (€)  │  Total (€)  │
├──────────────────────┼──────────┼────────────┼─────────────┤
│  Visual statique     │  12  [+][-] │  350    │  4 200      │
│  Motion graphic 15s  │   3  [+][-] │  900    │  2 700      │
│  Direction artistique│   1  [+][-] │  1 200  │  1 200      │
│  [+ Add line]        │            │            │             │
├──────────────────────┴──────────┴────────────┼─────────────┤
│  Payment terms: 45 days  [edit]              │  TOTAL      │
│  Currency: EUR                               │  8 100 €    │
├──────────────────────────────────────────────┴─────────────┤
│  [Generate PDF & Send]                [Dismiss]            │
└─────────────────────────────────────────────────────────────┘

LOW CONFIDENCE banner (shown when estimationConfidence === "low"):
┌─────────────────────────────────────────────────────────────┐
│  ⚠ Arya could not price the following items:               │
│  · "Custom illustrated map" — no matching pricing category  │
│  Add unit prices manually before generating the PDF.        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Step 6 — API Call Sequence

All calls are sequential (each depends on the prior result). Executed server-side
in `POST /api/admin/quotes/[id]/finalize`.

```
1. GET /api/admin/quotes/[id]
   → validate status === "draft", items have no null unitPrice

2. POST /api/admin/quotes/[id]/pdf   (calls proposal-html.ts template)
   → returns pdfBuffer (Buffer)
   ← on error → return 500, do not proceed

3. SharePoint.uploadFile(
     path: `/Clients/${clientName}/${projectName}/Quote_${date}.pdf`,
     buffer: pdfBuffer
   )
   → returns sharePointUrl
   ← on error → return 500, PDF not uploaded

4. db.update(quotes).set({ pdfUrl: sharePointUrl, status: "sent" }).where(id)

5. Outlook.createDraft({
     to: clients.primaryContactEmail,
     subject: `[${lang === "FR" ? "Devis" : "Quote"}] ${projectName} — Sarani`,
     body: purposeOfWork + standard footer (FR or EN per lang),
     attachments: [{ name: `Quote_${date}.pdf`, buffer: pdfBuffer }]
   })
   → returns draftId
   ← on error → log warning, continue (draft failure is non-blocking)

6. ClickUp.addComment(
     taskId: clickupTaskId,
     text: `Quote sent — ${total} EUR`
   )
   ← on error → log warning, continue

7. SharePoint.updateTrackerRow(
     client: clientName,
     project: projectName,
     updates: { quoteStatus: "Sent", quoteDate: date, quoteAmount: total }
   )
   ← on error → log warning, continue

8. db.update(inboxItems).set({ status: "dismissed" }).where(quoteId)
```

Steps 5–7 are non-blocking: failure logs to `sync_logs` but does not roll back the PDF upload.
Step 3 failure is blocking: no DB update, no email, PM sees an error toast.

---

## 6. Edge Cases

| Scenario | Detection | Behaviour |
|---|---|---|
| Brief too vague to extract line items | LLM returns `items: []` or all `unitPrice: null` | `estimationConfidence: "low"`, inbox item created with warning banner; PM must fill prices manually before PDF |
| Client has no pricing history / unknown deliverable type | No matching row in pricing grid | `unitPrice: null` for that line; item listed in `unpricedItems`; PM alerted via banner |
| PDF generation failure (proposal-html.ts throws) | Step 2 in §5 returns error | 500 returned to client, inbox item stays open, PM sees error toast "PDF generation failed — retry or contact @fullstack" |
| SharePoint upload failure | Step 3 in §5 returns error | Same as above; PDF is not stored; no DB update |
| LLM timeout (> 30s) | Promise rejects | Inbox item created with `type: auto_quote_failed`; PM prompted to build manually via standard quote form |
| Duplicate finalize click (double-submit) | `quotes.status !== "draft"` at step 1 | Return 409 Conflict; toast "This quote has already been finalized" |
| Client record missing email | `clients.primaryContactEmail` is null | Outlook draft is skipped; inbox item note: "No contact email on file — send manually" |
| Currency not EUR | `quotes.currency !== "EUR"` | Quote created normally; PDF template must render the actual currency symbol (no hardcoded €) |

---

## 7. Handoff @fullstack

**Files to create / modify:**
- `src/app/api/admin/inbox/auto-quote/route.ts` — new endpoint (trigger from auto-brief pipeline step 3)
- `src/app/api/admin/quotes/[id]/finalize/route.ts` — new endpoint (step 6 sequence)
- `src/lib/agents/quote-extractor.ts` — LLM call with the prompt from §2, returns `QuoteDraft` type
- `src/app/(admin)/inbox/components/AutoQuoteCard.tsx` — inbox card UI (wireframe §4)
- `src/lib/db/schema.ts` — add `status` column to `quotes` table: `varchar("status", {length: 20}).default("draft")` + `purposeOfWork: text("purpose_of_work")` + `paymentTermsDays: integer("payment_terms_days")`
- `src/lib/db/schema.ts` — add `lang` column to `quotes`: `varchar("lang", {length: 5}).notNull().default("EN")`

**Dependencies:**
- `proposal-html.ts` is the existing PDF template — no changes needed, just call it
- `createDraft()` Outlook helper already exists — pass `lang` to select FR/EN subject line
- Pricing grid injection: parse `docs/product/pricing-strategy.md` at runtime OR cache as a JSON config file at `src/lib/config/pricing-grid.json` (preferred — avoids fs reads in prod)

**Performance constraint:** LLM call in step 4 must complete within 30s (Vercel function timeout).
Use streaming if needed, or move to a background job (BullMQ / Vercel Cron) if latency is an issue.

**Type to add in schema.ts:**
```ts
export interface QuoteDraft {
  lang: "FR" | "EN";
  purposeOfWork: string;         // exactly 2 sentences
  paymentTermsDays: number;
  estimationConfidence: "high" | "medium" | "low";
  unpricedItems: string[];
  items: QuoteLineItem[];        // QuoteLineItem already defined in schema.ts
}
```
