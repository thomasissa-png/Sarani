# Phase 3 Workflow Test Report

**Auditor:** @pm (Project Manager Agent)
**Date:** 2026-03-25
**Scope:** Phase 3 integration workflow — Tracker, Project Creation, Quote Generation
**Method:** Static code audit of 11 source files (no runtime testing)

---

## Scenario 1: "Show me all my Sony projects"

**Flow:** `/admin/tracker` -> `GET /api/admin/integrations/tracker` -> merge(Excel + ClickUp + Evoliz)

### What works

| Capability | Status | Evidence |
|---|---|---|
| **Client filter dropdown** | OK | `tracker/page.tsx` L89, L126-130: dynamically extracts unique client names from project data, renders as `<select>` with "All Clients" default |
| **Project status filter** | OK | L27: `["All", "Open", "in progress", "review", "Closed"]` matches real ClickUp statuses from `config.ts` L36-65 |
| **Invoice status filter** | OK | L28: `["All", "Open PO", "Invoiced", "Paid", "Overdue"]` covers Evoliz mappings in `tracker-merge.ts` L16-29 |
| **Full-text search** | OK | L133-143: searches across project name, client name, contact, PO number (case-insensitive) |
| **Financial data (amounts)** | OK | L163-176: computes `totalValue`, `open`, `overdue` stats. `formatCurrency()` handles EUR/USD/GBP |
| **SharePoint links** | OK | L439-449: renders clickable SharePoint icon if `p.sharepointLink` exists. Link comes from Excel column "link" via `excel-parser.ts` |
| **ClickUp links** | OK | L450-459: renders external link icon if `p.clickupTaskUrl` exists. URL comes from ClickUp task merge in `tracker-merge.ts` L111 |
| **3-source parallel fetch** | OK | `tracker/route.ts` L241-245: `Promise.all([fetchClickUpTasks(), fetchExcelTrackers(), fetchEvolizInvoices()])` |
| **Role-based data stripping** | OK | `tracker/route.ts` L256-263: non-admin users get `totalValue: null`, `invoiceStatus: ""` |
| **Mobile responsive** | OK | L474-553: dedicated mobile card layout with all key fields |

### What is missing or weak

| Gap | Severity | Detail |
|---|---|---|
| **No column sorting** | Medium | Table headers are static `<Th>` components (L560-566) — no `onClick` sort handler. A PM managing 100+ Sony projects cannot sort by date, value, or status. |
| **No pagination** | Medium | All projects are rendered in a single list. With 9 tracker files x ~50-200 rows each, this could mean 500-1000+ DOM rows. |
| **No "Sony only" deep link** | Low | Cannot share a URL like `/admin/tracker?client=Sony`. Filters are local state only (L89). |
| **No date filter** | Medium | No way to filter by project date (e.g., "last 30 days", "Q1 2026"). The `date` field exists in `ExcelProject` but is not filterable. |
| **No export to CSV/Excel** | Low | PM cannot extract filtered data for client reporting. |

### Score: 7/10

Strong foundation. The 3-source merge with cache fallback is production-grade. Filters cover the key dimensions. Missing sorting and pagination will hurt at scale.

---

## Scenario 2: "Create Holiday Campaign for Sony France"

**Flow:** `/admin/tracker/new` -> `POST /api/admin/integrations/create-project` -> ClickUp + SharePoint + Excel (3 steps)

### What works

