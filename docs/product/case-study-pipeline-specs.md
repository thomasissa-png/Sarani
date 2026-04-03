# Case Study Multi-Agent Pipeline — Delta Specs

> **Version:** 1.0 — 2026-04-03
> **Owner:** @product-manager
> **Language:** English (mandatory — international project)
> **Linked to:**
> - `docs/product/case-study-generator-specs.md` — current V1 system (single-pass generation)
> - `docs/product/project-closure-star-pipeline-specs.md` — Star Pipeline trigger + scoring
> - `docs/strategy/brand-platform.md` — Sarani brand voice (Assured, Direct, Warm)
> **KPI North Star:** 10M€ revenue at 20% EBITDA — this delta converts AI-generated case study content into a multi-channel publishing engine with visual curation and LinkedIn direct-post capability

---

## Table of Contents

1. [Context — Current vs. Target System](#1-context--current-vs-target-system)
2. [Pipeline Architecture — 3-Step LLM Chain](#2-pipeline-architecture--3-step-llm-chain)
3. [DB Delta — New Columns and Tables](#3-db-delta--new-columns-and-tables)
4. [API Routes Delta](#4-api-routes-delta)
5. [LinkedIn API Integration](#5-linkedin-api-integration)
6. [Public Page /case-studies/[slug]](#6-public-page-case-studiesslug)
7. [UI Delta — Updated Detail Screen](#7-ui-delta--updated-detail-screen)
8. [User Stories](#8-user-stories)
9. [Hypotheses to Validate](#9-hypotheses-to-validate)

---

## 1. Context — Current vs. Target System

### Current System (V1 — to be extended, not replaced)

- `POST /api/admin/case-studies/candidates/[id]/generate` calls Claude in a **single pass**, generating 3 outputs simultaneously (case_study, linkedin_post, nurturing_email)
- All 3 outputs land in `case_study_outputs` table as separate rows, same generation timestamp
- LinkedIn: manual copy-to-clipboard only — no direct post capability
- Visuals: not surfaced in the generation flow — SharePoint folder URL stored but no visual selection UI
- Publication: writes directly to `src/data/case-studies.ts` (hardcoded array) — no public URL with slug-based routing
- No dedicated `/case-studies/[slug]` public page (portfolio at `/work` only)

### Target System (this delta)

- **Generate** triggers a **3-step sequential LLM chain**: creative-strategy agent → copywriter agent → social agent
- Each step reads the output of the previous step — not independent parallel calls
- **Visual suggestions**: after generation, SharePoint assets are surfaced for each output channel (case study hero, LinkedIn image, email header); PM selects from modal
- **LinkedIn direct-post**: "Post to LinkedIn" button publishes directly to Sarani LinkedIn page via API (no copy-paste)
- **Per-channel publish**: case study website, LinkedIn, email — each publishable independently
- **Public page**: `/case-studies/[slug]` — dedicated SEO-optimised page per case study (JSON-LD CreativeWork, OG tags)
- **Every generation stored in DB** with full step-by-step intermediate outputs

### What Does NOT Change

- Scoring algorithm (`scoring_config`, `case_study_candidates` table) — unchanged
- Status state machine (ignored → suggested → generating → generated → reviewed → published → excluded) — unchanged
- Regeneration per output with instruction — unchanged
- Admin/user RBAC — unchanged
- `case-studies.ts` write mechanism for website publication — unchanged

---

## 2. Pipeline Architecture — 3-Step LLM Chain

### Overview

When PM clicks **"Generate"** on a candidate (score >= 70 or manual force), the system runs:

```
Step 1 — creative-strategy agent  →  Step 2 — copywriter agent  →  Step 3 — social agent
        ↓                                     ↓                              ↓
  Strategic brief                    Full case study text           LinkedIn post +
  (positioning angle,                (headline, brief,              email subject/body
  key message, target                result, stats, meta)
  audience, tone)
```

Each step stores its intermediate output in DB before proceeding. If any step fails, the pipeline stops at that step — PM can retry from the failed step without restarting the whole chain.

---

### Step 1 — Creative Strategy Agent

**Role:** Defines the strategic angle before any copy is written. Prevents the copywriter from defaulting to generic "we delivered X fast" narratives.

**Input:**
```typescript
interface Step1Input {
  candidateId: string;
  clientName: string;
  projectType: string;
  projectAmount: number;
  completedAt: string;
  sharePointAssetCount: number;
  clickupDeliverables: string;      // raw deliverables from ClickUp task
  clickupOutcomes: string;          // quantified results from ClickUp custom fields
  existingPortfolioSectors: string[]; // to evaluate gap angle
  brandVoice: string;               // "Assured, Direct, Warm" from brand-platform.md
}
```

**System prompt persona:**
> You are Sarani's Creative Strategist. Sarani is an international creative agency (45 experts, 5 continents, 18 languages) delivering enterprise-quality work in 24 hours with unlimited revisions and fixed prices. Your role is to identify the single most compelling strategic angle for this case study — the angle that will make Sophie (Head of Marketing at a large international group) stop scrolling and think "I need this agency." Always prioritise speed + scale + quantified results over aesthetic claims.

**Output (Step 1):**

> **Implementation note:** The actual code uses `StrategyOutputSchema` (Zod) in `src/lib/case-studies/pipeline-prompts.ts`. The schema below matches the implemented version.

```typescript
interface Step1Output {
  angle: string;                    // the storytelling angle — the "why this matters" for Sophie
  keyMessages: string[];            // 2-5 key messages that support the angle with evidence
  visualDirection: string;          // guidance for visual assets (photo style, mood, composition)
  emotionalHook: string;            // the emotional trigger that makes Sophie stop scrolling
  targetAudience: string;           // e.g. "CMOs managing multi-market campaigns under time pressure"
  differentiators: string[];        // 1-5 aspects that make this project uniquely Sarani
}
```

**Stored in DB:** `pipelineSteps` JSONB array column on `case_study_candidates`, element with `step: 1`, `agent: "creative-strategy"`.

---

### Step 2 — Copywriter Agent

**Role:** Writes all text content for the case study and nurturing email, informed by the strategic brief from Step 1.

**Input:** Step 1 output + original candidate data + brand voice guidelines.

**System prompt persona:**
> You are Sarani's Senior Copywriter. You receive a strategic brief and write compelling copy for enterprise audiences. Your audience is Sophie — a Head of Marketing at a large international group under budget and deadline pressure. Write with authority and precision. No fluff. Every sentence earns its place. Use the "Problem → Result" headline formula. Quantify everything that can be quantified. The case study must make Sophie feel that Sarani has already solved a problem just like hers.

**Output (Step 2):**
```typescript
interface Step2Output {
  caseStudy: {
    slug: string;
    client: string;
    deliverable: string;
    volume: string;
    turnaround: string;
    outcome: string;
    brief: string;
    result: string;
    headline: string;              // chosen from Step 1 candidates, refined
    keyMetric: string;
    stats: [string, string, string]; // exactly 3
    metaDescription: string;        // 120-160 chars, SEO-optimised
    category: CaseStudyCategory;
  };
  nurturingEmail: {
    subject: string;               // max 60 chars
    preheader: string;             // max 90 chars
    body: string;                  // 150-200 words
    ctaText: string;
    suggestedSegment: string;      // e.g. "CMOs — FMCG sector"
  };
}
```

**Stored in DB:** `pipelineSteps` JSONB array on `case_study_candidates`, element with `step: 2`, `agent: "copywriter"`.

---

### Step 3 — Social Agent

**Role:** Writes the LinkedIn post, using the case study content and strategic angle as source material. Optimised for LinkedIn native algorithm (engagement over reach).

**Input:** Step 1 + Step 2 outputs + LinkedIn strategy guidelines from `docs/social/linkedin-strategy.md` (if exists) or fallback brand voice.

**System prompt persona:**
> You are Sarani's LinkedIn Content Strategist. You write LinkedIn posts that generate engagement from CMOs and Marketing Directors at large international groups. Your posts follow this structure: Hook (1 line — the unexpected fact), Story (3-4 lines — what happened and why it matters), Proof (2-3 bullet stats), CTA (1 line — soft, not salesy). Maximum 1300 characters. Use line breaks aggressively — no paragraph blocks. The first line must make Sophie stop scrolling.

**Output (Step 3):**

> **Implementation note:** The actual code uses `LinkedInPostSchema` (Zod) in `src/lib/case-studies/schemas.ts`. The schema below matches the implemented version. Visual suggestions are handled separately via the SharePoint visuals API (`GET /api/admin/case-studies/candidates/[id]/visuals`), not as part of the LLM output.

```typescript
interface Step3Output {
  linkedinPost: {
    hook: string;                  // 1 line, < 140 chars — THE opening line
    body: string;                  // narrative text (replaces "story" from original spec)
    proofPoints: string;           // stat bullets as a single formatted string (not array)
    hashtags: string;              // hashtags as a single string (not array)
    charCount: number;
  };
  // Note: visualSuggestions are NOT part of the LLM output.
  // Visuals are fetched from SharePoint via a separate API route and selected manually by PM.
}
```

**Visual selection logic:**
- System fetches files from SharePoint folder (`sharePointFolderUrl` on candidate)
- Filters by image extensions (jpg, jpeg, png, gif, mp4 for LinkedIn)
- Selects up to 6 images per channel (maximum 18 total suggestions)
- Rationale generated by LLM: "This image shows the volume of work delivered — ideal for the scale proof story"

**Stored in DB:** `pipelineSteps` JSONB array on `case_study_candidates`, element with `step: 3`, `agent: "social"`.

---

### Pipeline Execution Flow


```
PM clicks "Generate"
        ↓
candidate.status → "generating"
pipeline_run created (status: "running", started_at: now())
        ↓
Step 1 LLM call (creative_strategy) — timeout: 20s
  → success: step saved to pipeline_steps (step 1), proceed
  → failure: pipeline_run.status = "failed_step_1", PM notified, retry available
        ↓
Step 2 LLM call (copywriter) — timeout: 30s
  → success: step saved (step 2), proceed
  → failure: pipeline_run.status = "failed_step_2", retry from step 2 only
        ↓
Step 3 LLM call (social) + SharePoint visual fetch — timeout: 30s
  → success: step saved (step 3), all outputs assembled
  → failure: pipeline_run.status = "failed_step_3", retry from step 3 only
        ↓
case_study_outputs rows created/updated (3 rows: case_study, linkedin_post, nurturing_email)
candidate.status → "generated"
pipeline_run.status → "completed"
PM notified: "Generation complete — review required"
```

**Total expected duration:** 45–90 seconds for the full chain (3 sequential LLM calls + SharePoint fetch).

**UI behaviour during generation:** Stepper component showing Step 1 / Step 2 / Step 3 with live progress. Each step animates from "Pending" → "Running" → "Done" / "Failed".

---

## 3. DB Delta — New Columns and Tables

### Principle

The existing tables (`case_study_candidates`, `case_study_outputs`, `scoring_config`) are NOT modified in their existing columns. This delta adds new columns and one new table.

> **Implementation note (code-reality delta):** The actual implementation uses a simplified storage approach compared to the spec below. Pipeline steps are stored as a JSONB array in `case_study_candidates.pipelineSteps` (migration `0006_add_pipeline_tracking.sql`), not in separate `pipeline_runs` / `pipeline_steps` tables. Each array element has the shape `{step: number, agent: string, output: object, completedAt: string}`. There is no `pipeline_runs` table — pipeline status is tracked via the existing `status` field on the candidate row. The separate-table design below is retained as the target architecture for future scaling (audit trail, cost tracking per run).

---

### 3.1 — Add to `case_study_candidates`

```typescript
// ADD these columns to the existing caseStudyCandidates table

pipelineRunId: uuid("pipeline_run_id")
  .references(() => pipelineRuns.id),
  // FK to the active pipeline run (null if not yet generated)

pipelineStatus: varchar("pipeline_status", { length: 30 }).default("idle"),
  // idle | running | completed | failed_step_1 | failed_step_2 | failed_step_3

caseStudySlug: text("case_study_slug").unique(),
  // slug used for /case-studies/[slug] — null until published
  // populated from case_study_outputs.caseStudySlug on publish
```

---

### 3.2 — Add to `case_study_outputs`

```typescript
// ADD these columns to the existing caseStudyOutputs table

selectedVisualUrl: text("selected_visual_url"),
  // Anonymous SharePoint "Anyone" link for the PM-selected visual
  // null until PM picks a visual from the Share modal

selectedVisualFileName: text("selected_visual_file_name"),
  // Display name of the selected file (e.g. "TikTok_BTS_Campaign.jpg")

linkedinPostId: text("linkedin_post_id"),
  // LinkedIn API post ID — populated after successful direct-post
  // null if not yet posted or if manually published

linkedinPostedAt: timestamp("linkedin_posted_at"),
  // Timestamp of successful LinkedIn API post

linkedinPostUrl: text("linkedin_post_url"),
  // Full URL to the post on LinkedIn (e.g. https://www.linkedin.com/feed/update/urn:li:share:xxx)
```

---

### 3.3 — New table: `pipeline_runs`

Tracks one pipeline execution per candidate. Enables step-level retry, audit trail, and cost tracking.

```typescript
export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),

  candidateId: uuid("candidate_id").notNull()
    .references(() => caseStudyCandidates.id, { onDelete: "cascade" }),

  status: varchar("status", { length: 30 }).notNull().default("running"),
  // running | completed | failed_step_1 | failed_step_2 | failed_step_3

  triggeredBy: text("triggered_by").notNull(),
  // user id or "auto" (triggered by star pipeline)

  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),

  totalTokensUsed: integer("total_tokens_used"),
  // sum of all 3 step token usages — for cost monitoring

  errorMessage: text("error_message"),
  // last error detail if status = failed_step_X

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_pipeline_runs_candidate").on(table.candidateId),
  index("idx_pipeline_runs_status").on(table.status),
]);
```

---

### 3.4 — New table: `pipeline_steps`

Stores the intermediate LLM output for each step of each pipeline run. Enables per-step retry, debugging, and prompt iteration.

```typescript
export const pipelineSteps = pgTable("pipeline_steps", {
  id: uuid("id").primaryKey().defaultRandom(),

  runId: uuid("run_id").notNull()
    .references(() => pipelineRuns.id, { onDelete: "cascade" }),

  stepNumber: integer("step_number").notNull(),
  // 1 = creative_strategy, 2 = copywriter, 3 = social

  stepType: varchar("step_type", { length: 30 }).notNull(),
  // "creative_strategy" | "copywriter" | "social"

  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // pending | running | completed | failed

  inputSnapshot: jsonb("input_snapshot"),
  // snapshot of input data sent to the LLM (for debugging + replay)

  outputData: jsonb("output_data"),
  // structured output from the LLM (Step1Output | Step2Output | Step3Output)

  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),

  modelUsed: text("model_used").default("claude-sonnet-4-6"),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_pipeline_steps_run").on(table.runId),
  index("idx_pipeline_steps_type").on(table.stepType),
  uniqueIndex("uniq_run_step").on(table.runId, table.stepNumber),
]);
```

---

### 3.5 — Migration file

New migration file: `drizzle/0018_case_study_pipeline.sql`

Operations in order:
1. `CREATE TABLE IF NOT EXISTS pipeline_runs`
2. `CREATE TABLE IF NOT EXISTS pipeline_steps`
3. `ALTER TABLE case_study_candidates ADD COLUMN IF NOT EXISTS pipeline_run_id`, `pipeline_status`, `case_study_slug`
4. `ALTER TABLE case_study_outputs ADD COLUMN IF NOT EXISTS selected_visual_url`, `selected_visual_file_name`, `linkedin_post_id`, `linkedin_posted_at`, `linkedin_post_url`
5. All indexes

---

## 4. API Routes Delta

All routes follow the existing pattern in `docs/product/case-study-generator-specs.md` Section 5. Only new routes and modified routes are listed here.

### 4.1 — Modified Route: Generate

**Before:** `POST /api/admin/case-studies/candidates/[id]/generate` — single-pass, 1 LLM call, 3 outputs.

**After (this delta):** Same route, same request/response contract for the caller. Internally replaced by the 3-step chain. The external API signature does not change — callers (Arya star pipeline trigger, PM button) see no difference.

**New response body (extended):**
```json
{
  "pipelineRunId": "uuid",
  "status": "running",
  "steps": [
    { "stepNumber": 1, "stepType": "creative_strategy", "status": "pending" },
    { "stepNumber": 2, "stepType": "copywriter", "status": "pending" },
    { "stepNumber": 3, "stepType": "social", "status": "pending" }
  ]
}
```

The frontend polls `/api/admin/case-studies/candidates/[id]/pipeline-status` to track progress.

---

### 4.2 — New Route: Pipeline Status

```
GET /api/admin/case-studies/candidates/[id]/pipeline-status
Auth: session cookie (user)
```

**Response:**
```json
{
  "pipelineRunId": "uuid",
  "status": "running",
  "steps": [
    {
      "stepNumber": 1,
      "stepType": "creative_strategy",
      "status": "completed",
      "completedAt": "2026-04-03T10:00:05Z",
      "tokensUsed": 850
    },
    {
      "stepNumber": 2,
      "stepType": "copywriter",
      "status": "running",
      "startedAt": "2026-04-03T10:00:06Z"
    },
    {
      "stepNumber": 3,
      "stepType": "social",
      "status": "pending"
    }
  ],
  "totalTokensUsed": 850,
  "estimatedCompletion": "~40s remaining"
}
```

**Polling interval:** Every 3 seconds while status = "running". Stop polling when status = "completed" | "failed_step_X".

---

### 4.3 — New Route: Retry Failed Step

```
POST /api/admin/case-studies/candidates/[id]/pipeline-retry
Auth: session cookie (user)
Body: { "fromStep": 2 }  // 1 | 2 | 3
```

Restarts the pipeline from the specified step. Steps before `fromStep` are not re-run — their outputs are reused from the last `pipeline_steps` records.

**Response:** Same as generate — `{ pipelineRunId, status, steps }`.

**Validation:** `fromStep` must be the step that failed (matches `pipelineStatus` on candidate). Cannot retry from a step that has not failed.

---

### 4.4 — New Route: Select Visual

```
PATCH /api/admin/case-studies/outputs/[id]/visual
Auth: session cookie (user)
Body: {
  "sharePointFileId": "string",
  "sharePointFileName": "string",
  "channel": "case_study" | "linkedin_post" | "nurturing_email"
}
```

Generates an anonymous SharePoint "Anyone" link for the selected file and stores it in `case_study_outputs.selected_visual_url`.

**Response:**
```json
{
  "selectedVisualUrl": "https://saranistudio.sharepoint.com/...",
  "selectedVisualFileName": "TikTok_Campaign_BTS.jpg"
}
```

**Error cases:**
- SharePoint Graph API unavailable → 503, message "SharePoint temporarily unavailable. Try again."
- File not found → 404, message "File not found in SharePoint."
- Anonymous link creation fails → 500, message "Could not generate shareable link."

---

### 4.5 — New Route: LinkedIn Post

```
POST /api/admin/case-studies/outputs/[id]/linkedin-post
Auth: session cookie (admin)
Body: {
  "imageUrl": "string | null"  // selected_visual_url for the linkedin channel, or null for text-only
}
```

Posts the LinkedIn post content to the Sarani LinkedIn Page via LinkedIn API. On success, stores `linkedin_post_id`, `linkedin_posted_at`, `linkedin_post_url` in `case_study_outputs`.

**Response (success):**
```json
{
  "linkedinPostId": "urn:li:share:7xxxxxxxxxx",
  "linkedinPostUrl": "https://www.linkedin.com/feed/update/urn:li:share:7xxxxxxxxxx",
  "linkedinPostedAt": "2026-04-03T10:15:00Z"
}
```

**Response (error):**
```json
{
  "error": "linkedin_api_error",
  "message": "LinkedIn API returned 401 — access token expired. Re-authenticate in Settings.",
  "action": "reauthenticate"
}
```

---

### 4.6 — New Route: Fetch Visual Suggestions

```
GET /api/admin/case-studies/candidates/[id]/visual-suggestions
Auth: session cookie (user)
Query: ?channel=case_study | linkedin_post | nurturing_email
```

Returns up to 6 SharePoint image suggestions for the specified channel, using the `VisualSuggestion` objects stored in `pipeline_steps` step 3 output.

**Response:**
```json
{
  "suggestions": [
    {
      "sharePointFileId": "abc123",
      "sharePointFileName": "TikTok_Campaign_BTS.jpg",
      "thumbnailUrl": "https://...",
      "suggestedFor": "linkedin",
      "rationale": "This behind-the-scenes image demonstrates team scale — ideal for the volume proof narrative"
    }
  ],
  "total": 4,
  "sharePointFolderUrl": "https://saranistudio.sharepoint.com/..."
}
```

---

## 5. LinkedIn API Integration

### Overview

Thomas confirmed (Session 13): "Post to LinkedIn" button publishes directly to the Sarani LinkedIn Company Page. No copy-paste. No manual step.

### Auth Flow — OAuth 2.0 (Authorization Code)

LinkedIn requires OAuth 2.0 to post on behalf of a LinkedIn Page. Since Sarani has one LinkedIn Page (not a personal profile), the flow authenticates once and stores the token for reuse.

**Step 1 — Admin triggers OAuth in Settings:**
```
Admin → /admin/settings/integrations → "Connect LinkedIn"
  → Redirect to: https://www.linkedin.com/oauth/v2/authorization
      ?response_type=code
      &client_id={LINKEDIN_CLIENT_ID}
      &redirect_uri={LINKEDIN_REDIRECT_URI}
      &scope=w_organization_social%20r_organization_social
      &state={csrf_token}
```

**Step 2 — LinkedIn redirects back:**
```
GET /api/admin/linkedin/callback?code=xxx&state=csrf_token
  → Exchange code for access_token + refresh_token
  → Store encrypted in DB (table: integration_tokens, provider: "linkedin")
  → Admin redirected to /admin/settings/integrations with success toast
```

**Step 3 — Token refresh:**
LinkedIn access tokens expire after 60 days. Refresh tokens expire after 365 days.
- Before any POST to LinkedIn API, check token expiry
- If expired: attempt refresh via `POST https://www.linkedin.com/oauth/v2/accessToken` with `grant_type=refresh_token`
- If refresh fails: surface "LinkedIn authentication expired — reconnect in Settings" error to admin

---

### Required LinkedIn API Scopes

| Scope | Purpose | Required |
|---|---|---|
| `w_organization_social` | Create posts on behalf of a LinkedIn Page (not personal profile) | Yes |
| `r_organization_social` | Read existing posts (for `linkedin_post_url` retrieval) | Yes |

**Note:** The `w_member_social` scope is for personal profiles — NOT used here. Sarani posts as the company page, not as Thomas personally.

**LinkedIn App requirements:**
- App type: "Developer" with "Marketing Developer Platform" product enabled
- Verified LinkedIn Page association required before `w_organization_social` scope is granted
- LinkedIn review may be required for production access — [HYPOTHESE: timeline 2-4 weeks for LinkedIn app review — validate before scheduling launch]

---

### LinkedIn Post API Call

**Endpoint:** `POST https://api.linkedin.com/v2/ugcPosts`

**Request headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Restli-Protocol-Version: 2.0.0
```

**Request body (text-only post):**
```json
{
  "author": "urn:li:organization:{LINKEDIN_ORGANIZATION_ID}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "{linkedin_post.fullText}"
      },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

**Request body (with image):**
```json
{
  "author": "urn:li:organization:{LINKEDIN_ORGANIZATION_ID}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "{linkedin_post.fullText}"
      },
      "shareMediaCategory": "IMAGE",
      "media": [
        {
          "status": "READY",
          "description": { "text": "{case study headline}" },
          "media": "{linkedin_asset_urn}",
          "title": { "text": "{client} — {project type}" }
        }
      ]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

**Image upload flow (if image selected):**
1. `POST https://api.linkedin.com/v2/assets?action=registerUpload` — register asset, receive upload URL
2. `PUT {upload_url}` — binary upload of the image file (fetched from SharePoint URL)
3. Use returned `asset` URN in the ugcPosts request body

**Response (success):**
```json
{
  "id": "urn:li:ugcPost:7xxxxxxxxxx"
}
```

Store `id` as `linkedin_post_id`, construct URL: `https://www.linkedin.com/feed/update/{id}`.

**Rate limits:** LinkedIn API — 3 requests per day per organization for `ugcPosts` on the free Marketing Developer Platform tier. [HYPOTHESE: confirm rate limits for Sarani's LinkedIn app tier — may require partnership tier for higher limits]

**Environment variables required:**
```
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_REDIRECT_URI   # e.g. https://sarani.studio/api/admin/linkedin/callback
LINKEDIN_ORGANIZATION_ID  # Sarani's LinkedIn Company Page ID
```

---

### New Route: LinkedIn OAuth Callback

```
GET /api/admin/linkedin/callback
Auth: none (public — LinkedIn redirects here)
Query: ?code=xxx&state=csrf_token
```

Exchanges code for tokens, stores in DB, redirects admin.

---

### New Route: LinkedIn Connection Status

```
GET /api/admin/linkedin/status
Auth: session cookie (admin)
```

```json
{
  "connected": true,
  "tokenExpiresAt": "2026-06-03T00:00:00Z",
  "organizationName": "Sarani",
  "organizationId": "urn:li:organization:xxxxxxx",
  "lastPostedAt": "2026-04-03T10:15:00Z"
}
```

---

### New table: `integration_tokens`

Stores OAuth tokens for LinkedIn (and future integrations).

```typescript
export const integrationTokens = pgTable("integration_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: varchar("provider", { length: 30 }).notNull().unique(),
  // "linkedin" | future: "instagram"

  accessToken: text("access_token").notNull(),
  // AES-256 encrypted at rest

  refreshToken: text("refresh_token"),
  // AES-256 encrypted at rest

  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),

  organizationId: text("organization_id"),
  // LinkedIn: "urn:li:organization:xxxxxxx"

  connectedBy: text("connected_by").notNull(),
  // user id who performed the OAuth flow

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Security:** Tokens encrypted with AES-256 using `INTEGRATION_ENCRYPTION_KEY` env var. Never stored in plaintext. Never returned to frontend.

Add to migration `0018_case_study_pipeline.sql`.

---

## 6. Public Page /case-studies/[slug]

### Purpose

Each published case study gets a dedicated public page. This replaces the current model where case studies only appear in the `/work` gallery. Sophie (CMO evaluating Sarani) can be sent a direct link to a specific case study — deeper proof than a gallery card.

### Route

```
/case-studies/[slug]
Example: /case-studies/tiktok-video-production
```

**Rendering strategy:** Static Site Generation (SSG) with `generateStaticParams` from `src/data/case-studies.ts`. On publish, Next.js `revalidatePath("/case-studies/[slug]")` triggers ISR revalidation.

---

### Page Structure

```
┌──────────────────────────────────────────────────────┐
│ NAV                                                  │
├──────────────────────────────────────────────────────┤
│ HERO                                                 │
│ [Selected hero image — full width, 16:9]             │
│ Category badge (e.g. "Video & Social")               │
│ Client name                                          │
├──────────────────────────────────────────────────────┤
│ HEADLINE                                             │
│ H1: case_study.headline (Problem → Result formula)   │
│ Subline: case_study.keyMetric                        │
├──────────────────────────────────────────────────────┤
│ STATS ROW (3 columns)                                │
│ stat[0]  |  stat[1]  |  stat[2]                      │
├──────────────────────────────────────────────────────┤
│ PROJECT META (2 columns)                             │
│ Deliverable: {deliverable}                           │
│ Volume: {volume}                                     │
│ Turnaround: {turnaround}                             │
│ Outcome: {outcome}                                   │
├──────────────────────────────────────────────────────┤
│ BRIEF                                                │
│ H2: "The Challenge"                                  │
│ Body: case_study.brief (2-3 paragraphs)              │
├──────────────────────────────────────────────────────┤
│ RESULT                                               │
│ H2: "The Result"                                     │
│ Body: case_study.result                              │
├──────────────────────────────────────────────────────┤
│ CTA BLOCK                                            │
│ "Start your next project" → /contact                 │
├──────────────────────────────────────────────────────┤
│ FOOTER                                               │
└──────────────────────────────────────────────────────┘
```

**Responsive:** Hero image 16:9 on desktop, fills viewport width on mobile. Stats row stacks to 1 column on mobile. Meta grid stacks to 1 column on mobile.

---

### SEO — JSON-LD CreativeWork

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{case_study.headline}",
  "creator": {
    "@type": "Organization",
    "name": "Sarani",
    "url": "https://sarani.studio"
  },
  "about": {
    "@type": "Organization",
    "name": "{case_study.client}"
  },
  "description": "{case_study.metaDescription}",
  "dateCreated": "{publishedAt}",
  "keywords": "{case_study.category}, creative agency, {case_study.client}",
  "url": "https://sarani.studio/case-studies/{case_study.slug}"
}
</script>
```

---

### SEO — Meta Tags

```html
<title>{case_study.headline} | Sarani</title>
<meta name="description" content="{case_study.metaDescription}" />
<link rel="canonical" href="https://sarani.studio/case-studies/{case_study.slug}" />

<!-- Open Graph -->
<meta property="og:title" content="{case_study.headline}" />
<meta property="og:description" content="{case_study.metaDescription}" />
<meta property="og:image" content="{selected_visual_url or fallback OG image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://sarani.studio/case-studies/{slug}" />
<meta property="og:site_name" content="Sarani" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{case_study.headline}" />
<meta name="twitter:description" content="{case_study.metaDescription}" />
<meta name="twitter:image" content="{selected_visual_url or fallback OG image}" />
```

**OG image fallback:** If no `selected_visual_url` exists, use Next.js `ImageResponse` to generate a branded OG image (dark background, Sarani logo, client name, headline). Pattern already established in Session 8 (7 OG images implemented).

---

### 404 Handling

`generateStaticParams` generates paths from `caseStudies` array at build time. After ISR revalidation, new slugs are accessible. Unknown slugs → Next.js default `notFound()` → custom 404 page.

---

### Sitemap Update

Add `/case-studies/[slug]` entries to `sitemap.xml` with:
- `priority: 0.8`
- `changefreq: "monthly"`
- `lastmod: {publishedAt}`

Extend the existing sitemap generator to iterate `caseStudies` array and emit one entry per slug.

---

## 7. UI Delta — Updated Detail Screen

### What Changes on /admin/case-studies/[id]

The existing 2-column layout (score breakdown left, tabbed previews right) is extended — not replaced.

---

### 7.1 — Generation Trigger: Stepper replaces spinner

**Before:** "Generate All Outputs" button → single spinner "Generating... (est. 10–15s)".

**After:** Clicking "Generate" reveals a stepper component inline (below the button, no modal):

```
┌──────────────────────────────────────────────────────────┐
│ Generation Pipeline                                      │
│                                                          │
│  ● Step 1 — Creative Strategy      ✓ Done (4s)          │
│  ● Step 2 — Copywriter             ⟳ Running...         │
│  ○ Step 3 — Social + Visuals       ○ Pending             │
│                                                          │
│  [Cancel]                                                │
└──────────────────────────────────────────────────────────┘
```

States per step: `○ Pending` (grey) | `⟳ Running` (blue, animated) | `✓ Done` (green + elapsed time) | `✗ Failed` (red + [Retry from this step]).

**On completion:** Stepper collapses, tabs become active, PM sees the 3 generated outputs.

---

### 7.2 — Visual Selection: Share Modal per channel

After generation, each output tab shows a "Choose Visual" button. Clicking it opens a slide-over modal (not a separate page):

```
┌───────────────────────────────────────────────────────┐
│ Choose Visual — LinkedIn Post                    [×]  │
│                                                       │
│ AI Suggestions (from SharePoint):                     │
│ ┌──────┐ ┌──────┐ ┌──────┐                           │
│ │ img1 │ │ img2 │ │ img3 │                           │
│ └──────┘ └──────┘ └──────┘                           │
│ "Shows team scale — ideal for volume narrative"       │
│                                                       │
│ Browse SharePoint folder:                             │
│ [Open folder ↗] [Upload new file]                     │
│                                                       │
│ Selected: TikTok_BTS_Campaign.jpg                     │
│ [Confirm Selection]                                   │
└───────────────────────────────────────────────────────┘
```

**Channel-specific modals:** Each of the 3 channels (case study, LinkedIn, email) has its own "Choose Visual" button with its own visual suggestions (up to 6 suggestions per channel, pre-filtered by the social agent in Step 3).

**After selection:** Thumbnail appears in the output tab next to the content. PM can change or remove.

---

### 7.3 — Updated Tab: LinkedIn Post

**Before:** LinkedIn Post tab shows post text + [Copy to clipboard] + [Mark as Published] + [Regenerate].

**After (additional elements):**

```
┌─────────────────────────────────────────────────────────┐
│ LinkedIn Post                                           │
│ 847 / 1300 chars                                        │
│ ─────────────────────────────────────────────────────── │
│ [Post content preview — editable inline]                │
│                                                         │
│ [Selected image or "Choose Visual" button]              │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│ [Copy to clipboard]  [Regenerate]                       │
│                                                         │
│ [Post to LinkedIn ↗]  (admin only)                      │
│ Last posted: never                                      │
└─────────────────────────────────────────────────────────┘
```

**"Post to LinkedIn" button states:**
- Default: "Post to LinkedIn ↗" (visible to admin only)
- Loading: "Posting..." with spinner, button disabled
- Success: button replaced by "Posted ✓ — [View on LinkedIn ↗]" (permanent link)
- Error: error message inline "LinkedIn error — [details]. [Retry] [Reconnect LinkedIn]"
- Already posted: "Posted on [date] — [View on LinkedIn ↗]" + "Post again?" (confirmation required)

**Re-post guard:** If `linkedin_post_id` is already set, "Post to LinkedIn" requires a confirmation dialog: "This will create a new LinkedIn post — the previous one (posted on [date]) will remain live. Continue?"

---

### 7.4 — Updated Tab: Case Study

**Additional element — Hero image selector:**

Below the case study preview card, before the publish action:

```
Hero Image for /case-studies/[slug]:
[Selected thumbnail]  [Change Visual]

[Save Draft]  [Mark as Reviewed]  [Publish to Website ↑]  (admin)
```

**After publish:** "View on Website" link changes to `/case-studies/[slug]` (not `/work` as before).

---

### 7.5 — Action Bar Changes

**Before:**
```
[Save Draft]  [Mark as Reviewed]  [Publish to Website ↑]  (admin)
```

**After:** Per-channel publish actions, separated:

```
Case Study:   [Publish to Website ↑]  or  [Published ✓ — /case-studies/tiktok-video]
LinkedIn:     [Post to LinkedIn ↗]    or  [Posted ✓ — View post]
Email:        [Mark as Used]          or  [Used ✓ — 2026-04-03]
```

Each channel publishes independently. A case study can be live on the website without the LinkedIn post having been sent.

---

### 7.6 — 5 UI States per new element

| Element | Défaut | Loading | Vide | Erreur | Succès |
|---|---|---|---|---|---|
| Pipeline stepper | Hidden (before first generate) | Steps animated during run | N/A — stepper only appears during run | Step X shows ✗ Failed + [Retry from step X] | All steps green, stepper collapses automatically |
| Visual suggestions modal | "Choose Visual" button | "Loading suggestions…" skeleton grid | "No images found in SharePoint folder — [Open folder ↗]" | "Could not load SharePoint images. [Retry]" | Selected thumbnail visible in output tab |
| LinkedIn Post button | "Post to LinkedIn ↗" | "Posting…" (spinner, disabled) | N/A | Inline error + [Retry] + [Reconnect] | "Posted ✓ — [View on LinkedIn ↗]" |
| Per-channel publish bar | Each channel shows [Publish] | N/A (instant state update) | N/A | Error toast per failed channel | Channel shows [Published ✓ + link] |

---

## 8. User Stories

### US-CSP-01 — Run Multi-Step Generation Pipeline

**Persona:** Thomas (Sarani admin — PM role)
**Epic:** Case Study Multi-Agent Pipeline
**Dependencies:** US-CS-02 (existing generation), migration 0018
**Priority RICE:** R=5 I=5 C=4 E=1 → Score=100

#### Job-to-be-done
As Thomas (admin), I want to trigger a 3-step AI pipeline (creative strategy → copywriter → social) so that each generated case study has a strategically grounded angle instead of a generic AI template.

#### Context
- **Origin screen:** `/admin/case-studies/[id]` — candidate detail page, status = "suggested"
- **Trigger:** Click "Generate" button
- **Destination (success):** Same page, stepper completes, all 3 output tabs populated
- **Destination (failure):** Same page, failed step highlighted with [Retry from step X]

#### Data fields — pipeline_runs
| Field | Type | Required | Validation | Limits | Example |
|---|---|---|---|---|---|
| candidateId | uuid | Yes | Valid UUID, references existing candidate | — | "3f1a2b4c-..." |
| triggeredBy | string | Yes | Current session user ID | max 100 chars | "user_thomas" |
| fromStep | integer | No (retry only) | 1, 2, or 3 only | — | 2 |

#### Acceptance Criteria

**Happy path:**
- [ ] GIVEN candidate has status "suggested" WHEN Thomas clicks "Generate" THEN stepper appears with 3 steps in "Pending" state and Step 1 starts immediately
- [ ] GIVEN Step 1 completes WHEN Step 1 LLM returns valid JSON THEN Step 1 shows "Done (Xs)", Step 2 starts automatically, `pipeline_steps` row created for step 1
- [ ] GIVEN all 3 steps complete WHEN pipeline finishes THEN candidate status updates to "generated", all 3 output tabs become active, stepper collapses

**Error cases:**
- [ ] GIVEN Step 2 fails (LLM timeout) WHEN pipeline aborts at Step 2 THEN candidate shows `pipeline_status = "failed_step_2"`, error message shown inline, [Retry from step 2] button visible
- [ ] GIVEN [Retry from step 2] is clicked WHEN retry runs THEN Step 1 output is reused (no re-call), Step 2 and Step 3 re-run from scratch

**Edge cases:**
- [ ] GIVEN a generation is already running WHEN Thomas clicks "Generate" again THEN button is disabled, tooltip "Generation in progress"
- [ ] GIVEN the browser tab is closed during generation WHEN Thomas reopens the page THEN stepper resumes polling and shows current step status (pipeline continues server-side)
- [ ] GIVEN total pipeline duration > 120 seconds WHEN timeout fires THEN pipeline_run.status = "failed_step_X" (whichever step was running), error shown

**Permissions:**
- [ ] GIVEN user with role "user" WHEN they access the detail page THEN "Generate" button is visible and functional (user can trigger generation)
- [ ] GIVEN unauthenticated request to /api/admin/case-studies/.../generate THEN 401 response

**Data integrity:**
- [ ] GIVEN a candidate already has generated outputs WHEN "Generate" is triggered again THEN previous outputs are preserved as version history, new generation creates version N+1

#### Events analytics
| Event | Trigger | Properties | Funnel |
|---|---|---|---|
| `pipeline_started` | PM clicks Generate | `candidateId`, `candidateScore`, `triggeredBy` | activation |
| `pipeline_step_completed` | Each step finishes | `stepType`, `tokensUsed`, `durationMs` | activation |
| `pipeline_completed` | All 3 steps done | `totalDurationMs`, `totalTokens`, `retryCount` | activation |
| `pipeline_failed` | Step fails | `stepType`, `errorType`, `candidateId` | activation |

#### Definition of Done
- [ ] UI stepper component implemented with 5 states per step
- [ ] Polling route `/pipeline-status` functional (3s interval)
- [ ] `pipeline_runs` and `pipeline_steps` tables migrated
- [ ] Step retry from failed step works without re-running successful steps
- [ ] Test E2E: complete pipeline run mock (steps 1-2-3, success path)
- [ ] Test unit: retry logic (step 2 reuses step 1 output)

---

### US-CSP-02 — Select Visual for Each Channel

**Persona:** Thomas (Sarani admin — PM role)
**Epic:** Case Study Multi-Agent Pipeline
**Dependencies:** US-CSP-01
**Priority RICE:** R=4 I=4 C=4 E=1 → Score=64

#### Job-to-be-done
As Thomas (admin), I want to select a SharePoint image for each output channel (case study, LinkedIn, email) via a visual picker modal so that each published piece has the right image without leaving the back-office.

#### Context
- **Origin screen:** `/admin/case-studies/[id]` — any output tab (Case Study | LinkedIn | Email)
- **Trigger:** Click "Choose Visual" button on any output tab
- **Destination (success):** Modal closes, selected thumbnail shown in tab
- **Destination (failure):** Error message in modal, modal stays open

#### Acceptance Criteria

**Happy path:**
- [ ] GIVEN Step 3 generation is complete WHEN Thomas opens the LinkedIn Post tab THEN up to 6 AI-suggested images are shown in the visual picker, each with a 1-sentence rationale
- [ ] GIVEN Thomas clicks an image in the picker WHEN he clicks "Confirm Selection" THEN modal closes, thumbnail appears in the LinkedIn Post tab, `selected_visual_url` stored in DB
- [ ] GIVEN Thomas selects a visual for "case_study" channel WHEN the case study is published to `/case-studies/[slug]` THEN the selected image is used as the hero and OG image

**Error cases:**
- [ ] GIVEN SharePoint folder has 0 image files WHEN modal opens THEN "No images found in SharePoint folder" message + [Open folder ↗] link to SharePoint
- [ ] GIVEN Graph API returns 503 WHEN modal tries to load suggestions THEN "Could not load SharePoint images. [Retry]" — modal does not close

**Edge cases:**
- [ ] GIVEN Thomas selects a visual then changes his mind WHEN he clicks "Choose Visual" again THEN picker re-opens with current selection highlighted
- [ ] GIVEN Thomas removes the selection WHEN he clicks the × on the thumbnail THEN `selected_visual_url` set to null, "Choose Visual" button reappears
- [ ] GIVEN candidate has no SharePoint folder URL WHEN Thomas opens visual picker THEN picker shows empty state with "No SharePoint folder linked to this project" + manual URL input field

**Permissions:**
- [ ] GIVEN user with role "user" WHEN they access visual picker THEN picker is accessible (visual selection is not admin-only)

#### Events analytics
| Event | Trigger | Properties | Funnel |
|---|---|---|---|
| `visual_selected` | PM confirms selection | `channel`, `candidateId`, `fileName` | activation |
| `visual_removed` | PM removes selection | `channel`, `candidateId` | activation |

---

### US-CSP-03 — Post Directly to LinkedIn

**Persona:** Thomas (Sarani admin)
**Epic:** Case Study Multi-Agent Pipeline
**Dependencies:** US-CSP-01, US-CSP-02, LinkedIn OAuth connected
**Priority RICE:** R=5 I=5 C=3 E=1 → Score=75

#### Job-to-be-done
As Thomas (admin), I want to post the generated LinkedIn post directly to the Sarani LinkedIn Page with one click so that case study social proof reaches Sophie's feed without manual copy-paste.

#### Context
- **Origin screen:** `/admin/case-studies/[id]` — LinkedIn Post tab
- **Trigger:** Click "Post to LinkedIn ↗" button (admin only)
- **Destination (success):** Button replaced by "Posted ✓ — [View on LinkedIn ↗]"
- **Destination (failure):** Inline error, button returns to clickable state

#### Acceptance Criteria

**Happy path:**
- [ ] GIVEN LinkedIn is connected (valid OAuth token) AND the post has not been sent WHEN Thomas clicks "Post to LinkedIn ↗" THEN confirmation dialog appears: "This will publish on Sarani's LinkedIn page. Continue?"
- [ ] GIVEN Thomas confirms WHEN LinkedIn API call succeeds THEN `linkedin_post_id`, `linkedin_posted_at`, `linkedin_post_url` stored in DB; button shows "Posted ✓ — [View on LinkedIn ↗]"
- [ ] GIVEN a visual is selected for the LinkedIn channel WHEN the post is sent THEN the image is uploaded to LinkedIn and attached to the post

**Error cases:**
- [ ] GIVEN LinkedIn OAuth token is expired WHEN Thomas clicks "Post to LinkedIn" THEN error shown: "LinkedIn authentication expired — reconnect in Settings ↗"; no post attempted
- [ ] GIVEN LinkedIn API returns 422 (content policy violation) WHEN post fails THEN error shown: "LinkedIn rejected this post (content policy). Edit the post and try again."
- [ ] GIVEN LinkedIn API returns 429 (rate limit) WHEN post fails THEN error: "LinkedIn daily post limit reached. Try again tomorrow."

**Edge cases:**
- [ ] GIVEN Thomas has already posted this case study WHEN he sees the LinkedIn tab THEN button shows "Post again?" with warning "A post was already sent on [date] — this will create a duplicate"
- [ ] GIVEN the post text exceeds 1300 characters WHEN Thomas attempts to post THEN publish blocked client-side: "Post too long (1347/1300 chars). Edit before posting."
- [ ] GIVEN LinkedIn connection is not set up WHEN Thomas accesses the LinkedIn tab THEN "Post to LinkedIn" button shows "LinkedIn not connected — [Connect in Settings]" (disabled)

**Permissions:**
- [ ] GIVEN user with role "user" (not admin) WHEN they view the LinkedIn tab THEN "Post to LinkedIn" button is hidden — only [Copy to clipboard] and [Mark as Published] are visible

#### Events analytics
| Event | Trigger | Properties | Funnel |
|---|---|---|---|
| `linkedin_post_sent` | Successful API post | `candidateId`, `hasImage`, `charCount`, `postId` | revenue |
| `linkedin_post_failed` | API error | `errorType`, `candidateId` | revenue |
| `linkedin_reconnect_triggered` | Admin clicks reconnect | — | activation |

#### Notes for @fullstack
- LinkedIn image upload is a 2-step process: register asset → PUT binary. Image must be fetched from SharePoint URL first (binary stream)
- `LINKEDIN_ORGANIZATION_ID` env var must be set — without it, all posts fail silently. Add to env validation on startup.
- Token encryption: use AES-256-GCM with `INTEGRATION_ENCRYPTION_KEY`. Separate IV per token. Never log tokens.

---

### US-CSP-04 — View Public Case Study Page

**Persona:** Sophie (CMO, grand groupe international — evaluating Sarani)
**Epic:** Case Study Multi-Agent Pipeline
**Dependencies:** US-CS-04 (publish to website), Section 6 (public page)
**Priority RICE:** R=5 I=5 C=5 E=1 → Score=125

#### Job-to-be-done
As Sophie (CMO), I want to read a detailed case study on `/case-studies/[slug]` so that I can evaluate Sarani's capability on a project similar to mine before scheduling a call.

#### Context
- **Origin:** LinkedIn post (direct link), `/work` gallery card click, Google search result
- **Trigger:** Any link pointing to `/case-studies/[slug]`
- **Destination (success):** Full case study page loads with headline, stats, brief, result
- **Destination (failure):** 404 page (unknown slug)

#### Acceptance Criteria

**Happy path:**
- [ ] GIVEN a case study has been published WHEN Sophie navigates to `/case-studies/tiktok-video-production` THEN page loads with H1 = `case_study.headline`, hero image, 3 stats, brief section, result section
- [ ] GIVEN the page loads WHEN Google crawls it THEN JSON-LD CreativeWork schema is present in the HTML and valid per schema.org spec
- [ ] GIVEN Sophie shares the URL on LinkedIn WHEN the link is unfurled THEN OG image, title and description appear correctly (uses `selected_visual_url` if set, else branded fallback)
- [ ] GIVEN Sophie views the page on mobile (375px) WHEN she scrolls THEN hero fills viewport width, stats stack vertically (1 column), no horizontal overflow

**Error cases:**
- [ ] GIVEN an unknown slug WHEN Sophie navigates to `/case-studies/nonexistent-project` THEN Next.js `notFound()` triggers Sarani's custom 404 page
- [ ] GIVEN `selected_visual_url` is null (no visual selected by PM) WHEN page renders THEN branded OG fallback image (Next.js ImageResponse) is used — page does not show a broken image

**Edge cases:**
- [ ] GIVEN a case study is unpublished WHEN Sophie tries to access its slug THEN 404 (slug no longer in `caseStudies` array after unpublish + ISR revalidation)
- [ ] GIVEN a case study slug is `tiktok-video-production` WHEN `/work` gallery renders THEN the case study card links to `/case-studies/tiktok-video-production` (not an anchor or modal)

**Permissions:**
- [ ] GIVEN any visitor (unauthenticated) WHEN they navigate to `/case-studies/[slug]` THEN page is publicly accessible — no auth required

#### Notes for @ux
- CTA block at the bottom must link to `/contact` — not a modal. Sophie's next step after reading is contacting Sarani.
- "Conviction-first" principle: the page must earn the CTA by presenting the full proof before showing it. CTA is at the bottom, not in the hero.

#### Notes for @fullstack
- ISR revalidation: call `revalidatePath("/case-studies/[slug]")` AND `revalidatePath("/work")` on every publish/unpublish
- `generateStaticParams` reads from `caseStudies` array — ensure it runs at build time
- OG fallback: extend the existing `ImageResponse` pattern (established Session 8) to accept `headline` and `client` params

---

### US-CSP-05 — LinkedIn OAuth Setup

**Persona:** Thomas (Sarani admin)
**Epic:** Case Study Multi-Agent Pipeline
**Dependencies:** Section 5 (LinkedIn API), `integration_tokens` table
**Priority RICE:** R=5 I=5 C=3 E=1 → Score=75

#### Job-to-be-done
As Thomas (admin), I want to connect Sarani's LinkedIn Page to the back-office via OAuth so that I can enable direct-post capability for case studies.

#### Context
- **Origin screen:** `/admin/settings/integrations`
- **Trigger:** Click "Connect LinkedIn"
- **Destination (success):** Settings page shows "LinkedIn connected — Sarani Page"
- **Destination (failure):** Error message, connection status = disconnected

#### Acceptance Criteria

**Happy path:**
- [ ] GIVEN Thomas is on `/admin/settings/integrations` WHEN he clicks "Connect LinkedIn" THEN browser redirects to LinkedIn OAuth consent screen with scopes `w_organization_social r_organization_social`
- [ ] GIVEN Thomas approves the OAuth consent WHEN LinkedIn redirects to `/api/admin/linkedin/callback` THEN tokens are stored encrypted in `integration_tokens`, Thomas is redirected to `/admin/settings/integrations` with success toast "LinkedIn connected"
- [ ] GIVEN LinkedIn is connected WHEN Thomas views the integrations page THEN status shows "Connected — Sarani Page", token expiry date, and [Disconnect] button

**Error cases:**
- [ ] GIVEN Thomas declines the OAuth consent WHEN LinkedIn redirects back with `error=access_denied` THEN Thomas is redirected to settings with error "Connection cancelled. LinkedIn not connected."
- [ ] GIVEN access token expires WHEN any LinkedIn post attempt is made THEN automatic refresh is attempted; if refresh fails, error shown: "LinkedIn session expired — [Reconnect]"

**Edge cases:**
- [ ] GIVEN CSRF state token mismatch WHEN callback is received THEN request rejected with 400, "Invalid state parameter — possible CSRF attack"
- [ ] GIVEN `LINKEDIN_CLIENT_ID` env var is missing WHEN Thomas clicks "Connect LinkedIn" THEN button is disabled with tooltip "LinkedIn not configured — contact admin"

**Permissions:**
- [ ] GIVEN user with role "user" WHEN they visit `/admin/settings/integrations` THEN LinkedIn connect section is visible but "Connect LinkedIn" button is disabled (admin action only)

---

## 9. Hypotheses to Validate

These assumptions are critical to the pipeline design and must be validated before V2 decisions.

| # | Hypothesis | Risk if wrong | How to validate |
|---|---|---|---|
| H1 | LinkedIn Marketing Developer Platform grants `w_organization_social` scope within 2-4 weeks of app submission | Launch blocked or delayed — LinkedIn review can take longer for new apps without established usage | Submit LinkedIn app early in development, not post-launch |
| H2 | The 3-step chain (45–90s total) is acceptable UX for Thomas — he clicks Generate and returns to other tasks | UX friction causes the team to avoid the pipeline and fall back to manual writing | Measure time from Generate click to PM review session in first 2 weeks; if > 24h average, pipeline is not being used |
| H3 | SharePoint visual suggestions (up to 18 images) are relevant enough that Thomas picks from suggestions >= 70% of the time (vs. manually browsing SharePoint) | Visual selection modal becomes a friction point — team skips visuals entirely | Track `visual_selected` events: source = "suggestion" vs. "manual browse" |
| H4 | [HYPOTHESE: total token cost per 3-step generation ~3,000–6,000 tokens × Claude Sonnet pricing ≈ $0.04–0.12 per case study] | Budget impact if significantly higher — especially if Star Pipeline triggers many auto-generations | Measure `totalTokensUsed` in `pipeline_runs` for first 10 generations |
| H5 | LinkedIn API rate limit (3 posts/day on free Marketing Developer Platform tier) is sufficient for Sarani's publishing cadence | Post blocked mid-campaign if team publishes > 3 case study posts per day | Confirm tier with LinkedIn developer support before launch; upgrade if cadence > 3/day |
| H6 | ISR revalidation of `/case-studies/[slug]` works reliably on Replit (no stale cache after publish) | Published case studies not visible to Sophie until next Replit deploy | Test publish → ISR → public URL response time in staging before launch |

---

## Hypotheses Summary (marked)

- [HYPOTHESE: total token cost per 3-step pipeline ~$0.04–0.12 per case study — validate with @ia on first 10 runs]
- [HYPOTHESE: LinkedIn app review timeline 2-4 weeks — submit early, do not block launch on LinkedIn integration]
- [HYPOTHESE: LinkedIn free tier = 3 posts/day — confirm rate limits with LinkedIn developer support]
- [HYPOTHESE: SharePoint visual suggestions match quality >= 70% satisfaction rate — validate with Thomas on first 20 selections]

---

**Handoff → @fullstack**

- Files produced: `/home/user/Sarani/docs/product/case-study-pipeline-specs.md`
- Decisions taken:
  - Generate button triggers 3-step sequential LLM chain (creative_strategy → copywriter → social) — replaces current single-pass call. External API contract unchanged.
  - Each step stored in `pipeline_steps` table — enables per-step retry without restarting full chain
  - Two new tables: `pipeline_runs` + `pipeline_steps` + `integration_tokens`. Three new columns on `case_study_candidates`. Five new columns on `case_study_outputs`.
  - LinkedIn direct-post via `ugcPosts` endpoint — posts as LinkedIn Company Page (`w_organization_social` scope), not personal profile
  - Visual suggestions: Step 3 (social agent) pre-selects up to 6 images per channel from SharePoint. PM confirms via slide-over modal. Visual stored as anonymous SharePoint link.
  - Per-channel publish: case study, LinkedIn, email are independent publish actions
  - Public page `/case-studies/[slug]`: SSG + ISR, JSON-LD CreativeWork, OG tags, branded OG fallback via ImageResponse pattern
  - LinkedIn OAuth tokens stored AES-256 encrypted. Never returned to frontend. Refresh handled automatically.
  - Migration number: `0018_case_study_pipeline.sql`

- Points of attention:
  - **LinkedIn app submission must happen during development**, not post-launch — reviewer approval can take 2-4 weeks
  - **Token encryption key** (`INTEGRATION_ENCRYPTION_KEY`) must be added to Replit secrets before LinkedIn integration goes live
  - **ISR revalidation** after publish must call `revalidatePath` for both `/case-studies/[slug]` AND `/work` (gallery must also update)
  - **Pipeline polling** (3s interval): implement exponential backoff if polling continues > 60s to reduce server load
  - **Step 1 output reuse on retry**: when retrying from step 2, fetch the `outputData` from the step 1 `pipeline_steps` row and inject directly — do not re-call the LLM
  - **Image upload to LinkedIn** is binary (not URL reference) — fetch the SharePoint file server-side, pipe to LinkedIn upload endpoint. Do not expose SharePoint credentials to frontend.
  - **Settings page** `/admin/settings/integrations` does not exist yet — needs to be created as part of this delta (LinkedIn connection status + connect/disconnect actions)

---

**Handoff → @qa**

- Files to test: all new routes in Section 4, LinkedIn callback route (Section 5), public page (Section 6)
- Critical test scenarios:
  - Pipeline step failure + retry from step 2 (US-CSP-01 error path)
  - LinkedIn post with expired token (US-CSP-03 error)
  - Double-click protection on "Post to LinkedIn" button
  - Unauthenticated access to `/case-studies/[slug]` — must succeed (public page)
  - Unauthenticated access to `/api/admin/...` routes — must return 401
  - Pipeline polling stops when status = "completed" (no infinite polling)
  - ISR invalidation after publish — `/case-studies/[slug]` returns 200 within 5s of publish

