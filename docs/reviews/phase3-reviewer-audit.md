# Phase 3 Integration Audit — Sarani Back-Office
**Reviewer:** @reviewer | **Date:** 2026-03-25 | **Scope:** ClickUp + SharePoint + Evoliz + Tracker + Quotes + Automation

---

## Executive Summary (Non-Technical)

Phase 3 is a solid, well-architected integration layer connecting three external systems (ClickUp, SharePoint/Excel, Evoliz) into a unified project tracker. The code is production-quality in many areas — proper caching, graceful degradation, audit logging, and a clean separation of concerns. However, there are **security gaps in role enforcement** on several read routes, a **missing webhook implementation** that the specs require, and a **column-letter calculation bug** that will silently corrupt Excel writes on trackers with more than 26 columns. These must be fixed before going live with Sony/TikTok data. Overall: strong foundation, needs targeted hardening.

---

## Scoring Summary

| Dimension | Score | Verdict |
|---|---|---|
| 1. Architecture & Coherence | **8/10** | Strong |
| 2. Security | **6/10** | Needs Work |
| 3. Robustness & Graceful Degradation | **8/10** | Strong |
| 4. UX & Workflow | **7/10** | Good |
| 5. Conformity with PM Specs | **7/10** | Good |
| **6. Overall** | **7/10** | **GO with reserves** |

---

## 1. Architecture & Coherence — 8/10

### Strengths

- **Clean module separation.** The integration layer is well-factored: `clickup.ts`, `sharepoint.ts`, `evoliz.ts` are standalone API clients with zero cross-dependencies. Parsing (`excel-parser.ts`), merging (`tracker-merge.ts`), caching (`cache.ts`), and error handling (`error-handler.ts`) are all extracted into focused modules. This is textbook good architecture.

- **Config as single source of truth.** `config.ts` centralizes all client-to-space-to-tracker mappings, cache TTLs, drive IDs, and Excel sheet name candidates. Adding a new client is a single-object addition. The helper functions (`getMappingBySpaceName`, `mapClickUpStatus`, etc.) prevent scattered string matching.

- **Cache-through pattern.** `fetchWithCache()` in `cache.ts` implements a correct stale-while-revalidate strategy: serve fresh cache -> try live fetch -> on failure, serve stale cache -> on no cache, propagate error. This is exactly what the specs require (Section 1, Principle 2-3).

- **Typed response contracts.** `TrackerProject`, `SourceMeta`, and `TrackerResponse` in `types/integrations.ts` are shared between API routes and frontend pages, ensuring type safety across the wire.

- **Parallel data fetching.** The tracker route fetches ClickUp, SharePoint, and Evoliz data via `Promise.all()`, and within each source, uses `Promise.allSettled()` for per-item fetching. This is correct and spec-compliant (US-TRACK-02: "all 3 API sources refreshed in parallel").

### Problems

| ID | Issue | Severity | Detail |
|---|---|---|---|
| A-01 | **Column letter calculation bug** | BLOCKER | `create-project/route.ts` line 322: `String.fromCharCode(64 + numCols)` only works for columns A-Z (1-26). If a tracker has >26 columns (the Sony tracker has columns Q-AX = up to column 50), this produces garbage characters. Need to implement multi-letter column addressing (AA, AB, etc.). |
| A-02 | **Duplicate column mapping logic** | MINOR | `create-project/route.ts` lines 296-306 redefine the same column aliases as `excel-parser.ts` `COL_MAP`. If aliases are updated in one place, the other may fall out of sync. Should import and reuse `COL_MAP` and `findColumnIndex` from `excel-parser.ts`. |
| A-03 | **`error-handler.ts` underutilized** | MINOR | The centralized `handleIntegrationError()` is only partially adopted. Routes like `clickup/route.ts`, `sharepoint/trackers/route.ts`, and `tracker/[filename]/route.ts` still use ad-hoc error handling with duplicated patterns. Should be migrated to the centralized handler for consistency. |
| A-04 | **`sync_cache` schema drift** | MINOR | The PM specs define `sync_cache` with `expires_at TIMESTAMPTZ` as a concrete column. The Drizzle schema instead uses `ttlSeconds INTEGER` with computed staleness in application code. Functionally equivalent but diverges from the spec's data model. Not a runtime issue but a documentation mismatch. |

---

## 2. Security — 6/10

### Strengths