| Capability | Status | Evidence |
|---|---|---|
| **Client dropdown from DB** | OK | `new/page.tsx` L58-68: fetches `/api/admin/clients`, renders `<select>` |
| **Division auto-detection** | OK | L70-88, L96-117: fetches ClickUp spaces, matches by client name, populates division dropdown from ClickUp lists. Auto-selects if only 1 division. |
| **ClickUp task creation** | OK | `create-project/route.ts` L146-202: creates task in correct list (by division name or first list). Includes client/contact/category/division/value in description. |
| **Duplicate detection** | OK | `create-project/route.ts` L157-165 (R-04): checks for existing task with same name before creating. Returns existing task instead of duplicating. |
| **SharePoint YYYYMMDD folder** | OK | `create-project/route.ts` L227-232: `datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "")` + truncation at 80 chars. |
| **Division subfolder** | OK | L217-224: creates division subfolder under customer path if specified. Handles "already exists" gracefully. |
| **409 conflict handling** | OK | L241-256 (E-04): if folder already exists, fetches existing folder URL instead of failing. |
| **Excel row append** | OK | L286-373: reads used range, calculates next row, dynamically detects column positions via `COL_MAP`, writes new row. |
| **Advisory lock for Excel** | OK | L289-293 (E-03): `acquireAdvisoryLock` prevents race conditions on concurrent writes. 30s TTL auto-release. |
| **Excel file lock (423)** | OK | L376-379 (R-03): human-friendly error message when another user has the Excel file open. |
| **Cross-link ClickUp <-> SharePoint** | OK | L394-421 (Step 4): updates ClickUp task custom field "Folder" with SharePoint folder URL. Non-critical — does not fail the overall operation. |
| **Partial failure handling (207)** | OK | L423-428: returns HTTP 207 Multi-Status when some steps succeed and others fail. |
| **Retry failed steps** | OK | `new/page.tsx` L157-206 (E-09): sends `previousResults` to skip already-completed steps. Client-side merges results. |
| **Zod validation** | OK | `create-project/route.ts` L51-64: validates all fields, returns structured error on invalid input. |
| **Admin-only access** | OK | L100-102: checks `session.role !== "admin"` returns 403. |

### What is missing or weak

| Gap | Severity | Detail |
|---|---|---|
| **No "Sony France" concept** | Medium | The division dropdown maps to ClickUp Lists within the Sony Space, but the UI label says "Division" and is auto-detected. If Sony has Lists named "Sony France", "Sony DACH", etc., it works. But there's no explicit country/market field — it depends entirely on ClickUp list naming. |
| **Category is free text** | Low | `new/page.tsx` L285-292: category is a plain `<input>` with no suggestions or validation. No dropdown tied to ClickUp custom fields. Inconsistent categorization risk. |
| **No confirmation modal** | Low | "Create Project" button fires immediately on click (L119). No "Are you sure?" for a 3-system write operation. |
| **Contact not from client DB** | Low | Contact name is free text (L273-278). No autocomplete from client's known contacts. |
| **No link back to created project in tracker** | Low | After success, there is a "Create another project" button but no "View in Tracker" link. |

### Score: 8.5/10

This is the strongest workflow. Excellent resilience: duplicate detection, 409 handling, advisory locks, partial retry, 207 Multi-Status. The YYYYMMDD folder convention and cross-linking between ClickUp and SharePoint match real PM workflows perfectly. Minor UX gaps (no confirmation modal, free-text category).

---

## Scenario 3: "TikTok quote — 80 videos at $120 each"

**Flow:** `/admin/quotes` -> `POST /api/admin/quotes/generate` -> PDF generation + SharePoint upload + DB save

### What works

