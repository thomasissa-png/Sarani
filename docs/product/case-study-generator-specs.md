# AI Case Study Generator — Functional Specs

> **Version** : 1.0 — 2026-03-27
> **Owner** : @product-manager
> **Linked to** : `src/data/case-studies.ts`, `src/lib/db/schema.ts`, `docs/product/auth-specs.md`
> **KPI North Star** : 10M€ revenue at 20% EBITDA — this feature accelerates new account acquisition by generating proof-of-value content at scale

---

## Table of Contents

1. [Concept & Problem Statement](#1-concept--problem-statement)
2. [Scoring Algorithm](#2-scoring-algorithm)
3. [User Stories](#3-user-stories)
4. [Data Model](#4-data-model)
5. [API Routes](#5-api-routes)
6. [UI Wireframes & States](#6-ui-wireframes--states)
7. [Integrations](#7-integrations)
8. [Hypotheses to Validate](#8-hypotheses-to-validate)

---

## 1. Concept & Problem Statement

### Problem

Sophie (Head of Marketing, grand compte international) evaluates agencies before signing. The #1 trust signal she needs: proof that Sarani has done it before, at scale, for brands like hers. Today, Sarani's case studies are manually written — slow, inconsistent, and systematically behind the actual work delivered. Result: a sales gap between Sarani's real track record (TikTok, Sony, GEODIS, Adidas…) and what prospects can see.

### Solution

The **AI Case Study Generator** scans all completed projects from ClickUp and media assets from SharePoint, auto-scores each project on its case study potential, and generates four ready-to-publish content pieces for any project scoring >= 70/100. The output feeds directly into `src/data/case-studies.ts` (website), LinkedIn (social proof), email nurturing (for similar prospects), and pitch decks.

### Value to Sarani

- Converts delivered work into pipeline assets automatically — zero manual writing
- Ensures the portfolio is always current (no more "we did this but it's not on the site yet")
- Targets Sophie's trust signals: big brand names, quantified results, relevant sector
- Scales content production without adding headcount

### Scope V1

**In scope :** ClickUp scan, scoring engine, case study generation, LinkedIn post generation, email nurturing generation, pipeline dashboard (suggested → generated → reviewed → published / excluded), manual override on all scores.

**Out of scope V1 :** Slide/pitch deck generation (V2), direct LinkedIn API auto-publish (human validates first), SharePoint asset ingestion beyond metadata (file paths only in V1).

---

## 2. Scoring Algorithm

Every completed ClickUp project receives a score from 0 to 100. Score >= 70 triggers automatic generation.

### Scoring Matrix

| Criterion | Weight | Scoring Logic |
|---|---|---|
| Client Name | 25% | Tier 1 (TikTok, Sony, Adidas, L'Oréal, Pernod Ricard) = 25 pts. Tier 2 (GEODIS, PICO, Air Corsica, France Chimie) = 15 pts. Unknown = 0 pts |
| Project Amount | 20% | > 10 000€ = 20 pts. 5 000–10 000€ = 12 pts. 1 000–5 000€ = 6 pts. < 1 000€ = 0 pts |
| Visual Assets | 20% | >= 10 assets in SharePoint = 20 pts. 3–9 assets = 12 pts. 1–2 assets = 6 pts. 0 assets = 0 pts |
| Project Type | 15% | Campaign / Rebranding / Video Production = 15 pts. Graphic Design / Event = 10 pts. Translation / Presentation = 4 pts |
| Recency | 10% | Completed < 6 months ago = 10 pts. 6–18 months = 6 pts. > 18 months = 2 pts |
| Sector Diversity | 10% | Sector under-represented in current portfolio = 10 pts. Already well covered = 0 pts |

### Score Interpretation

| Range | Status | Action |
|---|---|---|
| 70–100 | Auto-generation | System generates all 4 outputs immediately |
| 40–69 | Suggested | Appears in pipeline as "Suggested" — team reviews manually |
| 0–39 | Ignored | Not surfaced by default — accessible via filters |

### Manual Override

Any team member (role: admin or user) can:
- Force-generate a project below 70
- Exclude a project above 70 from generation
- Edit individual score components (with reason logged)

Score overrides are stored as `scoreOverride: true` with an audit trail.

---

## 3. User Stories

### US-CS-00 — Auto-Scan & Scoring

**As** a Sarani team member,
**I want** the system to automatically scan all completed ClickUp projects and assign each a case study potential score,
**So that** I never miss a high-value project that could become a case study.

**Trigger:** Manual "Run Scan" button (V1) — scheduled daily scan (V2).
**Input:** ClickUp API — all tasks with status "Done" or equivalent completed status.
**Output:** List of scored projects in the pipeline dashboard.

**Acceptance Criteria:**
- [ ] System fetches all ClickUp tasks with status = completed
- [ ] Each task is scored against the 6-criterion matrix
- [ ] Score is stored in DB with timestamp and criterion breakdown
- [ ] Projects with score >= 70 move to "Suggested" status automatically
- [ ] Scan result shows: total scanned, new projects found, score distribution
- [ ] Re-scanning the same project updates the score without creating duplicates

**Edge Cases:**
- ClickUp API timeout → scan fails gracefully, partial results saved, error banner shown
- Project with no client name in ClickUp → Client Name = 0 pts, system flags for manual review
- Project already published as case study → excluded from scan output (no re-generation)

---

### US-CS-01 — Manual Project Selection

**As** a Sarani team member,
**I want** to manually select any ClickUp project and trigger case study generation,
**So that** I can generate content for projects the algorithm didn't surface.

**Acceptance Criteria:**
- [ ] Search bar to find any ClickUp project by name or client
- [ ] Score breakdown visible before triggering generation
- [ ] "Generate anyway" CTA available for projects below 70
- [ ] Generation history logged (who triggered, when)

**Edge Cases:**
- Project has no linked SharePoint assets → generation proceeds, image fields left empty, user warned
- Project is already in pipeline (another status) → system shows current status, asks to confirm override

---

### US-CS-02 — AI Content Generation

**As** a Sarani team member,
**I want** the system to generate case study content, a LinkedIn post, and a nurturing email from the project data,
**So that** I have ready-to-use content without writing anything manually.

**Trigger:** Score >= 70 (auto) OR manual "Generate" action.
**Inputs used:** Client name, project type, deliverables, amount, timeline, outcomes from ClickUp custom fields, SharePoint asset paths.

**Outputs generated:**

| Output | Format | Destination |
|---|---|---|
| Case study | `CaseStudy` object matching `src/data/case-studies.ts` interface | Website |
| LinkedIn post | Hook (1 line) + Story (3–4 lines) + Proof points (stats) + CTA | Social |
| Nurturing email | Subject line + 150-word body + CTA | Email sequences |

**Acceptance Criteria:**
- [ ] Generated case study populates all required fields: `slug`, `client`, `deliverable`, `volume`, `turnaround`, `outcome`, `brief`, `result`, `headline`, `keyMetric`, `stats[3]`, `metaDescription`, `category`
- [ ] Headline follows Formula 2: "Problem → Result" (as documented in `case-studies.ts` line 28)
- [ ] LinkedIn post stays under 1 300 characters (LinkedIn native limit)
- [ ] Nurturing email subject line under 60 characters
- [ ] Generation completes in < 15 seconds (UI shows progress indicator)
- [ ] All generated content stored in DB as `agentOutputs` record with `agentType = "case-study"`

**Edge Cases:**
- Missing quantified outcome in ClickUp → AI uses qualitative language, flags field for human completion
- Client name is confidential (NDA) → system detects NDA flag on client record, blocks generation, prompts team to confirm client approval
- Generation fails (API error) → status stays "Suggested", error logged, retry button shown

---

### US-CS-03 — Preview & Edit

**As** a Sarani team member,
**I want** to preview all generated outputs and edit them before publishing,
**So that** I maintain quality control over what goes live.

**Acceptance Criteria:**
- [ ] Side-by-side preview: case study card (as it appears on website) + raw fields editable
- [ ] LinkedIn post preview with character count
- [ ] Email preview in desktop layout
- [ ] All fields inline-editable (no modal — edit in place)
- [ ] "Save draft" preserves changes without publishing
- [ ] Change history tracked (original AI output vs. edited version)

**Edge Cases:**
- User edits then navigates away without saving → unsaved changes warning modal
- User deletes a required field (e.g. `headline`) → inline validation error, publish blocked

---

### US-CS-04 — One-Click Website Publish

**As** a Sarani admin,
**I want** to publish an approved case study to the website with one click,
**So that** the portfolio stays current without developer intervention.

**Acceptance Criteria:**
- [ ] "Publish to Website" button available from preview screen (admin role only)
- [ ] Publish action appends the `CaseStudy` object to `src/data/case-studies.ts`
- [ ] Published case study immediately visible on `/work` and `/case-studies/[slug]`
- [ ] Slug auto-generated from `client-project-type` pattern, duplicate slugs rejected
- [ ] Status updates to "Published" with timestamp and publisher identity
- [ ] Unpublish action available (removes from `case-studies.ts`, status → "Reviewed")

**Edge Cases:**
- Slug conflict (same client, same project type) → auto-append `-v2`, prompt user to confirm
- `case-studies.ts` write fails (Replit file system error) → publish blocked, error shown, DB status unchanged

---

### US-CS-05 — LinkedIn Post Scheduling

**As** a Sarani team member,
**I want** to copy or export the generated LinkedIn post with one click,
**So that** I can publish it manually on LinkedIn without reformatting.

**Acceptance Criteria:**
- [ ] "Copy to clipboard" button copies formatted post (hook + body + hashtags)
- [ ] "Mark as Published" action updates status in pipeline
- [ ] Post linked to the corresponding case study record
- [ ] No direct LinkedIn API integration V1 (human publishes manually)

---

### US-CS-06 — Nurturing Email Export

**As** a Sarani team member,
**I want** to export the generated nurturing email to use in our email sequences,
**So that** prospects receive proof-of-value content relevant to their sector.

**Acceptance Criteria:**
- [ ] Email export as plain text + HTML (copy buttons for both)
- [ ] Prospect segment suggested by AI based on client sector (e.g. "Tech CMOs" for TikTok case study)
- [ ] "Mark as Used" action tracks which emails have been deployed
- [ ] Export history stored in DB

---

### US-CS-07 — Iteration & Regeneration

**As** a Sarani team member,
**I want** to ask the AI to regenerate a specific output with new instructions,
**So that** I can improve content without rewriting it manually.

**Acceptance Criteria:**
- [ ] "Regenerate" button per output (case study / LinkedIn / email — independently)
- [ ] Instruction field: free text ("Make the headline more punchy", "Focus on the speed angle")
- [ ] Previous version saved before regeneration (version history, max 5 versions)
- [ ] Regeneration uses original project data + user instruction as additional prompt context

**Edge Cases:**
- User regenerates without instruction → system asks "What would you like to change?"
- Regeneration produces output identical to previous → system warns "Output unchanged — try a more specific instruction"

---

### US-CS-08 — Scoring Configuration

**As** a Sarani admin,
**I want** to configure the scoring weights and tier lists,
**So that** the algorithm reflects Sarani's current business priorities.

**Acceptance Criteria:**
- [ ] Admin panel: edit weights for each of the 6 criteria (must sum to 100%)
- [ ] Client tier list editable: add/remove clients from Tier 1 / Tier 2
- [ ] Project type mapping editable: assign score values per project type
- [ ] "Auto-generate threshold" configurable (default: 70)
- [ ] All config changes logged with timestamp and author

---

### US-CS-09 — Pipeline Dashboard

**As** a Sarani team member,
**I want** a visual dashboard showing all projects across pipeline stages,
**So that** I can manage the case study production flow at a glance.

**Acceptance Criteria:**
- [ ] Kanban-style columns: Suggested | Generated | Reviewed | Published | Excluded
- [ ] Each card shows: client name, project type, score, date, thumbnail (if assets available)
- [ ] Filter by: client, score range, project type, date range, status
- [ ] Sort by: score (desc), recency, client name
- [ ] Bulk actions: exclude selected, move to reviewed
- [ ] Count badge per column

---

### US-CS-10 — Auto-Generation Toggle

**As** a Sarani admin,
**I want** to enable or disable automatic generation for score >= 70 projects,
**So that** I can control the pipeline flow during high-volume periods.

**Acceptance Criteria:**
- [ ] Global toggle: "Auto-generate on score >= threshold" ON/OFF
- [ ] When OFF: projects above threshold go to "Suggested" — team triggers generation manually
- [ ] Toggle state persisted in DB, visible in admin panel
- [ ] Last toggled by / timestamp shown

---

### US-CS-11 — Project Exclusion

**As** a Sarani team member,
**I want** to permanently exclude a project from the case study pipeline,
**So that** NDA-protected or strategically sensitive projects never appear in content.

**Acceptance Criteria:**
- [ ] "Exclude" action from any pipeline stage
- [ ] Exclusion requires a reason (dropdown: NDA | Client request | Not representative | Other)
- [ ] Excluded projects never surfaced in future scans (persisted exclusion list)
- [ ] Exclusions reversible by admin only
- [ ] Excluded count visible in dashboard header

---

## 4. Data Model

All tables follow the Drizzle ORM + PostgreSQL pattern from `src/lib/db/schema.ts`.

### Table: `case_study_candidates`

Stores every ClickUp project evaluated by the scanner.

```ts
export const caseStudyCandidates = pgTable("case_study_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  clickupTaskId: text("clickup_task_id").notNull().unique(),
  clientId: uuid("client_id").references(() => clients.id),
  clientName: text("client_name").notNull(),
  projectType: varchar("project_type", { length: 50 }),
  projectAmount: numeric("project_amount"),
  completedAt: timestamp("completed_at"),
  sharePointAssetCount: integer("sharepoint_asset_count").default(0),
  sharePointFolderUrl: text("sharepoint_folder_url"),
  scoreTotal: integer("score_total").notNull(),
  scoreBreakdown: jsonb("score_breakdown"),
  // { clientName: 25, amount: 12, assets: 20, projectType: 10, recency: 6, diversity: 10 }
  scoreOverride: boolean("score_override").default(false),
  scoreOverrideReason: text("score_override_reason"),
  status: varchar("status", { length: 20 }).notNull().default("ignored"),
  // ignored | suggested | generating | generated | reviewed | published | excluded
  excludedReason: varchar("excluded_reason", { length: 50 }),
  excludedBy: text("excluded_by"),
  lastScannedAt: timestamp("last_scanned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_candidates_status").on(table.status),
  index("idx_candidates_score").on(table.scoreTotal),
  index("idx_candidates_client").on(table.clientName),
]);
```

### Table: `case_study_outputs`

Stores generated content — one record per output type per candidate, with full version history.

```ts
export const caseStudyOutputs = pgTable("case_study_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id").notNull()
    .references(() => caseStudyCandidates.id, { onDelete: "cascade" }),
  outputType: varchar("output_type", { length: 20 }).notNull(),
  // case_study | linkedin_post | nurturing_email
  currentVersion: integer("current_version").notNull().default(1),
  content: jsonb("content").notNull(),
  // case_study → full CaseStudy object (matches src/data/case-studies.ts interface)
  // linkedin_post → { hook, body, proofPoints, hashtags, charCount }
  // nurturing_email → { subject, body, ctaText, suggestedSegment }
  versions: jsonb("versions").$type<Array<{
    version: number;
    content: unknown;
    generatedAt: string;
    generatedBy: string;   // "ai" | user id
    instruction?: string;  // regeneration instruction if any
  }>>(),
  publishedAt: timestamp("published_at"),
  publishedBy: text("published_by"),
  caseStudySlug: text("case_study_slug"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_outputs_candidate").on(table.candidateId),
  index("idx_outputs_type").on(table.outputType),
]);
```

### Table: `scoring_config`

Admin-configurable scoring weights, tier lists, and thresholds. Single-row table (upsert pattern).

```ts
export const scoringConfig = pgTable("scoring_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  weightClientName: integer("weight_client_name").notNull().default(25),
  weightAmount: integer("weight_amount").notNull().default(20),
  weightAssets: integer("weight_assets").notNull().default(20),
  weightProjectType: integer("weight_project_type").notNull().default(15),
  weightRecency: integer("weight_recency").notNull().default(10),
  weightDiversity: integer("weight_diversity").notNull().default(10),
  tier1Clients: jsonb("tier1_clients").$type<string[]>(),
  tier2Clients: jsonb("tier2_clients").$type<string[]>(),
  projectTypeScores: jsonb("project_type_scores"),
  // { "Campaign": 15, "Rebranding": 15, "Video Production": 15, "Translation": 4, ... }
  autoGenerateThreshold: integer("auto_generate_threshold").notNull().default(70),
  autoGenerateEnabled: boolean("auto_generate_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});
```

---

## 5. API Routes

All routes under `/api/admin/case-studies/`. Auth required (session cookie). Role `user` = read + generate + review. Role `admin` = all + publish + config + exclusion reversal.

### Scanner

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/admin/case-studies/scan` | Trigger ClickUp scan + scoring | user |
| GET | `/api/admin/case-studies/scan/status` | Last scan result + timestamp | user |

**POST /scan response:**
```json
{
  "scanned": 47,
  "newCandidates": 12,
  "autoGenerated": 3,
  "errors": [],
  "completedAt": "2026-03-27T10:00:00Z"
}
```

### Pipeline

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/case-studies/candidates` | List with filters + pagination | user |
| GET | `/api/admin/case-studies/candidates/:id` | Single candidate + all outputs | user |
| PATCH | `/api/admin/case-studies/candidates/:id` | Update status, override score | user |
| POST | `/api/admin/case-studies/candidates/:id/exclude` | Exclude with reason | user |
| DELETE | `/api/admin/case-studies/candidates/:id/exclude` | Reverse exclusion | admin |

**GET /candidates query params:** `?status=suggested&minScore=40&client=TikTok&page=1&limit=20&sort=score_desc`

### Generation

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/admin/case-studies/candidates/:id/generate` | Generate all 3 outputs | user |
| POST | `/api/admin/case-studies/outputs/:id/regenerate` | Regenerate 1 output with instruction | user |
| PATCH | `/api/admin/case-studies/outputs/:id` | Save edited content (draft) | user |
| POST | `/api/admin/case-studies/outputs/:id/publish` | Publish case study to website | admin |
| DELETE | `/api/admin/case-studies/outputs/:id/publish` | Unpublish from website | admin |

**POST /generate request body:** `{ "force": false }` — `force: true` bypasses the >= 70 threshold.

**POST /regenerate request body:** `{ "instruction": "Make the headline more punchy — focus on the speed angle" }`

### Config

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/case-studies/config` | Get current scoring config | admin |
| PATCH | `/api/admin/case-studies/config` | Update weights, tier lists, thresholds | admin |

---

## 6. UI Wireframes & States

All screens live under `/admin/case-studies/`. Navigation entry: "Case Studies" in the admin sidebar.

### Screen 1 — Pipeline Dashboard (`/admin/case-studies`)

**Layout:** Full-width kanban. 5 columns: Suggested | Generated | Reviewed | Published | Excluded.

**Card anatomy:**
```
┌─────────────────────────────┐
│ [Thumbnail or sector icon]  │
│ TikTok — Video Production   │
│ Score: 87/100  ████████░░   │
│ Completed: 2026-01-15       │
│ [Generate]  [Exclude]       │
└─────────────────────────────┘
```

**States per column:**
- Default: cards sorted by score desc
- Empty: "No projects in this stage. Run a scan to populate the pipeline." + [Run Scan] button
- Loading (scan running): skeleton cards + progress bar "Scanning ClickUp... 23/47 projects"
- Error (scan failed): error banner "Scan failed — ClickUp API unreachable. [Retry]"
- Success (scan complete): toast "Scan complete — 12 new projects found, 3 auto-generated"

**Filter bar (top):** Client | Score range | Project type | Date range | Sort

**Header:** "Case Study Pipeline" — [Run Scan] [Last scan: 2026-03-27 09:42] — count badges per column

---

### Screen 2 — Candidate Detail + Preview (`/admin/case-studies/:id`)

**Layout:** 2-column split. Left: score breakdown + project metadata. Right: tabbed output previews.

**Left panel — Score breakdown:**
```
Client Name     TikTok          25/25
Project Amount  €22,000         20/20
Visual Assets   14 assets       20/20
Project Type    Video Production 15/15
Recency         8 months ago    6/10
Sector Diversity Tech (covered)  0/10
─────────────────────────────────────
TOTAL                           86/100
```
Override button (pencil icon) → opens score component editor with reason field.

**Right panel — Tabs:** Case Study | LinkedIn Post | Nurturing Email

**Case Study tab states:**
- Not generated: "Not yet generated" + [Generate All Outputs] button
- Generating: spinner + "Generating case study... (est. 10–15s)"
- Generated: all fields shown in a card matching the website `CaseStudy` interface, each field inline-editable
- Error: "Generation failed. [Retry]" + error detail collapsed

**LinkedIn Post tab states:**
- Generated: formatted post preview, character counter (e.g. "847 / 1300"), [Copy to Clipboard] [Mark as Published] [Regenerate]
- Regenerate → instruction field appears inline

**Nurturing Email tab states:**
- Generated: subject line + body preview, suggested segment badge (e.g. "Tech CMOs"), [Copy HTML] [Copy Text] [Mark as Used]

**Action bar (bottom right):**
- Before publish: [Save Draft] [Mark as Reviewed] [Publish to Website ↑] (admin only)
- After publish: [View on Website ↗] [Unpublish]

---

### Screen 3 — Scoring Config (`/admin/case-studies/config`)

**Layout:** Single-column form, admin only.

**Sections:**
1. Scoring weights (6 sliders, live sum indicator — turns red if != 100%)
2. Client tier lists (Tier 1 / Tier 2 — tag inputs, add/remove)
3. Project type scores (table: project type | score, editable)
4. Auto-generation settings (threshold slider + enable/disable toggle)
5. Save button + "Last updated by [name] on [date]"

**States:**
- Weights sum != 100%: save button disabled, inline warning "Weights must sum to 100%"
- Save success: toast "Config saved"
- Unsaved changes: navigation-away warning modal

---

## 7. Integrations

### ClickUp API

- **Auth:** API key stored as env var `CLICKUP_API_KEY` (same pattern as existing `clickupProjectId` on `clients` table)
- **Endpoints used:**
  - `GET /team/{team_id}/task?statuses[]=complete` — fetch all completed tasks
  - `GET /task/{task_id}` — fetch task detail (custom fields, assigned team, dates)
- **Custom fields mapped:**
  - `client_name` → `clientName`
  - `project_type` → `projectType`
  - `contract_amount` → `projectAmount`
  - `completion_date` → `completedAt`
- **Rate limit:** ClickUp API = 100 req/min. Scanner implements a 700ms delay between batches of 50 tasks.
- **Fallback:** If a custom field is missing → field defaults to null, scoring criterion scores 0 pts, flagged in scan report.

### SharePoint

- **V1 scope:** Asset count + folder URL only. No file download, no thumbnail generation.
- **Auth:** Microsoft Graph API — service account credentials as env vars `SHAREPOINT_TENANT_ID`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`
- **Endpoint:** `GET /drives/{drive_id}/root:/{folder_path}:/children?$count=true`
- **Matching logic:** ClickUp task name → SharePoint folder name (fuzzy match, confidence >= 0.8)
- **Fallback:** No matching folder found → `sharePointAssetCount = 0`, no blocking error

### AI Generation (LLM)

- **Model:** Claude claude-sonnet-4-6 (matches project stack and cost profile — see `CLAUDE.md` Stratégie de modèles)
- **Prompt structure:**
  - System prompt: Sarani brand voice, output format constraints, CaseStudy TypeScript interface
  - User prompt: project data JSON (client, type, amount, deliverables, outcomes, asset count)
  - Output: structured JSON matching the target interface
- **Validation:** Zod schema validation on LLM output before DB write. If validation fails → retry once, then error state.
- **Cost estimate:** [HYPOTHESE : ~2,000 tokens per generation call (3 outputs) × Claude Sonnet pricing — to validate with @ia before launch]
- **Timeout:** 30s max. If exceeded → status = error, user notified.

### Website Publication (case-studies.ts)

- **Mechanism:** On "Publish to Website", the API reads `src/data/case-studies.ts`, appends the new `CaseStudy` object to the `caseStudies` array, and writes the file back. Next.js static generation picks up the change on next build/reload.
- **Slug validation:** Regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` enforced. Auto-generated from `${clientSlug}-${projectTypeSlug}`.
- **Duplicate protection:** Grep for existing slug before write. Conflict → append `-v2` and prompt confirmation.
- **Rollback:** Unpublish reads the file, finds the object by slug, removes it, writes back.

---

## 8. Hypotheses to Validate

These assumptions are embedded in the design and must be validated before V2 roadmap decisions.

| # | Hypothesis | Risk if wrong | How to validate |
|---|---|---|---|
| H1 | ClickUp projects have consistent custom fields (client_name, contract_amount, project_type) populated for >= 80% of completed tasks | Scoring accuracy degrades — many projects score 0 on 2-3 criteria | Audit 20 recent ClickUp tasks before launch |
| H2 | SharePoint folder names match ClickUp task names with >= 80% fuzzy-match accuracy | Asset score unreliable — most projects score 0 on the visual assets criterion | Test fuzzy matching against 20 real project pairs |
| H3 | AI generates a valid CaseStudy JSON (Zod-passing) on first attempt >= 90% of the time | High retry rate → higher LLM costs + slower generation UX | Monitor validation failure rate in first 50 generations |
| H4 | [HYPOTHESE : cost per generation ~$0.02–0.05 per project (3 outputs)] | Budget impact if significantly higher | Measure token usage on first 10 generations |
| H5 | Team members (Thomas + ops lead) will review generated content before publishing >= 90% of the time | Quality risk: unreviewed AI content goes live on sarani.studio | Process audit after first 2 weeks of use |
| H6 | The >= 70 score threshold correctly surfaces the "right" projects (as judged by Thomas) | Pipeline flooded with low-quality suggestions OR high-value projects missed | Thomas reviews first scan output and adjusts threshold |

---

## Recommended Specialized Agents

| Agent proposed | Type | Role | Justification | Priority |
|---|---|---|---|---|
| @clickup-data-auditor | Expert tool | Audit ClickUp custom field coverage across all completed tasks | US-CS-00 — scoring accuracy depends entirely on data quality; a generic QA agent cannot assess ClickUp field completeness | High |
| @case-study-validator | Testeur persona | Evaluates each generated case study as Sophie (Head of Marketing) would — would this content make her trust Sarani? | US-CS-02, US-CS-03 — AI-generated content must pass the Sophie trust test before going live on sarani.studio | High |

### Specs for @agent-factory

**@clickup-data-auditor**
- Inputs: ClickUp API key + list of completed tasks
- Outputs: field coverage report (% populated per custom field), list of tasks with missing critical fields, recommended field mapping
- Success criterion: >= 80% field coverage confirmed before launch

**@case-study-validator**
- Inputs: generated `CaseStudy` JSON + LinkedIn post + nurturing email
- Outputs: pass/fail per output + specific improvement recommendations framed as Sophie's reactions
- Success criterion: every published case study receives a PASS from the validator before it goes live

---

## Hypotheses to Validate (summary block)

- [HYPOTHESE : cost per generation ~$0.02–0.05 per project (3 outputs) — to validate with @ia]
- [HYPOTHESE : ClickUp field coverage >= 80% — to validate with @clickup-data-auditor pre-launch]
- [HYPOTHESE : SharePoint fuzzy match >= 80% accuracy — to validate in integration testing]
- [HYPOTHESE : AI generates valid Zod-passing JSON >= 90% first-attempt rate — to measure in first 50 generations]

---

**Handoff → @fullstack**

- Files produced: `/home/user/Sarani/docs/product/case-study-generator-specs.md`
- Decisions taken:
  - Scoring matrix: 6 criteria, weights defined, threshold 70/100, configurable by admin
  - Pipeline statuses: ignored | suggested | generating | generated | reviewed | published | excluded
  - 3 outputs per project: CaseStudy object (maps to `src/data/case-studies.ts`), LinkedIn post, nurturing email
  - V1 excludes: SharePoint asset download, direct LinkedIn API publish, pitch deck generation
  - Auth: user role = generate/review, admin role = publish/config/exclusion reversal
  - LLM: Claude Sonnet (cost-efficient), Zod validation on output, 30s timeout
  - Website publish: writes directly to `src/data/case-studies.ts` (file append pattern)
- Points of attention:
  - `src/data/case-studies.ts` write operation requires atomic file handling (read → validate slug → append → write) to prevent corruption
  - ClickUp scan rate limit: 100 req/min — implement 700ms batch delay
  - SharePoint V1 = metadata only (asset count + folder URL) — no file download
  - NDA flag on client record must block generation (check `clients.signedFrameworkAgreement` field and add a dedicated NDA flag if needed — confirm with Thomas)
  - Scoring config is a single-row table (upsert pattern) — seed with default values on migration
  - All 3 DB tables need migration files before @fullstack can build the routes
