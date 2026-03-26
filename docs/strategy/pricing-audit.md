# Sarani — Pricing Page Audit
*Produced by @creative-strategy — 2026-03-26*
*Language: English*
*Source files read: project-context.md, brand-platform.md, pricing-strategy.md, competitive-benchmark.md, value-proposition.md, src/app/pricing/page.tsx*

---

## Executive Summary

**Overall score: 7.5 / 10**

The pricing page is structurally sound and delivers on the three non-negotiables: guarantee visibility, fixed-price transparency, and social proof. The comparison table and FAQ are strong. The dual-currency implementation works.

However, three issues limit conversion performance: (1) the category taxonomy creates friction for Sophie's mental model, (2) the "Video turnkey" range (3,800–99,800€) destabilises the enterprise positioning without context, and (3) the comparison table is too narrow — it only benchmarks Sarani against network agencies, ignoring the Superside competitive threat that procurement directors actually encounter. The page converts cautious browsers but could do more to accelerate confident buyers.

---

## 1. Scoring by Criterion

| Criterion | Score | Rationale |
|---|---|---|
| Positioning coherence | 8/10 | Fixed prices, guarantee, no-commitment are all front-loaded — aligned with brand-platform promise. One tension: "Content Creation" category mixes commodity items (35€ banner adaptation) with an 8,000€ website — the range blurs the entry-point anchor. |
| Category selection | 6/10 | Missing: Copy/Translation (documented as a Sarani pillar in all four source docs). Missing: Strategic Marketing (even as a "contact us" line). "On-Demand / Retainer" should not be a full card — it undercuts the per-project model on sight. |
| Price calibration | 8/10 | Prices are correctly positioned against benchmark. Static banner at 155€ is the proven Sony anchor. Round number logic is right. One anomaly: "Video turnkey 3,800–99,800€" spans 26x — this range is too wide to be informative and raises the "how much is this really?" anxiety the page is designed to eliminate. |
| Pricing architecture | 7/10 | The 3+2 card layout is clean. But the recommended display order in pricing-strategy.md (Graphic Design → Presentations → Video → Web → Copy+Marketing) is not followed: "Presentations" is card 3, "Operations & Marketing" is card 4 before "On-Demand". The first-project path (150€ banner → contact) is implied but not surfaced explicitly. |
| Reassurance elements | 9/10 | Guarantee strip (black bar) is high-impact. FAQ covers the five real objections. GEODIS anchor in comparison section is the strongest proof point on the page. Client logos section closes the loop. Minimal adjustment needed. |
| Dual currency (€/$) | 7/10 | USD prices are displayed correctly. Rounding is consistent. However: four items (Paid ads fee, SEO, Monthly pack) have no USD price — inconsistency breaks the "complete transparency" promise. The $170 display for a 155€ banner is a rounded conversion (at ~1.095 rate) — defensible, but the rate should be noted somewhere if queried. |

---

## 2. Item-by-Item Verdict

### Category: Content Creation

| Item | Price displayed | Verdict | Action |
|---|---|---|---|
| Static banner | 155€ / $170 | **KEEP** | Correct anchor. Sony proof point. First recommended item in pricing-strategy.md. |
| Banner adaptation | 35€/size / $40/size | **KEEP** | Right price, right framing. Add a tooltip: "Most campaigns need 5–8 sizes." |
| Full rebranding | from 5,000€ / from $5,500 | **KEEP — add context** | Price is correct. Add a one-line anchor: "Includes brand identity, guidelines, and 3 key asset templates." Without context, "from 5,000€" reads as the top of the page's price range without explanation. |
| Infographic | 180€ + 35€/lang / $200 + $40/lang | **KEEP — rename** | Price correct. Rename to "Infographic (master + language variations)" to make the per-lang logic intuitive immediately. |
| Newsletter | 450–600€/edition / $500–660/edition | **KEEP** | Correct range. Consider adding a note: "Design only — includes responsive template." |
| Website | 5,000–8,000€ / $5,500–8,800 | **MOVE** | This item does not belong in "Content Creation" alongside a 155€ banner. The 26x price gap creates anchoring disruption. Move to a dedicated "Web" section or append as "Web design & development" in a separate row below the card grid with a "contact us" CTA. |

