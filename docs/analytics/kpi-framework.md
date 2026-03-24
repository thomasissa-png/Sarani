# KPI Framework — Sarani

> Produced by: @data-analyst
> Date: 2026-03-24
> Analytics tool: Umami (self-hosted, privacy-first)
> Scope: B2B creative agency targeting enterprise accounts (>500M€ revenue)
> Status: Prospective tracking plan — no historical data yet. All targets marked [HYPOTHESIS] until validated with real traffic.

---

## Table of Contents

1. [North Star Metric — Decomposition](#1-north-star-metric--decomposition)
2. [Persona Validation](#2-persona-validation)
3. [Referral Tracking](#3-referral-tracking)
4. [AARRR KPI Framework](#4-aarrr-kpi-framework)
5. [Hypotheses to Validate](#5-hypotheses-to-validate)

---

## 1. North Star Metric — Decomposition

### North Star Definition

**10M€ revenue at 20% EBITDA**

This is a lagging output metric. On its own it cannot be acted upon week-to-week. The decomposition below breaks it into leading and input metrics that are measurable in Umami and a CRM.

---

### Revenue Decomposition Model

```
10M€ Revenue
= Active Enterprise Accounts × Average Contract Value × Renewals

Where:
- Active Enterprise Accounts = New Accounts Signed + Churned Accounts Retained
- Average Contract Value = Mix of project-based + retainer revenue
- 20% EBITDA = Revenue - (Team cost + Infra + Acquisition spend)
```

**Numerical targets required to reach 10M€:**

| Lever | Current (unknown) | Target (12 months) | Type |
|---|---|---|---|
| Active enterprise accounts | [HYPOTHESIS: ~20-30 based on named clients] | 80-100 | Lagging |
| Average project value | [HYPOTHESIS: 8,000-15,000€] | >10,000€ | Lagging |
| Monthly recurring retainer clients | Unknown | 30+ | Lagging |
| New accounts signed per month | Unknown | 5 | Leading |
| Client retention rate (annual) | Unknown | >85% | Leading |
| Referral-generated new accounts | Unknown | >60% of new accounts | Input |

---

### Input Metrics (you control these)

These are the levers the team can directly act on:

| Metric | Definition | Measurement Method | Frequency |
|---|---|---|---|
| **Qualified inbound leads** | Form submissions from companies >500M€ revenue | Umami goal conversion on contact form | Weekly |
| **Case study page views** | Views on TikTok, Sony, GEODIS, Adidas case study pages | Umami page analytics | Weekly |
| **Proposal sent** | Number of commercial proposals sent after qualification | CRM (manual entry) | Weekly |
| **Proposal-to-close rate** | % proposals that convert to signed contract | CRM (manual entry) | Monthly |
| **Time to first delivery** | Hours from contract signature to first asset delivered | Internal ops tracking | Per project |
| **Revision rounds per project** | Average number of revision cycles before final approval | Internal ops tracking | Monthly |

---

### Leading Indicators (predict future revenue)

| Metric | Definition | Target | Measurement |
|---|---|---|---|
| **New enterprise accounts / month** | Signed contracts with companies >500M€ revenue | 5/month | CRM |
| **Site-to-lead conversion rate** | % visitors who submit contact form | [HYPOTHESIS: 1-2%] — B2B enterprise benchmark: <1% for complex services | Umami goals |
| **Contact form quality score** | % forms from enterprise-size companies | >50% from target ICP | Manual review of submissions |
| **NPS score** | Net Promoter Score from active clients | >50 (Agency benchmark: 59 median) | Quarterly survey |
| **Referral rate** | % new accounts originating from client referrals | >60% | CRM "source" field |

---

### Lagging Indicators (measure past performance)

| Metric | Definition | Target | Measurement |
|---|---|---|---|
| **Monthly Revenue** | Total invoiced revenue per month | 833K€/month to reach 10M€/year | Accounting |
| **EBITDA margin** | (Revenue - Operating costs) / Revenue | 20% | Accounting |
| **Client retention rate** | % enterprise accounts renewing annually | >85% (B2B services benchmark: 83-85%) | CRM |
| **Revenue per active account** | Total revenue / number of active accounts | >100K€/year per account | CRM + accounting |
| **LTV / CAC ratio** | Customer Lifetime Value vs. cost to acquire | >10:1 (B2B professional services target) | CRM + finance |

---

## 2. Persona Validation

### The Problem

Sarani's two personas — Sophie (Head of Marketing) and Marc (Procurement Director) — are based on client observations and sales experience. Before investing in content and acquisition targeting these archetypes, the analytics setup must confirm:
1. Do website visitors actually match these profiles?
2. Do the frustrations attributed to Sophie (speed, rigidity, cost) show up in behavioral data?
3. Do the buying signals of Marc (ROI, process simplification) appear in engagement patterns?

Since Umami does not collect demographic data (privacy-first, no cookies), persona validation relies on behavioral proxies and direct collection methods.

---

### 2.1 — Validating Sophie (Head of Marketing / Communications Director)

**Sophie's expected behavior on the website:**
- Arrives via referral from a known Sarani client
- Reads case studies (especially TikTok, Sony, Adidas — brands she recognizes)
- Checks pricing or "how it works" sections
- Downloads or requests the company deck
- Submits a contact form with a specific brief (e.g., "I need X assets in Y days")

**Metrics to measure in Umami:**

| Metric | Definition | How to Measure | Validation Signal |
|---|---|---|---|
| **Case study engagement rate** | % visitors who visit at least one case study page | Umami: track `/case-studies/*` page views vs. total sessions | High = Sophie-type visitor (brand recognition matters to her) |
| **Time on case study pages** | Average session duration on case study pages | Umami: page-level analytics | >90 seconds = reading, not scanning |
| **Referral source quality** | % sessions arriving via direct referral links vs. organic | Umami: traffic source breakdown | >40% referral = word-of-mouth working |
| **Contact form completion rate** | % visitors who start the form AND submit it | Umami: goal tracking on form start + form submit events | Drop-off rate indicates friction in form |
| **Brief quality in form submissions** | % submissions mentioning specific deliverables, timelines, or volume | Manual review of form data | Specific briefs = Sophie persona (she knows what she needs) |

**Direct validation method — Self-Reported Attribution:**
Add a mandatory free-text field to the contact form: "What's your role and what triggered your search for a creative partner today?"
- Sophie responses will mention: time pressure, a specific campaign, a past bad experience with another agency
- This field costs nothing to implement and bypasses Umami's privacy limitations

---

### 2.2 — Validating Marc (Procurement Director)

**Marc's expected behavior on the website:**
- Arrives after Sophie has already been in contact (secondary stakeholder, arrives later in the sales cycle)
- Focuses on pricing pages, case studies with ROI data, guarantees
- Does not submit a form himself — he will be brought into a meeting or review a deck

**The challenge:** Marc is unlikely to appear in Umami data as an individual visitor. His engagement is mostly offline (evaluating proposals, reviewing contracts).

**Metrics to measure for Marc validation:**

| Metric | Definition | How to Measure | Validation Signal |
|---|---|---|---|
| **Pricing page visit rate** | % sessions that include a visit to pricing or "how it works" | Umami: page view tracking on `/pricing` or equivalent | >20% of sessions visiting pricing = procurement-type interest |
| **"Guarantee" or "how we work" section engagement** | Scroll depth and time on pages describing process, SLAs, guarantees | Umami: custom events on scroll milestones (50%, 100%) | High engagement = risk-reduction concern (Marc's primary driver) |
| **Multiple visits before contact** | % accounts that have 3+ sessions before submitting a form | Umami: session tracking by anonymous ID | Multi-visit pattern = committee-driven evaluation (Marc is in the loop) |
| **Form field: company size** | % form submissions from companies >500M€ revenue | Form field: "Company size" dropdown | >50% enterprise = Marc archetype is real |

**Direct validation method — Post-call survey:**
After the first discovery call with a prospect, ask: "Who else will be involved in the decision?" and "Who manages vendor relationships at your company?"
- If Marc-type stakeholders are consistently named, the persona is validated
- Log this in the CRM for pattern analysis

---

### 2.3 — Validating Frustrations (Speed, Rigidity, Cost)

The three frustrations attributed to Sophie are:
1. Too slow (needs assets in hours, not weeks)
2. Too rigid (every revision = extra invoice)
3. Disconnected from digital campaign reality (24/7 rhythm)

**Metrics to validate these frustrations exist in the market:**

| Frustration | Proxy Metric | How to Measure |
|---|---|---|
| **Speed frustration** | % contact forms mentioning urgency (same-day, ASAP, urgent) | Manual tagging of form submissions |
| **Speed frustration** | Traffic from search queries mentioning "fast", "urgent", "same day" | Umami: UTM parameters on paid search campaigns, once launched |
| **Cost/rigidity frustration** | Time spent on pricing page relative to case study pages | Umami: comparative page analytics |
| **Rigidity frustration** | Mentions of "revisions", "unlimited", "no extra charge" in form submissions | Manual tagging of form submissions |
| **Fit with 24/7 rhythm** | Sessions occurring outside standard business hours (evenings, weekends) | Umami: session time-of-day data |

**Benchmark note:** B2B enterprise buyers conduct 15-30 separate website sessions before converting (source: First Page Sage 2026). This means a single "urgency" visit may not show up as a first session. Track return visitor patterns.

---

## 3. Referral Tracking

### 3.1 — Why This Section Exists

100% of Sarani's historical growth has come from referrals. This is both a strength (high trust, low CAC) and a fragility (no controlled growth lever). The first step is to measure what is already working before trying to engineer new referrals.

**The core problem:** Umami alone cannot track referrals in the B2B enterprise sense. A referral from a TikTok account director to a Sony procurement team happens via email, Slack, WhatsApp, or a personal introduction — none of which generate a tracking link. This is "Dark Social."

---

### 3.2 — Referral Metrics to Track in Umami

These are the digital signals that proxy for referral activity:

| Metric | Definition | Umami Setup | Interpretation |
|---|---|---|---|
| **Direct traffic rate** | % sessions arriving with no referrer (typed URL or bookmarked) | Umami: traffic source = "direct" | High direct % = strong brand awareness; in B2B, often referral-driven (someone was told to visit) |
| **Branded search rate** | % sessions from search engines with "Sarani" as query | Umami: traffic source = organic search + query parameter tracking | Rising branded search = growing referral-driven reputation |
| **Referral domain traffic** | Sessions arriving from specific partner or client domains | Umami: referrer domain breakdown | Specific client domains appearing = internal sharing within a company |
| **Geographic clustering** | Multiple sessions from same city / country in same time window | Umami: geographic data | Cluster in a new city = someone talked about Sarani at a conference or internally |
| **Session timing correlation** | Spike in visits shortly after a known client delivery | Cross-reference Umami traffic spikes with project delivery dates | Correlation = satisfied client shared the work |

---

### 3.3 — Self-Reported Attribution Model

Since Dark Social cannot be tracked digitally, implement a mandatory self-reported attribution field on every contact form:

**Field:** "How did you first hear about Sarani?" (free text, mandatory)

**Categories to track in CRM:**
- Client referral (direct — name the client)
- LinkedIn
- Google search
- Event / conference
- Saw Sarani's work (specify where)
- Other

**Why this matters:** This is the only reliable method for tracking referrals in a long-cycle B2B context. Studies show this single field reveals the true source of 30-50% of leads that digital analytics misattributes to "direct" or "organic."

---

### 3.4 — Attribution Model for Long B2B Sales Cycles

**Context:** Sarani's enterprise sales cycle is likely 3-9 months (from first referral mention to signed contract). A last-touch attribution model (standard in most analytics tools) will systematically undercount referrals and overcount the last digital touchpoint (usually the contact form or a Google search).

**Recommended model: First Touch + Self-Reported Hybrid**

| Stage | Attribution Method | Data Source |
|---|---|---|
| **First awareness** | Self-reported "How did you hear about us?" | Contact form field |
| **Digital engagement** | First-touch Umami session tracking | Umami referrer data |
| **Sales cycle touchpoints** | Manual CRM entry by account manager | HubSpot or equivalent CRM |
| **Closed deal** | Linked back to first-touch source | CRM closed deal field |

**Lookback window:** Set CRM lookback to 18 months minimum. An enterprise account that first heard of Sarani in January may not sign until October. Standard 90-day attribution windows miss this entirely.

---

### 3.5 — Referral Amplification KPIs

Once the baseline is measured, these KPIs measure whether referral is being actively amplified:

| KPI | Definition | Target | Measurement |
|---|---|---|---|
| **Net Promoter Score** | % promoters (9-10) minus % detractors (0-6) among active clients | >50 (Agency benchmark: 59 median in 2025) | Quarterly survey to all active clients |
| **Referral introduction rate** | % active clients who have introduced at least one prospect in the past 12 months | [HYPOTHESIS: target 30%+] | CRM "referred by" field tracking |
| **Referral conversion rate** | % referred prospects who sign within 12 months | [HYPOTHESIS: higher than non-referral; B2B benchmark: referral closes 71% faster] | CRM source × deal stage |
| **Referral revenue share** | % of total revenue attributable to referred accounts | >60% (current historical baseline) | CRM source × invoice amount |
| **Case study publication rate** | Number of client case studies published with permission per quarter | 2-3 per quarter | Content tracking |
| **Client co-marketing activities** | Number of joint content pieces, testimonials, or speaking engagements per quarter | 1-2 per quarter | Marketing calendar |

---

### 3.6 — UTM Convention for Paid and Owned Channels

When Sarani launches paid acquisition (500€/month budget), all links must use consistent UTM parameters so Umami can distinguish paid referrals from organic:

```
utm_source    = channel name (linkedin / google / newsletter / partner)
utm_medium    = medium type (paid / organic / email / referral)
utm_campaign  = campaign name (lowercased, hyphens, no spaces)
utm_content   = creative variant (optional, for A/B testing)
```

**Example — LinkedIn paid campaign targeting CMOs:**
```
?utm_source=linkedin&utm_medium=paid&utm_campaign=cmo-enterprise-q2-2026&utm_content=sony-case-study-banner
```

**Example — Client referral email with tracking:**
```
?utm_source=client-referral&utm_medium=email&utm_campaign=referral-program&utm_content=geodis-intro
```

---

## 4. AARRR KPI Framework

### Phase mapping for Sarani (B2B site vitrine, no product)

| AARRR Phase | Sarani Equivalent | Primary Metric | Target |
|---|---|---|---|
| **Acquisition** | Visitor arrives on sarani.studio | Sessions per month | [HYPOTHESIS: 2,000-5,000/month at launch] |
| **Activation** | Visitor engages with a case study or pricing page | % sessions with >1 page view + >60s on site | >40% |
| **Retention** | Prospect returns to site during evaluation period | Return visitor rate | >25% |
| **Referral** | Active client introduces a new prospect | Referral introduction rate | >30% of active clients/year |
| **Revenue** | Contract signed | New enterprise accounts/month | 5 |

**Note on A/B testing viability:** With projected traffic below 5,000 sessions/month at launch, statistically valid A/B tests require 3-6 months to reach significance for conversion metrics. Recommendation: use qualitative methods (user interviews, heatmaps via Microsoft Clarity free tier) before launching quantitative A/B tests. Flag any A/B test requiring <500 conversions per variant as statistically non-viable.

---

## 5. Hypotheses to Validate

All [HYPOTHESIS] items from this document, consolidated for review:

| # | Hypothesis | How to Validate | Priority |
|---|---|---|---|
| H1 | Active enterprise accounts today = 20-30 | Confirm with Sarani team / CRM data | Critical |
| H2 | Average project value = 8,000-15,000€ | Confirm with finance / invoicing data | Critical |
| H3 | Site-to-lead conversion rate = 1-2% | Measure after 3 months of Umami data | High |
| H4 | Monthly traffic at launch = 2,000-5,000 sessions | Measure after 1 month of Umami data | High |
| H5 | Referral introduction rate target = 30%+ of active clients | Measure via CRM after NPS survey implementation | Medium |
| H6 | Referral closes 71% faster than non-referral at Sarani | Track deal velocity by source in CRM | Medium |
| H7 | LTV/CAC > 10:1 | Calculate once CAC data available from first paid campaigns | Low (deferred) |

---

*Sources consulted for benchmarks:*
- [B2B Conversion Rates by Industry 2026 — First Page Sage](https://firstpagesage.com/reports/b2b-conversion-rates-by-industry-fc/)
- [B2B Attribution Modeling for Long Sales Cycles — House of MarTech](https://houseofmartech.com/blog/b2b-attribution-modeling-for-long-sales-cycles)
- [B2B NPS Benchmarks 2025 — CustomerGauge](https://customergauge.com/blog/b2b-nps-benchmarks-tying-revenue-to-your-experience-program)
- [NPS Benchmarks 2025 — Retently](https://www.retently.com/blog/good-net-promoter-score/)
- [Referral Attribution & Enterprise Metrics — PartnerStack](https://partnerstack.com/articles/enterprise-kpis-saas-partnerships)
- [B2B Marketing Attribution — Improvado](https://improvado.io/blog/b2b-marketing-attribution)

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/analytics/kpi-framework.md`
- Decisions taken:
  - Analytics tool confirmed: Umami (self-hosted, privacy-first) — no GA4, no Mixpanel
  - North Star confirmed: 10M€ revenue / 20% EBITDA, decomposed into actionable input metrics
  - Attribution model: First Touch + Self-Reported Hybrid (mandatory form field "How did you hear about us?")
  - UTM naming convention defined (see Section 3.6)
- Points of attention for implementation:
  - Umami must track: page views per URL, session duration, referrer domain, traffic source, geographic data, goal completions (contact form submit)
  - Contact form must include two mandatory fields beyond the brief: (1) "Company size" dropdown, (2) "How did you first hear about Sarani?" free text
  - Umami goal events to configure: `form_view`, `form_start`, `form_submit` on the contact form
  - Scroll depth events on case study pages: fire at 50% and 100% scroll
  - All paid/owned links must use the UTM convention defined in Section 3.6