| Capability | Status | Evidence |
|---|---|---|
| **Line items with live totals** | OK | `quotes/page.tsx` L114-125: auto-calculates `total = quantity * unitPrice` on change. Grand total at L134. |
| **Multi-currency** | OK | L271-279: EUR/USD/GBP dropdown. Passed to PDF generation and DB. |
| **Full form validation** | OK | L142-150: checks all required fields (client, contact, project, description, scope) + at least 1 line item with description. |
| **Server-side Zod validation** | OK | `quotes/generate/route.ts` L13-28: validates every field including positive quantity and non-negative prices. |
| **PDF generation + download** | OK | `quotes/page.tsx` L179-188: receives blob response, creates download link, triggers browser download. |
| **SharePoint upload** | OK | `quotes/generate/route.ts` L80-114: uploads to `/Documents/00. Administrative/01_Quotes/{Client}_{Project}_{Date}.pdf`. Non-blocking — quote is saved even if upload fails. |
| **DB persistence** | OK | L117-128: saves to `quotes` table with all metadata. Returns quote ID in `X-Quote-Id` header. |
| **SharePoint URL feedback** | OK | `quotes/page.tsx` L190-195: reads `X-SharePoint-Url` header to show success message. |
| **Past quotes list** | OK | L515-644: table/card view of previous quotes with client filter, PDF link to SharePoint. |
| **Add/remove line items** | OK | L127-131: dynamic add/remove with minimum 1 item enforcement. |
| **Admin-only access** | OK | `quotes/generate/route.ts` L39-41: checks admin role. |
| **Loading states** | OK | L489-493: indeterminate progress bar during generation. Spinner on button. |

### What is missing or weak

| Gap | Severity | Detail |
|---|---|---|
| **No quote number / reference** | High | The PDF filename is `quote_{projectName}.pdf` on download (L184) but `quote_{savedQuote.id}.pdf` in Content-Disposition (route.ts L135). No human-readable quote number (e.g., SAR-Q-2026-0042). The `id` from the DB is a UUID — not client-friendly. |
| **No quote preview before PDF** | Medium | PM clicks "Generate PDF" and it immediately downloads. No preview step. For a $9,600 quote (80 x $120), you want to proofread before sending to TikTok. |
| **No link to existing project** | Medium | Quote is standalone — no dropdown to link it to a tracker project. No PO number field. The quote lives in `/01_Quotes/` but has no relationship to the project folder created in Scenario 2. |
| **No terms & conditions / validity** | Medium | No field for payment terms, quote validity period, or T&Cs. Professional quotes for enterprise clients (TikTok, Sony) typically require these. |
| **No tax handling** | Medium | No VAT/tax field. For EU clients, this is a legal requirement on formal quotes. |
| **No duplicate quote detection** | Low | Can generate multiple quotes for the same project. No warning. |
| **No edit/revision of past quotes** | Low | Past quotes are read-only (L571-603). Cannot revise and re-issue. |
| **Upload path mismatch** | Low | Quote PDF goes to `SHAREPOINT_TRACKERS_DRIVE_ID` (the OneDrive for Business) at `/Documents/00. Administrative/01_Quotes/`. But project folders go to `SHAREPOINT_ASSETS_DRIVE_ID` (SaraniAssets). The quote is not co-located with the project folder. |

### Score: 6/10

The technical flow works (PDF gen, upload, DB save). But from a PM perspective, this is a v0.5 quote tool. Enterprise clients like TikTok expect a quote number, payment terms, validity period, and tax information. No preview before sending is risky for a tool handling five-figure quotes. The lack of a link between quotes and projects means the PM has to manually track which quote belongs to which project.

---

## Scenario 4: "ClickUp is down -- what happens?"

**What a PM expects:** The tracker still loads with reasonably recent data. The PM sees a clear indicator that data may be stale. If ClickUp is down during project creation, the system handles it gracefully and lets me retry just the failed step.

### What the code actually delivers