### Category: Video Production

| Item | Price displayed | Verdict | Action |
|---|---|---|---|
| Basic video edit | 85€ / $95 | **KEEP** | Correct entry point for video. |
| Social media video (30s) | 360€ / $400 | **KEEP** | TikTok-relevant. Core volume item. |
| Sizzle reel | 360–900€ / $400–1,000 | **KEEP** | Reasonable range. Consider adding: "Delivery in 48–72h." |
| Video turnkey | 3,800–99,800€ / $4,200–110,000 | **MODIFY URGENTLY** | A 26x range (3,800 to 99,800€) is not a price — it is an invitation for the visitor to assume the worst. This single line undermines every fixed-price claim on the page. Replace with: "Production packages — from 3,800€. Contact us for a custom quote." with a link to the contact form. Remove the 99,800€ figure from the public page entirely. |

### Category: Presentations

| Item | Price displayed | Verdict | Action |
|---|---|---|---|
| Per slide | 30€ / $35 | **KEEP** | GEODIS proof point. Non-negotiable on this page. |
| Full deck (reference) | from 360€ / from $400 | **KEEP — add context** | Add "(12 slides minimum)" to make "from 360€" feel calculated, not arbitrary. |

### Category: Operations & Marketing

| Item | Price displayed | Verdict | Action |
|---|---|---|---|
| LinkedIn management | 1,800–2,500€/month / $2,000–2,750/month | **RECONSIDER** | Monthly retainer pricing on a per-project pricing page creates positioning confusion. If displayed, it must be visually separated and labelled "Ongoing management — contact us to discuss." See recommendation #3 below. |
| Paid ads fee | 8% of budget | **MODIFY** | No USD price — breaks dual-currency consistency. Add the conversion example as a note: "e.g. 10,000€ budget = 800€/month." This was specified in pricing-strategy.md Section 3.3 and is not implemented. |
| SEO | custom quote | **KEEP AS-IS or REMOVE** | "Custom quote" with no price or example creates dead ends. Either add a range ("from 1,500€/month — contact us") or remove from public pricing and surface as a service on the contact page. |

### Category: On-Demand / Retainer

| Item | Price displayed | Verdict | Action |
|---|---|---|---|
| Monthly pack | custom quote | **RESTRUCTURE** | This entire card undercuts the per-project positioning. "Custom quote" for a monthly pack is the least actionable item on the page. Convert this from a pricing card to an inline callout: "Need regular volume? Ask us about retained partnerships →" linking to contact. Do not give retainer a dedicated pricing card. pricing-strategy.md Section 2.2 is explicit on this: "The retainer should never appear as the primary offer on the pricing page." |

### Missing Items (should be added)

| Missing item | Source | Recommended display | Priority |
|---|---|---|---|
| Translation (per word: 0.12€) | pricing-strategy.md Section 3.2 | Add with conversion example: "0.12€/word — a 1,000-word page = 120€" | High — it is a documented Sarani service used by major clients (Sony 15-language video localisation) |
| Copywriting (per word: 0.25€) | pricing-strategy.md Section 3.2 | Add with conversion example: "0.25€/word — a 500-word landing page = 125€" | Medium |
| Presentation (per page for print) | pricing-strategy.md | Add: "Print layout — 100€/page" — typical brochure (8 pages) = 800€ | Medium |

---

## 3. Top 5 Recommendations (Ranked by Conversion Impact)

