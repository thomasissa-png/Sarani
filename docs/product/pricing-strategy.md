# Sarani — Pricing Strategy
*Produced by @product-manager — 2026-03-24*
*Language: English*
*Sources: competitive-benchmark.md, value-proposition.md, project-context.md, WebSearch 2026-03-24, Excel pricing sheet (source of truth for all Sarani prices)*

---

## Table of Contents

1. [Competitor Benchmark](#1-competitor-benchmark)
2. [Pricing Model Analysis](#2-pricing-model-analysis)
3. [Pricing Architecture for the Website](#3-pricing-architecture-for-the-website)
4. [Pricing Psychology](#4-pricing-psychology)
5. [Service Packages — Optional Bundles](#5-service-packages--optional-bundles)
6. [Revenue Modeling](#6-revenue-modeling)

---

## 1. Competitor Benchmark

*Data sourced via WebSearch 2026-03-24. All prices are real, publicly listed prices unless marked [DATA NOT FOUND].*

### 1.1 Superside
**Model:** Subscription (monthly)
**Pricing tiers:**
| Plan | Monthly Price | Key Features |
|------|--------------|--------------|
| Entry (Level 1–2) | $6,000–$10,000/month + $1,000 service fee | Creative production, strategy, ad hoc requests, Superspace platform access |
| Mid-range | $10,000–$30,000/month + $1,000 service fee | Higher capacity, concurrent projects |
| Enterprise | $30,000–$100,000+/month, custom service fee | Full dedicated team, enterprise SLAs |
| Booster (add-on) | $10,000 minimum one-time add-on | Seasonal burst capacity (max 3 months) |

**Delivery:** Not guaranteed D+1. Turnaround varies by plan capacity.
**Revisions:** [DATA NOT FOUND — not documented publicly]
**Satisfaction guarantee:** [DATA NOT FOUND — not documented publicly]
**Target client:** Enterprise (Amazon, Google, Meta, Salesforce, Cisco)
**Lock-in:** Subscription-only. Minimum monthly commitment. No per-project option.
**Key limitation for Sophie:** Minimum $6,000–$10,000/month before a single asset is produced. 12-month commitment to get best rates. Booster minimum is $10,000 for a seasonal push — no micro-project option.

---

### 1.2 Design Pickle
**Model:** Subscription (daily creative hours)
**Pricing tiers:**
| Plan | Monthly Price | Daily Hours | Key Features |
|------|--------------|-------------|--------------|
| Entry | $1,918/month | 2h/day | Graphic design, motion graphics, presentations |
| Mid | ~$4,000–$6,849/month | 4–8h/day | Higher volume |
| Power (enterprise) | $6,849+/month | 8–12h/day | Video editing, production coordinator |
| Custom enterprise | Custom | 12h+/day | Power plans with custom pricing |

**Delivery:** Queue model — one request at a time. No parallel work on base plans.
**Revisions:** Unlimited (all plans)
**Satisfaction guarantee:** 14-day refund window (quarterly/annual plans only)
**Target client:** SMB to mid-market. Agencies reselling design.
**Lock-in:** Monthly minimum. Auto-renew. No per-project option. Unused hours do not roll over.
**Key limitation for Sophie:** $1,918/month for 2 hours/day is insufficient for TikTok-scale volume (1,500+ edits/month). Enterprise plans at $6,849+/month still cap at daily hours — no burst capacity without expensive scaling.

---

### 1.3 ManyPixels
**Model:** Subscription (monthly)
**Pricing tiers:**
| Plan | Monthly Price | Daily Output | Key Features |
|------|--------------|--------------|--------------|
| Advanced | $549/month | 1 design/day | Graphic design, web design, illustrations, 1–2 day delivery |
| Business | $899–$999/month | 2 designs/day | Motion graphics included, next-day delivery |
| Dedicated Designer | $1,199–$1,299/month | Dedicated | Same-day delivery, Slack access (US Eastern / CET timezones only) |

**Delivery:** 24h on most services. Same-day only on top-tier (limited timezone coverage).
**Revisions:** Unlimited (all plans)
**Satisfaction guarantee:** 14-day money-back (non-monthly plans)
**Target client:** Small businesses, startups, mid-size businesses, agencies
**Lock-in:** Monthly subscription. No per-project option. No contracts (month-to-month).
**Key limitation for Sophie:** 1–2 outputs/day is insufficient for enterprise volume. No named enterprise clients. Timezone limitation on Dedicated Designer plan is a dealbreaker for multi-continent teams.

---

### 1.4 Penji
**Model:** Subscription (monthly)
**Pricing tiers:**
| Plan | Monthly Price | Concurrent Projects | Key Features |
|------|--------------|---------------------|--------------|
| Business | $499/month | 1 | Basic graphic design, 1-day delivery, self-managed |
| Marketer | $995/month | 2 | Infographics, ad creatives, presentations, Figma web, quality control manager |
| Agency | $1,497/month | 2 | Motion graphics, animations, video content, same-day delivery, art director |

**Delivery:** 1-day (Business), same-day (Agency tier only)
**Revisions:** Unlimited (all plans)
**Satisfaction guarantee:** 30-day money-back (all plans)
**Target client:** SMB, marketing teams, agencies
**Lock-in:** Monthly subscription. 10% discount annual. No per-project option.
**Key limitation for Sophie:** Same-day delivery only at $1,497/month (Agency). No enterprise client proof (AWeber, Reebok are SMB-tier). Max 2 concurrent projects even at top plan — impossible for TikTok volume.

---

### 1.5 99designs / Fiverr Pro
**Model:** Marketplace (project-by-project)
**99designs pricing:**
| Format | Price Range | Notes |
|--------|------------|-------|
| Design contests (Bronze–Platinum) | $299–$1,299+ | Fixed tiers. Multiple designers compete. |
| 1-to-1 Projects | Negotiated + 5% platform fee | Designer sets price. Client pays +5% fee. |
| Social media design | $99–$499 | Example range |
| Logo design | $299–$1,299 | Contest format |

**Fiverr Pro pricing:**
| Category | Price Range | Notes |
|----------|------------|-------|
| Design (logo, banner) | $100–$600+ | Per project, gig-based |
| Copywriting | $50–$300 | Per project |
| Video/animation | $150–$2,000+ | Per project, complexity-based |
| Fiverr Business plan | $149/year | Platform fee for teams, not a creative service |

**Delivery:** Variable. 1–7 days typical on Pro tier.
**Revisions:** Varies by gig (usually 1–3 included, more at extra cost)
**Satisfaction guarantee:** 99designs: 60-day money-back (conditions apply). Fiverr: dispute resolution only.
**Target client:** SMB to enterprise one-off projects
**Key limitation for Sophie:** No dedicated account relationship. Quality variance between freelancers. Not built for recurring volume at enterprise pace. No multilingual in-house team.

---

### 1.6 Benchmark Summary Table

| Competitor | Model | Entry Price | D+1 Standard? | Unlimited Revisions? | Per-Project? | Enterprise Clients? |
|------------|-------|-------------|---------------|---------------------|--------------|---------------------|
| Superside | Subscription | $6,000–$10,000/month | No | Not documented | No | Yes (Amazon, Google, Meta) |
| Design Pickle | Subscription (hours) | $1,918/month | No (queue) | Yes | No | No |
| ManyPixels | Subscription | $549/month | Partial (timezone limited) | Yes | No | No |
| Penji | Subscription | $499/month | Only at $1,497/month | Yes | No | No (SMB) |
| 99designs | Marketplace | $99–$1,299/project | No (1–7 days) | 1–3 included | Yes | No |
| Fiverr Pro | Marketplace | $100–$600/project | Variable | Per gig | Yes | No |
| **Sarani** | **Per-project** | **155€/banner** | **Yes — all clients** | **Yes — all projects** | **Yes** | **Yes (TikTok, Sony, Adidas)** |

**Conclusion:** Sarani is the only option combining enterprise-tier clients + D+1 as standard + unlimited revisions + per-project pricing (no subscription lock-in). This is a demonstrably unoccupied market position.

---

## 2. Pricing Model Analysis

### 2.1 Why Per-Project Pricing Is the Right Model for Sarani

Sarani's model is **project-by-project, no subscription required**. This is not a default choice — it is a strategic differentiator directly validated by the competitor benchmark above.

**Why subscriptions would hurt Sarani:**
- Superside already owns the "premium subscription" position. Entering that space means competing on a field where $10K/month is the incumbent entry price.
- Design Pickle, ManyPixels, and Penji own the "affordable subscription" space. Entering that space positions Sarani against SMB-tier competitors and undercuts the enterprise credibility built on TikTok, Sony, and GEODIS.
- A subscription model would require Sophie to justify a recurring line item to procurement (Marc) — creating the exact same objection as Superside.

**Why per-project works for Sophie's budget reality:**
- Enterprise marketing teams manage **project-based budgets**, not SaaS tool budgets. A 500€ line item per campaign is reconciled under "agency fees" — a 3,000€/month subscription requires a vendor contract, procurement approval, and a recurring PO.
- Sophie's patterns are burst-intensive: Black Friday push, product launch, rebranding sprint. A subscription forces her to pay during quiet months.
- The entry point at 155€ (static banner) means Sophie can test Sarani on a real project before any commitment discussion. No subscription competitor can match this.

**Why per-project works for Marc (Procurement):**
- No annual commitment = no lock-in risk on the vendor shortlist.
- Fixed prices published openly = no scope creep, no surprise invoices, no renegotiation.
- Per-project also means Sarani can be activated as a supplemental vendor alongside the existing agency — without displacing the incumbent or triggering a full procurement review.
- Preferred by procurement in multi-supplier strategies: Sarani as "fast execution arm," incumbent agency for strategic work.

### 2.2 The Retainer as an Upsell — Not the Default

A retainer model (like the SOC management structure in the Excel sheet) exists for mature client relationships. It should be positioned as:
- Available for clients with ongoing, predictable volume needs
- Presented **after** the first project has been delivered and proven
- Framed as a cost-optimization tool ("lock in our team at a preferential rate for your Q3 campaign sprint"), not as the entry point

**The retainer should never appear as the primary offer on the pricing page.** It should be referenced as "Need regular volume? Ask us about our retained partnerships" — CTA to the contact form.

### 2.3 How to Structure Pricing Display on the Website

Three display principles for the pricing page (US-104):

1. **Start with concrete prices, not packages.** Show the 155€ banner, the 30€/slide presentation, the 85€ basic video edit. Real numbers build trust faster than "starting at" ranges or tier names.

2. **Group by output type, not by client need.** Enterprise buyers know what they need to produce. "Graphic Design," "Video," "Web," "Presentations," "Copy," "Marketing" is the right taxonomy — it matches how Sophie briefs her team internally.

3. **Surface the guarantee and no-commitment message at the top.** Before prices are read, the visitor must understand: "No subscription. First project satisfaction or no invoice." This removes the mental barrier of "what am I getting into" before pricing is evaluated.

---

## 3. Pricing Architecture for the Website

### 3.1 Categories to Display (and Why)

The pricing page should display **5 main categories**, ordered by entry-point accessibility and enterprise relevance:

| Display Order | Category | Why This Order |
|--------------|----------|----------------|
| 1 | Graphic Design | Highest volume, clearest entry point (155€ banner), most immediately relatable for Sophie |
| 2 | Presentations | Strong proof point (GEODIS 5,700 slides), high enterprise relevance (Marc sees this and gets it) |
| 3 | Video | Volume proof (TikTok 1,500+/month), growing budget category, clear price ladder (85€ to 900€) |
| 4 | Web | High-value services, but fewer transactions — position after volume services |
| 5 | Copy + Marketing | Complex/variable pricing (% of spend, €/word) — display last to avoid early cognitive friction |

### 3.2 Entry Points to Highlight vs. Prices to Minimize

**Prices to put FRONT AND CENTER:**
- Static Banner: **150€** (EUR display) / **$150** (USD) — the Sony proof-point price
- Banner Adaptation: **35€/size** — scale-out logic (1 banner → 10 languages)
- Presentation slide: **30€/slide** — GEODIS anchor (5,700 slides at this rate)
- Basic video edit: **85€** — entry point for video production
- Social media video 30s: **360€** — strong value vs agency
- Landing page (design + implementation): **650€** — best-in-class price vs 3,000–15,000€ at agencies

**Prices to display contextually (not as primary entry points):**
- 3D Video (5,000€+): "On demand — contact us" with a note "for complex productions"
- Production Day Packages (2,000–20,000€+): Same — contextual, contact-us
- Website (design & implementation): "On demand" — already in pricing sheet
- Social Network Management (2,500€/month): Contextual — retainer upsell, not primary
- Part-Time CMO (1,000€/day): Contextual — premium service for specific client profiles

**Prices that require explanation before display:**
- Translation: 0.12€/word → must include a "1,000-word document = 120€" conversion example
- Copywriting: 0.25€/word → same treatment
- Social Ads Management: 8% of spend → must include "on a 10,000€/month budget = 800€/month" example

### 3.3 Handling Variable Pricing Units

The pricing grid uses 5 different units: fixed price, €/size, €/slide, €/page, €/word, % of spend. On the website, apply this display rule:

| Unit type | Display format | Example on pricing page |
|-----------|---------------|------------------------|
| Fixed | Direct price | "Static banner — 150€" |
| €/size (adaptations) | Price + note | "Per additional size — 35€ — most clients need 5–8 sizes" |
| €/slide | Price + benchmark | "Per slide — 30€ — GEODIS: 5,700 slides, 3 weeks" |
| €/page (print) | Price + range example | "Per page — 100€ — typical brochure (8 pages) = 800€" |
| €/word | Price + conversion | "Per word — 0.12€ — a 1,000-word landing page = 120€" |
| % of spend | Rate + example | "8% of ad spend — on a 10,000€ campaign = 800€/month" |

### 3.4 Comparison Against Traditional Agencies

The pricing page must include a **side-by-side comparison table** to anchor value perception:

| Deliverable | Sarani | Traditional Network Agency | Savings |
|------------|--------|---------------------------|---------|
| Static banner (1 master) | 150€ | 500–2,000€ | ~70–92% |
| Banner adaptation (per size) | 35€ | 200–500€ | ~85–93% |
| Presentation slide | 30€ | 100–300€ | ~70–90% |
| Social media video (30s) | 360€ | 2,000–8,000€ | ~82–95% |
| Landing page (design + dev) | 650€ | 3,000–15,000€ | ~78–96% |
| Translation (per word) | 0.12€ | 0.30–0.80€ | ~60–85% |

*Traditional agency estimates based on industry benchmarks and Sarani commercial deck (source: 2026_Sarani Deck_Introduction_EN_light.pdf). The "up to 60% savings" claim from the deck is conservative — actual savings on individual line items range 70–95%.*
*[HYPOTHESE : network agency rates for individual assets — no primary invoice source available. These are estimates based on client-stated data and industry knowledge. To be validated with Sarani team before using in advertising.]*

### 3.5 "Starting at" vs. Fixed Price Display

**Recommendation: Use fixed prices, not "starting at."**

"Starting at" pricing creates uncertainty and invites the assumption that the real price is much higher. Sarani's competitive advantage is **price transparency** — the exact opposite of what Sophie gets from network agencies.

Exception: Services with genuine variability (Production Day Packages, Website implementation, 2D/3D animation by duration) should display "On demand — contact us for a quote" with a clear explanation of why the price varies (duration, team size, complexity).

---

## 4. Pricing Psychology

### 4.1 Anchoring Strategy — High Value First

**Recommendation: Open the pricing page with a trust signal, not with the lowest price.**

The homepage already displays the 155€ Sony banner as an entry anchor. The pricing page serves a different function: it is visited by Marc (procurement) who is comparing total cost of ownership, and by Sophie who is calculating what a campaign would cost.

Recommended anchoring sequence on the pricing page:
1. **Top of page:** Trust header — "Used by TikTok, Sony, Adidas. First project satisfaction or no invoice." Sets the quality anchor before any price is seen.
2. **Second block:** The comparison table (Section 3.4 above) — shows Sarani prices against traditional agency costs. This anchors 500–2,000€ as the reference point before 150€ is presented.
3. **Main pricing grid:** Display from Graphic Design (150€) downward. The savings vs. agencies make even the higher prices (900€ sizzle video, 650€ landing page) feel compelling.

**Do NOT start the page with the cheapest line item (15€ buttons/icons).** This creates a "cheap tool" perception that contradicts enterprise positioning. The right entry anchor is the banner (150€) — real money, real enterprise use case, proven with Sony.

### 4.2 Price Endings — Are Sarani's Round Prices Optimal?

Sarani's prices are currently round numbers: 135€, 250€, 500€, etc. (Note: USD prices are the same rounded structure.)

**Assessment:** Round prices are correct for this positioning. The psychology of price endings works as follows:
- **Charm pricing ($X.99)** signals budget/discount positioning — exactly what Sarani's brand must avoid. Never use €149 or €134 for an enterprise service.
- **Round prices** signal confidence, quality, and clarity — aligned with "assured, direct, warm" brand tone. A client who pays 150€ for a banner feels they are working with a professional agency, not buying a Fiverr gig.
- **Odd-but-specific prices** (e.g., $1,918 like Design Pickle) signal complexity and calculation — they create a "why this exact number?" cognitive friction that round prices avoid.

**Verdict:** Keep the round price structure. It is optimal for the enterprise positioning.

### 4.3 First-Contact Service Recommendation

**The recommended "first project" for a new prospect is a Static Banner Master Asset (150€).**

Rationale:
- Low financial commitment (150€ vs. 10,000€ Superside minimum)
- Clear deliverable (a specific banner for a specific campaign)
- 1–2 day turnaround means the proof is in hand before the end of the week
- Unlimited revisions means the client cannot be disappointed by a single round
- "First project satisfaction or no invoice" guarantee means zero risk for the client
- Directly referenced in the Sony case study — the most memorable proof point on the site

**On the pricing page, highlight this path explicitly:** "Not sure where to start? 78% of our new enterprise clients begin with a banner. 150€. Delivered in 24 hours. No invoice if you're not satisfied." (Note: the 78% figure is [HYPOTHESE — to be validated with Sarani team data before publishing.])

### 4.4 EUR vs. USD Display Strategy

**Recommendation: Dual-currency display (EUR primary, USD secondary) with a currency toggle.**

Rationale:
- Sarani clients are international. The Excel pricing sheet already provides both EUR and USD prices.
- Paris-based Sophie sees EUR. Dubai-based Sophie sees USD. London-based Sophie may prefer either.
- Dual display eliminates any "what's this in my currency?" cognitive friction at the moment of price evaluation.

**Implementation options (in order of priority):**
1. **Static dual display:** Show both "150€ / $150" on all price items (simplest, no JS required, SEO-friendly)
2. **Currency toggle:** A EUR/USD button at the top of the pricing page that switches all prices (requires minimal JS, better UX for long grids)
3. **Geo-detection:** Detect user locale and display the appropriate currency by default (most sophisticated, adds latency risk — lower priority for V1)

**Recommendation for V1 (Phase 1, W3):** Static dual display. Simple to implement, zero performance risk, covers both currencies at a glance.

### 4.5 Communicating Unlimited Revisions as Value

"Unlimited revisions" is a powerful differentiator — but only if communicated correctly. The risk is that it sounds like a discount ("we'll redo it as many times as you want = we're cheap"). It must be framed as a **confidence signal**, not a concession.

**Recommended copy framing:**
- Wrong: "Unlimited revisions included free"
- Right: "Revisions are part of the process. Brief us once — we deliver until you're satisfied."
- Right: "No revision fees. Ever. Because great work takes iteration, not invoices."

Place this message in two locations:
1. As a page-level callout at the top of the pricing grid (next to "No subscription" and "D+1 delivery")
2. As a tooltip or footnote next to each line item in the pricing table

---

## 5. Service Packages — Optional Bundles

*Bundles are optional. They exist to reduce the first-order cognitive load for new clients who don't yet know where to start, and to increase average order value (AOV) per first project.*

*All bundles should be positioned as "most popular starting points" — not as mandatory purchases. Individual pricing remains available and visible.*

### 5.1 "Discovery Sprint" Package — Entry Bundle

**Target:** New enterprise client testing Sarani for the first time.
**Designed for:** Sophie's typical "test with a real brief" scenario.

| What's included | EUR | USD |
|----------------|-----|-----|
| 1 Static Banner Master Asset | 150€ | $150 |
| 3 Banner Adaptations (3 sizes or 3 languages) | 105€ | $120 |
| **Bundle price** | **220€** | **$240** |
| *vs. individual price* | *255€ — saves 35€* | *$270 — saves $30* |

**Delivery:** 2 days.
**Rationale:** A banner master + 3 adaptations is the real-world minimum for any enterprise campaign (EN master + 2 localized versions, or desktop + mobile + square). The bundle removes the decision "what sizes?" from the first brief. Saves 14% vs. individual pricing.

### 5.2 "Content Sprint" Package — Volume Bundle

**Target:** Enterprise client launching a campaign across multiple channels.
**Designed for:** Sophie's typical pre-launch content sprint.

| What's included | EUR | USD |
|----------------|-----|-----|
| 1 Static Banner Master Asset | 150€ | $150 |
| 5 Banner Adaptations | 175€ | $200 |
| 1 Social Media Video (up to 30s) | 360€ | $390 |
| 2 Presentation slides (for internal campaign brief) | 60€ | $70 |
| **Bundle price** | **660€** | **$720** |
| *vs. individual price* | *745€ — saves 85€* | *$810 — saves $90* |

**Delivery:** 3 days.
**Rationale:** This covers a minimum viable campaign launch package: display banners, a social video, and internal alignment slides. Saves 11% vs. individual pricing. AOV target: 660€ vs. 150€ for a single banner — 4.4x increase.

### 5.3 "Enterprise Trial" — First-Project Guarantee Path

This is not a discount bundle. It is a **risk-removal offer** for procurement-constrained clients.

**Offer:** "Start with any project at standard rates. If you're not satisfied with the first delivery, you pay nothing."

This is already Sarani's guarantee ("First project satisfaction or no invoice"). The "Enterprise Trial" framing makes it explicit on the pricing page as a zero-risk entry path — targeted at Marc (procurement) who needs to validate a new vendor without financial exposure.

**Display on pricing page:** A dedicated callout box (not buried in footnotes):
> "New to Sarani? Your first project is fully guaranteed. If the result doesn't meet your expectations, there's no invoice. Start from 150€."

**Why this works better than a "free trial":**
- A free trial cheapens the service and attracts non-enterprise prospects.
- "First project satisfaction or no invoice" keeps the commitment real: both parties invest time and effort; Sarani carries the financial risk. This is a quality signal, not a discount.

---

## 6. Revenue Modeling

### 6.1 Average Revenue Per Unit (ARPU) Estimation

Based on the pricing grid, a typical enterprise client engagement yields the following transaction patterns:

**Typical "Sophie" order composition per campaign:**
- 2 banner masters: 300€
- 6 banner adaptations: 210€
- 1 social video (30s): 360€
- 1 presentation (10 slides): 300€
- 1 email design: 500€
- **Estimated per-campaign order: ~1,670€**

**Annual client engagement pattern (enterprise, active account):**
- 4 campaign sprints per year: 4 × 1,670€ = 6,680€
- 2 video productions (sizzle/promotional): 2 × 900€ = 1,800€
- Ongoing translation (estimating 5,000 words/quarter × 4): 2,400€
- Occasional presentation work: ~1,000€
- **Estimated annual revenue per active enterprise account: ~11,880€**

[HYPOTHESE : ces estimations sont basées sur la grille tarifaire et les patterns clients documentés (Sony, GEODIS, TikTok). Elles doivent être validées avec l'équipe Sarani contre les données de facturation Evoliz réelles avant d'être utilisées comme projections officielles.]

**ARPU cible:**
- Conservative (light client): 5,000€/year
- Base (active client): 12,000€/year
- Optimistic (strategic account, retainer): 40,000–120,000€/year (retainer structure)

### 6.2 Monthly Recurring Revenue (MRR) Projection — 6 Months

*Sarani's model is per-project, not subscription-based. "MRR" here means average monthly revenue, not contractually locked-in recurring revenue.*

**Input assumptions (apply to all 3 scenarios):**
- New enterprise accounts signed per month: varies by scenario
- Average time-to-second-order: 4–6 weeks after first delivery
- Average monthly spend per active account (ARPU / 12): 1,000€/month (conservative), 1,400€/month (base), 3,500€/month (optimistic strategic accounts)
- Churn rate: 10%/month (conservative), 5%/month (base), 3%/month (optimistic) — [HYPOTHESE — à valider avec données historiques Sarani]
- Starting active account base: [DATA NOT FOUND — Sarani team to provide current number of active billed accounts. Required for accurate MRR baseline.]

**Scenario A — Conservative**
- New accounts/month: 2 (below roadmap target of 5)
- Average monthly spend/account: 1,000€
- Monthly churn: 10%

| Month | New Accounts | Total Active | Monthly Revenue |
|-------|-------------|-------------|-----------------|
| M1 | 2 | 2 | 2,000€ |
| M2 | 2 | 4 | 4,000€ |
| M3 | 2 | 6 | 6,000€ |
| M4 | 2 | 7 | 7,000€ |
| M5 | 2 | 8 | 8,000€ |
| M6 | 2 | 9 | 9,000€ |

*6-month cumulative: ~36,000€ — does not reflect existing revenue base.*

**Scenario B — Base (roadmap target)**
- New accounts/month: 5 (roadmap target: 5 new enterprise accounts/month)
- Average monthly spend/account: 1,400€
- Monthly churn: 5%

| Month | New Accounts | Total Active | Monthly Revenue |
|-------|-------------|-------------|-----------------|
| M1 | 5 | 5 | 7,000€ |
| M2 | 5 | 10 | 14,000€ |
| M3 | 5 | 14 | 19,600€ |
| M4 | 5 | 18 | 25,200€ |
| M5 | 5 | 22 | 30,800€ |
| M6 | 5 | 26 | 36,400€ |

*6-month cumulative (new accounts only): ~133,000€ — does not reflect existing revenue base.*

**Scenario C — Optimistic (strategic accounts + referral acceleration)**
- New accounts/month: 8 (includes referral pipeline from existing TikTok/Sony network)
- Average monthly spend/account: 3,500€ (mix of project + light retainer accounts)
- Monthly churn: 3%

| Month | New Accounts | Total Active | Monthly Revenue |
|-------|-------------|-------------|-----------------|
| M1 | 8 | 8 | 28,000€ |
| M2 | 8 | 16 | 56,000€ |
| M3 | 8 | 23 | 80,500€ |
| M4 | 8 | 30 | 105,000€ |
| M5 | 8 | 37 | 129,500€ |
| M6 | 8 | 44 | 154,000€ |

*6-month cumulative (new accounts only): ~553,000€*

### 6.3 Link to North Star KPI (10M€ Annual Revenue)

**10M€ annual revenue target = ~833,333€/month average MRR.**

To reach 10M€/year from new accounts only (ignoring existing revenue base):
- **Conservative (1,000€/account/month):** requires ~833 active accounts simultaneously — not achievable at 2 new accounts/month.
- **Base (1,400€/account/month):** requires ~595 active accounts — achievable at 5/month over ~4 years (with low churn) but not at 6 months.
- **Optimistic (3,500€/account/month):** requires ~238 active accounts — achievable at 8/month with referral acceleration, targeting 3–4 year horizon.

**The 4M€ / 6-month objective is achievable under the following conditions:**
[HYPOTHESE] Sarani already has an existing revenue base from current clients (not reflected in the new-account-only projections above). The 4M€ target at 6 months likely assumes:
- Existing annual revenue base of ~3M€+ (current client portfolio)
- New account acquisition adds ~1M€ incremental in the first 6 months
- This requires confirmation of current revenue figures from Sarani team (DATA NOT FOUND — required to calibrate projections)

**Priority action for revenue modeling accuracy:**
1. Sarani team to provide: (a) current number of active billed accounts, (b) last 12-month revenue total, (c) average revenue per account from Evoliz data. These three numbers will allow accurate MRR projections.
2. The 10M€ North Star is achievable with ~200–250 active enterprise accounts at 3,500–4,000€/month average spend — credible given the existing TikTok-scale reference (TikTok alone likely exceeds 15,000€/month in volume).

---

## Hypotheses to Validate

- [HYPOTHESE : "78% of new clients begin with a banner" — to validate with Sarani historical order data from Evoliz before publishing on pricing page]
- [HYPOTHESE : Average monthly spend per active account — 1,000€ (conservative), 1,400€ (base), 3,500€ (optimistic) — to calibrate against actual Evoliz billing data]
- [HYPOTHESE : Monthly churn rates (10%/5%/3%) — no historical data available. Sarani team to confirm with client retention data]
- [HYPOTHESE : Per-campaign order composition (~1,670€) — estimated from pricing grid and documented client patterns. To validate against actual invoices]
- [HYPOTHESE : Traditional agency rates in comparison table (500–2,000€/banner, 2,000–8,000€/video) — based on Sarani commercial deck and client-stated data, not primary invoices. To validate before using in regulated advertising]
- [HYPOTHESE : Current Sarani revenue base — DATA NOT FOUND. Required from Sarani team to calibrate 4M€ / 6-month target against existing portfolio]

---

**Handoff → @growth + @legal**

Files produced: `/home/user/Sarani/docs/product/pricing-strategy.md`

Decisions taken:
- **Per-project model confirmed as primary pricing model** — subscription explicitly rejected for strategic reasons (Superside already owns premium subscription; SMB subscription players own low-end; per-project is the unoccupied enterprise space)
- **Retainer positioned as upsell only** — never as the primary offer; not displayed on pricing page
- **5 display categories** ordered: Graphic Design → Presentations → Video → Web → Copy+Marketing
- **Fixed prices over "starting at"** — pricing transparency is a core differentiator; "starting at" undermines it
- **Round price endings confirmed as correct** for enterprise positioning (charm pricing ruled out)
- **150€ Static Banner identified as the recommended first-contact service** (lowest risk, highest proof value via Sony case study)
- **Dual-currency display (EUR + USD static) recommended for V1** — geo-detection as Phase 2 upgrade
- **3 optional bundles defined:** Discovery Sprint (220€), Content Sprint (660€), Enterprise Trial (guarantee framing)
- **Revenue model built for 3 scenarios** — all figures marked as hypotheses pending Evoliz data validation
- **Critical data gap identified:** Current Sarani revenue base (active accounts + LTM revenue) is required to calibrate 4M€/6-month target accurately

Points of attention:
- **@growth** — the per-project model creates specific acquisition funnel implications: the "first project" is the conversion event, not a subscription signup. Funnel must be optimized for "brief now, pay after delivery" rather than "subscribe." The Discovery Sprint (220€) and Content Sprint (660€) bundles are designed to increase AOV at first conversion — growth strategy should A/B test bundle offers vs. individual pricing CTAs.
- **@legal** — the "First project satisfaction or no invoice" guarantee needs legal framing: what constitutes "satisfaction"? What is the dispute resolution process? What is the maximum project value covered by this guarantee? The pricing page will display this guarantee publicly — @legal must validate the wording before W3 deployment.
- **@legal** — the comparison table against traditional agencies uses estimated figures. Before using these comparisons in any advertising context (not just the website), @legal should confirm this is not subject to comparative advertising regulations in key markets (France, UK, UAE).
- **@copywriter** — the pricing page UX copy must implement the "unlimited revisions as confidence signal" framing from Section 4.5. The wrong framing ("unlimited revisions included free") actively hurts positioning.
- **@fullstack** — the pricing page (US-104) requires: (1) dual currency display, (2) comparison table, (3) variable pricing unit explanations (€/word, %/spend examples), (4) guarantee callout block, (5) optional bundle display. All prices are now defined — no "TBD" items except "On demand" services.

Sources used in this document:
- [Superside Pricing 2026 — Designity](https://www.designity.com/blog/superside-pricing)
- [Superside Pricing — G2](https://www.g2.com/products/superside/pricing)
- [Design Pickle Pricing 2026 — Designity](https://www.designity.com/blog/design-pickle-pricing)
- [Design Pickle Pricing — G2](https://www.g2.com/products/design-pickle/pricing)
- [ManyPixels Pricing — official](https://www.manypixels.co/pricing)
- [Penji Pricing 2026 — official](https://penji.co/pricing/)
- [Penji Pricing — G2](https://www.g2.com/products/penji/pricing)
- [99designs Pricing 2026 — hireinsouth](https://www.hireinsouth.com/post/99designs-pricing)
- [Fiverr Pricing 2026 — hireinsouth](https://www.hireinsouth.com/post/fiverr-pricing)
