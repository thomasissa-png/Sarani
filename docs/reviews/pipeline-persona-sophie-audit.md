# Persona Audit — Pipeline Case Study Page
**Persona:** Sophie, 38, Head of Marketing — Major international group (TikTok, Sony, Adidas calibre)
**Budget under management:** €500K–€5M/year
**Auditor role:** Prospective enterprise client evaluating Sarani as a potential agency partner
**Pages evaluated:** `/case-studies/[slug]` (pipeline-generated) vs `/work/[slug]` (static reference)
**Pipeline reviewed:** `pipeline-prompts.ts`, `schemas.ts`
**Date:** 2026-04-03

---

## Overall Score: 7.2 / 10

The bones are solid. The architecture is right. But right now, the pipeline-generated page is a step *below* the static `/work/` pages that already exist — and those are the pages I'd actually be shown by someone at my level. The gap matters.

---

## Gates GP1–GP10

### GP1 — Compréhension immédiate
**PASS — with a caveat**

When I land on this page, I immediately see the client name in brand color at the top, then a headline that follows the Problem → Result formula. If the pipeline does its job, I get something like "300–500 edits per week. 400M+ views. Every deadline met." That lands in under 3 seconds.

The caveat: the `keyMetric` badge (the orange pill below the H1) is doing double duty as both a proof point AND a teaser. That works only if the number is genuinely striking. If the pipeline outputs something vague like "Scalable production" because the project data is thin, that pill becomes noise.

**What makes this tick or fail: the quality of the headline the LLM generates.** The schema enforces the Problem → Result formula, which is the right constraint. Execution depends on the input data richness.

---

### GP2 — Valeur perçue
**CONDITIONAL PASS — depends entirely on what the stats cards say**

The 3-stats layout is the right call. At my level, I don't read long case studies first — I scan the numbers. If I see "1,500+ videos/month / $20 per video / 100% deadlines met" I'm interested. If I see "Quality production / Fast delivery / Satisfied client" — I'm gone.

The `stats` field in the schema is a strict tuple of 3 required items. The copywriter prompt explicitly says: *"Use specific numbers: '1,500+ videos/month' not 'many videos'"*. That's the right instruction. But the input to the copywriter is `sharePointAssetCount` (an integer) and `projectAmount` (a string). If a project has an asset count of 47 and an amount of €3,200, the LLM has to work to turn those into compelling stats. It will likely produce something like "47 assets / €3,200 total / 2 weeks" — which is fine but not wow.

The real risk: projects with thin data (no views, no savings vs. competitor quote, no percentage improvement) will produce stats that feel generic. And generic stats don't convert me.

---

### GP3 — Crédibilité
**FAIL**

This is where the pipeline page falls behind the static `/work/` pages, and it matters.

The `/work/[slug]` page has:
- A **hero image** of the actual work (the Adidas Arena photo, the TikTok UGC visual)
- A **project gallery** from SharePoint — real assets Sarani produced
- A **Prev/Next navigation** that signals this is one of many case studies in a rich portfolio

The `/case-studies/[slug]` (pipeline) page has:
- **No hero image**
- **No gallery**
- A sticky "At a Glance" sidebar that's nearly identical to the static version

When I land on a page about video editing work and I can't see a single frame of the output, I feel like I'm reading a brochure, not seeing proof. The copy might say "1,500 edits per month" but my brain needs visual confirmation. No visuals = agence qui se cache derrière les mots.

The testimonial is optional in the schema (`testimonial?: {...}`). If it's missing, the credibility gap widens further.

---

### GP4 — Parcours fluide
**PASS**

The CTA architecture is clean. There's a "Start a project" button in the sticky sidebar (always visible while scrolling the body) and a second CTA at the page bottom ("Your brief could be next. / First project satisfaction or no invoice."). 

The closing line "First project satisfaction or no invoice" is genuinely differentiated — it addresses my risk objection directly without me having to ask. I don't have to wonder "but what if it's bad?" — they've answered it in the CTA section.

