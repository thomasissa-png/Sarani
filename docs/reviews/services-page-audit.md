# Services Page Audit — `src/app/services/page.tsx`
*Produced by @creative-strategy + @design — 2026-03-26*
*Persona lens: Sophie, 38, Head of Marketing, global enterprise*
*References: brand-platform.md, brand-voice.md, design-system.md, project-context.md*

---

## Scores by Criterion

### Strategy (60% weight)

| # | Criterion | Score | Comment |
|---|-----------|-------|---------|
| 1 | **Positioning** | 7/10 | D+1, fixed prices, and no-retainer appear — but only in the closing section. The hero H1 ("What we do. All of it.") opens on capability breadth, not on the enterprise-speed positioning. Sophie arrives from a referral or search expecting to read *why this agency is different*. The first thing she reads is a catalog opener. The meta description is stronger than the H1 itself. The fourth pillar — unlimited revisions — is entirely absent from the page. |
| 2 | **Persona fit** | 6/10 | Sophie's core frustrations (slow turnaround, revision billing, opaque pricing, agencies that don't understand 24/7 campaign rhythms) are addressed only implicitly through proof points. The page never names her pain. "The brief before the brief" (section 1 headline) is agency jargon. Sophie does not think in those terms — she thinks "I need assets by tomorrow." The on-demand section headline ("Need something that doesn't fit a category?") signals uncertainty, not confidence — wrong register for a Head of Marketing managing 5M€ budgets. |
| 3 | **Social proof** | 8/10 | Strong. Named clients, real volumes, verifiable numbers in every section. TikTok (1,500+ edits/month, 51M views), Sony (same-day banners), GEODIS (350 presentations / 5,700 slides / 3 weeks), Adidas Arena, LEGO Champs-Élysées — all specific. One factual discrepancy: the on-demand proof point states "150€" for Sony banners; brand-platform.md and brand-voice.md consistently use "155€." A single wrong number undermines the evidence-first standard, particularly for Marc (Procurement) who cross-checks every figure. |
| 4 | **CTA & Conversion** | 5/10 | Four identical "Start a project" buttons appear sequentially — one at the end of each service block — before the closing section adds a fifth. CTA fatigue is severe. By button three, the CTA has become wallpaper. No secondary path is offered mid-page (no "View pricing," no "See our work") until the very end of the page. No anchor navigation allows a Sophie who already knows she needs video editing to skip directly to that section. The conversion funnel treats all visitors as identical — it is not segmented by intent. |
| 5 | **Differentiation** | 5/10 | The page catalogues what Sarani does. It does not explain the structural mechanism that makes 24-hour delivery possible. The 35-person / 5-continent / time-zone-relay model — the one argument no competitor can copy — appears only in the closing section. At section level, each block reads as a capability menu. A competitor could copy this page structure and swap in their own client names. The white space of differentiation is not weaponised. |

**Strategy subtotal: 31/50 → 6.2/10**

---

### Design (40% weight)

