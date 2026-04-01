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

---

## 4. Arya LinkedIn Feeder — Continuous Intelligence Layer

### Concept

Arya interacts with clients every day: reading briefs, reviewing deliverables, exchanging feedback, closing projects. She accumulates operational intelligence that @social and @creative-strategy cannot access on their own. The LinkedIn Feeder formalises Arya as a data source for the content team — not a content creator in this context, but a signal provider.

The Feeder has three moments:
1. **Per-project signals** — captured at project closure (integrated into PROTO-PROJECT-CLOSURE Step 3)
2. **Weekly digest** — a structured brief sent every Friday to @social and @creative-strategy
3. **Hot signal** — immediate notification when an exceptional moment occurs mid-project

### 4.1 — Signal Types Arya Captures

Arya captures these signals from existing workflows (no additional data entry required from PM):

| Signal Type | Source | When Captured | Example |
|---|---|---|---|
| **Measurable result** | Client email, ClickUp task data | On closure | "Client confirmed 94M views", "Delivered 350 presentations in 21 days" |
| **Client verbatim** | Email content (classified as `client_approval`) | On client validation email | "How did you deliver this so fast?" |
| **Production insight** | Brief complexity, delivery time vs deadline | On PROTO-ASSET-REVIEW | "Brief received Monday 9pm, delivered Tuesday 7am across 3 time zones" |
| **Sector trend** | Brief topic, client industry, request type | On PROTO-EMAIL-INTAKE | "3rd client this month asking for AI-generated script + human polish" |
| **Unexpected challenge** | PM learnings (closure questions) | On PROTO-PROJECT-CLOSURE | "Client changed direction 4 times — delivered anyway with same deadline" |
| **Volume milestone** | ClickUp aggregates by client | Weekly scan | "TikTok: 500th video delivered this year" |

**Privacy rule:** Arya captures signals only from project data already in the system. She does NOT use the full email body for signal extraction without PM consent. Client names in signals are used only if the project has no NDA flag.

### 4.2 — Per-Project Signal Capture (PROTO-PROJECT-CLOSURE addition)

After Step 3 of PROTO-PROJECT-CLOSURE, before the final PM validation:

**Trigger:** POST /api/admin/projects/[id]/linkedin-signals

Arya analyses:
- Project type, sector, client tier
- Delivery timeline (brief date → delivery date → on time or early?)
- Number of revision rounds (from ClickUp status history)
- Final invoice amount
- Assets delivered count (from SharePoint)
- Client approval email — extract the most compelling sentence if present
- PM learnings captured at closure

**Output:** A `LinkedInSignal[]` array stored on the project record:

```typescript
interface LinkedInSignal {
  type: "result" | "verbatim" | "process_insight" | "sector_trend" | "challenge_overcome" | "volume_milestone";
  content: string;            // the signal in one sentence, factual
  contentPillar: 1 | 2 | 3 | 4 | 5; // which LinkedIn pillar this maps to
  strength: "high" | "medium" | "low"; // how compelling
  usableWithNDA: boolean;     // can this signal be used if project is under NDA?
  clientNameRequired: boolean; // does this signal only work if client name is mentioned?
  suggestedHook: string;      // Arya's suggested opening line for a LinkedIn post
  used: boolean;              // true once signal is published or included in a post
}
```

### 4.3 — Weekly Content Brief (Friday Digest)

Every Friday, Arya generates a structured content brief for @social.

**Trigger:** Automated cron (Friday 9:00 AM Paris time)
**Endpoint:** POST /api/admin/arya/linkedin-weekly-digest

**Output saved to:** `docs/pm/linkedin-briefs/weekly-[YYYY-MM-DD].md`

**Brief format:**

