# Arya — Project Closure, Star Pipeline & LinkedIn Feeder Specs

> **Version:** 1.0 — 2026-04-01
> **Owner:** @product-manager
> **Language:** English (mandatory — international project)
> **Linked to:**
> - `docs/pm/arya-protocols.md` — PROTO-PROJECT-CLOSE (existing base)
> - `docs/product/case-study-generator-specs.md` — scoring algorithm + generation engine
> - `docs/social/linkedin-strategy.md` — content pillars, voice, audience
> - `docs/social/editorial-calendar.md` — publishing cadence
> - `docs/strategy/case-studies-selection.md` — existing portfolio criteria
> **KPI North Star:** 10M€ revenue at 20% EBITDA — this feature converts every completed project into a pipeline asset automatically

---

## Table of Contents

1. [PROTO-PROJECT-CLOSURE — Automated Project Closure](#1-proto-project-closure--automated-project-closure)
2. [Star Project Scoring System](#2-star-project-scoring-system)
3. [Star Pipeline — Automated Content Generation](#3-star-pipeline--automated-content-generation)
4. [Arya LinkedIn Feeder — Continuous Intelligence Layer](#4-arya-linkedin-feeder--continuous-intelligence-layer)
5. [User Stories](#5-user-stories)
6. [UI Wireframes (ASCII)](#6-ui-wireframes-ascii)
7. [Edge Cases](#7-edge-cases)
8. [Data Model Additions](#8-data-model-additions)
9. [API Routes](#9-api-routes)
10. [Hypotheses to Validate](#10-hypotheses-to-validate)

---

## 1. PROTO-PROJECT-CLOSURE — Automated Project Closure

### Context

The existing `PROTO-PROJECT-CLOSE` in `docs/pm/arya-protocols.md` requires manual PM trigger. This spec adds:
1. **Automatic closure detection** — Arya monitors projects and triggers closure without waiting for PM initiation
2. **Star scoring** — runs immediately after closure, before the PM sees the summary
3. **Pipeline trigger** — if star, automatically queues content generation

### Closure Trigger Conditions

Two conditions trigger automatic closure detection. Arya runs a daily scan (PROTO-PROJECT-FOLLOWUP cron) and flags projects meeting either condition:

| Condition | Logic | Grace Period |
|---|---|---|
| **Client validation received** | Email classified as `client_approval` OR ClickUp status manually set to "Approved" by PM | None — immediate |
| **Non-response timeout** | Project in status "Client Review" for >= 14 calendar days with no email reply from client domain | 24h warning at Day 13 before flagging |

**Important:** Arya does NOT close the project automatically. She flags it for PM validation (⏸️ gate). Closure is irreversible in ClickUp and triggers billing — human sign-off is mandatory.

### PROTO-PROJECT-CLOSURE Workflow

**Trigger:** Daily cron (PROTO-PROJECT-FOLLOWUP) OR manual PM invocation
**Endpoint extensions:** POST /api/admin/projects/[id]/close-check, POST /api/admin/projects/[id]/close

#### Step 1 — Detect closure-ready projects

```
Arya scans all active ClickUp projects:
- Status "Client Review" + last client email > 14 days ago → flag as "timeout-closure"
- Status "Approved" (set manually or via email classification) → flag as "validation-closure"
```

For each flagged project, Arya prepares a closure summary card (see Section 6 — Wireframe W1).

#### Step 2 — ⏸️ VALIDATION PM — Closure intent

```
⏸️ VALIDATION PM:
"[Project Name] is ready to close.
Reason: [client validation received on [date] / no client response for 14+ days]
Deliverables archived: [yes / not yet — X files missing]
Invoice status: [drafted / not started]
Star Score (pre-check): [score/100 — Full scoring runs after you confirm]

[ CLOSE PROJECT ] [ KEEP OPEN ] [ ESCALATE TO THOMAS ]"
```

Criteria for PM to confirm: all tasks closed, deliverables present in SharePoint, no open disputes.

#### Step 3 — Execute closure (existing PROTO-PROJECT-CLOSE + additions)

Once PM confirms:

1. ClickUp → status = "Closed", add closure comment (dates, deliverables, amount)
2. Evoliz → generate invoice from tracker data (⏸️ PM validates amount before sending)
3. SharePoint → verify all final files in `/Clients/[ClientName]/Deliverables/[ProjectName]/`, generate anonymous share link
4. **[NEW]** Run full Star Score → POST /api/admin/projects/[id]/star-score
5. **[NEW]** Capture LinkedIn signals → POST /api/admin/projects/[id]/linkedin-signals
6. Capture learnings → PM answers 3 questions (well/improve/client feedback)
7. ⏸️ VALIDATION PM — closure summary with star result and pipeline options

#### Step 4 — ⏸️ VALIDATION PM — Closure + Star summary

```
⏸️ VALIDATION PM:
"Project [Name] — CLOSED.
ClickUp: Closed ✅ | Invoice: [amount] generated ✅ | SharePoint: archived ✅

⭐ STAR SCORE: [score]/100 — [STAR PROJECT / NOT A STAR]
[If star]: Pipeline queued for:
  ✅ Case Study (case-study-generator) — ready to review
  ✅ LinkedIn Article — ready to review
  ✅ Commercial Slide — ready to review
  ✅ SEO Signal — sent to pipeline
[If not star]: No pipeline triggered. Project visible in case study generator as "Suggested" if score >= 40.

[ VIEW PIPELINE ] [ SKIP PIPELINE ] [ OVERRIDE STAR DECISION ]"
```

### Timeout Closure — Special Handling

When closure is triggered by non-response (not client validation):

- Invoice is prepared but **not sent** until PM explicitly approves
- Email to client: PROTO-CLIENT-REPLY prepares a "project completed — invoice attached" draft (not auto-sent)
- PM can mark the project "On Hold" instead of "Closed" if there is a known dispute reason

---

## 2. Star Project Scoring System

### Design Principles

- **Objective and reproducible:** every criterion has a numeric rule, no subjective judgment
- **Extends the case-study-generator scoring:** the existing scoring matrix (Section 2 of `docs/product/case-study-generator-specs.md`) measures case study potential. The Star Score adds two dimensions the existing matrix does not cover: storytelling potential and strategic impact on Sarani's positioning
- **Relationship to case study score:** a project can score >= 70 on the case study generator (triggering case study generation) without being a Star. Star requires >= 75/100 on the Star Score AND >= 70 on the case study score. Both scores run independently; the Star label requires both thresholds.

### Star Scoring Matrix

| Criterion | Weight | 5 pts | 10 pts | 15 pts | 20 pts | 25 pts |
|---|---|---|---|---|---|---|
| **Client Tier** | 25% | Internal / unknown | Small brand (<100M€ revenue) | Mid-market brand (100–500M€) | Large enterprise (500M€–5B€): GEODIS, Air Corsica, PICO, France Chimie | Top-tier global brand: TikTok, Sony, Adidas, L'Oréal, Pernod Ricard, LEGO |
| **Measurable Impact** | 25% | No metrics available | Qualitative only ("client was happy") | 1 metric available (e.g. volume of assets) | 2 metrics (e.g. views + cost) | 3+ metrics OR viral/exceptional result (e.g. 300M views, 94M views for 3,800€) |
| **Creative Ambition** | 20% | Routine production (translations, resizes) | Standard deliverables (banners, social posts) | Multi-format campaign | Multi-market or multi-language campaign | Exceptional scale, venue, or cultural moment (e.g. Adidas Superstar Concert, LEGO Champs-Élysées) |
| **Storytelling Potential** | 15% | No angle (pure production work) | Single angle (speed or price) | Two angles (e.g. speed + volume) | Strong narrative (e.g. unlimited revisions proof, same-day delivery) | Jaw-dropping story: a fact or number that makes Sophie stop scrolling and say "wait, they did that?" |
| **Strategic Portfolio Gap** | 15% | Sector already well-covered (3+ existing case studies) | Sector covered (1–2 existing) | Sector under-represented (0 existing) | New sector + new capability demonstrated | Unique proof point with no equivalent in current portfolio |

**Scoring rules:**
- Each criterion is scored independently
- Scores are: 5 / 10 / 15 / 20 / 25 (matching weight x 5 granularity levels)
- Maximum: 100 points
- Override: any team member (admin) can override individual criterion scores with a mandatory reason logged

### Star Thresholds

| Score | Status | Action |
|---|---|---|
| 75–100 AND case study score >= 70 | **STAR PROJECT** ⭐ | Full pipeline triggered automatically |
| 75–100 AND case study score < 70 | **Strong Story, Weak Assets** | LinkedIn article only — no case study (insufficient visual proof) |
| 50–74 | **Noteworthy** | Appears in LinkedIn feeder queue for @social review; no auto-pipeline |
| 0–49 | **Standard** | No pipeline triggered; accessible via filters |

### Star Score Examples (Sarani Portfolio Calibration)

To ensure the scoring is calibrated against real Sarani projects:

| Project | Client Tier | Impact | Creative Ambition | Storytelling | Portfolio Gap | Total | Status |
|---|---|---|---|---|---|---|---|
| TikTok #GimmeTheMic (94M views, 3,800€) | 25 | 25 | 15 | 25 | 10 | **100** | STAR ⭐ |
| GEODIS 5,700 slides / 3 weeks | 20 | 20 | 15 | 20 | 15 | **90** | STAR ⭐ |
| Adidas Superstar Concert | 25 | 15 | 25 | 20 | 15 | **100** | STAR ⭐ |
| Sony TV Launch — 15 languages | 25 | 20 | 15 | 20 | 20 | **100** | STAR ⭐ |
| A logo redesign for a 200M€ brand | 15 | 5 | 10 | 5 | 10 | **45** | Standard |
| A 10-banner pack for a startup | 5 | 5 | 5 | 5 | 5 | **25** | Standard |

**[HYPOTHÈSE : ces scores sont calibrés sur les données disponibles dans project-context.md et case-studies-selection.md. La calibration finale doit être validée par Thomas sur 5+ projets réels avant activation.]**

### NDA Override

If `nda_blocks_publication: true` on the project record, Star Score still runs but pipeline is suppressed. A ⏸️ gate asks PM: "This project scored [X]/100 (STAR) but is under NDA. Options: (A) Anonymise client — generate content without naming the brand. (B) Skip pipeline entirely. (C) Mark for future review when NDA expires."

---

## 3. Star Pipeline — Automated Content Generation

### Overview

When a project receives Star status (score >= 75 AND case study score >= 70), Arya automatically queues four outputs. All outputs are **drafts** — nothing is published without PM validation.

| Output | Agent | Trigger | PM Validation Required |
|---|---|---|---|
| Case Study (website) | case-study-generator | Auto on star confirmation | ⏸️ Review → Publish |
| LinkedIn Article (long-form) | Arya (self, using @social voice) | Auto on star confirmation | ⏸️ Review → Schedule |
| Commercial Slide | Arya (self, presentation format) | Auto on star confirmation | ⏸️ Review → Add to deck |
| SEO Signal | Arya → SEO pipeline notification | Auto on star confirmation | None (signal only) |

### Pipeline 3.1 — Case Study Generation

**Integration:** Existing `docs/product/case-study-generator-specs.md` handles this entirely.

**How Arya triggers it:**
- On star confirmation, Arya calls POST /api/admin/case-studies/generate with the project ID
- The case-study-generator runs its own pipeline (see existing specs)
- The output (4 content pieces) lands in the case study pipeline dashboard
- Arya notifies PM: "Case study draft generated for [Project]. Review here: [link to pipeline dashboard]"

**Arya does NOT duplicate the case study logic.** She is the trigger, not the generator.

**Input Arya provides to the generator:**

```typescript
interface StarCaseStudyTrigger {
  projectId: string;
  clickupTaskId: string;
  starScore: number;           // total star score
  starCriteria: StarCriteria;  // breakdown per criterion
  linkedinSignals: LinkedInSignal[]; // captured during closure (see Section 4)
  ndaBlocksPublication: boolean;
  clientApprovalForPublication?: boolean; // if PM confirmed client OK with it
}
```

### Pipeline 3.2 — LinkedIn Article (Long-Form)

**What it is:** A 600–900 word LinkedIn native article (not a short post). This is the "storytelling" format — it goes deeper than a proof point post, tells the story of how the project happened, what made it exceptional, and why it matters. It maps to Pillar 1 (Proof Points) or Pillar 3 (Thought Leadership) depending on the angle.

**Agent responsible:** Arya generates the first draft using the @social voice and LinkedIn strategy guidelines. The PM reviews before scheduling.

**Trigger:** POST /api/admin/projects/[id]/star-pipeline/linkedin

**Input to generation:**

```typescript
interface LinkedInArticleInput {
  projectName: string;
  clientName: string;            // full name if no NDA, "a global tech platform" if NDA
  metrics: Metric[];             // all measurable results from the project
  starCriteria: StarCriteria;    // what makes this project exceptional
  linkedinSignals: LinkedInSignal[]; // angles captured during closure
  contentPillar: "proof_point" | "thought_leadership"; // Arya selects based on story type
  toneGuide: string;             // from brand-platform.md: "Assured, Direct, Warm"
}
```

**Output format:**

```markdown
## [Article Title — max 80 chars, hook-first]

[Opening paragraph — the jaw-dropping fact or moment. No preamble.]

[Story paragraph 1 — context: what the client needed, what made it hard]

[Story paragraph 2 — how Sarani delivered: the mechanism, the team, the process]

[Story paragraph 3 — the result: numbers, client reaction, what it proves]

[Closing paragraph — the lesson or principle this project demonstrates]
[Soft CTA — "If you're facing [problem], we'd love to hear your brief."]

#EnterpriseCreative #[ClientSector] #[ProjectType]
```

**Validation workflow:**

```
Arya → Draft LinkedIn Article
  ⏸️ VALIDATION PM:
  "LinkedIn article ready for [Project Name].
  Pillar: [1 / 3]
  Estimated reading time: ~[X] min
  Suggested publish slot: [next available slot in editorial calendar matching this pillar]
  [ APPROVE + SCHEDULE ] [ EDIT DRAFT ] [ REJECT ]"
```

On approval, Arya inserts the article into the editorial calendar (`docs/social/editorial-calendar.md`) at the next available slot for the matching pillar, replacing or inserting after the next planned post of that pillar. It does not auto-publish to LinkedIn — the PM copies/pastes or uses the LinkedIn scheduler.

**Editorial calendar integration:** Arya reads the current editorial calendar, finds the next unfilled slot for the relevant pillar (proof_point → Pillar 1, thought_leadership → Pillar 3), inserts the article brief, and updates the Status from "Draft" to "Ready". If no slot is available in the next 2 weeks, Arya creates a new row and flags it: "Added by Star Pipeline — not in original schedule."

### Pipeline 3.3 — Commercial Slide

**What it is:** A single slide in the Sarani commercial deck format (the 96-slide deck referenced in `project-context.md`). The slide becomes a live proof point in the deck that Thomas or client managers use in sales presentations.

**Agent responsible:** Arya generates the slide content (text + structure). The visual is implemented by a human designer or the Graphic Designer IA agent.

**Trigger:** POST /api/admin/projects/[id]/star-pipeline/slide

**Output format (slide content brief):**

```markdown
## Commercial Slide Brief — [Project Name]

**Slide type:** Proof Point
**Deck section:** Case Studies / Results

**Headline (max 12 words):**
[e.g. "94 million views. 3,800€. Zero compromises."]

**Subheadline (max 20 words):**
[e.g. "TikTok #GimmeTheMic Germany — video campaign, delivered in 48h"]

**3 stat callouts:**
- [Stat 1 with label — e.g. "94M VIEWS"]
- [Stat 2 with label — e.g. "€3,800 TOTAL BUDGET"]
- [Stat 3 with label — e.g. "48H DELIVERY"]

**Visual direction:**
[What type of visual to use — e.g. "Campaign frame / video thumbnail", "Event photography", "Mockup of deliverables"]

**Client logo:** [yes / anonymised]
**Position in deck:** After slide [X] — [current last slide of Case Studies section]
```

**Validation workflow:**

```
⏸️ VALIDATION PM:
"Commercial slide brief ready for [Project Name].
[ APPROVE BRIEF → SEND TO DESIGNER ] [ EDIT ] [ SKIP ]"
```

On approval, the brief is saved in `docs/pm/slide-briefs/[project-name]-slide-brief.md` and a notification is sent to the human designer (or added to the Graphic Designer IA queue).

### Pipeline 3.4 — SEO Signal

**What it is:** Not a piece of content — a structured signal to the SEO pipeline that a new star project exists and could anchor a blog article. Arya generates the signal and routes it.

**Agent responsible:** Arya generates the signal → @seo receives it for the next content planning session.

**Trigger:** POST /api/admin/projects/[id]/star-pipeline/seo-signal

**Output format:**

```typescript
interface SEOSignal {
  projectId: string;
  projectName: string;
  clientSector: string;       // e.g. "logistics", "consumer tech", "fashion"
  primaryKeywordAngles: string[]; // e.g. ["same-day creative delivery", "enterprise creative velocity"]
  metrics: string[];          // e.g. ["5700 slides in 3 weeks", "8500€ budget"]
  suggestedArticleAngles: string[]; // e.g. ["How to rebrand 350 presentations without losing your team"]
  urgency: "immediate" | "next_sprint" | "backlog";
  createdAt: string;
}
```

The signal is appended to a queue file `docs/seo/star-signal-queue.md`. @seo reads this file at the start of each content planning session.

**No PM validation required** for the signal itself — it's informational. The PM validates the resulting SEO article when @seo produces it.