The `CaseStudyCta` component fires a tracking event with the client name, which means the analytics are properly instrumented. Good.

One friction: there is no `resultsDetail` fallback summary sentence under the stats grid (unlike the `/work/` page which renders `cs.resultsDetail || cs.result` as a narrative paragraph after the stats). The pipeline page just shows 3 stat cards and moves on. I want one human sentence after the numbers to give them context.

---

### GP5 — Pricing acceptable
**N/A** — No pricing on this page. Noted.

---

### GP6 — Recommandation
**CONDITIONAL PASS**

If the pipeline is working well — clear headline, strong stats, clean layout — I'd forward this to a colleague CMO or a procurement director. The URL structure `/case-studies/[slug]` is shareable and descriptive.

But I would NOT share a page that has no visual proof of the work. My colleague would open it and say "nice numbers, where's the creative?" and I'd look like I didn't vet it properly. The no-image problem (GP3) directly blocks this gate from being a firm PASS.

---

### GP7 — Conviction
**CONDITIONAL PASS**

The layout does the job of convincing me conceptually. The structure is: Context → Numbers → Story → Sidebar proof → Social proof (testimonial if present) → Risk removal (no invoice guarantee) → Next steps.

That's a solid conversion architecture. I've seen agencies charge €15K for a landing page that's less well thought through.

The problem: conviction requires proof, and proof is partly visual. The best copy in the world doesn't overcome "I haven't seen the work." If the pipeline generates a case study for a video editing project and there's no video, no thumbnail, no visual — my conviction is theoretical, not visceral.

If Sarani adds even a single image per pipeline-generated case study, this becomes a firm PASS.

---

### GP8 — Look & feel
**PASS**

From what I can read in the component structure, the design language is consistent with a premium creative agency: clean typography hierarchy (H1 at `text-5xl` on desktop), brand color accents (`brand-flame` / `brand-flame-dark`), subtle border on the sidebar card, generous spacing, breadcrumb schema for SEO.

The `rounded-full` pills for category and tags are a nice touch — they feel editorial rather than corporate. The `bg-brand-flame/10` tag pills are particularly good: visible but not aggressive.

One note: the `keyMetric` badge uses `bg-brand-flame/10` with `text-brand-flame` — which is the same color family as the tags. Visually, this risks getting lost. The keyMetric is the single most important number on the page. It deserves more visual separation from the category tags.

---

### GP9 — Outputs utiles
**PASS — for the page structure, CONDITIONAL for the content quality**

The information architecture covers exactly what I need to evaluate an agency:
1. What was the problem (brief/challenge)
2. What did they do (solution)
3. What were the measurable results (stats + resultsDetail)
4. Who can vouch for them (testimonial)
5. What does it cost me to try (first project satisfaction guarantee)

The structure is right. The utility depends on content quality — which circles back to whether the pipeline inputs are rich enough to generate genuinely useful outputs.

The `challenge` / `solution` / `resultsDetail` fields are all optional in the schema. If the LLM only populates `brief` and `result` (the fallback path), the page feels thin. I want the structured Challenge → Solution → Results in Detail narrative — it mirrors how I'd present a project to my board.

---

### GP10 — Fidélisation
**PASS**

If I were already a Sarani client and I landed on one of these case studies (perhaps shared by my account manager, or discovered via a LinkedIn post), this page would work as a confidence reinforcer. Seeing my industry peers (TikTok, Sony, Adidas) mentioned in the related case studies section normalizes my choice of agency.

The "More Case Studies" grid at the bottom effectively signals breadth of portfolio. If I'm a TikTok marketing manager reading the TikTok UGC case study, seeing GEODIS and Adidas in the "More" section tells me this isn't a one-trick shop.

---

## Content Quality Assessment

### Prompt architecture: well-designed, one structural gap

The 3-step pipeline (Strategy → Copy → Social) is genuinely sophisticated for an agency's back-office tool. The creative strategy step is particularly smart — making the LLM define an `emotionalHook` and `targetAudience` before the copywriter writes anything forces strategic alignment that most agencies skip.