```markdown
## Arya Weekly LinkedIn Brief — Week of [date]

### Strongest signals this week

| Signal | Project | Pillar | Strength | Suggested Hook |
|---|---|---|---|---|
| [1-sentence signal] | [project / client or anonymised] | [1–5] | High | "[suggested first line]" |

### Trends observed
- [Trend 1: e.g. "2 enterprise clients asked for same-day delivery — demand pattern worth amplifying"]
- [Trend 2: e.g. "First project in pharma sector — portfolio gap being filled"]

### Proof points cleared for publication
(Star projects, case study approved, no NDA)
- [Project Name] — [headline metric] — [link to case study draft]

### Suggested posts for next week (editorial calendar gaps)
- [Slot] — Pillar [X] — Suggested angle: [angle based on this week's signals]

### Signals for @creative-strategy
- New client sectors this week: [list]
- Recurring pain point in incoming briefs: [if >= 2 similar briefs]
- Capability newly demonstrated: [if any]
```

**PM validation:** No approval required — informational. If PM wants to develop a signal into a post immediately, she triggers the LinkedIn Article pipeline (Section 3.2) directly.

### 4.4 — Hot Signal (Immediate Notification)

Arya triggers a hot signal when one of these conditions is met mid-project:

| Condition | Trigger Moment |
|---|---|
| Client approval email contains a strong verbatim (sentiment positive + > 50 words) | On email classification |
| Project delivered > 50% ahead of deadline | On PROTO-ASSET-REVIEW completion |
| Volume milestone crossed (e.g. 1,000th asset for a client) | On ClickUp data aggregation |
| PM learnings capture an exceptional challenge overcome | On PROTO-PROJECT-CLOSURE learnings step |

**Output (Arya notification):**

```
⚡ HOT SIGNAL — [Project Name]
[Signal in 1 sentence — factual, no embellishment]
Suggested LinkedIn hook: "[Arya's draft first line]"
[ TRIGGER LINKEDIN DRAFT ] [ SAVE FOR WEEKLY BRIEF ] [ IGNORE ]
```

### 4.5 — Integration with @creative-strategy

For signals of type `sector_trend` or `challenge_overcome`, Arya also adds the signal to the @creative-strategy queue. These signals may inform:
- Positioning updates (new sector entry)
- Thought leadership angles (recurring client pain points = market insight)
- Service offering evolution signals

Format: same as hot signal, routed to the @creative-strategy agent queue in the back-office.

### 4.6 — Editorial Calendar Sync

When @social selects a signal to develop into a post:
1. @social generates post copy
2. @social inserts the post into `docs/social/editorial-calendar.md` at the appropriate slot
3. Status: "Ready" (replacing "Draft")
4. The source signal is marked `used: true` in the project's `linkedin_signals` record — prevents the same signal from appearing in future weekly briefs

---

## 5. User Stories

### US-CLOSE-01 — Detect timeout-ready projects

**As** the PM,
**I want** Arya to automatically detect projects in "Client Review" status with no client response for >= 14 days,
**So that** no project is left open indefinitely because of a non-responsive client.

**Acceptance Criteria:**

Happy path:
- [ ] GIVEN a project in status "Client Review" WHEN the last client email on that domain is > 14 calendar days ago THEN Arya flags the project as "timeout-closure" and surfaces it in the PM dashboard
- [ ] GIVEN a flagged project WHEN the PM selects "CLOSE PROJECT" THEN PROTO-PROJECT-CLOSURE executes steps 1–7 in sequence
- [ ] GIVEN a project flagged for timeout closure WHEN Arya computes the Star Score THEN the score is computed and displayed in the closure summary before PM confirmation

Error cases:
- [ ] GIVEN a ClickUp API timeout during closure WHEN Arya cannot update the status THEN she logs the error, notifies PM, and provides manual instructions — she does NOT retry automatically
- [ ] GIVEN the PM selects "KEEP OPEN" on a flagged project THEN the project is removed from the timeout queue for 7 days, then re-flagged if still unresolved

Edge cases:
- [ ] GIVEN a project with no client email domain in the system WHEN timeout check runs THEN the project is flagged for PM manual review with note "No client email found — cannot verify non-response"
- [ ] GIVEN double-click on "CLOSE PROJECT" button THEN second click is ignored — closure runs exactly once (idempotent)

Permissions:
- [ ] GIVEN a user with role "user" (not admin) WHEN they attempt to trigger closure THEN closure is blocked and PM (admin) is notified

Existing data:
- [ ] GIVEN a project already in status "Closed" WHEN the daily scan runs THEN the project is excluded from all closure checks

