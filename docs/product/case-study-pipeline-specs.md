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
```typescript
interface Step1Output {
  strategicAngle: string;           // e.g. "Speed as competitive advantage — same-day Black Friday delivery"
  primaryMessage: string;           // 1-sentence core claim
  targetAudience: string;           // e.g. "CMOs managing multi-market campaigns under time pressure"
  proofPoints: string[];            // 2-4 specific facts to emphasise (from ClickUp data)
  toneGuidance: string;             // contextual tone notes for this specific project
  headlineCandidates: string[];     // 3 headline options (Problem → Result formula)
  category: CaseStudyCategory;      // one of: "Video & Social" | "Graphic Design" | "Event" | "Multilingual" | "Out-of-Home"
}
```

**Stored in DB:** `pipeline_steps` JSONB column, `step_number: 1`, `step_type: "creative_strategy"`.

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

**Stored in DB:** `pipeline_steps` JSONB column, `step_number: 2`, `step_type: "copywriter"`.

---

### Step 3 — Social Agent

**Role:** Writes the LinkedIn post, using the case study content and strategic angle as source material. Optimised for LinkedIn native algorithm (engagement over reach).

**Input:** Step 1 + Step 2 outputs + LinkedIn strategy guidelines from `docs/social/linkedin-strategy.md` (if exists) or fallback brand voice.

**System prompt persona:**
> You are Sarani's LinkedIn Content Strategist. You write LinkedIn posts that generate engagement from CMOs and Marketing Directors at large international groups. Your posts follow this structure: Hook (1 line — the unexpected fact), Story (3-4 lines — what happened and why it matters), Proof (2-3 bullet stats), CTA (1 line — soft, not salesy). Maximum 1300 characters. Use line breaks aggressively — no paragraph blocks. The first line must make Sophie stop scrolling.

**Output (Step 3):**
```typescript
interface Step3Output {
  linkedinPost: {
    hook: string;                  // 1 line, < 140 chars — THE opening line
    story: string;                 // 3-4 lines narrative
    proofPoints: string[];         // 2-3 stat bullets (e.g. "→ 94M views")
    cta: string;                   // 1 soft CTA line
    hashtags: string[];            // 3-5 relevant hashtags
    fullText: string;              // assembled final post, max 1300 chars
    charCount: number;
  };
  visualSuggestions: {
    caseStudyHero: VisualSuggestion[];    // from SharePoint — for /case-studies/[slug]
    linkedinImage: VisualSuggestion[];    // from SharePoint — for LinkedIn post
    emailHeader: VisualSuggestion[];      // from SharePoint — for nurturing email
  };
}

interface VisualSuggestion {
  sharePointFileId: string;
  sharePointFileName: string;
  sharePointPreviewUrl: string;   // anonymous share link (Graph API — "Anyone" scope)
  thumbnailUrl: string;           // 400x300 thumbnail via Graph API
  suggestedFor: "hero" | "linkedin" | "email";
  rationale: string;              // 1 sentence: why this image works for this channel
}
```

**Visual selection logic:**
- System fetches files from SharePoint folder (`sharePointFolderUrl` on candidate)
- Filters by image extensions (jpg, jpeg, png, gif, mp4 for LinkedIn)
- Selects up to 6 images per channel (maximum 18 total suggestions)
- Rationale generated by LLM: "This image shows the volume of work delivered — ideal for the scale proof story"

**Stored in DB:** `pipeline_steps` JSONB column, `step_number: 3`, `step_type: "social"`.

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
