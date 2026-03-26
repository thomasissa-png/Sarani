# Sarani Back-Office — Phase 3 Integration Specs
*Produced by @product-manager — 2026-03-25*
*Language: English*

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Roles and Permissions](#2-roles-and-permissions)
3. [Data Model](#3-data-model)
4. [User Stories — ClickUp Integration](#4-user-stories--clickup-integration)
5. [User Stories — SharePoint Integration](#5-user-stories--sharepoint-integration)
6. [User Stories — Evoliz Integration](#6-user-stories--evoliz-integration)
7. [User Stories — Unified Tracker Dashboard](#7-user-stories--unified-tracker-dashboard)
8. [User Stories — New Project Automation](#8-user-stories--new-project-automation)
9. [User Stories — Quote PDF Generator](#9-user-stories--quote-pdf-generator)
10. [Sync Flow: ClickUp ↔ Excel ↔ Evoliz](#10-sync-flow-clickup--excel--evoliz)
11. [New Project Automation Flow](#11-new-project-automation-flow)
12. [Environment Variables and Configuration](#12-environment-variables-and-configuration)
13. [Graceful Degradation and Fallback UI](#13-graceful-degradation-and-fallback-ui)
14. [Risks](#14-risks)
15. [Open Questions for Thomas](#15-open-questions-for-thomas)
16. [Hypotheses to Validate](#16-hypotheses-to-validate)

---

## 1. Architecture Overview

### System Map

```
┌─────────────────────────────────────────────────────────────┐
│                    SARANI BACK-OFFICE (/admin)               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              UNIFIED TRACKER DASHBOARD              │     │
│  │  (master view: all clients, all projects, all KPIs) │     │
│  └────────────────┬───────────────┬────────────────────┘     │
│                   │               │                           │
│         ┌─────────▼─────┐ ┌──────▼──────┐                   │
│         │ QUOTE GENERATOR│ │ PROJECT AUTO│                   │
│         │  (PDF export)  │ │ (new project│                   │
│         └───────────────┘ │  creation)  │                   │
│                           └─────────────┘                   │
└───────────┬──────────────────┬──────────────────┬───────────┘
            │                  │                  │
    ┌───────▼──────┐  ┌────────▼──────┐  ┌───────▼──────┐
    │   CLICKUP     │  │  SHAREPOINT   │  │   EVOLIZ      │
    │   REST API    │  │  Graph API    │  │   REST API    │
    │               │  │               │  │               │
    │  • Projects   │  │  • 8 Excel    │  │  • Invoices   │
    │  • Tasks      │  │    trackers   │  │  • PO refs    │
    │  • Statuses   │  │  • Folders    │  │  • Payment    │
    │  • Deadlines  │  │  • File ops   │  │    status     │
    │  • Assignees  │  │               │  │               │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### Source of Truth

| Data Type | Source of Truth | Can be edited from back-office? | Sync direction |
|---|---|---|---|
| Project list + status | Excel tracker (SharePoint) | Yes | Bidirectional |
| Task deadlines + assignees | ClickUp | Yes (via ClickUp sync) | Bidirectional |
| Invoice status (Paid/Unpaid) | Evoliz | No (read-only) | Evoliz → back-office |
| Invoice number | Evoliz | No | Evoliz → back-office |
| PO number | Excel tracker | Yes | Excel ↔ back-office |
| Quote data (pricing grid) | Excel tracker (columns Q-AX) | Yes | Excel ↔ back-office |
| SharePoint folder URLs | Excel tracker (Link column) | No (auto-generated) | Excel → back-office |

**Rule**: The Excel tracker is the master record for project-level data. ClickUp is the master for task-level data. Evoliz is the master for financial data. The back-office is a read/write interface into all three — it never owns the data.

### Integration Architecture Principles

1. **No data duplication by default** — the back-office fetches live from APIs where possible (with caching for performance)
2. **Cached layer for performance** — API responses cached in PostgreSQL with TTL (5 minutes for ClickUp/Evoliz, 15 minutes for SharePoint Excel reads)
3. **Webhook-first, polling-fallback** — ClickUp webhooks for real-time updates; polling every 5 minutes if webhooks fail
4. **All writes are audited** — every back-office edit that propagates to an external system is logged in `sync_logs` table
5. **Graceful degradation mandatory** — if any API is down, the back-office displays cached data with a warning banner

---

## 2. Roles and Permissions

Inherits the two-role system from `auth-specs.md`.

| Feature | `admin` | `user` |
|---|---|---|
| View Unified Tracker Dashboard | Yes — all clients | Yes — assigned clients only [OQ-1] |
| Edit tracker data (project fields) | Yes | No — read-only |
| Create new project (triggers automation) | Yes | No |
| Generate quote PDF | Yes | Yes — assigned clients only [OQ-1] |
| Trigger manual sync (force refresh) | Yes | No |
| View ClickUp tasks | Yes — all projects | Yes — assigned clients only [OQ-1] |
| Edit ClickUp task status | Yes | No |
| View Evoliz invoices | Yes — all clients | No |
| View SharePoint folder links | Yes | Yes — assigned clients only [OQ-1] |
| Download generated quotes | Yes | Yes — own quotes only |
| View sync logs / audit trail | Yes | No |
| Configure API credentials | Yes | No |

**Rule BR-INT-01**: All external API calls are server-side only. API keys are never exposed to the browser.

**Rule BR-INT-02**: A `user` role never sees financial data (invoice amounts, billing status) — this is admin-only.

---

## 3. Data Model

### 3.1 New Tables Required

#### `sync_cache`
Stores API responses with TTL. Prevents redundant API calls and provides fallback data during outages.

```sql
CREATE TABLE sync_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT NOT NULL,           -- 'clickup' | 'sharepoint' | 'evoliz'
  cache_key   TEXT NOT NULL UNIQUE,    -- e.g. 'clickup:project:abc123'
  payload     JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  is_stale    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_sync_cache_key ON sync_cache(cache_key);
CREATE INDEX idx_sync_cache_expires ON sync_cache(expires_at);
```

#### `sync_logs`
Audit trail for every write operation that touches an external system.

```sql
CREATE TABLE sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by  UUID REFERENCES users(id),
  direction     TEXT NOT NULL,         -- 'backoffice→clickup' | 'backoffice→sharepoint' | etc.
  entity_type   TEXT NOT NULL,         -- 'project' | 'task' | 'invoice' | 'tracker_row'
  entity_id     TEXT NOT NULL,
  action        TEXT NOT NULL,         -- 'create' | 'update' | 'delete'
  payload_before JSONB,
  payload_after  JSONB,
  status        TEXT NOT NULL,         -- 'success' | 'error' | 'pending'
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `projects` (extended from existing)
Add integration-specific fields to the existing projects table (or create if not yet present).

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS clickup_task_id     TEXT UNIQUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sharepoint_folder_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS evoliz_po_number     TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS evoliz_invoice_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS evoliz_invoice_status TEXT; -- 'Paid' | 'Unpaid' | 'Sent'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS clickup_status       TEXT; -- 'OPEN' | 'ON HOLD' | 'SUBMITTED' | 'CLOSED'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracker_client_name  TEXT; -- matches Excel "Customer" column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracker_row_index    INTEGER; -- row position in Excel for update ops
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_value_eur      NUMERIC(10,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_date           DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_month        TEXT; -- "March 2026" format
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_synced_at       TIMESTAMPTZ;
```

#### `tracker_line_items`
Stores the pricing grid from columns Q-AX of the Excel tracker (one row per asset type per project).

```sql
CREATE TABLE tracker_line_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_type    TEXT NOT NULL,         -- 'banner_creation' | 'banner_adaptation' | 'slide' | 'newsletter' | etc.
  unit_price_eur NUMERIC(8,2) NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  total_eur     NUMERIC(10,2) GENERATED ALWAYS AS (unit_price_eur * quantity) STORED,
  excel_column  TEXT,                  -- e.g. 'Q', 'R', 'S' — for write-back mapping
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `quotes`
Tracks generated PDF quotes.

```sql
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id),
  generated_by    UUID NOT NULL REFERENCES users(id),
  pdf_storage_url TEXT,               -- SharePoint URL after upload [HYPOTHESIS: storage location TBD — see OQ-6]
  template_version TEXT NOT NULL DEFAULT 'v1',
  quote_data      JSONB NOT NULL,     -- snapshot of data at generation time
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  downloaded_at   TIMESTAMPTZ
);
```

### 3.2 Asset Type Reference (Pricing Grid)

The following asset types are derived from the Sony tracker analysis. Each has a fixed unit price.

| Asset Type | Unit Price (EUR) | Excel Column (approx.) |
|---|---|---|
| Banner creation | 120 | Q |
| Banner adaptation | 35 | R |
| Slide | 35 | S |
| Newsletter | 500 | T |
| [HYPOTHESIS: remaining columns U-AX — exact mapping TBD from real tracker] | — | U-AX |

**Note**: The full column mapping (Q through AX = 36 columns) must be extracted from the real Sony tracker file before implementation. Thomas to provide the complete mapping — see OQ-5.

### 3.3 Client-to-Tracker Mapping

8 client trackers exist in SharePoint. The back-office needs to know which Excel file corresponds to which client.

[HYPOTHESIS: each Excel file is named after the client (e.g. `Sony_Tracker.xlsx`, `TikTok_Tracker.xlsx`) — exact filenames must be confirmed by Thomas — see OQ-2]

```sql
CREATE TABLE client_trackers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id),
  sharepoint_file_path TEXT NOT NULL,  -- relative path from the base folder
  sharepoint_file_id   TEXT,           -- Graph API driveItem ID (cached for faster access)
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true
);
```

---

## 4. User Stories — ClickUp Integration

### US-CLICK-01 — View project list from ClickUp

```
GIVEN an admin on /admin/tracker
WHEN the page loads
THEN the system fetches all tasks from the configured ClickUp workspace
     AND displays each task as a row: Project name, Status, Assignees, Due date
     AND maps ClickUp statuses to display labels:
         OPEN         → "Open" (gray badge)
         ON HOLD      → "On Hold" (yellow badge)
         SUBMITTED    → "Submitted" (blue badge)
         CLOSED       → "Closed" (green badge)
     AND data is served from cache if last fetch was < 5 minutes ago
     AND a "Last synced: X minutes ago" timestamp is visible in the UI

GIVEN an admin on /admin/tracker
WHEN the ClickUp API returns an error (timeout, 401, 5xx)
THEN the system displays cached data (last known good state)
     AND shows a yellow warning banner: "ClickUp data may be outdated — last sync: [timestamp]"
     AND provides a "Retry sync" button
```

**Edge cases:**
- ClickUp workspace has no tasks → empty state: "No projects found in ClickUp. Check your workspace configuration."
- Task with no due date → display "—" in the Due date column
- Task with multiple assignees → display first assignee name + "+N" badge
- API rate limit hit (ClickUp: 100 req/min) → queue requests, show spinner, do not show error to user

**Acceptance Criteria:**
- AC-CLICK-01-1: Task list renders in < 2 seconds on first load (cache warm)
- AC-CLICK-01-2: All 4 ClickUp statuses are correctly mapped to display labels
- AC-CLICK-01-3: Fallback to cached data when API unavailable (tested with mock 503)
- AC-CLICK-01-4: "Last synced" timestamp updates on every successful fetch

---

### US-CLICK-02 — Update ClickUp task status from back-office

```
GIVEN an admin viewing a project row in /admin/tracker
WHEN they click the status badge and select a new status
THEN a confirmation modal appears: "Update status to [NEW STATUS] in ClickUp?"
     AND on confirm, the back-office calls the ClickUp API PATCH endpoint
     AND on success: the row updates immediately (optimistic UI)
     AND the action is logged in sync_logs (triggered_by, payload_before, payload_after)

GIVEN an admin who confirms a status update
WHEN the ClickUp API call fails
THEN the optimistic UI update is rolled back
     AND an error toast appears: "Failed to update ClickUp status. Try again."
     AND the failure is logged in sync_logs with status='error'
```

**Edge cases:**
- User clicks status update → network drops before API response → timeout after 10s → rollback + error
- Admin updates status while cache is serving stale data → after update, force cache invalidation for that project
- Status update succeeds in ClickUp but Excel sync fails → ClickUp is updated, sync_log records partial failure, Excel update retried async

**Acceptance Criteria:**
- AC-CLICK-02-1: Status update reflects in UI within 500ms (optimistic)
- AC-CLICK-02-2: Rollback is instant and correct on API failure
- AC-CLICK-02-3: Every status change is recorded in sync_logs
- AC-CLICK-02-4: ClickUp status change triggers Excel status update (async, within 30s)

---

### US-CLICK-03 — View task assignees and deadlines

```
GIVEN an admin viewing a project detail page /admin/projects/[id]
WHEN the page loads
THEN the ClickUp assignees are displayed with their names (not just IDs)
     AND the task due date is displayed in DD/MM/YYYY format
     AND subtasks (if any) are listed below the main task
     AND a direct link to the ClickUp task is available ("Open in ClickUp ↗")
```

**Acceptance Criteria:**
- AC-CLICK-03-1: Assignee names resolved from ClickUp user IDs (not raw IDs displayed)
- AC-CLICK-03-2: "Open in ClickUp" link opens correct task URL in new tab
- AC-CLICK-03-3: Overdue deadlines are highlighted in red

---

## 5. User Stories — SharePoint Integration

### US-SP-01 — Read Excel tracker data for a client

```
GIVEN an admin on /admin/tracker or /admin/clients/[id]
WHEN the page loads
THEN the system reads the corresponding Excel tracker file from SharePoint via Graph API
     AND parses all rows (each row = one project)
     AND displays the following columns per row:
         Customer, Division, Date, Project name, Contact, Status, Category,
         SharePoint folder link (Link column), Asset count, Total Value (EUR),
         Quote date, PO number, Payment month, Invoice number, Invoice Status
     AND data is cached for 15 minutes (Excel reads are expensive API calls)
     AND a "Last synced" timestamp is shown

GIVEN an admin on /admin/tracker
WHEN the SharePoint Graph API is unavailable
THEN the system displays the last cached version of the tracker data
     AND shows a warning banner: "SharePoint data may be outdated — last sync: [timestamp]"
     AND disables all edit buttons with tooltip: "Editing unavailable — SharePoint offline"
```

**Edge cases:**
- Excel file has been renamed or moved → API returns 404 → error state: "Tracker file not found. Check SharePoint configuration." + alert to admin
- Excel row is blank (empty project row) → skip silently, do not display
- Excel cell contains a formula (e.g. SUM) → read computed value, not formula string
- Tracker has >200 rows → paginate display (50 rows per page) + search/filter

**Acceptance Criteria:**
- AC-SP-01-1: All 15+ columns from the tracker are parsed and displayed correctly
- AC-SP-01-2: SharePoint folder URL (Link column) is displayed as a clickable link opening in a new tab
- AC-SP-01-3: Cached data served when API unavailable, with visible staleness warning
- AC-SP-01-4: Read latency < 3 seconds when cache is warm

---

### US-SP-02 — Edit a tracker row from the back-office

```
GIVEN an admin viewing a project row in the tracker
WHEN they click "Edit" on a row
THEN an inline edit form opens with editable fields:
     Status, Contact, PO number, Quote date, Payment month, Invoice number,
     Invoice Status, Asset count, Total Value, and pricing grid quantities (columns Q-AX)
     AND fields that are auto-populated from ClickUp or Evoliz are read-only with a lock icon and tooltip

GIVEN an admin who has edited fields and clicks "Save"
WHEN they confirm the save
THEN the back-office writes the updated values to the Excel file via Graph API (PATCH request)
     AND updates the corresponding fields in the local PostgreSQL cache
     AND logs the action in sync_logs
     AND shows a success toast: "Tracker updated in SharePoint"

GIVEN a save operation
WHEN the Graph API write fails (timeout, conflict, permission error)
THEN the local cache is NOT updated
     AND an error toast appears: "Failed to save to SharePoint. Your changes were not saved."
     AND the edit form remains open with the user's unsaved changes preserved
```

**Edge cases:**
- Two admins editing the same row simultaneously → last write wins; no conflict resolution in v1 [HYPOTHESIS: acceptable given team size — see OQ-7]
- Graph API write times out after 10s → retry once automatically → if second attempt fails → error state
- Excel file is locked by another user (Microsoft lock) → API returns 423 Locked → display: "File is currently being edited by someone else. Try again in a few minutes."
- PO number edited in back-office → must also update Evoliz reference if PO exists in Evoliz → async job queued

**Acceptance Criteria:**
- AC-SP-02-1: Edited values are written to the correct cell in the correct Excel file
- AC-SP-02-2: Read-only fields (ClickUp/Evoliz-sourced) cannot be edited (disabled input + tooltip)
- AC-SP-02-3: Save failure does not corrupt local cache
- AC-SP-02-4: Every write is recorded in sync_logs with before/after payload

---

### US-SP-03 — Display SharePoint folder link for a project

```
GIVEN an admin viewing a project row
WHEN the Link column contains a SharePoint URL
THEN a "View folder ↗" button is displayed
     AND clicking it opens the SharePoint folder in a new browser tab

GIVEN a project row where the Link column is empty
THEN the "View folder" button is replaced by a "—" placeholder
     AND if the project has been auto-created (US-AUTO-01), a "Create folder" button is shown
```

**Acceptance Criteria:**
- AC-SP-03-1: SharePoint links open correctly in new tab
- AC-SP-03-2: Empty Link column does not cause render errors

---

## 6. User Stories — Evoliz Integration

### US-EVOLIZ-01 — Sync invoice status for a project

```
GIVEN an admin viewing a project row in the tracker
WHEN the project has a PO number (evoliz_po_number is set)
THEN the system queries Evoliz API using the PO number as the reference
     AND displays:
         Invoice number (Evoliz)
         Invoice amount (EUR)
         Invoice status: Paid / Unpaid / Sent (color-coded: green / red / yellow)
         Invoice date
     AND data is cached for 5 minutes

GIVEN a project where Evoliz returns no matching invoice for the PO number
THEN the invoice fields show "Not found in Evoliz"
     AND no error is thrown (this is a valid state — invoice not yet created)

GIVEN the Evoliz API being unavailable
THEN cached invoice data is shown with a staleness warning
     AND invoice status fields display a gray "—" with tooltip: "Evoliz data unavailable"
```

**Edge cases:**
- PO number format mismatch between Excel and Evoliz → no match found → display "Not found" (not an error)
- One PO number maps to multiple invoices in Evoliz → display the most recent invoice; show "+N more" link to full list
- Evoliz API rate limit → queue requests, prioritize visible rows first

**Acceptance Criteria:**
- AC-EVOLIZ-01-1: Invoice status displayed with correct color coding for all 3 states
- AC-EVOLIZ-01-2: "Not found in Evoliz" state handled gracefully (no error UI)
- AC-EVOLIZ-01-3: Evoliz data is never editable from the back-office (read-only)
- AC-EVOLIZ-01-4: API unavailability shows cached data with warning, not an error screen

---

### US-EVOLIZ-02 — Revenue dashboard per client

```
GIVEN an admin on /admin/clients/[id]
WHEN the client page loads
THEN a financial summary section is displayed:
     - Total invoiced (EUR) — sum of all Evoliz invoices for this client
     - Total paid (EUR) — sum of Paid invoices
     - Total outstanding (EUR) — sum of Unpaid + Sent invoices
     - Number of invoices by status (Paid / Unpaid / Sent)
     AND this data is derived from Evoliz API, not from the Excel tracker
     (the tracker Invoice Status column is used as a visual reference but Evoliz is the source of truth)
```

**Acceptance Criteria:**
- AC-EVOLIZ-02-1: Financial summary visible only to `admin` role (not `user`)
- AC-EVOLIZ-02-2: Totals are accurate to 2 decimal places
- AC-EVOLIZ-02-3: Section renders empty state if no Evoliz invoices found for client

---

## 7. User Stories — Unified Tracker Dashboard

### US-TRACK-01 — View unified tracker (all clients)

```
GIVEN an admin on /admin/tracker
WHEN the page loads
THEN ALL client trackers are loaded (all 8 Excel files) and merged into one unified view
     AND each row shows: Client, Project, ClickUp Status, Invoice Status, Total Value, Due Date, SharePoint Link
     AND rows are grouped by client by default (collapsible groups)
     AND the data is a join of:
         Excel tracker data (project name, value, PO, dates)
         ClickUp data (status, assignees, deadline) — matched by project name [HYPOTHESIS: see OQ-3]
         Evoliz data (invoice status, amount) — matched by PO number
     AND a global "Last synced" indicator shows the oldest sync timestamp across all 3 sources

GIVEN the unified tracker is loaded
WHEN an admin uses the search bar
THEN results filter in real-time across all clients, project names, statuses
     AND search is client-side (against cached data, no new API call)

GIVEN the unified tracker
WHEN an admin clicks a column header to sort
THEN rows sort by that column (ascending/descending toggle)
     AND sort persists in session (not in URL)
```

**Filters available:**
- Client (multi-select dropdown)
- ClickUp Status (OPEN / ON HOLD / SUBMITTED / CLOSED)
- Invoice Status (Paid / Unpaid / Sent / Not found)
- Date range (Quote date or Payment month)
- Category

**Acceptance Criteria:**
- AC-TRACK-01-1: All 8 client trackers are loaded and displayed in a single unified table
- AC-TRACK-01-2: Each row correctly combines data from all 3 sources
- AC-TRACK-01-3: Search and filter operate without additional API calls
- AC-TRACK-01-4: Page renders initial data within 3 seconds (all caches warm)
- AC-TRACK-01-5: `user` role sees only their assigned clients' rows [OQ-1]

---

### US-TRACK-02 — Manual sync trigger

```
GIVEN an admin on /admin/tracker
WHEN they click "Sync now"
THEN all 3 API sources are refreshed in parallel (ClickUp + SharePoint + Evoliz)
     AND a loading spinner replaces the "Sync now" button
     AND on completion, the table re-renders with fresh data
     AND "Last synced" timestamp updates to now()
     AND if one source fails, the others still complete and the failed source shows a warning

GIVEN a sync that fails for one source (e.g. Evoliz timeout)
THEN the sync completes for the other 2 sources
     AND the failed source shows: "Evoliz sync failed — showing cached data"
     AND the "Sync now" button is re-enabled after 30 seconds
```

**Acceptance Criteria:**
- AC-TRACK-02-1: All 3 sources are refreshed in parallel (not sequentially)
- AC-TRACK-02-2: Partial failure does not block the full sync
- AC-TRACK-02-3: Sync button disabled for 30s after click to prevent rate limit abuse

---

## 8. User Stories — New Project Automation

### US-AUTO-01 — Auto-create tracker row when new ClickUp task is created

```
GIVEN a ClickUp webhook is configured for the workspace
WHEN a new task is created in ClickUp
THEN the back-office webhook endpoint receives the event
     AND identifies the correct client from the task name or list name [HYPOTHESIS: matching logic — see OQ-3]
     AND adds a new row to the correct client's Excel tracker with:
         - Project = ClickUp task name
         - Status = "Open PO" (default)
         - Date = today's date
         - ClickUp task ID stored in the row (or in a hidden column)
         AND all other columns left blank (to be filled manually)
     AND logs the creation in sync_logs
     AND sends a back-office notification to all admins: "New project created: [name] — row added to [Client] tracker"

GIVEN the webhook event
WHEN the client cannot be identified from the task name/list
THEN the row is NOT automatically added
     AND an admin notification is sent: "New ClickUp task '[name]' could not be matched to a client. Please add manually."
     AND the task is flagged in the back-office "Unmatched tasks" queue

GIVEN a ClickUp webhook being unavailable or not configured
THEN the admin can manually trigger "Create project" from the back-office
     AND the same row creation + folder creation logic runs on demand
```

**Edge cases:**
- Duplicate task name already exists in the tracker → do not create duplicate; alert admin
- Excel file is locked at the time of webhook → queue the write, retry every 30s for 5 minutes → if still locked, alert admin
- Webhook delivers the same event twice (duplicate delivery) → idempotency check on ClickUp task ID → skip if row already exists

**Acceptance Criteria:**
- AC-AUTO-01-1: New ClickUp task triggers tracker row within 60 seconds (webhook latency)
- AC-AUTO-01-2: Correct Excel file is selected based on client matching
- AC-AUTO-01-3: Idempotency: same ClickUp task ID never creates two rows
- AC-AUTO-01-4: Unmatched tasks are surfaced in the back-office UI, not silently dropped

---

### US-AUTO-02 — Auto-create SharePoint project folder

```
GIVEN the same webhook event as US-AUTO-01 (or manual "Create project" trigger)
WHEN the client is identified
THEN the back-office creates a new folder in SharePoint at:
     /personal/team_sarani_studio/Documents/00. Administrative/03. Financials (Trackers)/[Client name]/[Project name]/
     [HYPOTHESIS: folder structure — exact path must be confirmed by Thomas — see OQ-4]
     AND writes the new folder's SharePoint URL into the Link column of the newly created tracker row
     AND logs the folder creation in sync_logs

GIVEN folder creation
WHEN a folder with the same name already exists at that path
THEN the existing folder URL is used (no duplicate created)
     AND the Link column is updated to point to the existing folder
```

**Edge cases:**
- Project name contains special characters (/, \, :, *, ?, ", <, >, |) → sanitize for SharePoint compatibility (replace with "-" or "_")
- SharePoint API returns permission error → folder not created, admin alerted, Link column left empty
- Folder creation succeeds but Excel write-back fails → folder exists orphaned; retry Excel write async

**Acceptance Criteria:**
- AC-AUTO-02-1: Folder created at the correct path within 60 seconds of project creation
- AC-AUTO-02-2: SharePoint URL written back to tracker Link column automatically
- AC-AUTO-02-3: Special characters in project names are sanitized before folder creation
- AC-AUTO-02-4: Existing folder detection prevents duplicates

---

## 9. User Stories — Quote PDF Generator

### US-QUOTE-01 — Generate a quote PDF from tracker data

```
GIVEN an admin or user on a project page /admin/projects/[id]
WHEN they click "Generate quote"
THEN a quote preview modal opens with:
     Pre-filled fields from tracker data:
       - Date: today's date (editable)
       - Project title: project name from tracker (editable)
       - Client: Customer from tracker (editable)
       - Contact name: Contact column from tracker (editable)
       - Pricing table: populated from tracker_line_items (columns Q-AX)
         Each row: Item | Fixed Rate | Quantity | Total
         Auto-calculated subtotal and total
       - Purpose of work: [blank, free text] (required)
       - Scope and deliverables: [blank, free text] (required)
       - Project schedule: [blank, free text] (required)
     AND standard boilerplate fields are pre-filled (not editable in v1):
       - "Work commences once a PO is raised"
       - "Unlimited rounds of revisions"
       - "Payment terms are 45 days"
       - CEO signature block [HYPOTHESIS: static text or image — see OQ-6]

GIVEN the quote preview modal is open
WHEN the admin clicks "Download PDF"
THEN a PDF is generated server-side using the filled template
     AND the PDF is automatically downloaded to the user's browser
     AND the quote is saved to the `quotes` table with a snapshot of the data
     AND the generated_at timestamp is recorded
```

**PDF Template Structure (based on TikTok DOCX analysis):**

```
┌─────────────────────────────────────────────────┐
│  [Sarani Logo]                    [Date]         │
│                                                  │
│  Service proposal: [Project Title]               │
│                                                  │
│  This proposal is for [Contact] at [Client].     │
│                                                  │
│  ──────────────────────────────────────────────  │
│  Purpose of work                                 │
│  [free text]                                     │
│                                                  │
│  ──────────────────────────────────────────────  │
│  Scope and deliverables                          │
│  [free text]                                     │
│                                                  │
│  ──────────────────────────────────────────────  │
│  Project schedule                                │
│  [free text]                                     │
│                                                  │
│  ──────────────────────────────────────────────  │
│  Pricing / payment / terms                       │
│                                                  │
│  ┌───────────────────┬──────────┬──────┬───────┐ │
│  │ Item              │ Fixed    │ Qty  │ Total │ │
│  │                   │ Rate     │      │       │ │
│  ├───────────────────┼──────────┼──────┼───────┤ │
│  │ Banner creation   │ 120€     │  50  │ 6,000€│ │
│  │ Banner adaptation │  35€     │  20  │   700€│ │
│  │ ...               │ ...      │ ...  │ ...   │ │
│  ├───────────────────┼──────────┼──────┼───────┤ │
│  │                   │          │ TOTAL│ 6,700€│ │
│  └───────────────────┴──────────┴──────┴───────┘ │
│                                                  │
│  Work commences once a PO is raised.             │
│  Unlimited rounds of revisions.                  │
│  Payment terms are 45 days.                      │
│                                                  │
│  [CEO Signature]                                 │
└─────────────────────────────────────────────────┘
```

**Edge cases:**
- Pricing table has all quantities = 0 → warning shown: "No items in pricing grid. Quote will show empty table." (still allowed to generate)
- Contact field is empty in tracker → field shows "[Contact name]" as placeholder in preview (user must fill before download)
- Project name contains special characters → sanitize for safe filename generation (e.g. `Quote_Sony_Banner-Campaign_2026-03-25.pdf`)
- PDF generation timeout (> 15 seconds) → error toast: "PDF generation failed. Try again." (do not save to quotes table)

**Acceptance Criteria:**
- AC-QUOTE-01-1: PDF generated in < 5 seconds (server-side)
- AC-QUOTE-01-2: Pricing table totals are mathematically correct (computed server-side, not trusted from client)
- AC-QUOTE-01-3: All pre-filled fields are populated from tracker_line_items and projects table (no manual re-entry)
- AC-QUOTE-01-4: Generated quote is saved to `quotes` table with data snapshot
- AC-QUOTE-01-5: PDF filename follows convention: `Quote_[Client]_[ProjectName]_[YYYY-MM-DD].pdf`

---

### US-QUOTE-02 — View quote history for a project

```
GIVEN an admin on /admin/projects/[id]
WHEN they scroll to the "Quotes" section
THEN all previously generated quotes are listed with:
     - Generation date
     - Generated by (user name)
     - Download button (re-download the original PDF)
     AND quotes are ordered most recent first
```

**Acceptance Criteria:**
- AC-QUOTE-02-1: Quote history shows all past quotes, including those generated by other users
- AC-QUOTE-02-2: Re-download uses the saved snapshot (not re-generated from current data)

---

## 10. Sync Flow: ClickUp ↔ Excel ↔ Evoliz

### 10.1 Read Flow (back-office loads data)

```
Admin opens /admin/tracker
           │
           ▼
   Check sync_cache for each source
           │
   ┌───────┴──────────────────────┐
   │  Cache hit AND not expired?  │
   └───────┬──────────────────────┘
           │                │
          YES               NO
           │                │
    Serve cache        Fetch from API in parallel:
           │            ┌──────────────────────────────┐
           │            │ ClickUp: GET /task?list_id=X  │
           │            │ SharePoint: GET /drive/items/ │
           │            │   [file_id]/workbook/workshts │
           │            │ Evoliz: GET /invoices?ref=PO# │
           │            └──────────┬───────────────────┘
           │                       │
           │              Update sync_cache
           │              (store payload + expires_at)
           │                       │
           └─────────────────┐     │
                             ▼     ▼
                        Merge all data sources:
                        - Match ClickUp task ↔ Excel row by project name
                        - Match Evoliz invoice ↔ Excel row by PO number
                        - For unmatched rows: show with partial data
                             │
                             ▼
                      Render unified tracker table
```

### 10.2 Write Flow (admin edits tracker data)

```
Admin edits a field in back-office UI
           │
           ▼
Optimistic UI update (instant local state change)
           │
           ▼
Determine write target(s):
  - Project name, status, category → Excel tracker row (SharePoint)
  - ClickUp status → ClickUp PATCH /task/[id]
  - PO number change → Excel + flag for Evoliz reconciliation
           │
           ▼
Execute write(s) in parallel (where possible)
           │
   ┌───────┴──────────────────────────┐
   │      All writes successful?       │
   └───────┬──────────────────────────┘
           │                │
          YES               NO
           │                │
  Commit cache update   Rollback optimistic UI
  Log success in        Log failure in sync_logs
  sync_logs             Show error toast
  Show success toast
```

### 10.3 ClickUp Webhook Flow (real-time updates)

```
ClickUp event occurs (task created / status changed)
           │
           ▼
POST → /api/webhooks/clickup (back-office endpoint)
           │
           ▼
Verify webhook signature (HMAC-SHA256 with CLICKUP_WEBHOOK_SECRET)
           │
           ▼
Parse event type:
  - task_created → trigger US-AUTO-01 + US-AUTO-02
  - task_updated (status) → update projects.clickup_status
                          → update Excel tracker status column (async)
  - task_updated (due_date) → update projects deadline in cache
           │
           ▼
Invalidate relevant sync_cache entries
           │
           ▼
Log event in sync_logs
           │
           ▼
Return HTTP 200 to ClickUp (within 5s to avoid webhook retry)
```

### 10.4 Status Mapping: ClickUp ↔ Excel ↔ Back-office Display

**Project Status** (from ClickUp):

| ClickUp Status | Excel "Status" column | Back-office badge | Badge color |
|---|---|---|---|
| `Open` | In progress | Open | Gray |
| `in progress` | In progress | In Progress | Blue |
| `review` | In progress | Review | Purple |
| `Closed` | Delivered | Closed | Green |

**Invoice Status** (from Evoliz — separate dimension):

| Evoliz Status | Excel "Invoice Status" column | Back-office badge | Badge color |
|---|---|---|---|
| No invoice | — | Open PO | Gray |
| Invoice created | Sent | Invoiced | Blue |
| Paid | Paid | Paid | Green |
| Overdue | Unpaid | Overdue | Red |

*Updated 2026-03-25: Real statuses from live API exploration (see Addendum A.2). Thomas confirmed dual-status model: project lifecycle + invoice lifecycle.*

---

## 11. New Project Automation Flow

```
Trigger: ClickUp webhook (task_created) OR manual "Create project" in back-office
           │
           ▼
Step 1 — Identify client
  Parse task name or list name for client identifier
  Look up client_trackers table for matching client
  If no match → flag as "unmatched", alert admin, STOP automation
           │
           ▼
Step 2 — Add row to Excel tracker (parallel with Step 3)
  Open client's Excel file via Graph API
  Append new row with:
    - Project = ClickUp task name
    - Date = today
    - Status = "Open PO"
    - ClickUp task ID stored in notes/hidden column
    - All other columns = blank
  If Excel locked → queue write (retry every 30s, max 5 attempts)
           │
           ▼
Step 3 — Create SharePoint folder (parallel with Step 2)
  Sanitize project name (remove special chars)
  Create folder at: [base_path]/[Client]/[Project name]/
  If folder exists → get existing URL (no duplicate)
           │
           ▼
Step 4 — Write SharePoint folder URL back to Excel row
  PATCH the Link column cell with the new folder URL
           │
           ▼
Step 5 — Update back-office local cache
  Upsert project record in PostgreSQL
  Invalidate sync_cache for this client's tracker
           │
           ▼
Step 6 — Notify admins
  In-app notification (back-office notification bell)
  [HYPOTHESIS: email notification optional — see OQ-9]
           │
           ▼
Log all steps in sync_logs
```

**Rollback strategy**: Steps 2 and 3 run in parallel. If Step 2 fails but Step 3 succeeds (folder created, no tracker row) → admin is alerted to add the row manually and the folder URL is provided. If Step 3 fails but Step 2 succeeds (tracker row created, no folder) → Link column left empty, admin can trigger "Create folder" manually from the project row.

---

## 12. Environment Variables and Configuration

### Required Environment Variables

| Variable | Description | Where used |
|---|---|---|
| `CLICKUP_API_KEY` | ClickUp personal API token | All ClickUp API calls |
| `CLICKUP_WORKSPACE_ID` | ClickUp workspace (team) ID | Scoping API calls to the right workspace |
| ~~`CLICKUP_LIST_ID`~~ | **NOT NEEDED** — app fetches all Spaces (one per client), each with multiple Lists | — |
| `CLICKUP_WEBHOOK_SECRET` | HMAC secret for webhook signature verification | Webhook endpoint security |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID for OAuth2 | Graph API auth |
| `MICROSOFT_CLIENT_ID` | Azure AD app registration client ID | Graph API auth |
| `MICROSOFT_CLIENT_SECRET` | Azure AD app registration client secret | Graph API auth |
| `SHAREPOINT_BASE_URL` | `https://saranistudio-my.sharepoint.com/` | SharePoint base path |
| `SHAREPOINT_DRIVE_ID` | OneDrive for Business drive ID (fetched via Graph API once, then stored) | All file operations |
| `SHAREPOINT_TRACKERS_PATH` | `/personal/team_sarani_studio/Documents/00. Administrative/03. Financials (Trackers)/` | Tracker file location |
| `EVOLIZ_API_KEY` | Evoliz API key | All Evoliz API calls |
| `EVOLIZ_COMPANY_ID` | Evoliz company identifier | Scoping API calls |

### Microsoft Graph API — Authentication Setup

The app registration in Azure AD must have the following **Application permissions** (not delegated):
- `Files.ReadWrite.All` — read and write Excel files in SharePoint
- `Sites.ReadWrite.All` — access SharePoint sites
- `User.Read.All` — resolve ClickUp assignee names (if cross-referenced with Microsoft users) [HYPOTHESIS: may not be needed — see OQ-11]

[HYPOTHESIS: the service account `team_sarani_studio` must have write permissions on the trackers folder — Thomas to verify with IT/Microsoft admin — see OQ-12]

### Configuration Storage

API credentials are stored exclusively in environment variables (Replit Secrets). They are never stored in the database or committed to Git. The `client_trackers` table stores SharePoint file paths (not credentials).

---

## 13. Graceful Degradation and Fallback UI

### 13.1 Per-API Fallback Matrix

| Scenario | User-facing behavior | Technical behavior |
|---|---|---|
| ClickUp API down | Yellow banner: "ClickUp data may be outdated — last sync: [T]". Status badges shown in gray with "?" icon. Edit status disabled. | Serve sync_cache. Log health failure. Retry in background every 2 minutes. |
| SharePoint / Graph API down | Yellow banner: "SharePoint data may be outdated — last sync: [T]". Edit buttons disabled. Download links still work if cached. | Serve sync_cache for reads. Queue writes (hold in pending_writes table) for retry when API recovers. |
| Evoliz API down | Invoice status columns show gray "—" with tooltip: "Evoliz unavailable". Financial summary section hidden. | Serve sync_cache for invoice data. No writes to Evoliz from back-office anyway (read-only). |
| All 3 APIs down simultaneously | Dashboard shows full cached data with global warning: "All external integrations offline — showing data from [oldest timestamp]". | Serve all caches. Alert admins via in-app notification. |
| Cache is empty AND API down | Error state per section with manual refresh button. No blank screens — always show the error clearly. | Return HTTP 200 with error payload (not 500) — prevents Next.js error boundary from swallowing the message. |
| ClickUp webhook fails to deliver | Polling fallback activates: refresh every 5 minutes. | Webhook failure is logged. Polling resumes automatically. Alert admin if webhook fails for >1 hour. |

### 13.2 Pending Writes Queue

When a write operation fails due to API unavailability, it is stored in a `pending_writes` table for retry:

```sql
CREATE TABLE pending_writes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target      TEXT NOT NULL,        -- 'sharepoint' | 'clickup' | 'evoliz'
  operation   TEXT NOT NULL,        -- 'update_row' | 'create_folder' | 'update_status'
  payload     JSONB NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL DEFAULT 'pending'  -- 'pending' | 'success' | 'failed'
);
```

A background job (Replit cron or Next.js route handler triggered by timer) processes pending writes every 2 minutes.

### 13.3 UI States for Integration Features

Every integration-dependent section must implement these 4 states:

| State | Trigger | UI |
|---|---|---|
| **Loading** | API fetch in progress | Skeleton loader (not spinner — avoids layout shift) |
| **Live data** | API success within TTL | Data displayed normally, "Last synced: X min ago" |
| **Stale data** | API failed, cache serving | Data displayed + yellow warning banner |
| **No data** | Cache empty + API failed | Empty state with refresh button + error message |

---

## 14. Risks

| Risk ID | Risk | Severity | Probability | Mitigation |
|---|---|---|---|---|
| R-01 | ClickUp API rate limit (100 req/min) hit by bulk tracker load (8 clients × N projects) | High | Medium | Cache aggressively (5 min TTL). Paginate requests. Batch task fetches by list. Never poll faster than TTL. |
| R-02 | SharePoint Excel file locked by concurrent editor (Microsoft 365 lock) | High | Medium | Detect 423 Locked response. Surface clear message to user. Queue write for retry. Never silently drop writes. |
| R-03 | Microsoft Graph API token expiry mid-session | Medium | High | Implement token refresh (client_credentials flow — tokens expire every 60 min). Refresh proactively at 50 min. Cache access token in memory. |
| R-04 | Excel tracker file renamed or moved by Sarani team | High | Low | Store file path in `client_trackers`. If 404 detected → alert admin immediately with exact path that failed. |
| R-05 | ClickUp project name ≠ Excel project name (matching breaks) | Critical | Medium | This is the only join key between ClickUp and Excel. Thomas must enforce a naming convention. See OQ-3. |
| R-06 | Evoliz PO reference format inconsistency (manual entry in Excel) | High | Medium | Normalize PO numbers before Evoliz query (trim whitespace, uppercase, remove special chars). Log all "not found" cases for admin review. |
| R-07 | PDF generation library incompatible with Replit environment | Medium | Low | Test PDF library (Puppeteer / pdf-lib / @react-pdf/renderer) in Replit before committing to implementation. Puppeteer may require headless Chrome — validate available on Replit. [HYPOTHESIS: pdf-lib preferred as it has no Chrome dependency — confirm with @fullstack] |
| R-08 | SharePoint quota exceeded (file writes on free/limited OneDrive plan) | Low | Low | Verify OneDrive for Business storage quota with Thomas before implementation. |
| R-09 | Webhook endpoint publicly reachable on Replit URL | High | Certain | Webhook endpoint `/api/webhooks/clickup` MUST verify HMAC-SHA256 signature on every request. Reject requests with invalid signatures (return 401). |
| R-10 | Data loss if Replit restarts during a pending write | Medium | Medium | Pending writes are persisted in PostgreSQL (not in-memory). Replit restart recovers automatically on next background job run. |

---

## 15. Open Questions for Thomas

These questions are blockers or near-blockers for implementation. Answers required before development begins on each affected feature.

| ID | Question | Blocks | Priority |
|---|---|---|---|
| OQ-1 | Can `user` (client manager) role see ALL clients or only their assigned clients in the tracker? | US-TRACK-01 permissions, US-CLICK-01, US-SP-03 | P0 — before any user role scoping |
| OQ-2 | What are the exact filenames of the 8 client Excel trackers in SharePoint? (e.g. `Sony_Tracker.xlsx` or `TRACKER_SONY_2026.xlsx`) | `client_trackers` table seed data, US-SP-01 | P0 — before SharePoint integration |
| OQ-3 | How should we match a ClickUp task to an Excel tracker row? Option A: exact project name match. Option B: custom field in ClickUp stores a project code that also appears in Excel. Option C: manual linking in back-office UI. | US-TRACK-01 (join logic), US-AUTO-01, R-05 | P0 — most critical design decision |
| OQ-4 | What is the exact SharePoint folder structure for project folders? Is it: `[Trackers base path]/[Client name]/[Project name]/` or a different hierarchy? | US-AUTO-02 | P0 — before automation feature |
| OQ-5 | Can you provide the complete column mapping for columns Q through AX of the Excel tracker? (asset types, unit prices, column letters) | `tracker_line_items` table, US-QUOTE-01 pricing table | P0 — before quote generator |
| OQ-6 | Where should generated quote PDFs be stored? Options: A) PostgreSQL only (no file storage). B) SharePoint (in the project folder). C) Replit local storage (ephemeral — not recommended). | `quotes` table design, US-QUOTE-01 | P1 |
| OQ-7 | Is optimistic locking needed for concurrent Excel edits? (Two admins editing the same row simultaneously.) For v1, last-write-wins is simpler — is that acceptable? | US-SP-02 | P1 |
| OQ-8 | Please validate the ClickUp ↔ Excel status mapping table in Section 10.4. Is the mapping correct? Are there additional ClickUp statuses in your workspace? | US-CLICK-01 display, Section 10.4 | P0 — before any status display |
| OQ-9 | Should admins receive an email notification when a new project is auto-created (US-AUTO-01)? Or is in-app notification sufficient? | US-AUTO-01 notifications | P2 |
| OQ-10 | Does Sarani use one ClickUp list per client, one list for all clients, or something else (folders, spaces)? | `CLICKUP_LIST_ID` env var, API query scope | P0 — before ClickUp integration |
| OQ-11 | Is the CEO signature on quotes a static text block, a digital signature image, or something else? | US-QUOTE-01 PDF template | P1 |
| OQ-12 | Does the Azure AD app registration for Graph API already exist for Sarani? If not, who has Microsoft admin rights to create it? | All SharePoint integration | P0 — infrastructure prerequisite |

---

## 16. Hypotheses to Validate

| ID | Hypothesis | Impact if wrong | Validate with |
|---|---|---|---|
| H-01 | Each Excel tracker file is named after the client (e.g. `Sony_Tracker.xlsx`) | Client-to-tracker mapping breaks at initialization | Thomas — confirm exact filenames (OQ-2) |
| H-02 | ClickUp tasks and Excel rows are matched by exact project name | The join between ClickUp and Excel is the most critical technical dependency. A mismatch means split data. | Thomas — validate matching strategy (OQ-3) |
| H-03 | SharePoint project folders live at `[Trackers base path]/[Client]/[Project]/` | Auto-created folders go to wrong location | Thomas — confirm folder hierarchy (OQ-4) |
| H-04 | The status mapping ClickUp OPEN → Excel "Open PO" is correct (Section 10.4) | Status display misleads admins | Thomas — validate full mapping table (OQ-8) |
| H-05 | `pdf-lib` (no headless Chrome dependency) is the correct PDF library for Replit | PDF generation fails in Replit environment | @fullstack — test in Replit before implementation |
| H-06 | Last-write-wins is acceptable for concurrent Excel edits (v1) | Data loss if two admins edit the same row simultaneously | Thomas — confirm team size and usage patterns (OQ-7) |
| H-07 | The 8 client trackers all have the same column structure (same columns Q-AX pricing grid) | Quote generator breaks for clients with different column layouts | Thomas — provide all 8 tracker files for review (OQ-5) |
| H-08 | `user` role should see only their assigned clients (principle of least privilege) | If users need cross-client visibility, the permission model changes significantly | Thomas — confirm intended user role scope (OQ-1) |

---

## ADDENDUM — API Exploration Results (2026-03-25)

All data below was obtained by live API calls. This resolves most Open Questions and validates/invalidates Hypotheses.

### A.1 ClickUp Workspace Structure (OQ-10 RESOLVED)

Sarani uses **one Space per client** (not one list). Each Space contains folderless Lists by division/region.

| Space | ID | Lists (folderless) |
|---|---|---|
| Sony | 90100452675 | Sony France (156 tasks), Sony Professional (49), Sony Europe (105) |
| TikTok | 90050434316 | TBD |
| PICO XR | 90050434327 | TBD |
| Ubi | 90171040997 | TBD |
| Brand Native | 90050436581 | TBD |
| Aujan | 90171121804 | TBD |
| Bose | 90171343766 | TBD |
| Other customers | 90050435651 | TBD |
| Sarani | 90050433950 | TBD |
| CMC Markets | 90172572190 | TBD |
| Lamarck | 90172906076 | TBD |
| Aristocrat | 90174878459 | TBD |

**Consequence**: No single `CLICKUP_LIST_ID` env var needed. The app must fetch all Spaces, then iterate Lists per Space. The Space name = Client name mapping.

### A.2 ClickUp Statuses (OQ-8 RESOLVED)

All Spaces share the same 4 statuses:

| ClickUp Status | Type | Color | → Excel Project Status | → Excel Invoice Status |
|---|---|---|---|---|
| `Open` | open | #87909e | In progress | — |
| `in progress` | custom | #1090e0 | In progress | — |
| `review` | custom | #5f55ee | In progress | Open PO |
| `Closed` | closed | #008844 | Delivered | — |

**Note**: Thomas specified a dual-status model: Project Status (`Open` / `In progress` → `Submitted` → `Closed`) AND Invoice Status (`Open PO` → `Invoiced` → `Paid`). ClickUp has only project-level statuses. Invoice status comes from Evoliz only.

### A.3 ClickUp Custom Fields

Discovered on Sony France list (consistent across workspace):

| Field Name | Type | ID | Usage |
|---|---|---|---|
| `🌐 Contact` | short_text | 83dde580-... | Client contact name → maps to Excel "Contact" column |
| `Folder` | url | 64230d72-... | **SharePoint project folder URL** — this is the link between ClickUp and SharePoint |
| `Project Manager` | users | df65cc18-... | Sarani PM assigned |
| `Priority` | short_text | 8708f0ac-... | 1, 2, 3 scale |
| `Note de transition` | text | 1411a64c-... | Handoff notes |
| `Figma` | short_text | 5a5cebfa-... | Figma link |
| `Google Slides` | url | b6fcca99-... | Slides link |
| `Rating` | emoji | db412289-... | Client satisfaction |
| `Résumé` | text | 9edce6e6-... | Project summary |
| `Message on Lark` | url | b9f02cf3-... | Lark chat link |

**Critical finding**: The `Folder` custom field (URL type) already contains the SharePoint project folder link. This means:
- OQ-3 is PARTIALLY RESOLVED: matching ClickUp → SharePoint is via the `Folder` custom field
- For ClickUp → Excel matching, we still rely on **project name** (Thomas confirmed: flow is always ClickUp → back-office → Excel)

### A.4 SharePoint — Two Sites (OQ-12 RESOLVED)

Azure AD app registration is now active with `Sites.ReadWrite.All` + `Files.ReadWrite.All` permissions (admin consent granted).

| Site | Host | Site ID | Drive ID | Purpose |
|---|---|---|---|---|
| **OneDrive (team@sarani.studio)** | saranistudio-my.sharepoint.com | 08675b24-... | `b!JFtnCBXApE6jsyomGN6hXni64SgHnShCg41yK06ZLObe1kAv17nOTZJFGBX3aH4A` | Financial trackers (Excel files) |
| **SaraniAssets** | saranistudio.sharepoint.com/sites/SaraniAssets | 07d23b05-... | `b!BTvSB7PxVEeCQbtgLKBtdI62eOvL4gFEkH_L6luQY04w7z1UWPKDQ4GDuZJmfD9_` | Project folders + client assets |

### A.5 Excel Tracker Filenames (OQ-2 RESOLVED)

Located at: `OneDrive / Documents / 00. Administrative / 03. Financials (Trackers)/`

| # | Filename | Size |
|---|---|---|
| 0 | `00. Global Overview.xlsx.xlsx` | 35 KB |
| 1 | `01. Sarani_Sony Projects.xlsx` | 795 KB |
| 2 | `02. Sarani_Bytedance Projects.xlsx` | 15.5 MB |
| 3 | `03. Sarani_Other Projects.xlsx` | 119 KB |
| 4 | `04. Sarani_Aristocrat Projects.xlsx` | 83 KB |
| 5 | `09. Sarani_Projets Ubi.xlsx` | 79 KB |
| 6 | `10. Sarani_Aujan Projects.xlsx` | 38 KB |
| 7 | `11. Sarani_Bose Projects.xlsx` | 35 KB |
| 8 | `12. Sarani_Lamarck Projects.xlsx` | 28 KB |
| 9 | `13. Sarani_CMC Markets Project.xlsx` | 19 KB |

Plus sub-folders: `01_Quotes/`, `02_Old/`, `03_Tracker Archivés/`

**Mapping ClickUp Space → Excel Tracker → SharePoint Customer Folder:**

| ClickUp Space | Excel Tracker | SharePoint Customer Folder |
|---|---|---|
| Sony | 01. Sarani_Sony Projects.xlsx | 03. Customers/02. Sony/ |
| TikTok | 02. Sarani_Bytedance Projects.xlsx | 03. Customers/05. TikTok/ |
| Other customers | 03. Sarani_Other Projects.xlsx | 03. Customers/01. Single Projects/ |
| Aristocrat | 04. Sarani_Aristocrat Projects.xlsx | 03. Customers/11. Aristocrat/ |
| Ubi | 09. Sarani_Projets Ubi.xlsx | 03. Customers/17. Ubi/ |
| Aujan | 10. Sarani_Aujan Projects.xlsx | 03. Customers/18. Aujan/ |
| Bose | 11. Sarani_Bose Projects.xlsx | 03. Customers/19. Bose/ |
| Lamarck | 12. Sarani_Lamarck Projects.xlsx | 03. Customers/21.Lamarck/ |
| CMC Markets | 13. Sarani_CMC Markets Project.xlsx | 03. Customers/20. CMC Markets/ |

### A.6 SharePoint Customer Folder Structure (OQ-4 RESOLVED)

```
SaraniAssets / Documents / 03. Customers /
├── 01. Single Projects/ (74 items — one-off projects)
├── 02. Sony/
│   ├── 01. Guidelines & Assets/
│   ├── 02. Sony Europe/
│   ├── 03. Sony France/
│   │   ├── 01. Cross/ (51 items)
│   │   ├── 02. TV-HAV/ (173 items)
│   │   ├── 03. V&S/ (183 items)
│   │   └── ...
│   └── 06. Sony Professional/ (160 items)
├── 05. TikTok/
├── 11. Aristocrat/
├── 17. Ubi/
├── 18. Aujan/
├── 19. Bose/
├── 20. CMC Markets/
└── 21.Lamarck/
```

**For new project automation (US-AUTO-02)**: project folder should be created inside the client's existing subfolder structure. The exact subfolder (e.g. Sony France → `03. V&S/`) must be inferred from the ClickUp List name or selected manually in the back-office.

### A.7 Resolved Open Questions Summary

| OQ | Status | Resolution |
|---|---|---|
| OQ-1 | **OPEN** | Still needs Thomas input: can `user` role see all clients? |
| OQ-2 | **RESOLVED** | 9 tracker files identified (see A.5) |
| OQ-3 | **PARTIALLY RESOLVED** | ClickUp → Excel matching by project name. ClickUp → SharePoint via `Folder` custom field URL. Flow: ClickUp first → back-office → Excel. |
| OQ-4 | **RESOLVED** | Structure: `03. Customers / [XX. Client Name] / [Division] / [Project Folder]` |
| OQ-5 | **PARTIALLY RESOLVED** | Sony tracker columns confirmed. Thomas confirmed pricing grid varies per client. Need to handle per-tracker column mappings. |
| OQ-6 | **OPEN** | Where to store generated PDFs? Recommend: SharePoint (`01_Quotes/` subfolder in Trackers) |
| OQ-7 | **OPEN** | Last-write-wins acceptable for v1? |
| OQ-8 | **RESOLVED** | Real ClickUp statuses: Open / in progress / review / Closed. Invoice status is separate (from Evoliz). |
| OQ-9 | **OPEN** | Email vs in-app notification for auto-created projects |
| OQ-10 | **RESOLVED** | One Space per client, multiple Lists per Space (by division) |
| OQ-11 | **OPEN** | CEO signature format on quotes |
| OQ-12 | **RESOLVED** | Azure AD app registration created, admin consent granted, API access confirmed |

### A.8 Validated/Invalidated Hypotheses

| ID | Status | Notes |
|---|---|---|
| H-01 | **INVALIDATED** | Filenames are `01. Sarani_Sony Projects.xlsx` not `Sony_Tracker.xlsx`. Naming is inconsistent (numbered, some with `Sarani_` prefix). Mapping table provided in A.5. |
| H-02 | **VALIDATED (modified)** | Matching by project name confirmed, but flow is always ClickUp → back-office → Excel (not bidirectional matching). ClickUp `Folder` custom field provides SharePoint link. |
| H-03 | **INVALIDATED** | Project folders are NOT in the Trackers folder. They're in a separate SharePoint site (SaraniAssets), path: `03. Customers/[Client]/[Division]/[Project]/` |
| H-04 | **INVALIDATED** | Real statuses are `Open`, `in progress`, `review`, `Closed` (not OPEN/ON HOLD/SUBMITTED/CLOSED). Invoice status is a separate dimension from Evoliz. |
| H-05 | **OPEN** | pdf-lib still recommended — to test on Replit |
| H-06 | **OPEN** | Last-write-wins — awaiting Thomas confirmation |
| H-07 | **CONFIRMED at risk** | Thomas confirmed pricing grids vary per client. Quote generator must read column headers dynamically from each tracker, not assume a fixed schema. |
| H-08 | **OPEN** | User role scoping — awaiting Thomas |

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/product/phase3-integrations-specs.md`
- Decisions taken:
  - Excel tracker is the master record for project-level data; ClickUp = task-level master; Evoliz = financial master
  - Bidirectional sync for ClickUp and SharePoint; Evoliz is read-only
  - PostgreSQL `sync_cache` table with TTL (5 min ClickUp/Evoliz, 15 min SharePoint) — mandatory for performance and graceful degradation
  - `sync_logs` table mandatory for every write operation — audit trail from day one
  - `pending_writes` table for write retry when APIs are unavailable
  - ClickUp-to-Excel matching: by project name (H-02) — must be validated by Thomas before implementation
  - New project automation: webhook-first, polling-fallback (every 5 min)
  - Quote PDF: server-side generation, snapshot saved to `quotes` table, pdf-lib preferred (no headless Chrome)
  - All API keys server-side only — never exposed to browser
  - Optimistic UI for status updates with instant rollback on failure
  - 4 mandatory UI states for every integration section: Loading / Live / Stale / No data
- Points of attention:
  - **12 open questions (OQ-1 to OQ-12) must be answered by Thomas before coding** — OQ-2, OQ-3, OQ-4, OQ-5, OQ-8, OQ-10, OQ-12 are P0 blockers
  - Microsoft Graph API app registration (OQ-12) is an infrastructure prerequisite — may take several days to provision if not already done
  - R-05 (ClickUp name ≠ Excel name mismatch) is the most critical technical risk — Thomas must enforce naming convention or choose Option B (custom field matching)
  - R-07: Puppeteer may not work on Replit — test pdf-lib or @react-pdf/renderer first
  - Webhook endpoint `/api/webhooks/clickup` must have HMAC signature verification from line 1 (R-09)
  - `tracker_line_items` table requires the full Q-AX column mapping before it can be seeded (OQ-5)