---

### US-CLOSE-02 — Client validation triggers closure

**As** the PM,
**I want** Arya to detect a client validation email and automatically flag the project for closure,
**So that** I don't need to manually initiate closure when a client says "approved."

**Acceptance Criteria:**

Happy path:
- [ ] GIVEN an email classified as `client_approval` by PROTO-CLIENT-RETURN WHEN the email is matched to an open project THEN Arya flags the project for "validation-closure" and surfaces a closure summary in the PM dashboard
- [ ] GIVEN a closure summary surfaced WHEN the PM confirms THEN ClickUp status updates to "Closed", invoice is generated, Star Score is computed, LinkedIn signals are captured — all in sequence

Error cases:
- [ ] GIVEN an email classified as `client_approval` WHEN the project match returns `{ matched: false }` THEN Arya notifies PM: "Approval email received but no project matched. Please manually link and trigger closure."
- [ ] GIVEN invoice generation fails (Evoliz API error) WHEN PM confirms closure THEN ClickUp is still closed, PM is notified of the invoice error separately — closure is not rolled back

Edge cases:
- [ ] GIVEN a client sends a partial approval ("the logo version is approved, not the banner") WHEN PROTO-CLIENT-RETURN classifies it THEN classification returns `client_partial_approval` (not `client_approval`) and Arya does NOT trigger closure — she flags it for PM review instead
- [ ] GIVEN a project with NDA flag WHEN validation-closure is triggered THEN Star Pipeline is suppressed and PM receives the NDA gate: "This project scored [X]/100 but is under NDA. Options: A, B, C."

---

### US-STAR-01 — Star scoring on project closure

**As** the PM,
**I want** Arya to automatically score every closed project on the 5-criterion Star matrix,
**So that** I can immediately see which projects deserve content generation without having to evaluate them manually.

**Acceptance Criteria:**

Happy path:
- [ ] GIVEN a project being closed WHEN PROTO-PROJECT-CLOSURE runs THEN Star Score is computed against the 5-criterion matrix and stored on the project record before the PM sees the final summary
- [ ] GIVEN a Star Score >= 75 AND case study score >= 70 THEN the project is flagged as STAR and the pipeline is offered to the PM in the closure summary
- [ ] GIVEN a Star Score >= 75 AND case study score < 70 THEN the project is flagged as "Strong Story, Weak Assets" — LinkedIn article only pipeline is offered
- [ ] GIVEN a Star Score 50–74 THEN the project is flagged as "Noteworthy" and added to the LinkedIn feeder queue without triggering the full pipeline

Error cases:
- [ ] GIVEN a project with missing data (no client name in ClickUp, no invoice amount) WHEN Star Score is computed THEN missing criteria are scored 5 pts (minimum), PM is shown "[criterion] could not be scored — defaulted to minimum. Override?" after closure
- [ ] GIVEN an admin overrides a criterion score WHEN the new score pushes the total above or below a threshold THEN the pipeline status updates immediately and PM is notified of the change

Edge cases:
- [ ] GIVEN a project with `nda_blocks_publication: true` WHEN Star Score >= 75 THEN score is stored but pipeline is suppressed — PM sees the NDA gate options
- [ ] GIVEN a project that was already scored by the case-study-generator WHEN Star Score runs THEN both scores are stored independently — no overwrite of the case study generator score

Permissions:
- [ ] GIVEN a user with role "user" WHEN they attempt to override a Star criterion score THEN the override is blocked — only admin can override

---

### US-STAR-02 — Star Pipeline trigger and validation

**As** the PM,
**I want** to review all four pipeline outputs (case study, LinkedIn article, commercial slide, SEO signal) before any of them goes live,
**So that** nothing is published automatically without my approval.

**Acceptance Criteria:**

Happy path:
- [ ] GIVEN a project flagged as STAR WHEN the PM confirms the pipeline in the closure summary THEN all four outputs are generated asynchronously and available in the back-office within [HYPOTHÈSE : 2–5 minutes depending on content generation latency]
- [ ] GIVEN a LinkedIn article draft generated WHEN the PM reviews it THEN she can: (A) approve and schedule (inserts into editorial calendar), (B) edit the draft inline, or (C) reject (draft archived, not deleted)
- [ ] GIVEN a commercial slide brief generated WHEN the PM approves THEN the brief is saved to `docs/pm/slide-briefs/` and a notification is queued for the design team
- [ ] GIVEN an SEO signal generated THEN it is immediately appended to `docs/seo/star-signal-queue.md` without PM action required

