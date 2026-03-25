# Phase 3 Code Audit -- Integration Layer

**Auditor:** @fullstack
**Date:** 2026-03-25
**Scope:** All Phase 3 files (integration clients, API routes, pages, PDF generator, DB schema, migration)
**Files reviewed:** 21

---

## 1. Code Quality -- 7/10

### Strengths

- **Zero `any` in all files.** All types are explicitly declared. The `ClickUpTask`, `DriveItem`, `EvolizInvoice` interfaces are well-structured and reflect the actual API contracts.
- **Consistent error classes.** Each integration client defines its own error class (`ClickUpApiError`, `SharePointApiError`, `EvolizApiError`) with `statusCode` and `response` fields. Good for debugging.
- **Zod validation on mutations.** `create-project` and `quotes/generate` both use `z.object()` with `safeParse`. Input validation is solid.
- **Consistent naming conventions.** Files use kebab-case for routes, camelCase for functions and variables, PascalCase for types/interfaces.
- **Clean separation of config.** `config.ts` is a single source of truth for all mapping constants.

### Issues

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| Q-01 | **Minor** | `config.ts:147` | `GLOBAL_OVERVIEW_FILENAME` has double extension: `"00. Global Overview.xlsx.xlsx"` | Remove the duplicate `.xlsx` |
| Q-02 | **Minor** | `evoliz.ts:155` | `normalizeInvoice` takes `Record<string, unknown>` -- this is one step above `any`. The raw Evoliz response shape is not typed. | Define a `RawEvolizInvoiceResponse` interface (even if partial) to make the normalization explicit |
| Q-03 | **Minor** | `clickup.ts:289-294` | `getCustomFieldValue` casts `field.value` to `ClickUpUserField[]` inside an `Array.isArray` check, but the `value` union type also includes `string[]`. The cast is unsafe if value is `string[]`. | Add a guard: check if first element has `username` property before casting |
| Q-04 | **Minor** | `tracker/route.ts` (unified) | `TrackerProject`, `ExcelProject`, `SourceMeta` types are defined inline in the route file (lines 26-55). These are also duplicated in the tracker page component. | Extract shared types to `src/types/integrations.ts` |
| Q-05 | **Minor** | `tracker/page.tsx` | `TrackerProject`, `SourceMeta`, `TrackerResponse` types are duplicated from the API route. | Import from a shared types file |
| Q-06 | **Minor** | `create-project/route.ts:272-284` | Step 4 (update ClickUp custom field) uses raw `fetch()` bypassing the `clickupFetch` wrapper. No retry, no error class. | Add a `setCustomField(taskId, fieldId, value)` function to `clickup.ts` |

---

## 2. Performance -- 6/10

### Strengths

- **3-source parallel fetch in tracker route.** `Promise.all([fetchClickUpTasks(), fetchExcelTrackers(), fetchEvolizInvoices()])` is correct.
- **DB-backed cache with TTL.** The `fetchWithCache` pattern is well implemented with stale-while-revalidate fallback.
- **ClickUp spaces fetched in parallel** within the clickup route (`Promise.all(spaces.map(...))`).

### Issues

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| P-01 | **Major** | `tracker/route.ts:124-131` | **Sequential N+1 for ClickUp tasks.** For each space, lists are fetched sequentially, then for each list, all tasks are fetched sequentially. With 9 client spaces x ~3 lists each = ~27 sequential API calls. | Fetch lists for all spaces in parallel with `Promise.all`, then fetch tasks for all lists in parallel with `Promise.all` (bounded with `Promise.allSettled` or a concurrency limiter to respect rate limits) |
| P-02 | **Major** | `tracker/route.ts:183-193` | **Sequential Excel tracker reads.** All 9 tracker files are read sequentially in a `for...of` loop. Each requires 2 API calls (resolve path + read used range). That's ~18 sequential Graph API calls. | Use `Promise.allSettled` to read all trackers in parallel. Graph API allows 10k requests per 10 minutes -- 18 parallel calls is safe. |
| P-03 | **Major** | `tracker/[filename]/route.ts:64-87` | **Triple sequential fallback for sheet names.** Tries "Sheet1", then "Feuil1", then "Feuille1" sequentially via nested try/catch. Each failed attempt is a full API round trip. | Use the Graph API worksheets endpoint first (`/workbook/worksheets`) to list available sheets, then read the first one. Single extra call vs. 2 wasted calls worst case. |
| P-04 | **Minor** | `sharepoint.ts:252-298` | `uploadFile` is limited to 4MB (comment says so). The Bytedance tracker is 15.5MB. If anyone tries to upload a large file through this function, it will silently fail. | Implement the upload session API for files > 4MB (`/createUploadSession`). Document the 4MB limit clearly and throw if exceeded. |
| P-05 | **Minor** | `tracker/route.ts` | The entire merged dataset (potentially hundreds of projects) is returned in a single JSON response with no pagination. | Add `?page=1&limit=50` query params, or implement virtual scrolling on the frontend |