| # | Criterion | Score | Comment |
|---|-----------|-------|---------|
| 6 | **Visual hierarchy** | 7/10 | The left-border-accent pattern (4px colored bar → H2 → subtitle → service grid → proof block → CTA) is logical and scannable. The problem: all four service sections follow the exact same visual rhythm. Sophie's eye stops being guided after block two — pattern recognition kicks in and she skims. No visual elevation moment (a stat callout in large type, a full-bleed client quote, a metrics strip) re-engages attention between sections. The hero is text-only, flat, and provides no visual entry point beyond the H1. |
| 7 | **Design system compliance** | 8/10 | Token usage is accurate. `bg-brand-flame/10`, `text-brand-cerulean-dark`, `bg-brand-black` closing section all follow the palette rules. Accent color rotation (Flame → Cerulean → Lemon → Flame) is correct. `bg-surface-warm` alternation on even sections adds cadence. One flag: the closing section uses "45+ experts" with a "+" character — brand-voice.md §3.2 mandates the verbatim unit "45 experts, 5 continents, 18 languages, 24/7" without the "+". Minor, but it deviates from the approved vocabulary. |
| 8 | **Responsive (320px)** | 7/10 | Service grid collapses correctly (`sm:grid-cols-2 lg:grid-cols-3`). `max-w-3xl` / `max-w-4xl` containers are viewport-safe. Two risk points: (1) The Content Creation section has 7 sub-groups — on mobile, these stack into a very long vertical list with no visual break separating groups from items. (2) The hero H1 uses `text-5xl` at the base breakpoint with no `xs` step — at 320px with a long heading, word-wrapping may produce an awkward single-word orphan on the last line depending on font metrics. |
| 9 | **Accessibility** | 6/10 | `ariaLabel` passed to `Section` components is correct for landmark labeling. `<ul><li>` for service items is semantically appropriate. Three issues: (1) Five `<Button>` elements with identical text "Start a project" and identical `href="/contact"` are indistinguishable to screen readers — each needs a unique `aria-label` (e.g., `"Start a content creation project"`). (2) Proof point blocks use `.text-neutral-700.italic.text-sm` on tinted backgrounds — the 10% opacity accent backgrounds are near-white but need contrast ratio verification against WCAG AA (4.5:1 minimum for small text). (3) Group headings (`<h3>` with `.text-sm.uppercase`) at accent colors on white backgrounds need contrast verification, particularly `text-brand-lemon-dark`. |
| 10 | **Visual impact** | 5/10 | The page is clean and professional. It is not memorable. Four blocks of muted-tint proof quotes and grid service lists create a catalog feel, not a brand statement. Sophie, landing from a referral or a LinkedIn ad, should register "enterprise-level, fast, serious" within 3 seconds without reading. Currently she reads a well-structured agency website. No client logo strip, no hero metric in large type, no kinetic element, no single visual moment of elevation. The closing black section is the strongest beat on the page — Sophie has to scroll through the entire catalog to reach it. |

**Design subtotal: 33/50 → 6.6/10**

---

## Global Score

| Block | Weight | Subtotal | Weighted |
|-------|--------|----------|---------|
| Strategy | 60% | 6.2/10 | 3.72 |
| Design | 40% | 6.6/10 | 2.64 |
| **Global** | | | **6.36 / 10** |

---

## Top 5 Recommendations (ranked by impact)

---

### Rec 1 — Rewrite the hero to lead with the structural differentiator [Critical]

**Problem:** "What we do. All of it." opens on capability breadth. Sophie needs to know in 3 seconds what makes this agency structurally different from the four others she has reviewed this morning.

**Proposed copy:**

```
H1:
Enterprise creative. Every format. Delivered in 24 hours.

Subtitle:
Strategy, content, distribution, on-demand production —
produced by 45 experts across 5 continents, working in relay.
No retainer. Fixed prices. First project satisfaction or no invoice.
```

This hero answers: what (creative), for whom (enterprise), how fast (24h), why possible (35 / 5 continents / relay), commercial model (no retainer, fixed prices), and risk removal (guarantee). Every Sophie objection addressed before she scrolls.

---

### Rec 2 — Replace four identical CTAs with a conversion funnel by intent [High]

**Problem:** Five "Start a project" buttons kill urgency. No mid-page path for Sophie in evaluation mode (needs proof) or Marc in validation mode (needs pricing).

**Proposed layout (no-code wireframe):**

```
[Strategic Marketing block]   → CTA removed (Sophie is not ready at block 1)

[Content Creation block]      → CTA: "See our work"    (/case-studies)
                                    secondary: "Start a project"

[Operational Marketing block] → CTA: "View pricing"    (/pricing)

[On-Demand block]             → CTA: "Tell us what you need"  (/contact)
                                    (impulse brief — this section attracts urgent requests)

[Closing section]             → Primary: "Start a project"
                                Secondary: "View pricing"
                                Guarantee line: "First project satisfaction or no invoice."
```

This routes Sophie and Marc through the page by intent stage rather than repeating the same committed action at every scroll stop.

---