Error cases:
- [ ] GIVEN the case-study-generator API fails WHEN the pipeline is triggered THEN Arya notifies PM: "Case study generation failed. [Error detail]. You can retry here: [button]. Other pipeline outputs are unaffected."
- [ ] GIVEN LinkedIn article generation produces a draft with a placeholder (e.g. "[METRIC NEEDED]") WHEN PM reviews THEN the placeholder is highlighted in red and the PM is blocked from approving until the placeholder is resolved

Edge cases:
- [ ] GIVEN the PM selects "SKIP PIPELINE" at the closure confirmation THEN no pipeline outputs are generated. The Star Score is still stored. PM can re-trigger the pipeline later from the project record.
- [ ] GIVEN a pipeline is triggered for a project that already has a published case study THEN the case study pipeline is skipped (duplicate prevention). Arya notifies PM: "Case study already published for this project — skipped. LinkedIn, slide and SEO generated normally."

---

### US-FEEDER-01 — Weekly LinkedIn brief generation

**As** the PM,
**I want** Arya to produce a weekly content brief every Friday with the strongest signals from the week's projects,
**So that** @social has fresh material each week without me having to manually compile project data.

**Acceptance Criteria:**

Happy path:
- [ ] GIVEN the Friday cron runs at 9:00 AM WHEN there are projects closed or updated during the week with captured LinkedIn signals THEN a weekly brief is generated and saved to `docs/pm/linkedin-briefs/weekly-[date].md`
- [ ] GIVEN the weekly brief is generated THEN it contains at minimum: strongest signals table, editorial calendar gaps, proof points cleared for publication
- [ ] GIVEN the PM clicks a signal in the brief WHEN she selects "Trigger LinkedIn Draft" THEN the LinkedIn Article pipeline (Section 3.2) is triggered with that signal as input

Error cases:
- [ ] GIVEN no projects were closed or updated this week WHEN the Friday cron runs THEN a brief is still generated with: "No new project signals this week. [Reminder of unused signals from previous weeks still available.]"

Edge cases:
- [ ] GIVEN a signal was already marked `used: true` WHEN the Friday cron runs THEN the signal is excluded from the brief
- [ ] GIVEN a brief generation fails (e.g. DB error) WHEN the cron runs THEN the error is logged and PM is notified via back-office notification — no silent failure

---

## 6. UI Wireframes (ASCII)

### W1 — Closure Summary Card (PM Dashboard)

```
┌─────────────────────────────────────────────────────────────────┐
│  PROJECT CLOSURE — [Project Name] — [Client]                    │
│  ─────────────────────────────────────────────────────────────  │
│  Reason:  Client validation received on [date]                  │
│           (OR) No client response for 14+ days                  │
│                                                                 │
│  Deliverables:  ✅ 12 files archived in SharePoint              │
│  Invoice:       € [amount] — ready to generate                  │
│  Open tasks:    ✅ All closed                                    │
│                                                                 │
│  ⭐ STAR SCORE (preliminary)                                    │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Client Tier        ██████████████████████  20/25     │      │
│  │ Measurable Impact  ██████████████████████  20/25     │      │
│  │ Creative Ambition  ████████████████        15/20     │      │
│  │ Storytelling       ████████████████████    15/15     │      │
│  │ Portfolio Gap      ██████████████          10/15     │      │
│  │ ─────────────────────────────────────────────────    │      │
│  │ TOTAL              ████████████████████    80/100 ⭐ │      │
│  └──────────────────────────────────────────────────────┘      │
│  Full scoring runs after you confirm closure.                   │
│                                                                 │
│  [ CLOSE PROJECT ] [ KEEP OPEN ] [ ESCALATE TO THOMAS ]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### W2 — Star Badge & Pipeline Panel (Post-Closure)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ PROJECT CLOSED — [Project Name]                             │
│  ClickUp: Closed | Invoice: €[X] generated | SP: archived      │
│                                                                 │
│  ⭐ STAR PROJECT — 80/100                                       │
│  ─────────────────────────────────────────────────────────────  │
│  CONTENT PIPELINE                                               │
│                                                                 │
│  📄 Case Study         [ GENERATING... / REVIEW DRAFT ]        │
│  📝 LinkedIn Article   [ GENERATING... / REVIEW DRAFT ]        │
│  🖼  Commercial Slide   [ BRIEF READY — APPROVE ]              │
│  🔍 SEO Signal         [ SENT TO PIPELINE ✅ ]                 │
│                                                                 │
│  All drafts require your approval before use.                  │
│                                                                 │
│  [ VIEW ALL DRAFTS ] [ SKIP PIPELINE ] [ OVERRIDE STAR (🔒) ] │
└─────────────────────────────────────────────────────────────────┘
```