| Capability | Verdict | Evidence |
|---|---|---|
| **Cache-through pattern** | YES | `cache.ts` L167-225: `fetchWithCache()` -- (1) return fresh cache if under TTL, (2) try live fetch, (3) on failure fall back to stale cache, (4) only throw if no cache exists at all. |
| **Per-source TTLs** | YES | `config.ts` L156-163: ClickUp 5min, Evoliz 5min, SharePoint 15min. Reasonable for operational use. |
| **Stale indicator in UI** | YES | `tracker/page.tsx` L199-202: `isAnyCached` checks if any source has `status === "stale"`. L216-219: renders "(cached X min ago)" text. |
| **Per-source status bar** | YES | L244-260: renders green/yellow/red dot per integration (ClickUp, SharePoint, Evoliz) with status text ("connected", "not configured", "error"). Uses `/api/admin/integrations/status` endpoint. |
| **Graceful degradation on tracker fetch** | YES | `tracker/route.ts` L40-94 (ClickUp), L96-151 (Excel), L176-228 (Evoliz): each fetcher returns `meta.status: "unavailable"` with error message on failure. No exception propagation -- all 3 sources are independent. |
| **Partial data merge** | YES | `tracker-merge.ts` L40-114: if ClickUp returns zero tasks, Excel projects are still returned with empty `clickupStatus` and `clickupTaskUrl`. Same for Evoliz -- falls back to Excel invoice status. |
| **Promise.allSettled for ClickUp tasks** | YES | `tracker/route.ts` L62-71: uses `Promise.allSettled()` for task fetching across lists. Failed lists don't block successful ones. |
| **Sync log on cache fallback** | YES | `cache.ts` L206-211: logs `fetch_fallback_to_cache` with error details when falling back to stale data. |
| **Partial failure on project creation** | YES | `create-project/route.ts` L130-134 + L423-428: each step (ClickUp, SharePoint, Excel) has independent try/catch. Returns 207 Multi-Status with per-step results. |
| **Retry failed steps only** | YES | `new/page.tsx` L157-206: passes `previousResults` containing successful step outputs. API skips completed steps (L141-145, L209-211, L284-285). Client merges new results with previous successes (L196-200). |
| **Error UI with retry button** | YES | `tracker/page.tsx` L344-356: error state shows message + "Retry" button that calls `fetchData()`. |

### Gaps identified

| Gap | Severity | Detail |
|---|---|---|
| **No auto-refresh / polling** | Medium | When data is stale, the PM must manually click "Sync now" (L233-239). No automatic retry on a timer. |
| **Stale indicator is subtle** | Low | The "(cached X min ago)" text (L216-219) is a small `text-neutral-400` span. For critical PM decisions (e.g., "is this project really still Open?"), the staleness warning should be more prominent -- e.g., a yellow banner saying "ClickUp is unreachable. Showing data from 15 minutes ago." |
| **No per-source error detail in UI** | Medium | The status bar shows red dot + "error" but does not show the actual error message from `integration.error`. The PM cannot tell if ClickUp is down globally, or if it's a token expiry, or a rate limit. |
| **Cache TTL not configurable at runtime** | Low | TTLs are compile-time constants in `config.ts`. Cannot adjust without redeployment. |
| **Advisory lock has edge case** | Low | `cache.ts` L104-158: the `acquireAdvisoryLock` uses `onConflictDoNothing` then reads back, but if two processes insert at the exact same millisecond, both could read the same lock entry and both believe they own it. This is a low-probability edge case but worth noting. |

### Score: 8/10

Excellent resilience architecture. The cache-through pattern with stale fallback is exactly what a PM needs -- data might be slightly old but the tool never goes blank. `Promise.allSettled` for ClickUp list fetching and independent try/catch per creation step are defensive programming done right. The retry-failed-steps pattern (E-09) is a standout feature. Loses points for lack of auto-refresh and insufficiently prominent staleness warnings.

---

## Scenario 5: "Client says 'I need a few banners' -- does the AI PM challenge this?"

**What a PM expects:** The PM AI agent should NOT accept vague briefs. It should push back: "How many banners? What sizes? What campaign? What deadline? What brand guidelines?"

### What the code actually delivers

