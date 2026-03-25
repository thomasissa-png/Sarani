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