---

### W3 — LinkedIn Article Review Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  LINKEDIN ARTICLE DRAFT — [Project Name]                        │
│  Pillar: 1 — Proof Point  |  ~4 min read                       │
│  Suggested slot: Thursday April 9 (Pillar 1 gap in calendar)   │
│  ─────────────────────────────────────────────────────────────  │
│  TITLE                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 94 million views. 3,800€. Here's exactly how it happened. │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  BODY (scrollable)                                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [Opening paragraph — jaw-dropping fact]                   │ │
│  │ [Context paragraph — what the client needed]              │ │
│  │ [Process paragraph — how Sarani delivered]                │ │
│  │ [Result paragraph — numbers + client reaction]            │ │
│  │ [Closing — principle + soft CTA]                          │ │
│  │ #EnterpriseCreative #VideoProduction                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [ APPROVE + SCHEDULE Thu Apr 9 ] [ EDIT ] [ REJECT ]          │
└─────────────────────────────────────────────────────────────────┘
```

---

### W4 — Weekly LinkedIn Brief (PM View)

```
┌─────────────────────────────────────────────────────────────────┐
│  ARYA WEEKLY BRIEF — Week of April 1                            │
│  3 signals captured | 1 proof point cleared | 2 calendar gaps  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  STRONGEST SIGNALS                                              │
│  ┌──┬──────────────────────────────┬───────┬────────┬────────┐ │
│  │# │ Signal                       │Pillar │Strength│Action  │ │
│  ├──┼──────────────────────────────┼───────┼────────┼────────┤ │
│  │1 │ Client X: delivered 48h      │   1   │  High  │[DRAFT] │ │
│  │  │ ahead of 5-day deadline      │       │        │        │ │
│  ├──┼──────────────────────────────┼───────┼────────┼────────┤ │
│  │2 │ 2nd pharma brief this month  │   3   │  Med   │[SAVE]  │ │
│  ├──┼──────────────────────────────┼───────┼────────┼────────┤ │
│  │3 │ "How did you deliver this    │   2   │  High  │[DRAFT] │ │
│  │  │ so fast?" — [Client Y]       │       │        │        │ │
│  └──┴──────────────────────────────┴───────┴────────┴────────┘ │
│                                                                 │
│  EDITORIAL CALENDAR GAPS (next 7 days)                         │
│  · Thu Apr 4 — Pillar 1 slot empty                             │
│  · Fri Apr 5 — Pillar 3 slot empty                             │
│                                                                 │
│  [ VIEW FULL BRIEF ] [ OPEN EDITORIAL CALENDAR ]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Edge Cases

### EC-1 — Client who never responds

**Scenario:** A project is in "Client Review" for 14 days. Arya flags it. PM closes it. Client responds 2 weeks later saying they want changes.

**Handling:**
- The email is classified as `client_followup` by PROTO-CLIENT-RETURN
- PROTO-CLIENT-RETURN's US-2.3 applies: Arya detects the project status is "Closed" and proposes reopening
- ⏸️ VALIDATION PM: "Project [Name] was closed on [date]. Client sent feedback on [date]. Reopen as In Progress?"
- If PM reopens: invoice is put on hold (PM must cancel or amend in Evoliz manually — Arya cannot automatically retract a sent invoice)
- Star Pipeline outputs already generated are kept in draft status — not deleted