| Capability | Verdict | Evidence |
|---|---|---|
| **PM persona enforces precision** | YES | `pm.ts` L33-35: "If a client asks for 'a few banners', force precision: how many? what sizes? what campaign?" -- explicitly coded into the system prompt. |
| **Vague brief detection** | YES | L34: "If the scope is unclear, do NOT guess -- list what's ambiguous and propose options." |
| **Structured missing info output** | YES | L72-78: `missingInfo` array with `field`, `suggestion`, and `blocking: true/false`. Blocking items prevent task generation. |
| **Client checks** | YES | L66-71: `clientChecks` array validates brand book availability, target language, deadline, asset sizes. |
| **Deadline enforcement** | YES | L30: "A brief without a deadline is incomplete -- ask for one or assume D+1." |
| **Brand guidelines check** | YES | L31: "A design task without brand guidelines reference is a red flag -- check the client's SharePoint folder." |
| **Batch work precision** | YES | L95: "For batch work (e.g., '50 banners'), specify exact quantities, sizes, and variations in the task description." |
| **Agent decomposition** | YES | L37-51: 13 specialist agents available. L79-88: tasks are assigned to specific agents with description, complexity, estimated minutes, dependencies. |
| **JSON-only output** | YES | L61: "You MUST respond with valid JSON matching this exact structure" -- prevents rambling non-actionable responses. |
| **ASAP handling** | YES | L99: "If this is an ASAP request, flag it in every task description and reorder tasks by criticality." |

### Gaps identified

| Gap | Severity | Detail |
|---|---|---|
| **No client history lookup** | High | The PM prompt says "Cross-reference with client context: brand book available? Past similar projects?" (L54) but there is no tool/function to actually retrieve client history from the DB or SharePoint. The AI will hallucinate or skip this check. |
| **No budget/pricing intelligence** | Medium | The PM cannot check if "$120/video x 80" matches TikTok's typical rates or Sarani's pricing model. No access to past quotes or financial data. |
| **No integration with tracker** | Medium | The PM agent cannot see what projects are currently active for a client. If Sony already has a "Holiday Campaign" in progress, the PM cannot detect the conflict. |
| **Agent list is hardcoded in prompt** | Low | `pm.ts` L37-51 lists 13 agents. If a new agent is added to the platform, the PM prompt must be manually updated. |
| **No feedback loop** | Medium | After the PM challenges a vague brief and the user provides clarification, there is no mechanism to update/re-run the analysis incrementally. |
| **"a few banners" is in the prompt but not tested** | Low | The prompt instructs the PM to challenge vague briefs, but there is no guardrail (e.g., regex check or keyword detection) that forces the behavior. It relies entirely on the LLM following instructions, which is probabilistic. |

### Score: 7/10

The PM system prompt is one of the best I have audited. It captures the real personality and standards of a senior PM at a top agency. The "force precision" rule, the structured JSON output, and the blocking `missingInfo` pattern are all strong. But the prompt makes promises the system cannot keep -- it references "checking SharePoint" and "past projects" without any tool access. The AI PM is smart but blind to operational data.

---

## Scenario 6: Global Assessment

### Score Summary

| # | Scenario | Score | Category |
|---|---|---|---|
| 1 | View Sony projects (Tracker) | 7/10 | Read |
| 2 | Create Holiday Campaign (Project Creation) | 8.5/10 | Write |
| 3 | TikTok quote (Quote Generation) | 6/10 | Write |
| 4 | ClickUp down (Resilience) | 8/10 | Infrastructure |
| 5 | Vague brief challenge (AI PM) | 7/10 | Intelligence |

### Global Score: 7.5/10

### What is already production-grade

1. **3-source merge architecture** -- Excel as source of truth, ClickUp for live status, Evoliz for invoicing. Parallel fetch, independent failure handling, cache-through with stale fallback. This is how enterprise integrations should work.

2. **Project creation atomicity** -- The 3-system write (ClickUp + SharePoint + Excel) with duplicate detection, advisory locks, 409 conflict handling, 423 lock detection, 207 Multi-Status, and client-side retry of failed steps is genuinely impressive. This handles the real-world chaos of distributed systems.

3. **Dynamic Excel column detection** -- Using `COL_MAP` with multiple header aliases (English/French, abbreviations) means the system survives tracker file reformatting without code changes. This is a pain point I have seen break integrations at every agency.