**What works:**
- `NEVER invent data` is explicit in all three prompts — this is the right guardrail
- The headline formula constraint ("Problem → Result") is enforced at prompt level — the schema validates the output, the prompt explains why
- The `keyMessages` array (2-5 items) gives the copywriter structured guidance, not a blank canvas
- The LinkedIn post prompt correctly identifies "first line is everything" — this shows platform-native thinking
- The `suggestedSegment` field in the nurturing email schema means each email can be targeted — not blasted

**The structural gap:**
The `stats` tuple is always 3 items. But the schema doesn't enforce that stats should be *metrics* — it just requires `label` and `value` strings. This means a low-data project could produce stats like:
```
{ label: "Client", value: "GEODIS" }
{ label: "Format", value: "Presentation" }
{ label: "Timeline", value: "3 weeks" }
```
That's exactly what the Adidas and LEGO static case studies do for their weaker stat positions. It's not wrong, but it's not *proof* — it's description. I'd recommend the copywriter prompt include guidance like: "at least 2 of the 3 stats must contain a quantified outcome (number, percentage, currency amount, or time-to-deliver)."

### Simulated output: TikTok — 1,500+ video edits per month

Based on the input data the pipeline would receive for the TikTok UGC edits project:
- `clientName`: TikTok
- `projectType`: Video Production
- `assetCount`: 1,500+
- `amount`: $20/video (recurring)

**Creative strategy step** would likely produce:
- `angle`: "The agency that never sleeps — how TikTok's compliance editing programme scaled without a single missed week"
- `emotionalHook`: Something about "300 videos stacked in your inbox on Monday morning" — the operational dread of scale

That's genuinely resonant for me. I've been in that situation. My team gets overwhelmed by volume requests, not creative ones.

**Headline** — the formula constraint should produce something like: "300–500 edits per week. No agency could handle it. Sarani did." That works. It's direct.

**Stats** — with strong input data ($20/video, 1,500+/month, 100% delivery rate), the stats would be powerful. This is a best-case scenario for the pipeline.

**Nurturing email** — the `suggestedSegment` would likely be "Head of Creative Production / Video Production Manager at enterprise platforms." The `emotionalHook` as opener ("Your Monday morning content queue is 300 videos deep...") is the right approach. Under 150 words is achievable. Whether the LLM actually stays under 150 words consistently is a runtime concern, not a schema issue.

**LinkedIn post** — the `hook` needs to earn a stop-scroll in 1 line. If the pipeline produces "We edited 1,500+ TikTok videos last month" — that's a FAIL. If it produces "300 videos in your inbox. Monday morning. Your team of 3." — that earns the scroll-stop. The SOCIAL_PROMPT's optimization tips are well-written; execution depends on the LLM.

---

## What Would Make Me Say WOW

**1. Show me the work — one visual per pipeline case study**
This is the single biggest gap. Even a screenshot, a still frame, a mockup. The `/work/` pages have gallery images and hero photos. The pipeline page has none. An agency talking about visual work without showing it feels like a chef describing a meal without letting you taste it.

**2. The "vs. what it would have cost" contrast**
The GEODIS case study nails this: "previous agency quoted €80,000 / Sarani: €8,500." That one data point is more convincing than three paragraphs of copy. If a project has a competitive context (they got quotes from others, they had an internal team trying to do it, they paid an expensive agency before Sarani), that contrast should be surfaced in a callout box — not buried in the body text.

**3. A named testimonial with a LinkedIn-verifiable title**
The static case studies have "Campaign Manager, TikTok" and "Marketing Director, GEODIS." That's fine. But if Sarani could get a first name — "Marie-Laure, Marketing Director, GEODIS" — the credibility multiplies. I Google people. I check LinkedIn. A job title without a name reads like a placeholder.