---

### EC-2 — Project cancelled mid-flight

**Scenario:** Client cancels the project before any deliverables are produced. No completion, no invoice possible.

**Handling:**
- Closure triggered by PM (not by timeout or validation)
- PROTO-PROJECT-CLOSURE runs, but at Step 3 (invoice generation): ⏸️ VALIDATION PM — "Invoice amount: 0 or [cancellation fee]? Check your contract." Arya does not generate an invoice amount she cannot verify.
- Star Score still runs. Score will be low (no measurable impact, no delivered assets) — expected result: Standard (< 50).
- No pipeline triggered.
- ClickUp: status = "Cancelled" (not "Closed") — Arya uses a separate status to distinguish cancelled from completed projects.

---

### EC-3 — NDA strict (no publication possible)

**Scenario:** A project has `nda_blocks_publication: true`. The project scores 90/100 — clearly a Star.

**Handling:**
- Star Score computed and stored (internal value)
- Pipeline is NOT triggered automatically
- PM sees the NDA gate:
  ```
  ⏸️ NDA GATE:
  "This project scored 90/100 (STAR) but is under NDA.
  A: Anonymise — generate content without naming the client brand
  B: Skip — no content generated now
  C: Defer — mark for review when NDA expires (set reminder date)"
  ```
- If A (anonymise): Arya generates all pipeline outputs with `clientName = "a global [sector] brand"`. PM reviews before any publication.
- If B or C: score is stored, signals are archived, no outputs generated.

---

### EC-4 — Project too small for Star

**Scenario:** A simple banner pack for a startup, invoiced at 350€.

**Handling:**
- Star Score computed: Client Tier = 5, Impact = 5, Creative Ambition = 5, Storytelling = 5, Portfolio Gap = 5 → Total = 25
- Status: Standard — no pipeline triggered, not surfaced by default
- Project is still accessible via filters in the case-study-generator dashboard
- No PM notification about Star Score (below 50 = silent)

---

### EC-5 — LinkedIn slot conflict

**Scenario:** Arya tries to insert an approved LinkedIn article into the editorial calendar but the next available Pillar 1 slot is already filled by another draft.

**Handling:**
- Arya inserts the article as a new row after the filled slot and flags it: "Added by Star Pipeline — not in original schedule. Review calendar to reorder if needed."
- Arya does NOT overwrite or delete existing calendar entries.

---

### EC-6 — Case study already published

**Scenario:** A project was manually published as a case study 6 months ago. Now the Star Pipeline runs on a related project and tries to generate a duplicate.

**Handling:**
- Case-study-generator checks for existing case studies by `clickupTaskId` before generating.
- If found: case study pipeline is skipped. Arya notifies PM: "Case study already published for [Project] — skipped. LinkedIn article and slide generated normally."

---

### EC-7 — Score tie at threshold

**Scenario:** A project scores exactly 75 on the Star Score but 69 on the case study score (one point below the 70 threshold).

**Handling:**
- Status: "Strong Story, Weak Assets" (not full STAR)
- LinkedIn article pipeline is triggered
- Case study pipeline is NOT triggered (threshold not met)
- PM can manually override to force case study generation — override reason is logged

---

## 8. Data Model Additions

### Table: `project_star_scores`

| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| project_id | varchar(255) | FK → projects |
| client_tier_score | int | 5–25 |
| impact_score | int | 5–25 |
| creative_ambition_score | int | 5–20 |
| storytelling_score | int | 5–15 |
| portfolio_gap_score | int | 5–15 |
| total_score | int | 0–100 |
| star_status | enum | STAR / STRONG_STORY_WEAK_ASSETS / NOTEWORTHY / STANDARD |
| override_by | uuid | FK → users (null if no override) |
| override_reason | text | Required if override_by is set |
| nda_blocks_publication | boolean | default false |
| pipeline_triggered | boolean | default false |
| pipeline_triggered_at | timestamp | null if not triggered |
| created_at | timestamp | |
| updated_at | timestamp | |

### Table: `linkedin_signals`

| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| project_id | varchar(255) | FK → projects |
| type | enum | result / verbatim / process_insight / sector_trend / challenge_overcome / volume_milestone |
| content | text | Signal in 1 sentence |
| content_pillar | int | 1–5 |
| strength | enum | high / medium / low |
| usable_with_nda | boolean | |
| client_name_required | boolean | |
| suggested_hook | text | Arya's draft first line |
| used | boolean | default false |
| created_at | timestamp | |

### Table: `star_pipeline_outputs`

| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| project_id | varchar(255) | FK → projects |
| output_type | enum | case_study / linkedin_article / commercial_slide / seo_signal |
| status | enum | generating / draft / approved / rejected / skipped |
| draft_content | text | JSON or markdown content |
| pm_reviewed_by | uuid | FK → users |
| pm_reviewed_at | timestamp | |
| rejection_reason | text | Required if status = rejected |
| published_at | timestamp | null until published |
| created_at | timestamp | |

### Additions to existing `projects` table

| Column | Type | Description |
|---|---|---|
| closure_trigger | enum | client_validation / timeout / manual / cancelled | null |
| closure_flagged_at | timestamp | When Arya first flagged for closure |
| closed_at | timestamp | When PM confirmed closure |
| nda_blocks_publication | boolean | default false |

---

## 9. API Routes

### POST /api/admin/projects/[id]/close-check

Check whether a project is eligible for closure (reads ClickUp status + email history).

```typescript
// Response
interface CloseCheckResponse {
  eligible: boolean;
  reason: "client_validation" | "timeout" | "not_eligible";
  lastClientEmailDate?: string; // ISO date
  openTasksCount: number;
  deliverableCount: number;
  invoiceAmount?: number; // from Excel tracker, null if not found
}
```

---

### POST /api/admin/projects/[id]/star-score

Compute the full Star Score. Idempotent — re-running updates the score.

```typescript
// Input
interface StarScoreInput {
  projectId: string;
  overrides?: { criterion: string; score: number; reason: string }[]; // optional manual overrides
}

// Response
interface StarScoreResponse {
  clientTierScore: number;
  impactScore: number;
  creativeAmbitionScore: number;
  storytellingScore: number;
  portfolioGapScore: number;
  totalScore: number;
  starStatus: "STAR" | "STRONG_STORY_WEAK_ASSETS" | "NOTEWORTHY" | "STANDARD";
  caseStudyScore: number; // from case-study-generator scoring
  pipelineRecommendation: ("case_study" | "linkedin_article" | "commercial_slide" | "seo_signal")[];
}
```

---

### POST /api/admin/projects/[id]/linkedin-signals

Extract and store LinkedIn signals from project data.

```typescript
// No input body — reads project record, ClickUp data, SharePoint file count, email history
// Response
interface LinkedInSignalsResponse {
  signalsCount: number;
  signals: LinkedInSignal[];
}
```

---

### POST /api/admin/projects/[id]/star-pipeline/trigger

Trigger all pipeline outputs for a starred project. Returns immediately — generation is async.

```typescript
// Input
interface StarPipelineTriggerInput {
  outputs: ("case_study" | "linkedin_article" | "commercial_slide" | "seo_signal")[]; // which outputs to generate
  anonymise?: boolean; // true if NDA — replaces client name with sector description
}

// Response
interface StarPipelineTriggerResponse {
  jobId: string;
  estimatedReadyAt: string; // ISO datetime — [HYPOTHÈSE: 2–5 min]
  outputsQueued: string[];
}
```

---

### POST /api/admin/arya/linkedin-weekly-digest

Generate the Friday weekly brief. Called by cron or manually.

```typescript
// No input body — reads all linkedin_signals from the past 7 days, editorial calendar, star pipeline outputs
// Response
interface WeeklyDigestResponse {
  savedTo: string; // path to the generated .md file
  signalCount: number;
  calendarGapsFound: number;
  proofPointsCleared: number;
}
```

---

## 10. Hypotheses to Validate