### Rec 3 — Add a structural proof mechanism to the page [High]

**Problem:** The 24/7 relay model — the one argument no competitor can replicate — appears only in the closing section. Four service blocks describe *what* Sarani does but not *why* it delivers in 24 hours.

**Proposed insert:** A lean full-width module between the service blocks and the closing section:

```
[Dark strip — bg-brand-black — full width]

Why 24 hours is our default, not our premium.

45 experts across 5 time zones work in relay.
When Paris signs off, Dubai continues. When Dubai hands off, São Paulo picks up.
Your brief never waits for a timezone to wake up.
That is why D+1 delivery is the standard — not an add-on.

[Link: Meet the team →]
```

This single module transforms the page from a catalog into a positioning statement.

---

### Rec 4 — Fix the 150€ / 155€ discrepancy immediately [High]

**Problem:** The on-demand proof point reads "150€." Every other Sarani source (brand-platform.md, brand-voice.md, pricing page) consistently uses "155€." One wrong number damages the evidence-first standard and breaks trust with Marc, who cross-checks numbers.

**Current:**
```
"Request in the morning. Two proposals by afternoon. Delivery by the next morning. 150€."
```

**Corrected:**
```
"Request in the morning. Two proposals by afternoon. Delivery by the next morning. 155€."
```

One character. Zero design impact. Apply immediately.

---

### Rec 5 — Add a client logo strip below the hero [Medium]

**Problem:** The hero is text-only. Sophie registers "professional agency" — not "enterprise-level partner." A visual trust signal is missing at the page's highest-attention moment.

**Proposed:** Horizontal strip of 5 client logos (TikTok, Sony, Adidas, GEODIS, L'Oréal) immediately below the hero subtitle. Style: monochrome (grayscale) at 60% opacity on white — the standard enterprise proof convention. Requires no copy change. Requires client logo assets (confirm availability).

**Alternative if logos unavailable:** Promote the metrics strip from the closing section to below the hero:

```
45 experts   ·   5 continents   ·   18 languages   ·   24/7
Working in relay so your campaigns never stop.
```

Zero new content required — it already exists. Move it up.

---

## Accessibility Fixes Required

**Immediate:** Add unique `aria-label` to each CTA button:
```tsx
// Strategic Marketing section
<Button variant="primary" href="/contact" aria-label="Start a strategic marketing project">

// Content Creation section
<Button variant="primary" href="/contact" aria-label="Start a content creation project">

// Operational Marketing section
<Button variant="primary" href="/contact" aria-label="Start an operational marketing project">

// On-Demand section
<Button variant="primary" href="/contact" aria-label="Start an on-demand project">
```

**Verify:** Run WCAG AA contrast check on:
- `text-neutral-700` on `bg-brand-flame/10`, `bg-brand-cerulean/10`, `bg-brand-lemon/10`
- `text-brand-lemon-dark` on white background (group heading)

If contrast fails: move proof point text to `text-neutral-900`. No visual impact.

---

## Hypotheses to Validate

- [HYPOTHÈSE] Adidas Arena and LEGO Champs-Élysées references in Content Creation proof point are accurate as stated — no primary source provided for verification.
- [HYPOTHÈSE] Accent color dark tokens (`text-brand-flame-dark`, `text-brand-cerulean-dark`, `text-brand-lemon-dark`) meet WCAG AA 4.5:1 on white — needs contrast check against design-tokens.json.

---

*Audit scope: copy, strategy, visual structure, accessibility. No code was modified.*

---

**Handoff → @fullstack**
- Files produced: `docs/reviews/services-page-audit.md`
- Apply Rec 4 (150€ → 155€) immediately — single character fix, no review required
- Rec 1 and Rec 2 are copy and layout changes — apply after Sophie persona review with @copywriter
- Rec 3 requires a new UI component (dark strip) — brief @design first
- Rec 5 requires client logo assets — confirm with Thomas before implementing
- Accessibility fixes (aria-labels) apply to all Button instances on the page — zero visual impact, apply in the same pass as Rec 4
