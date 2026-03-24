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
