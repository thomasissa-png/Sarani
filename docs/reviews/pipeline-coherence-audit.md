# Pipeline Coherence Audit — Case Study Multi-Agent Pipeline

> **Auditor:** @reviewer | **Date:** 2026-04-03 | **Score: 7.5/10**
> **Scope:** Data flow (step 1 > 2 > 3), specs vs code, schema consistency, public page rendering

---

## 1. Data Flow Between Steps

### Step 1 output > Step 2 input — OK
- `route.ts:202` — `buildCopyInput(candidate, strategyData)` passes full `StrategyOutput` to step 2.
- `pipeline-prompts.ts:145-156` — `buildCopyInput` serializes both `candidate` data and `strategy` JSON into the user message. Step 2 LLM receives the strategic angle, key messages, emotional hook, differentiators.
- **Verdict: PASS** — data chain is complete.

### Step 2 output > Step 3 input — OK
- `route.ts:262` — `buildSocialInput(candidate, strategyData, copyData)` passes all three.
- `pipeline-prompts.ts:213-224` — serializes project data + strategy + full `copyOutput.caseStudy` into the prompt.
- **Verdict: PASS** — social agent has access to case study content for proof points.

### Outputs saved to `case_study_outputs` — OK with caveat
- `route.ts:318-367` — Three output records created: `case_study` (from `copyData.caseStudy`), `linkedin_post` (from `socialData.linkedInPost`), `nurturing_email` (from `copyData.nurturingEmail`).
- Atomic transaction at `route.ts:370` — delete old + insert new + update status.
- **Verdict: PASS** — types match `outputType` enum values in `schema.ts:372-373`.

---

## 2. Specs vs Code Discrepancies

### FAIL-1: Step 1 Output Schema Mismatch (MAJOR)
- **Specs** (`case-study-pipeline-specs.md:102-111`) define `Step1Output` with fields: `strategicAngle`, `primaryMessage`, `targetAudience`, `proofPoints[]`, `toneGuidance`, `headlineCandidates[]`, `category`.
- **Code** (`pipeline-prompts.ts:10-17`) uses different field names: `angle`, `keyMessages[]`, `visualDirection`, `emotionalHook`, `targetAudience`, `differentiators[]`.
- **Impact:** 5 of 7 fields differ in name or semantics. `headlineCandidates` and `category` from specs are absent. `visualDirection` and `emotionalHook` exist in code but not specs.
- **Risk:** Medium — the pipeline works internally (code is self-consistent), but specs are misleading for any future developer or PM reviewing the system. Specs describe a system that does not exist.

### FAIL-2: Step 3 Output Schema Mismatch (MAJOR)
- **Specs** (`case-study-pipeline-specs.md:169-194`) define `linkedinPost` with: `hook`, `story`, `proofPoints[]` (array), `cta`, `hashtags[]` (array), `fullText`, `charCount`. Plus `visualSuggestions` object.
- **Code** (`schemas.ts:47-53`) defines: `hook`, `body` (not `story`), `proofPoints` (string, not array), `hashtags` (string, not array), `charCount`. No `cta`, no `fullText`, no `visualSuggestions`.
- **Impact:** Field types differ (`proofPoints` string vs array, `hashtags` string vs array), fields missing (`cta`, `fullText`, `visualSuggestions`). The specs promise visual suggestions from SharePoint that are not implemented at all.

### FAIL-3: `pipeline_runs` and `pipeline_steps` Tables Not Implemented (MAJOR)
- **Specs** (`case-study-pipeline-specs.md:292-368`) define two new tables: `pipeline_runs` (audit trail, cost tracking, per-step retry) and `pipeline_steps` (intermediate outputs, token tracking).
- **Code** (`schema.ts`) — neither table exists. Pipeline steps are stored as a JSONB array in `case_study_candidates.pipelineSteps` (`schema.ts:332-341`).
- **Impact:** No per-step retry capability (spec section 4.3). No token usage tracking. No `pipeline_run_id` foreign key. The simplified implementation works but lacks the audit trail and retry-from-failed-step features documented in specs.

### FAIL-4: Missing API Routes (MODERATE)
- **Specs** define 4 new routes: `GET pipeline-status` (4.2), `POST pipeline-retry` (4.3), `PATCH visual` (4.4), `POST linkedin-post` (4.5).
- **Code** — none of these routes exist in `src/app/api/admin/case-studies/`.
- **Impact:** No polling endpoint for stepper UI, no step-level retry, no LinkedIn direct-post. The specs describe a richer system than what is implemented.

### FAIL-5: Step 2 Nurturing Email — `preheader` Field Missing (MINOR)
- **Specs** (`case-study-pipeline-specs.md:149`) define `preheader` (max 90 chars) in `Step2Output.nurturingEmail`.
- **Code** (`schemas.ts:55-60`) — `NurturingEmailSchema` has `subject`, `body`, `ctaText`, `suggestedSegment`. No `preheader`.
- **Impact:** Low — nurturing email will render without preheader but email clients will auto-generate one from body text (suboptimal).

### OK-1: Score Threshold — Aligned
- **Specs:** score >= 70 or manual force.
- **Code** (`route.ts:115`): `candidate.scoreTotal < 70 && !force` — matches.

### OK-2: Status State Machine — Aligned
- Specs: `generating` during pipeline, `generated` on success, `suggested` on failure.
- Code: `route.ts:127-130` sets `generating`, `route.ts:383` sets `generated`, error handlers (`route.ts:178-184`) set back to `suggested`.