| Hypothesis | Evidence Level | Validation Test | Status |
|---|---|---|---|
| The 5-criterion Star matrix correctly identifies the projects Sarani would intuitively call "exceptional" | Low — calibrated on limited examples | Run the matrix on 10–15 historical projects, compare with Thomas's intuitive ranking | To validate |
| A 14-day timeout is the right threshold for non-response closure | Low — no data | Track closure-by-timeout cases for 60 days; if > 20% reopen after closure → lower threshold to 10 days | To validate |
| LinkedIn articles generated by Arya reach publishing quality with 1 PM review pass | Low | PM review time tracking on first 10 articles — if avg edit time > 30 min → rework the generation prompt | To validate |
| The Friday brief format is actionable enough that @social uses it without further clarification | Low | Track @social brief-to-post conversion rate for 4 weeks | To validate |
| [HYPOTHÈSE : pipeline generation latency is 2–5 minutes] | Not measured | Instrument generation endpoint with timing; adjust UX loading states if > 5 min | To validate |
| The "Strong Story, Weak Assets" threshold (case study score < 70 but star score >= 75) correctly identifies edge cases | Low | Manually review all projects that hit this condition in the first 90 days | To validate |

---

**Handoff → @fullstack**

Files produced:
- `/home/user/Sarani/docs/product/project-closure-star-pipeline-specs.md` — this document

Decisions taken:
- **Closure is never automatic** — Arya flags, PM confirms. Every irreversible action (ClickUp status change, invoice generation) has a ⏸️ gate.
- **Star Score is a new matrix (5 criteria, 0–100)** separate from but complementary to the case-study-generator scoring matrix. Both thresholds must be met (star >= 75 AND case study >= 70) to trigger the full pipeline.
- **Pipeline outputs are all drafts** — nothing is auto-published. PM validates each output individually.
- **Arya as LinkedIn Feeder** is signal-extraction only, not content creation. The content is created by @social using Arya's signals. This preserves the content quality standard from `docs/social/linkedin-strategy.md`.
- **NDA gate** is a hard stop on all publication pipelines — score is stored but no output is generated without explicit PM decision.
- **SEO signal is the only output with no PM approval** — it is informational only and feeds `docs/seo/star-signal-queue.md`.

Points of attention for implementation:
- **PROTO-PROJECT-CLOSURE** extends the existing `PROTO-PROJECT-CLOSE` from `docs/pm/arya-protocols.md`. Steps 1–3 of the existing protocol are unchanged. New steps (Star Score, LinkedIn signals, pipeline trigger) are inserted at Steps 4–5 before the final PM summary.
- **Case study generation** must call the existing case-study-generator API (see `docs/product/case-study-generator-specs.md`) — do not duplicate the generation logic in Arya.
- **Email classification** for `client_partial_approval` is a new classification label — extend the classify route to support it (distinct from `client_approval` — does not trigger closure).
- **Editorial calendar** (`docs/social/editorial-calendar.md`) is a markdown file. The insertion logic (Pillar slot detection, row append) requires a parser that can read and write this specific table format.
- **Data model additions** (3 new tables + 4 columns on `projects`) are defined in Section 8 — add to `src/lib/db/schema.ts`.
- **Weekly cron** — add a Friday 9:00 AM Paris time cron job (or manual trigger) for the LinkedIn weekly digest.

**Handoff → @qa**

Test scenarios to derive:
- Timeout closure: project at exactly 14 days, project at 13 days (should NOT trigger), project at 15 days
- Double-click on "CLOSE PROJECT" — idempotency test
- Star Score with all fields present vs missing client name vs missing invoice amount
- NDA gate: project with NDA that scores STAR → verify pipeline is suppressed until PM decision
- Editorial calendar insertion with full slots vs empty slots vs calendar in malformed state
- Weekly digest with zero signals (empty week), normal week, week with NDA-only projects

**Handoff → @social**

Weekly LinkedIn briefs are now generated automatically every Friday by Arya and saved to `docs/pm/linkedin-briefs/`. @social should read the latest brief at the start of each content creation session as the primary input, alongside `docs/social/linkedin-strategy.md` and `docs/social/editorial-calendar.md`.

Hot signals (immediate notifications) can also arrive mid-week when exceptional project moments are detected — @social should treat these as priority content opportunities.
