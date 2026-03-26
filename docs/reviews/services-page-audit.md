# Services Page Audit — Sarani
*Produced by @creative-strategy + @design — 2026-03-26*
*File audited: `src/app/services/page.tsx`*
*Persona lens: Sophie, 38, Head of Marketing, global enterprise*

---

## Scores by Criterion

### Strategy (60% weight)

| # | Criterion | Score | Comment |
|---|-----------|-------|---------|
| 1 | Positioning | 7/10 | D+1 and fixed prices appear in the closing section but are buried — they are not in the hero. Sophie lands on a page that lists services without immediately reading the enterprise promise. The meta description correctly signals "no retainer required" but the H1 ("What we do. All of it.") opens on capability, not competitive differentiation. |
| 2 | Persona fit | 6/10 | Sophie's core frustrations (slow agencies, revision billing, opaque pricing) are addressed only indirectly. The proof points hit the right clients and volumes but the page never names her pain explicitly. "On time" in section 2 is close, but "The brief before the brief" as a section label is agency-jargon and will not resonate with a Head of Marketing managing 3 simultaneous campaigns. |
| 3 | Social proof | 8/10 | Strong. TikTok (1,500+ edits/month), Sony (same-day banners), GEODIS (350 presentations, 3 weeks), Adidas, LEGO, 51M views — all named, all specific. Minor issues: the Sony on-demand proof point says "150€" but brand-platform.md and brand-voice.md consistently use "155€". One discrepancy damages the evidence-first standard. |
| 4 | CTA & Conversion | 6/10 | Each service block ends with a "Start a project" button — four identical CTAs in sequence. No funnel logic: Sophie may want to see pricing before committing, or explore work. The closing section has a "View pricing" secondary CTA, but it is below the fold and visually subordinate. No "See our work" CTA anywhere on the page despite brand-voice.md mandating it as a standard secondary CTA. |
| 5 | Differentiation | 5/10 | The page describes what Sarani does but not structurally why it can do it faster and cheaper. The 35-person / 5-continent / 18-language / 24/7 relay mechanism — the core structural proof — only appears in the closing section. At section level, each block reads as a capability menu, not a competitive statement. Sophie could read this page and still not understand why Sarani delivers in 24h when others take two weeks. |

**Strategy subtotal: 32/50 → 6.4/10**

---

### Design (40% weight)

| # | Criterion | Score | Comment |
|---|-----------|-------|---------|
| 6 | Visual hierarchy | 7/10 | The left-border-accent pattern (4px colored bar + H2 + subtitle + proof block) is clear and scannable. Four identical block structures in sequence create monotony — the eye stops being guided after block two. The hero lacks visual weight: centered H1 + paragraph with no supporting visual, number, or accent element creates a flat entry point. |
| 7 | Design system compliance | 9/10 | Token usage is accurate: `bg-brand-flame/10`, `text-brand-cerulean-dark`, `bg-brand-black` closing section. Typography hierarchy (bold H1 70px → H2 40px → body 18px) follows the scale. The accent colors rotate correctly across sections (Flame → Cerulean → Lemon → Flame). Minor: the "35+ experts" line in the closing section uses "+" which deviates from the standard "35 experts" verbatim unit in brand-voice.md §3.2. |
| 8 | Responsive (320px) | 7/10 | Grid collapses correctly (`sm:grid-cols-2 lg:grid-cols-3`). The `max-w-4xl` container and `max-w-3xl` hero are viewport-appropriate. Risk point: the grouped services grid with 7 groups in Content Creation will stack to a very long vertical list on mobile with no visual breaks between groups. No `gap-y` distinction between group headers and items. Proof point boxes (`rounded-xl p-6`) at 320px may feel cramped — `p-6` is 24px on all sides, tight for long italic text. |
| 9 | Accessibility | 6/10 | `ariaLabel` is passed to Section for landmark labeling — positive. Service items are rendered as `<ul><li>` — correct. Issues: group headers (`<h3>`) use `.text-sm.uppercase` which can fail WCAG contrast at `text-brand-flame-dark` / `text-brand-cerulean-dark` / `text-brand-lemon-dark` on white backgrounds (flame-dark and lemon-dark need verification). Proof point text uses `.italic.text-sm.text-neutral-700` on `bg-brand-flame/10` — at 10% opacity the background is near-white but the combination needs contrast check. No `aria-label` on CTA buttons: four buttons all read "Start a project" with no destination context for screen readers. |
| 10 | Visual impact | 5/10 | The page is functional but not memorable. Four repeated block structures with muted accent backgrounds and italic proof quotes create a catalogue feel, not a brand statement. The hero has no visual hook — no number in large type, no client logo strip, no animation, no bold graphic element. Sophie, landing from a LinkedIn ad or referral, should feel "this is clearly enterprise-level" within 3 seconds. Currently she feels "this is a well-organised agency website." |

