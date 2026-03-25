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