4. **Security model** -- Auth checks on every route, admin-only write operations, financial data stripping for non-admin roles. Clean and consistent.

5. **PM AI prompt** -- The persona, the precision-forcing rules, the structured JSON output with blocking `missingInfo` -- this is a high-quality system prompt.

### What is needed for 10/10

| Priority | Gap | Impact | Effort |
|---|---|---|---|
| **P0** | Table sorting (by client, status, value, date) | PM cannot prioritize work without sorting | Small (add `useMemo` sort state + clickable headers) |
| **P0** | Pagination or virtualization on tracker | Performance cliff at 500+ projects | Medium |
| **P0** | Quote numbering system (SAR-Q-YYYY-NNNN) | Enterprise clients require numbered quotes for PO matching | Small (DB sequence + format helper) |
| **P1** | Quote preview before download | Risk of sending wrong numbers on five-figure quotes | Medium (render PDF in iframe/modal) |
| **P1** | Quote tax/discount/payment terms fields | Legal requirement in EU (VAT) and client expectation | Medium |
| **P1** | Link quotes to tracker projects | Quotes are orphaned from the project they relate to | Small (add projectId FK) |
| **P1** | URL-based filters on tracker (`?client=Sony`) | Cannot share filtered views or bookmark them | Small (sync state to URL params) |
| **P1** | PM agent access to client data (past projects, quotes, SharePoint) | PM prompt promises context it cannot access | Large (function calling + tool integration) |
| **P2** | Date range filter on tracker | Cannot focus on recent work | Small |
| **P2** | CSV/Excel export from tracker | Client reporting, finance reconciliation | Small |
| **P2** | Auto-refresh when stale data detected | PM should not have to manually click "Sync now" | Small (polling interval) |
| **P2** | PM/Priority custom fields on ClickUp task creation | Missing from the 4 known custom fields (Contact/Folder/PM/Priority) | Small |
| **P2** | Global Overview tracker sync on project creation | `00. Global Overview.xlsx` defined in config but never written to | Medium |
| **P3** | Confirmation modal before project creation | 3-system write with no undo deserves a confirmation step | Small |
| **P3** | Category dropdown (not free text) | Prevents inconsistent categorization across trackers | Small |

### Architecture Observations

- **Config is well-organized.** `config.ts` is the single source of truth for all cross-system mappings. 9 client mappings, each with ClickUp Space ID + Excel filename + SharePoint folder path. Adding a new client is a one-line addition.

- **Separation of concerns is clean.** `excel-parser.ts` (parsing), `tracker-merge.ts` (merging), `cache.ts` (caching), `config.ts` (configuration) are all separate modules with clear responsibilities. The tracker route is a thin orchestrator.

- **The Evoliz integration is complete but underutilized.** Invoice data is fetched and merged into the tracker view, but there is no way to create invoices, mark them as paid, or reconcile POs from the UI.

- **The sidebar correctly positions all three workflows.** `sidebar.tsx` has Dashboard > Quick Brief > Projects > Tracker > Quotes > Clients > Users, followed by agent groups. The navigation hierarchy matches the PM mental model.

- **The dashboard (`page.tsx`) bridges agent outputs and the tracker.** It shows recent outputs, client stats, and a prominent "Project Tracker" CTA. Good entry point that connects the two worlds (AI agents and operational tracking).

### Final Verdict

This is a **solid v1** of a PM operations platform. The architecture is right, the resilience patterns are mature, and the integration mapping is thorough. The main gap is that the read experience (tracker) lacks table-stakes features (sort, paginate) and the quote generator is too bare-bones for enterprise use. The AI PM has a great prompt but no access to operational data.

Fix the P0 items (sorting, pagination, quote numbers) and the score goes to **8.5/10**. Add P1 items (quote preview, tax fields, URL filters, PM data access) and it reaches **9.5/10**.