### Recommendation 1 — Fix the "Video turnkey" line (Impact: HIGH)
**Problem:** "Video turnkey 3,800–99,800€" destroys price transparency at a glance. It is the single largest source of distrust on the page — a 26x range is not a price, it is a signal that pricing is opaque.
**Action:** Replace with:
```
Video turnkey — from 3,800€ / from $4,200
Contact us for production day packages and complex productions.
```
Remove 99,800€ from the page. Let the contact form capture the high-end conversations. High-value projects are sold in a brief, not a price list.

---

### Recommendation 2 — Add Translation as a visible line item (Impact: HIGH)
**Problem:** Translation (0.12€/word) is one of Sarani's most enterprise-relevant services — Sony 15-language video localisation is on the homepage. It is completely absent from the pricing page. This creates the "do they even do translation?" question in Sophie's mind when she's scanning.
**Action:** Add a "Copy & Translation" card (or section) with:
```
Translation — 0.12€/word  ($0.14/word)
  "A 1,000-word document = 120€ / $140"
Copywriting — 0.25€/word  ($0.28/word)
  "A 500-word landing page = 125€ / $140"
```
This also closes the gap between Sarani's "18 languages" claim (prominent in the hero) and the pricing page, where no multilingual service appears.

---

### Recommendation 3 — Remove the "On-Demand / Retainer" card; replace with inline callout (Impact: MEDIUM-HIGH)
**Problem:** Giving "Monthly pack — custom quote" a dedicated pricing card violates pricing-strategy.md's explicit rule: "The retainer should never appear as the primary offer on the pricing page." More practically: a card with a single "custom quote" item adds no information and signals "the real price is hidden."
**Action:** Remove the card. Replace with an inline line below the grid:
```
Need regular volume?
We build retained partnerships for enterprise teams with ongoing production needs.
→ Talk to us [button → /contact]
```
This is cleaner, aligned with brand voice, and does not compete with the per-project message that makes Sophie pick up the phone for a 155€ first order.

---

### Recommendation 4 — Add the per-word conversion examples to Paid Ads and variable pricing items (Impact: MEDIUM)
**Problem:** "8% of budget" with no USD equivalent and no example is the least informative line on the page. pricing-strategy.md explicitly specified "on a 10,000€ campaign = 800€/month" — this is not implemented. The same gap applies to all variable-unit services.
**Action:**
- Paid ads: add note under the price — *e.g. 10,000€ budget = 800€/month* / *$800/month on a $10K spend*
- Translation (once added): add note — *1,000-word document = 120€*
- Copywriting (once added): add note — *500-word landing page = 125€*
This converts abstract units into concrete euro figures — the format enterprise buyers need to reconcile against a campaign budget.

---

### Recommendation 5 — Expand the comparison table to include Superside (Impact: MEDIUM)
**Problem:** The current comparison table pits Sarani against "Network Agency" only. But Marc (Procurement), who approves vendor onboarding, has often been shown Superside as the modern alternative. The page does not address this. Sophie may have already compared Sarani to Superside before arriving on the pricing page.
**Action:** Add a Superside column to the comparison table:

| | Sarani | Superside | Network Agency |
|---|---|---|---|
| Entry price | 155€/project | $10,000/month | Custom retainer |
| Revisions | Unlimited | Not documented | 200–800€ each |
| Turnaround | 24 hours | Not specified | 10–15 days |
| Commitment | None | 12-month subscription | Retainer required |

This makes the "no subscription" positioning visceral — $10,000/month vs 155€/project is the most powerful contrast on the page. It should be visible.

---

## 4. Points to Preserve Unconditionally

The following elements are working well and must not be altered:

- **Guarantee strip (black bar, top of page):** "Not satisfied with your first project? No invoice." — High-impact. Exactly the right placement (before the grid, before any price is evaluated). Keep the copy verbatim.
- **GEODIS anchor in comparison section:** "350 presentations, 3 weeks, 8,500€ — their previous agency quoted 80,000€." This is the most credible sentence on the page. Do not dilute it with additional case studies in this section — it works precisely because it is singular and specific.
- **FAQ answers:** All five questions are the right questions. The answers are direct and brand-aligned. Particularly: "You don't pay. Simple as that. We believe in earning trust through work, not contracts." — this is the tone of voice at its best. Do not touch.
- **Round price structure:** Prices are correctly rounded (150€, 360€, 900€ — not 149€, 357€). This is an intentional quality signal. Preserve it.
- **VAT note at the bottom:** "All prices exclude VAT (HT). VAT is applied according to applicable regulations." — essential for Marc (Procurement) who builds P.O. requests on HT figures.
- **Closing CTA copy:** "One brief. 24 hours. Done." — excellent. Direct, brand-aligned, no fluff. Keep.

---

## 5. Risks Identified

| Risk | Description | Severity |
|---|---|---|
| Perception risk — "Video turnkey" | The 3,800–99,800€ range currently on the page contradicts the fixed-price promise. A visitor who reads this before the GEODIS proof point may close the tab before being anchored. | High |
| Positioning drift — Retainer card | The "On-Demand / Retainer" card signals "we do subscriptions too" to a visitor who just read "no subscription required." This is a direct contradiction of the most differentiating claim on the page. | Medium-High |
| Missing translation service | A prospect who arrives from "sarani.studio" after seeing "18 languages" on the homepage and finds no translation pricing will assume it is not publicly available, too expensive, or not a real service. Lost conversion on a high-confidence Sarani service. | Medium |
| Comparison table gap | Sophie's procurement director likely knows Superside. A table that only compares Sarani to network agencies does not answer the actual comparison he is running. | Medium |
| USD display inconsistency | Four items (Paid ads, SEO, Monthly pack, SEO) have no USD price. For international prospects, this incomplete currency display breaks trust at the moment of price evaluation. | Low-Medium |

---

## 6. If Prices Change: Specific Recommendations

The current prices are **correctly calibrated** — no systemic repricing is recommended. Two specific adjustments:

**Static banner: 155€ → keep at 155€.** Some previous internal documents used 150€ (pricing-strategy.md). The live page shows 155€ (aligned with the Sony case study reference in brand-platform.md). The 155€ figure is the one cited in the commercial deck — use it consistently across all pages. This is a data integrity note, not a repricing recommendation.

**Full deck reference: from 360€.** Correct (12 slides × 30€). Consider adding "(12 slides)" as a parenthetical so the calculation is visible — it transforms "from 360€" from a hedge into a proof of transparent pricing.

---

## 7. Hypotheses to Validate

- [HYPOTHESIS] The USD conversion rate used ($170 for 155€ implies ~1.095 rate). This should be documented and periodically updated if static display is retained. Alternatively, note "Converted at approximately current rate — final invoice in EUR" for EU-based clients.
- [HYPOTHESIS] "SEO — custom quote" may be a service Sarani does offer at scale (TikTok SEO, GEODIS blog strategy). If so, adding a range (e.g., "from 1,500€/month") would convert this dead-end line into an actionable entry point.

---

## Handoff

---
**Handoff → @fullstack**
- File produced: `/home/user/Sarani/docs/strategy/pricing-audit.md`
- Decisions taken:
  - Video turnkey range (3,800–99,800€) must be replaced with "from 3,800€ + contact us" — do not display the 99,800€ ceiling publicly
  - "On-Demand / Retainer" card should be removed and replaced with an inline callout below the grid
  - Translation and Copywriting items (0.12€/word, 0.25€/word) need to be added to the pricing data
  - Paid ads "8% of budget" needs a USD price and a concrete example note
  - Comparison table should include a Superside column
  - Website item should be moved out of "Content Creation" card
- Points of attention:
  - All USD prices must be present for all items — currently Paid ads, SEO, Monthly pack have no USD display (breaks dual-currency consistency)
  - The 155€ figure is canonical (sourced from commercial deck) — use it everywhere, not 150€
  - Keep guarantee strip, GEODIS comparison copy, and closing CTA copy verbatim — these are performing
---