**Design subtotal: 34/50 → 6.8/10**

---

## Global Score

| Block | Weight | Subtotal | Weighted |
|-------|--------|----------|---------|
| Strategy | 60% | 6.4/10 | 3.84 |
| Design | 40% | 6.8/10 | 2.72 |
| **Global** | | | **6.56/10** |

---

## Top 5 Recommendations (by impact)

### Rec 1 — Rewrite the hero to lead with the structural differentiator [Impact: Critical]

**Problem:** H1 "What we do. All of it." opens on capability inventory. Sophie already knows agencies list services. She needs to know in 3 seconds why Sarani is structurally different.

**Proposed copy:**

```
H1:
Enterprise creative. Every format. Delivered in 24 hours.

Subheadline:
Strategy, content, distribution, on-demand production — handled by 35 experts across 5 continents, working in relay. No retainer. Fixed prices. First project satisfaction or no invoice.
```

This hero immediately answers: what (creative), for whom (enterprise), how fast (24h), why credible (35 / 5 / relay), commercial terms (no retainer, fixed prices), and risk removal (guarantee).

---

### Rec 2 — Fix the price discrepancy on the Sony proof point [Impact: High]

**Problem:** The on-demand `proofPoint` reads "150€" — inconsistent with "155€" in brand-platform.md, brand-voice.md, and the pricing page. One wrong number destroys the evidence-first standard.

**Current:**
```
"Request in the morning. Two proposals by afternoon. Delivery by the next morning. 150€."
```

**Proposed:**
```
"Request in the morning. Two proposals by afternoon. Delivery by the next morning. 155€."
```

Single character change — no structural impact.

---

### Rec 3 — Add the structural proof mechanism to each service block [Impact: High]

**Problem:** Each block describes what Sarani does but not the structural reason it can deliver faster than any other agency. The 24/7 relay mechanism only appears in the closing section.

**Proposed addition:** A brief mechanism line beneath each section subtitle (max 20 words):

**Strategic Marketing block:**
```
Subtitle addition: "35 experts, 5 continents — your brief never waits for a timezone."
```

**Content Creation block (already has it implicitly — reinforce):**
```
Current subtitle is correct. Add at the end: "Working in relay means your assets ship while your team sleeps."
```

**Operational Marketing block:**
```
Subtitle addition: "Campaigns running 24/7 — managed by a team that works 24/7."
```

---

### Rec 4 — Replace four identical CTAs with a logical conversion funnel [Impact: High]

**Problem:** Four "Start a project" buttons in sequence create CTA fatigue. No funnel logic for Sophie who is in evaluation mode, not decision mode.

**Proposed layout change (no code — wireframe):**

```
[Strategic Marketing block]
  → CTA: "Start a project"    (Sophie who is ready)

[Content Creation block]
  → CTA: "See our work"       (Sophie who needs proof before committing)

[Operational Marketing block]
  → CTA: "View pricing"       (Sophie checking the commercial model)

[On-Demand block]
  → CTA: "Start a project"    (impulse brief — this section is for urgent needs)

[Closing section]
  → Primary: "Start a project"
  → Secondary: "View pricing"
```

This routes Sophie and Marc through the page logically rather than hammering the same action four times.

---

### Rec 5 — Add one high-impact visual anchor to the hero [Impact: Medium]

**Problem:** The hero is text-only. At 7.5 seconds average landing page attention, Sophie needs a visual hook that confirms "enterprise, premium, fast" without reading a word.

**Proposed (no code — design brief):**

Add a horizontal strip of 4–5 client logos (TikTok, Sony, Adidas, GEODIS, L'Oréal) between the hero subtitle and the first service block. Style: monochrome (grayscale) logos at 60% opacity on white — the standard enterprise trust signal. This single element moves the page from "agency catalogue" to "enterprise partner page."

Alternative if logos are unavailable: a 3-column metrics block in large type:

```
35 experts   |   18 languages   |   5 continents
      Working 24/7 so your campaigns don't stop
```

This costs zero dev effort (already exists in closing section — move it to the hero).

---

## Hypotheses to Validate

- [HYPOTHÈSE] The Adidas Arena / LEGO Champs-Élysées references in the Content Creation proof point are accurate as stated — no URL or date provided to verify.
- [HYPOTHÈSE] `text-brand-flame-dark`, `text-brand-cerulean-dark`, `text-brand-lemon-dark` tokens meet WCAG AA contrast on white backgrounds — needs contrast ratio verification against the design-tokens.json values.

---

*Handoff → @fullstack for implementation of copy changes (Rec 2 is one character, apply immediately). Rec 1 and Rec 4 are copy-only changes. Rec 5 requires logo assets from the client.*