---

## 3. Security -- 8/10

### Strengths

- **Auth check on every route.** All 8 API routes call `getUserFromSession()` and return 401 if null. No route is unprotected.
- **Admin role check on sync-clients.** The `POST /sync-clients` route checks `session.role !== "admin"` and returns 403.
- **Server-side only API keys.** All integration clients (`clickup.ts`, `sharepoint.ts`, `evoliz.ts`) read credentials from `process.env` and are only imported in API routes (server-side). No `"use client"` file imports them.
- **Input validation with zod.** Both mutation endpoints validate inputs before processing.
- **Token cache with proactive refresh.** SharePoint token is refreshed 5 minutes before expiry, reducing the window of expired-token errors.

### Issues

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| S-01 | **Major** | `create-project/route.ts` | No admin role check. Any authenticated user (role "user") can create projects across ClickUp, SharePoint, and Excel. The sync-clients route correctly checks `session.role !== "admin"`, but create-project does not. | Add `if (session.role !== "admin")` check |
| S-02 | **Major** | `quotes/generate/route.ts` | No admin role check. Any authenticated user can generate quotes and upload them to SharePoint. | Add admin role check |
| S-03 | **Major** | `tracker/[filename]/route.ts:36` | **Path traversal via filename.** `decodeURIComponent(filename)` is used directly to build a SharePoint path. A malicious filename like `../../secrets.xlsx` would construct a path outside the intended directory. The `.xlsx` extension check is insufficient. | Validate that filename contains no path separators (`/`, `\`, `..`). Use `path.basename()` equivalent or a regex: `/^[^/\\]+\.xlsx$/` |
| S-04 | **Minor** | `client-branding/[clientName]/route.ts:56` | Same path traversal risk with `clientName` parameter, though the impact is limited (it's used to match against folder names, not directly construct paths). | Validate `clientName` does not contain path separators |
| S-05 | **Minor** | `quotes/generate/route.ts:131-133` | `X-Quote-Id` header exposes the internal UUID. Not critical but unnecessary information disclosure. | Consider using a shorter reference number instead |
| S-06 | **Minor** | All routes | Error responses for unconfigured integrations return HTTP 200 with `"status": "unavailable"`. This masks errors from monitoring tools that check HTTP status codes. | Return 503 for service unavailable states |

---

## 4. Maintainability -- 8/10

### Strengths

- **Clean client abstraction.** Each integration (`clickup.ts`, `sharepoint.ts`, `evoliz.ts`) is a self-contained module with its own types, error class, and retry logic. Adding a new integration (e.g., Notion, Asana) would follow the same pattern.
- **Config-driven client mapping.** Adding a new client requires only adding an entry to `CLIENT_MAPPINGS` in `config.ts`. No code changes needed.
- **Cache layer is generic.** `fetchWithCache<T>` works for any data type. The TTL is configurable per source.
- **DB schema is clean.** Tables are well-indexed, types match the Drizzle schema, migration SQL matches the schema definition.
- **Graceful degradation on Evoliz.** `getConfigOrNull()` pattern allows the system to work even when Evoliz credentials are not configured.

### Issues

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| M-01 | **Minor** | Multiple routes | Error handling pattern is heavily duplicated across all routes. The same try/catch structure with "environment variable not set" check, API error check, and generic error fallback is copy-pasted 6+ times. | Extract a `handleIntegrationError(error, source)` helper that returns the appropriate `NextResponse` |
| M-02 | **Minor** | `tracker/route.ts` | The unified tracker route is 474 lines. It contains type definitions, Excel parsing logic, 3 data fetchers, merge logic, and the route handler. | Split into: `src/lib/integrations/tracker-merge.ts` (merge logic), `src/lib/integrations/excel-parser.ts` (column mapping + parsing), and keep only the route handler in the route file |
| M-03 | **Minor** | `generate-pdf.ts` | PDF layout logic is 583 lines of imperative drawing commands. Adding a new section or changing layout is error-prone. | This is an acceptable trade-off for avoiding Puppeteer/Chrome dependency. Consider adding section-level helper functions (e.g., `drawSection(pageRef, title, content)`) to reduce repetition |
| M-04 | **Minor** | `tracker/route.ts:232-234` | Sheet name fallback list `["Sheet1", "Feuil1", "Feuille1"]` is duplicated between the unified tracker route and the `tracker/[filename]` route. | Extract to config: `EXCEL_SHEET_NAME_CANDIDATES` |

---

## 5. Edge Cases -- 5/10

### Issues

| ID | Severity | File | Issue | Fix |
|----|----------|------|-------|-----|
| E-01 | **Major** | `tracker/route.ts:232-244` | **Unknown Excel structure.** If a tracker has a sheet named "Tracker" or "Projects" (not in the 3 hardcoded names), `rangeData` stays `undefined` and the file is silently skipped. No error is logged. | Use the Graph API `worksheets` endpoint to get the actual first sheet name. Log a warning if the sheet name is unexpected. |
| E-02 | **Major** | `sharepoint.ts:137-198` | **Token expiration mid-request is only partially handled.** The `graphFetch` function retries once on 401. But the `getFileContent` function (line 226) does NOT use `graphFetch` -- it uses raw `fetch`. If the token expires during a file download, there is no retry. | Refactor `getFileContent` to use `graphFetch` or at least replicate the 401 retry logic |
| E-03 | **Major** | `create-project/route.ts:208-240` | **Race condition on Excel row number.** Two simultaneous requests read `usedRange.values.length` and both compute the same `nextRow`. Both write to the same row, and the second write overwrites the first. | Use a database-level lock (advisory lock on the tracker filename) before reading the used range. Or use the Graph API `table` operations which auto-append rows. |
| E-04 | **Major** | `create-project/route.ts:160-167` | **SharePoint folder already exists.** `createFolder` uses `"@microsoft.graph.conflictBehavior": "fail"`. If the project folder already exists (e.g., retry after partial failure), Step 2 throws and is marked as failed. But the folder actually exists and is usable. | Use `"@microsoft.graph.conflictBehavior": "rename"` or catch the 409 conflict error and treat it as success (fetch the existing folder URL) |
| E-05 | **Minor** | `create-project/route.ts:213-217` | **Hardcoded "Sheet1" for Excel write.** The read logic tries 3 sheet names, but the write always targets "Sheet1". If the tracker uses "Feuil1", the read succeeds but the write goes to a different (or nonexistent) sheet. | Use the same sheet name resolution for both read and write |
| E-06 | **Minor** | `create-project/route.ts:223-234` | **Hardcoded column layout A-H.** The Excel write assumes columns A through H in a fixed order. But the `readTrackerFile` function in the tracker route uses flexible column detection (`COL_MAP`). If a tracker has a different column order, the new row will have data in the wrong columns. | Read the header row first, find column positions with `COL_MAP`, then write values to the correct columns |
| E-07 | **Minor** | `tracker/route.ts:361-364` | **ClickUp task matching by normalized name.** If two projects have names that normalize to the same string (e.g., "Holiday Campaign 2026" and "Holiday-Campaign-2026"), only the last one in the Map wins. | Use a `Map<string, ClickUpTask[]>` and handle multiple matches (e.g., pick the most recent) |
| E-08 | **Minor** | `tracker/route.ts:367-372` | **Evoliz invoice matching by PO.** Same issue -- if two invoices share the same PO reference (e.g., credit note + original), only one survives the Map. | Store as array and pick the most relevant (latest non-draft) |
| E-09 | **Minor** | `new/page.tsx:157-159` | **Retry re-creates everything.** The "Retry Failed Steps" button re-submits the entire form. If ClickUp task creation succeeded, the retry creates a duplicate task. | Pass the successful step results back to the API and skip already-completed steps. Or implement idempotency keys. |

---

## 6. Bugs (Confirmed or High-Probability)

| ID | Severity | File | Line | Bug | Fix |
|----|----------|------|------|-----|-----|
| B-01 | **Blocker** | `config.ts` | 147 | `GLOBAL_OVERVIEW_FILENAME` = `"00. Global Overview.xlsx.xlsx"` -- double extension. Any code referencing this constant will fail to find the file. | Change to `"00. Global Overview.xlsx"` |
| B-02 | **Major** | `create-project/route.ts` | 213-217 | Excel write always targets "Sheet1" regardless of actual sheet name. If the tracker uses a French sheet name, the write will fail or create a new "Sheet1" sheet in the workbook. | Resolve sheet name before write (same fallback logic as read) |
| B-03 | **Major** | `create-project/route.ts` | 219 | `nextRow = usedRange.values.length + 1` assumes row 1 is at index 0. This is correct IF the used range starts at A1. But if the Excel file has empty rows at the top or the used range starts at a different cell, the next row calculation will be wrong (could overwrite data or leave gaps). | Parse the `usedRange.address` to determine the actual start row, then calculate next row as `startRow + values.length` |
| B-04 | **Major** | `sharepoint.ts` | 226-246 | `getFileContent` does not use `graphFetch` wrapper. It lacks: retry on 429, retry on 500, retry on 401 (token expiry). For large files (15.5MB Bytedance tracker), a single failure means total failure with no recovery. | Refactor to use the retry pattern or at minimum add 401 handling |
| B-05 | **Minor** | `quotes/generate/route.ts` | 127 | `Buffer.from(pdfBytes)` where `pdfBytes` is `Uint8Array`. This works in Node.js but the `Buffer` constructor from `Uint8Array` creates a view, not a copy. If `pdfBytes` is garbage collected before the response is sent, the response body could be corrupted. | Use `Buffer.from(pdfBytes.buffer, pdfBytes.byteOffset, pdfBytes.byteLength)` for safety |
| B-06 | **Minor** | `status/route.ts` | 46-47 | ClickUp health check returns either "connected" or "error", but the status route maps it as `clickupResult.status === "connected" ? "connected" : "error"`. If ClickUp `checkHealth()` threw (caught by `.catch()`), the error object would have `status: "error"`. But if the env vars are missing, `checkHealth` returns `{ status: "error" }` -- this is mapped to "error" in the UI, when it should ideally be "not_configured" (like Evoliz). | Add a `not_configured` status to ClickUp and SharePoint health checks when env vars are missing |
| B-07 | **Minor** | `tracker/page.tsx` | 60 | `formatCurrency` hardcodes `currency: "EUR"`. If a project's value is in USD or GBP, it will still show the EUR symbol. | Accept currency as a parameter or derive it from the project data |

---

## 7. Overall Score: 6.5/10

### Score Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Code Quality | 7/10 | 20% | 1.4 |
| Performance | 6/10 | 20% | 1.2 |
| Security | 8/10 | 20% | 1.6 |
| Maintainability | 8/10 | 15% | 1.2 |
| Edge Cases | 5/10 | 25% | 1.25 |
| **Total** | | **100%** | **6.65** |

### Summary

The Phase 3 integration layer is **architecturally sound** -- the separation between integration clients, cache layer, config, and API routes is clean and extensible. The TypeScript typing is strict with no `any`. Auth is enforced everywhere. The cache-through pattern with stale fallback is production-grade.

The main weaknesses are:

1. **Sequential API calls** where parallel would be safe (P-01, P-02, P-03). This directly impacts page load time for the tracker view -- potentially 30+ seconds of sequential API calls on a cold cache.

2. **Edge case handling in create-project** is fragile (E-03 race condition on row numbers, E-04 folder conflict, E-05/E-06 hardcoded sheet/column assumptions, E-09 retry creates duplicates). This is the highest-risk endpoint because it writes to 3 external systems.

3. **Path traversal vulnerability** in the tracker filename route (S-03) is the only real security concern. The filename is URL-decoded and used to build a SharePoint path without sanitization.

4. **Missing admin role checks** on create-project and quotes/generate (S-01, S-02) mean any authenticated user can write to external systems.

### Priority Fix Order

1. **S-03** -- Path traversal in `tracker/[filename]` (security)
2. **S-01, S-02** -- Add admin role checks to create-project and quotes/generate (security)
3. **E-03** -- Race condition on Excel row writes (data integrity)
4. **B-01** -- Double extension in `GLOBAL_OVERVIEW_FILENAME` (immediate bug)
5. **B-02, E-05** -- Sheet name mismatch between read and write (data integrity)
6. **P-01, P-02** -- Parallelize ClickUp and Excel fetches (performance)
7. **E-04** -- Handle SharePoint folder conflict gracefully (reliability)
8. **B-04, E-02** -- Add retry logic to `getFileContent` (reliability)

---

*Audit produced by @fullstack -- 2026-03-25*