**4. The "relay structure" explanation**
The Sony Black Friday case study mentions the relay structure (45 experts, 5 continents, working in timezone relay). That's Sarani's operational moat. I've never seen another agency explain HOW they deliver same-day without it being a "rush fee" — because most agencies can't. This should surface on the pipeline page too, not just on static pages.

**5. Prev/Next navigation between case studies**
The `/work/` page has it. The pipeline page doesn't. For me as an evaluator reading multiple case studies, this navigation is the difference between a curated portfolio experience and a dead-end page.

---

## Red Flags

**Red flag #1 — No visual proof on the pipeline page**
I've said it twice and I'll say it again: if I land on a case study about video editing and I can't see or watch anything Sarani produced, my trust level drops. I start wondering if the project was actually that impressive, or if the numbers were cherry-picked. Visual proof is the disarming mechanism.

**Red flag #2 — Optional testimonial**
The `testimonial` field is `optional` in the schema. That means some pipeline-generated case studies will have it and some won't. The ones without it feel noticeably weaker, especially sitting next to the static pages which almost all have testimonials. Either the pipeline should be required to request/generate a testimonial placeholder, or the page layout should be designed to work without it in a way that doesn't leave an obvious gap.

**Red flag #3 — Generic stats on low-data projects**
If the pipeline runs on a project where SharePoint asset count is the only metric (no views, no savings vs. competitor, no tight deadline story), the stats will be weak. "47 assets / 2 weeks / Graphic Design" is not conversion copy. It's a spreadsheet row. The copywriter prompt should have a minimum quality bar for the stats outputs, or the pipeline should have a gate that flags low-confidence outputs before publishing.

**Red flag #4 — The "At a Glance" sidebar duplicates the hero**
In the hero section, I already see `Deliverable` and `Category`. In the sidebar, I see `Deliverable` and `Category` again. That's dead space. The sidebar should use that real estate for what the hero doesn't show: the outcome or key metric in large format, a timeline, maybe the scope of languages or markets. The `/work/` page sidebar is slightly better because it shows `Volume` and `Timeline` — both absent from the hero — but the pipeline page sidebar shows `Category` twice (once in the hero meta strip, once in the sidebar).

**Red flag #5 — "Start a project" CTA in the sidebar feels premature**
While I'm reading the challenge and solution narrative, there's a "Start a project" button glued to the side of the screen. Professionally I understand why it's there — conversion architecture — but emotionally, it feels slightly aggressive at the reading stage. I'm not done evaluating. I'd be more comfortable with a softer sidebar CTA like "Get a quote" or "Talk to us" at this stage, reserving "Start a project" for the closing CTA after I've read everything and the risk has been addressed.

---

## Summary for Sarani

The pipeline architecture is genuinely impressive for an agency's internal tooling. The 3-step creative strategy → copy → social sequence is more rigorous than what most agencies apply manually. The brand voice guardrails (evidence-first, no "game-changer", specific numbers) are exactly right.

The page layout works. The information hierarchy works. The closing CTA with the satisfaction guarantee works.

What needs to close the gap between the pipeline page and the static reference pages:
1. **One image per pipeline case study** — even a thumbnail from SharePoint would suffice
2. **Prev/Next navigation** — bring it over from `/work/[slug]`
3. **Stronger stats quality gate** — at least 2 of 3 stats must be quantified outcomes
4. **Remove the `Category` duplication** between hero and sidebar
5. **Consider softening the sidebar CTA** while the body content is being read

Fix those five things and this pipeline page competes with — and potentially exceeds — what the best boutique creative agencies show their prospects.

---

*Audit conducted by Sophie (testeur-persona) — Head of Marketing, enterprise group, €500K–€5M annual creative budget. Pages reviewed: `/case-studies/[slug]/page.tsx`, `/case-studies/[slug]/cta.tsx`, `/lib/case-studies/pipeline-prompts.ts`, `/lib/case-studies/schemas.ts`, `/app/work/[slug]/page.tsx`, `/data/case-studies.ts`.*