- **Secrets are server-side only.** All API keys (`CLICKUP_API_KEY`, `MICROSOFT_CLIENT_SECRET`, `EVOLIZ_API_KEY`) are read from `process.env` inside server-only modules. No key is ever sent to the browser.

- **Auth on every route.** Every API route calls `getUserFromSession()` and returns 401 if no session. Write operations (`create-project`, `sync-clients`, `quotes/generate`) additionally check `session.role === "admin"` and return 403.

- **Path traversal protection on dynamic routes.** `client-branding/[clientName]/route.ts` validates against `/`, `\`, and `..`. `sharepoint/tracker/[filename]/route.ts` validates with regex `^[^/\\]+\.xlsx$` and rejects `..`. Both are correct.

- **SharePoint token caching with proactive refresh.** The 5-minute buffer before token expiry prevents race conditions on long-running requests.

- **Zod validation on write endpoints.** `create-project` and `quotes/generate` validate all input with Zod schemas, preventing injection of unexpected fields.

### Problems

| ID | Issue | Severity | Detail |
|---|---|---|---|
| S-01 | **Missing role checks on read routes** | MAJOR | Per spec (Section 2), `user` role should see only "assigned clients only" on tracker, ClickUp, and SharePoint folder links. Currently, `tracker/route.ts`, `clickup/route.ts`, `sharepoint/trackers/route.ts`, and `sharepoint/tracker/[filename]/route.ts` return ALL data to any authenticated user regardless of role. No row-level filtering exists. For Sony/TikTok data, this is a confidentiality risk if the team grows beyond Thomas + ops. |
| S-02 | **Evoliz financial data visible to all roles** | MAJOR | Per spec rule BR-INT-02: "A `user` role never sees financial data (invoice amounts, billing status) — this is admin-only." The tracker API returns `invoiceStatus`, `invoiceNumber`, and `totalValue` to all authenticated users. The frontend displays these to everyone. |
| S-03 | **`quotes/route.ts` GET has no role check** | MAJOR | The GET route for listing quotes only checks `getUserFromSession()` but never checks role. Per spec, users should only see "own quotes only" (`user`) vs all quotes (`admin`). Currently all quotes are returned to any authenticated user. |
| S-04 | **No rate limiting on sync/create endpoints** | MINOR | `create-project` and `sync-clients` perform multiple external API calls. No rate limiting or debounce on the server side. The UI disables the button during loading but an attacker could spam the endpoint directly. Low risk given the auth requirement but worth noting for production hardening. |
| S-05 | **Advisory lock race condition** | MINOR | `acquireAdvisoryLock()` uses `INSERT ... ON CONFLICT DO NOTHING` + `SELECT` which is not atomic. Two concurrent requests could both read the lock entry and both believe they own it. A `SELECT ... FOR UPDATE` or database-level advisory lock (`pg_advisory_lock`) would be more robust. |

---

## 3. Robustness & Graceful Degradation — 8/10

### Strengths

- **Per-source independence.** If ClickUp is down, SharePoint and Evoliz data still loads. The tracker route uses `Promise.all()` with individual try/catch wrappers for each source. Each source returns its own `SourceMeta` with status/fetchedAt/error. The frontend shows per-source connection indicators. This exactly matches US-TRACK-02: "Partial failure does not block the full sync."

- **Retry with backoff on all three clients.** `clickup.ts`, `sharepoint.ts`, and `evoliz.ts` all implement single-retry on 429 (rate limit) and 5xx (server error) with configurable delay. Token refresh retry on 401 for SharePoint. Correct and spec-compliant.

- **Stale cache fallback.** `fetchWithCache()` returns stale data when the live fetch fails, with `stale: true` flag. The UI correctly shows "(cached X min ago)" when stale data is served. Logged as `fetch_fallback_to_cache` in sync_logs.

- **Evoliz graceful not-configured.** `evoliz.ts` `getInvoices()` returns `[]` (not an error) when env vars are missing. This means the entire system works without Evoliz configured — exactly what's needed for incremental setup.

- **`Promise.allSettled()` for per-file operations.** The tracker route uses `Promise.allSettled()` when reading individual tracker files (lines 107-121), so one broken Excel file doesn't prevent the other 8 from loading.

- **Create-project partial success with 207 Multi-Status.** Returns detailed per-step results (ClickUp/SharePoint/Excel) and HTTP 207 when some steps fail. The frontend supports retrying only failed steps via `previousResults` parameter.

### Problems

| ID | Issue | Severity | Detail |
|---|---|---|---|
| R-01 | **No Evoliz pagination safety** | MINOR | `tracker/route.ts` line 198: safety limit of `page > 20` (2000 invoices max). If Sarani grows past this, invoices will be silently truncated. Should log a warning when the limit is hit. |
| R-02 | **ClickUp task pagination unbounded in `getAllTasksForList`** | MINOR | `clickup.ts` line 220: the while loop fetches all pages without a safety limit. A misconfigured list with thousands of tasks could cause memory issues and timeout. Should add a max-pages guard. |
| R-03 | **Excel file lock (423) not handled in `create-project`** | MAJOR | Per spec US-SP-02 edge case: "Excel file is locked by another user (Microsoft lock) -> API returns 423 Locked -> display appropriate message." The `writeExcelRows` call in `create-project/route.ts` does not catch 423 specifically. The SharePointApiError will propagate with a generic message instead of the user-friendly "File is currently being edited" text. |
| R-04 | **No idempotency check for duplicate ClickUp tasks** | MAJOR | Per spec US-AUTO-01 edge case: "Duplicate task name already exists in the tracker -> do not create duplicate." The `create-project` route creates tasks without checking if a task with the same name already exists. Double-clicking the create button (or retrying without `previousResults`) could create duplicate tasks. |

---

## 4. UX & Workflow — 7/10

### Strengths

- **Unified tracker is genuinely useful.** The tracker page combines data from 3 systems into a single table with client/status/invoice filters, full-text search across project names, clients, contacts, and PO numbers — all client-side against cached data (no API call per filter change). This matches spec US-TRACK-01 exactly.

- **Connection status bar.** The real-time status bar showing green/yellow/red dots for ClickUp, SharePoint, and Evoliz gives immediate visibility into system health. Non-tech users can instantly see what's connected.

- **Stat cards with actionable data.** Total Projects, Total Value, Open/In Progress, and Overdue counts provide at-a-glance KPIs. The "Overdue" card turns red when > 0 — a nice touch for alerting.

- **Mobile-responsive design.** The tracker page renders a card-based layout on mobile (via `md:hidden` / `hidden md:block` classes). Each card shows client, project, status badges, and action links. This is important for Thomas checking status on mobile.

- **Create-project 3-step feedback.** The new project page shows green checkmarks or red X per step (ClickUp task, SharePoint folder, Excel row) with direct links to the created resources. The "Retry Failed Steps" button intelligently resends only failed operations using `previousResults`. This is excellent partial-failure UX.

- **Quote generator line-item editor.** Dynamic add/remove rows, auto-calculated totals, inline editing with live grand total update. Currency selection (EUR/USD/GBP). Previous quotes table with SharePoint link. Professional-grade form for a back-office tool.

- **Loading skeletons.** The tracker page renders proper skeleton loaders (animated pulse placeholder rows) during data fetch, not just a spinner. Good perceived performance.

### Problems

| ID | Issue | Severity | Detail |
|---|---|---|---|
| U-01 | **No pagination on tracker table** | MAJOR | Per spec US-SP-01 edge case: "Tracker has >200 rows -> paginate display (50 rows per page) + search/filter." Currently all projects render in a single flat table. With 8 client trackers potentially having 50-100 rows each, the table could have 400-800 rows. This will degrade scroll performance and make the table unwieldy. Need pagination or virtual scrolling. |
| U-02 | **No column sorting** | MINOR | Per spec US-TRACK-01: "When an admin clicks a column header to sort, rows sort by that column (ascending/descending toggle)." The table headers are static text — no sort functionality is implemented. |
| U-03 | **No inline editing on tracker rows** | MAJOR | Per spec US-SP-02: "When they click 'Edit' on a row, an inline edit form opens with editable fields." The tracker page is currently read-only. There is no edit button, no inline form, no ability to update fields from the back-office. This is a core feature gap — the spec describes bidirectional sync with Excel, but the UI only implements read. |
| U-04 | **No "Sync now" cooldown** | MINOR | Per spec US-TRACK-02: "Sync now button is re-enabled after 30 seconds." Currently the button is only disabled during the fetch (loading state). After data loads, it's immediately re-clickable. Rapid clicking could trigger excessive API calls, especially to SharePoint (expensive Excel reads). |
| U-05 | **Stale data warning could be more prominent** | MINOR | When serving stale cache, the indicator is a subtle "(cached X min ago)" in the subtitle text. Per spec, a "yellow warning banner" should appear: "ClickUp data may be outdated — last sync: [timestamp]." The current implementation is too subtle for critical data visibility. |
| U-06 | **Quote form has no "Project Schedule" free text field** | MINOR | Per spec US-QUOTE-01, the quote modal should include "Project schedule: [blank, free text] (required)." The generate-pdf code renders a hardcoded schedule section with bullet points instead of accepting user input. The PM spec says this should be editable. |
| U-07 | **No client grouping with collapsible sections** | MINOR | Per spec US-TRACK-01: "Rows are grouped by client by default (collapsible groups)." The current table renders a flat list with client as a column. For 8+ clients with many projects each, grouped/collapsible sections would significantly improve scannability. |

---

## 5. Conformity with PM Specs — 7/10

### What the code implements correctly

| Spec Requirement | Status | Notes |
|---|---|---|
| US-CLICK-01: View project list from ClickUp | PASS | Fetches all spaces/lists/tasks, maps statuses, shows cached timestamp |
| US-CLICK-03: View task assignees and deadlines | PARTIAL | ClickUp task URL is linked, but assignee names and deadline are not displayed in the tracker table |
| US-SP-01: Read Excel tracker data | PASS | All 9 client trackers parsed in parallel with flexible column detection |
| US-SP-03: SharePoint folder link | PASS | Rendered as clickable link in actions column |
| US-EVOLIZ-01: Sync invoice status | PASS | PO-based matching with Evoliz, graceful "not found" handling |
| US-TRACK-01: Unified tracker dashboard | PASS | Merged 3-source view with filters and search |
| US-TRACK-02: Manual sync trigger | PARTIAL | Sync button works, but no 30s cooldown, partial failure warning is subtle |
| US-AUTO-01: Auto-create tracker row | PARTIAL | Manual create-project works, but no ClickUp webhook endpoint exists |
| US-AUTO-02: Auto-create SharePoint folder | PASS | Folder creation with dedup (409 handling) and date-prefix naming |
| US-QUOTE-01: Generate quote PDF | PASS | Full pdf-lib implementation with table, terms, references, logo |
| US-QUOTE-02: View quote history | PASS | Quotes list with client filter and SharePoint links |
| Section 2: Roles and permissions | FAIL | User/admin role filtering not implemented on any read route |
| Section 3.1: sync_cache table | PASS | Implemented via Drizzle schema, functional equivalent |
| Section 3.1: sync_logs table | PASS | Full audit logging on all operations |
| Section 3.1: quotes table | PASS | Schema matches spec, with snapshot via JSONB items |
| Section 12: Env vars | PASS | All expected env vars validated at runtime |
| Section 13: Graceful degradation | PASS | Per-source fallback, stale cache, warning banners |

### What is missing or divergent

| Spec Requirement | Status | Impact |
|---|---|---|
| **US-CLICK-02: Update ClickUp task status from back-office** | NOT IMPLEMENTED | No status update UI or endpoint exists. Spec describes confirmation modal, optimistic UI, rollback on failure. None of this is built. |
| **US-SP-02: Edit tracker row from back-office** | NOT IMPLEMENTED | No inline editing, no write-back to Excel from the tracker view. Core bidirectional sync is missing. |
| **US-EVOLIZ-02: Revenue dashboard per client** | NOT IMPLEMENTED | No financial summary section on client pages. |
| **Section 10.3: ClickUp webhook endpoint** | NOT IMPLEMENTED | No `/api/webhooks/clickup` route. Spec describes webhook signature verification, auto-creation of tracker rows, unmatched task queue. All absent. |
| **Section 3.1: `projects` table extensions** | NOT IMPLEMENTED | Spec defines `clickup_task_id`, `sharepoint_folder_url`, `evoliz_po_number`, etc. as columns on a `projects` table. No such table exists in the Drizzle schema. The system relies on live API data merged in memory instead of persisting project records. This is an intentional architectural divergence — simpler but means no local project state. |
| **Section 3.1: `tracker_line_items` table** | NOT IMPLEMENTED | Spec defines a per-project pricing grid table. Not built. The quote system uses ad-hoc line items instead. |
| **Section 3.1: `client_trackers` mapping table** | NOT IMPLEMENTED | Replaced by hardcoded `CLIENT_MAPPINGS` in `config.ts`. Functionally equivalent for v1 but not database-driven. |
| **Quote re-download from snapshot** | NOT IMPLEMENTED | Per spec AC-QUOTE-02-2: "Re-download uses the saved snapshot (not re-generated)." The quotes table stores items as JSONB but there is no re-download endpoint — only a SharePoint link. If SharePoint upload failed, the quote data exists in DB but cannot be re-downloaded as PDF. |

---

## 6. Overall Score — 7/10

### Verdict: **GO WITH RESERVES**

### What makes this a GO

1. **The core read path works end-to-end.** ClickUp tasks + Excel trackers + Evoliz invoices are fetched, cached, merged, and displayed in a unified UI. The 3-source architecture is sound.

2. **Graceful degradation is genuinely good.** Each integration can fail independently without breaking the others. Stale cache fallback works correctly. Health checks are proper.

3. **Create-project automation is well-engineered.** The 3-step creation (ClickUp task + SharePoint folder + Excel row) with partial failure handling and retry capability is production-quality.

4. **Quote PDF generation is complete and professional.** pdf-lib implementation with logo, pricing table, terms, signature block. Multi-page support. SharePoint upload with graceful fallback.

5. **Audit logging is comprehensive.** Every API interaction (reads and writes) is logged to sync_logs with source, action, entity, payload, and status.

### What makes this "with reserves" (blockers to fix before Sony/TikTok production use)

| Priority | Issue ID | Fix Required |
|---|---|---|
| **P0 (Blocker)** | A-01 | Fix column letter calculation for >26 columns. Excel trackers with columns A-AX will have corrupted writes. |
| **P0 (Blocker)** | S-01, S-02, S-03 | Implement role-based data filtering on all read routes. `user` role must not see all clients' data or financial information. |
| **P1 (Before launch)** | U-03 | Implement inline tracker editing with write-back to Excel. Without this, the back-office is read-only and Thomas still has to edit Excel manually — defeating the purpose of Phase 3. |
| **P1 (Before launch)** | R-04 | Add idempotency check (by task name within space) before creating ClickUp tasks. |
| **P1 (Before launch)** | U-01 | Add pagination to the tracker table. 400+ rows in a single DOM table will cause performance issues. |
| **P2 (Soon after launch)** | R-03 | Handle 423 Locked responses from SharePoint with user-friendly message. |
| **P2 (Soon after launch)** | U-02 | Add column sorting to the tracker table. |
| **P2 (Soon after launch)** | U-04 | Add 30-second cooldown on Sync button. |
| **P3 (Backlog)** | Webhook | Implement ClickUp webhook endpoint for real-time auto-creation. |
| **P3 (Backlog)** | US-CLICK-02 | Implement status update from the back-office UI. |
| **P3 (Backlog)** | US-EVOLIZ-02 | Implement revenue dashboard per client. |

### Architecture Decisions to Acknowledge

The implementation made a deliberate trade-off versus the PM specs: **no local `projects` table, no `tracker_line_items`, no `client_trackers` database table.** Instead, data lives in the external systems (ClickUp, SharePoint Excel, Evoliz) and is merged in memory at request time with caching. This is simpler and avoids sync state issues, but it means:

- No local project state to query against
- No way to track data that doesn't exist in any external system
- Quote line items are decoupled from tracker line items

This is a reasonable v1 trade-off given the team size (2 users), but should be revisited if the system needs to support more complex workflows (e.g., project-level dashboards, historical tracking).

---

## Handoff

**Handoff -> @orchestrator**
- Files produced: `/home/user/Sarani/docs/reviews/phase3-reviewer-audit.md`
- Decisions: GO WITH RESERVES. 2 P0 blockers (column calc bug + role enforcement) must be fixed before production.
- Points of attention:
  - @fullstack must fix A-01 (column letter bug) and S-01/S-02/S-03 (role checks) as P0
  - @fullstack should implement U-03 (inline tracker editing) as P1 — this is the core value proposition of Phase 3
  - The ClickUp webhook (Section 10.3 of specs) is entirely absent — recommend scheduling for Phase 3.1
  - The PM specs describe features (US-CLICK-02, US-SP-02, US-EVOLIZ-02) that represent significant remaining work beyond what's been built