### OK-3: Sequential Execution — Aligned
- Specs: "3-step sequential LLM chain."
- Code: steps execute sequentially with `await` between each.

---

## 3. Persona & Brand Voice Coherence

### FAIL-6: Sophie Frustrations Inaccurate in Prompt (MINOR)
- **Prompt** (`pipeline-prompts.ts:28-31`): lists "Freelancers disappear or miss deadlines" and "Agency costs are unpredictable."
- **Persona** (`personas.md:37-48`): Sophie's frustrations are about traditional agencies — banner turnaround (10-15 days), revision costs (200-800 EUR), pricing opacity, limited language coverage. No mention of freelancers.
- **Impact:** The LLM gets a slightly distorted picture of Sophie. "Freelancers disappear" is not Sophie's world — she works with large agencies, not freelancers.

### OK-4: Brand Voice — Aligned
- Prompts cite "Assured, Direct, Warm, Evidence-first" — matches `brand-voice.md` tone matrix.
- CTA "Start a project" is correct per brand-voice.md.
- Banned words list in copywriter prompt (`pipeline-prompts.ts:96`) matches brand guidelines.

### OK-5: Evidence-First Enforced
- All three prompts include "NEVER invent data" rule — aligned with project-context.md Rule n2.

---

## 4. Public Page Rendering Coherence

### OK-6: Required Fields All Rendered
- `slug` — used for routing. `client`, `headline`, `keyMetric`, `deliverable`, `category`, `stats`, `brief`, `result`, `metaDescription` — all rendered in `page.tsx`.

### OK-7: Optional Fields Gracefully Handled
- `challenge`, `solution`, `resultsDetail` — conditional rendering with `{cs.challenge && ...}` (page.tsx:235-266).
- Fallback to `brief`/`result` when challenge/solution absent (page.tsx:267-282).
- `testimonial` — conditional block (page.tsx:348-364).
- `tags` — conditional map (page.tsx:164-172).

### FAIL-7: Optional Fields Never Prompted (MODERATE)
- `CaseStudyOutputSchema` (`schemas.ts:31-44`) defines optional fields: `subtitle`, `challenge`, `solution`, `resultsDetail`, `tags`, `testimonial`.
- **Copywriter prompt** (`pipeline-prompts.ts:89-117`) never instructs the LLM to produce these fields. It asks for "headline, brief, result, stats, meta" only.
- **Impact:** The public page has rich sections (Challenge, Solution, Results in Detail, Testimonial) that will never be populated. The page always falls back to the simpler brief/result layout. The richer template is dead code until the prompt is updated.

### OK-8: JSON-LD Coherent
- `page.tsx:129-144` — JSON-LD uses `cs.client`, `cs.headline`, `cs.metaDescription` — same fields from the schema. Type `CreativeWork` is appropriate.

### FAIL-8: `volume` and `turnaround` Not Rendered (MINOR)
- `CaseStudyOutputSchema` has `volume` and `turnaround` as optional strings.
- `page.tsx` never renders these fields — not in the hero, not in the sidebar, nowhere.
- **Impact:** If the LLM produces volume/turnaround data, it is stored but invisible to visitors.

---

## 5. Top 3 Corrections Prioritaires

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | FAIL-1 + FAIL-2: Specs schemas diverge significantly from code | Specs are misleading — any future dev/PM will build against wrong contracts | Update specs to match implemented schemas OR update code to match specs (recommend: update specs, code works) |
| 2 | FAIL-7: Rich optional fields (challenge, solution, testimonial) never prompted | Public page always renders the minimal layout — missing differentiation opportunity | Add explicit instructions in `COPYWRITER_PROMPT` to generate challenge/solution/resultsDetail/testimonial when data supports it |
| 3 | FAIL-3: No pipeline_runs/pipeline_steps tables, no retry mechanism | Cannot retry from failed step, no cost tracking, no audit trail | Implement specs tables or document the simplified approach as intentional delta |

---

## 6. Summary

| Category | PASS | FAIL | Total |
|---|---|---|---|
| Data flow (step chaining) | 3 | 0 | 3 |
| Specs vs code | 3 | 5 | 8 |
| Persona & brand voice | 2 | 1 | 3 |
| Public page rendering | 3 | 2 | 5 |
| **Total** | **11** | **8** | **19** |

**Score: 7.5/10** — The pipeline is internally coherent (data flows correctly between steps, schemas validate, outputs are saved atomically). However, the specs describe a substantially richer system than what is implemented (missing tables, missing routes, different field names). The public page has dead sections that the prompts never populate.

**Verdict: GO CONDITIONNEL** — The pipeline works end-to-end for generation. The specs need to be updated to reflect the actual implementation (or the implementation needs to catch up to specs). The prompt should be enriched to populate the rich page layout.

---

**Handoff > @orchestrator**
- Fichier produit : `docs/reviews/pipeline-coherence-audit.md`
- Decisions : GO CONDITIONNEL -- pipeline fonctionne mais specs divergent du code
- Points d'attention : (1) Specs schemas ne correspondent pas au code (FAIL-1, FAIL-2), (2) Prompt copywriter ne genere pas les champs riches (FAIL-7), (3) Sophie frustrations citent "freelancers" au lieu d'agences traditionnelles (FAIL-6), (4) Tables pipeline_runs/pipeline_steps non implementees (FAIL-3)
