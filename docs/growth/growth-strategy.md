# Sarani — Growth Strategy
*Produced by @growth — 2026-03-24*
*Language: English*
*Sources: project-context.md, pricing-strategy.md, kpi-framework.md, brand-platform.md, personas.md*

---

## 1. Unit Economics

### CAC by Channel

| Channel | Estimated CAC | Basis |
|---------|--------------|-------|
| Referral (existing) | ~0€ | 100% of growth to date. Zero paid budget. Sophie refers Sophie. |
| Referral (structured program) | ~50–150€ | Cost of incentive if introduced (gift, credit, co-marketing). Currently 0€ because no formal program exists. |
| LinkedIn Organic | ~200–600€ | Time cost of content production only. ~4–6h/post including brief, production, engagement. At estimated 150€/h internal team rate, 3–4 posts to generate 1 qualified inbound lead = 450–900€ effective CAC. Budget spent: 0€. |
| SEO (organic) | ~300–900€ | Content + technical investment amortized over 12 months. First 3–6 months produce zero leads. Long-tail qualified traffic starts M4–M6. CAC falls below 100€ after M12 if strategy is executed. |
| Paid (LinkedIn Ads) | ~800–2,500€ | LinkedIn CPL for B2B enterprise decision-makers in Marketing Director / Head of Marketing roles. Estimated CPL 150–500€. 3–5 leads needed to close 1 account = 450–2,500€ CAC. Budget constraint: 500€/month severely limits scale. |

**LTV Calculation (base scenario, per pricing-strategy.md):**
- Annual revenue per active enterprise account: 12,000€ (base)
- Client lifespan assumption: 3 years [HYPOTHESIS — no churn data available from Sarani team. To validate against Evoliz billing history]
- Gross margin assumption: 60% [HYPOTHESIS — no P&L data available. To confirm with Sarani team before using in investor materials]
- **LTV = 12,000€ × 3 years × 60% margin = ~21,600€**

**LTV/CAC Ratio by Channel:**

| Channel | CAC | LTV | LTV/CAC | Target Met? (>3x, ideally >10x) |
|---------|-----|-----|---------|----------------------------------|
| Referral (0€) | 0€ | 21,600€ | Infinite | Yes — best channel by definition |
| Referral (structured) | 100€ | 21,600€ | 216x | Yes |
| LinkedIn Organic | 500€ | 21,600€ | 43x | Yes |
| SEO (after M12) | 150€ | 21,600€ | 144x | Yes (after M12 only) |
| Paid LinkedIn | 1,500€ | 21,600€ | 14x | Yes — but only if CPL stays below 300€ and close rate >33% |

**Payback Period:**
- Average order value at first project: 220€ (Discovery Sprint) to 1,670€ (full campaign order)
- At 1,670€ first order and 1,500€ CAC (paid): payback = 1 month (if full campaign)
- At 220€ first order (Discovery Sprint) and 1,500€ CAC: payback = 7 months → **paid acquisition is not justified for Discovery Sprint-only first orders**
- Referral and LinkedIn Organic: payback < 1 month regardless of entry point

**Warning — Paid Channel:** At 500€/month budget, LinkedIn Ads can generate 1–3 leads/month maximum (at 150–500€ CPL). This is insufficient to reach 5 new accounts/month. Paid must be treated as a test channel at this budget level, not a growth driver.

---

## 2. Acquisition Strategy — 4 Channels, Ordered by Priority

### Channel #1 — Referral (Activate the Existing Engine)

**Why #1:** 100% of Sarani's historical growth. LTV/CAC = infinite. The existing client base (TikTok, Sony, Adidas, GEODIS, Pernod Ricard) is the highest-value referral network in the market. One referral from a TikTok Marketing Director reaches 10 peers at equivalent budget authority.

**Current state:** Passive. Referrals happen organically, without any systematic trigger.

**Actions to activate:**

| Action | Cost | KPI |
|--------|------|-----|
| Map existing client network: identify which clients have referral potential (company size, industry network, LinkedIn connections) | 0€ — internal audit | Referral map built within W2 |
| Add a referral ask to every project delivery email: "Know someone who could benefit from this?" + link to contact form | 0€ — 1 email template | % of clients who forward or introduce (track via self-reported form field) |
| Create a client case study co-creation program: offer featured clients a joint LinkedIn post (they get visibility, Sarani gets proof) | 0€ — content effort only | 1 co-created post/month = 1 warm intro/month minimum |
| Introduce a referral incentive for high-volume clients (optional, low priority): discount on next project or dedicated production day | ~100–300€ credit per referral | Test on 5 top clients. Referral-to-close rate target: >50% |

**Constraint:** Do not build a formal referral "program" (referral codes, landing pages, tracking dashboard) before the new website is live. Use email-based referral asks only until W4.

---

### Channel #2 — LinkedIn Organic (Build the Inbound Pipeline)

**Why #2:** Sophie (ICP) is active on LinkedIn. Enterprise marketing directors and procurement directors both validate vendors via LinkedIn before any contact. Zero budget required. Content compounds over time.

**Actions:**

| Action | Cost | KPI |
|--------|------|-----|
| Publish 3 posts/week: mix of case study proof (Sony D+1, TikTok volume), "how we work" transparency, and industry POV | 0€ — internal content team | Follower growth rate, inbound profile visits, contact form submissions tagged "LinkedIn" |
| Optimize Sarani company page: headline = value proposition from brand-platform.md, featured section = 3 top case studies | 0€ | Profile visit-to-contact conversion rate |
| Activate employee advocacy: have the 5 most senior Sarani team members reshare company posts with personal comment | 0€ | Reach multiplier (target: 3x organic reach per repost) |
| LinkedIn DM outreach to warm contacts (second-degree connections via existing clients): personalized, project-specific, not mass | 0€ | Response rate >20%, meeting rate >5% |

**Content calendar priority:** Case studies first (proof), then process (trust), then opinion (authority). The messaging-matrix.md "Consideration" stage LinkedIn messages are the correct template.

---

### Channel #3 — SEO (12-Month Compounding Asset)

**Why #3:** SEO will not produce leads in the first 3 months. It is included here because it is a zero-variable-cost channel after initial setup and it compounds indefinitely. The website (Phase 1) is the prerequisite.

**Priority pages for organic traffic:**

| Target keyword cluster | Page | Timeline |
|----------------------|------|----------|
| "creative agency enterprise" / "creative production agency" | Homepage | M1 (goes live with site) |
| "banner design agency" / "banner design 24 hours" | Pricing or dedicated service page | M2 |
| "presentation design agency enterprise" | Case study: GEODIS 5,700 slides | M3 |
| "creative agency tiktok" / "social media video production" | Case study: TikTok 1,500 videos/month | M3 |
| "design agency alternatives superside" | Comparison landing page | M4 |

**Actions:**
- Publish 1 case study/month (existing clients: Sony, TikTok, GEODIS, Adidas — content already exists in deck)
- Implement all structured data from metadata-templates.md (JSON-LD, Organization, Service schema)
- Target featured snippet positions for "creative agency vs traditional agency" type queries

**Budget:** 0€ variable cost. Time cost only (internal team).

**KPI:** Organic sessions, contact form submissions from organic source (Umami tracking).

---

### Channel #4 — Paid / LinkedIn Ads (Validation Test Only at 500€/Month)

**Why #4 and why "test only":** At 500€/month, this budget generates 1–3 leads/month. It cannot drive 5 new accounts/month on its own. The correct use of this budget is to validate messaging before scaling, not to drive volume.

**Recommended allocation:**

| Ad type | Budget | Goal |
|---------|--------|------|
| LinkedIn Single Image Ad — "We delivered 1,500 videos/month for TikTok" — CTA: "See our pricing" | 300€/month | Validate which proof point drives the highest CTR (TikTok volume vs Sony same-day vs GEODIS volume) |
| LinkedIn Lead Gen Form — Discovery Sprint offer (220€ — first project guarantee) | 200€/month | Validate if low-ticket entry point converts better than generic "contact us" |

**KPIs to validate in 30 days:** CTR >0.5%, CPL <300€, contact-to-brief rate >30%.

**Decision rule:** If after 60 days the CPL exceeds 300€ or contact-to-brief rate falls below 20%, cut paid and reallocate the 500€ to content production (SEO + LinkedIn organic acceleration).

---

## 3. Funnel AARRR — Metrics by Stage

| Stage | Definition for Sarani | Target (6 months) | Measurement |
|-------|----------------------|-------------------|-------------|
| **Acquisition** | Unique visitors to sarani.studio | 2,000/month by M6 | Umami pageviews |
| **Activation** | Contact form submission (= first qualified touchpoint) | 1–2% site-to-lead rate = 20–40 leads/month by M6 | Umami form_submit event |
| **Conversion** | First project briefed and invoiced | 25–40% lead-to-brief rate → 5–16 new accounts/month | Evoliz invoice data |
| **Retention** | Client reorders within 90 days | >85% retention rate | Evoliz repeat billing |
| **Revenue** | Monthly revenue from active accounts | 4M€ cumulative by M6 [HYPOTHESIS — contingent on existing client base size, unknown] | Evoliz total billing |
| **Referral** | New leads self-reporting "referred by client" | 30–50% of all leads | Contact form "How did you hear about us?" field |

**Bottleneck identified:** The funnel is currently not measurable because (1) the new website is not live yet, (2) Umami is not implemented, (3) there is no contact form tracking. The entire AARRR funnel starts at W4 (go-live). Before W4, all acquisition is direct outreach and referral only.

**Critical path:** US-103 (contact form) → Umami implementation (W4) → first trackable leads → funnel baseline established. Without this, growth decisions at M2 will be based on zero data.

---

## 4. Growth Loops

### Loop #1 — The Referral Loop (Primary, Active Now)
```
Client delivers campaign results (e.g., Sony banner, TikTok video)
→ Campaign performs well
→ Sophie shares result internally or with peer
→ Peer contacts Sarani (referral)
→ New client, new delivery, loop repeats
```
**Activation lever:** Systematize the post-delivery touchpoint. Every project close = one referral ask. Current state: this ask does not happen systematically.

### Loop #2 — The Case Study Content Loop (LinkedIn Organic)
```
Sarani delivers exceptional result (GEODIS 5,700 slides, TikTok 1,500 videos)
→ Case study published on website + LinkedIn post
→ Sophie's peers see the post, recognize the client name
→ Inbound inquiry or LinkedIn DM
→ New project → new case study
```
**Activation lever:** 1 case study/month minimum. Content already exists (deck has 12 clients documented). Execution = write, design, publish. No new client needed to start.

### Loop #3 — The Social Proof Loop (Pricing Page Conversion)
```
Visitor lands on pricing page (via LinkedIn, referral, or SEO)
→ Sees Discovery Sprint 220€ + "First project satisfaction or no invoice"
→ Zero perceived risk → submits brief
→ Delivers in 24h → client shares result
→ Referral loop activates
```
**Activation lever:** The guarantee must be displayed prominently on the pricing page (pricing-strategy.md Section 5.3). This loop is activated by pricing page design, not by acquisition spend.

---

## 5. Pricing and Acquisition Coherence

### Is the Per-Project Model Compatible with Acquisition?

**Yes — with one important nuance.**

Per-project pricing is the correct acquisition model for Sophie because it removes the subscription objection entirely. The CAC/LTV math works at every price point above 220€, as shown in Section 1.

The key implication for acquisition funnels:

| Subscription model funnel | Sarani per-project funnel |
|--------------------------|--------------------------|
| CTA: "Start free trial" or "Subscribe" | CTA: "Start a project" |
| Conversion event: subscription signup | Conversion event: first brief submitted |
| Revenue at M1: recurring MRR | Revenue at M1: project invoice (variable) |
| Churn measured monthly | Retention measured at 90-day reorder |

**What this means for tracking:** The lead-to-brief conversion rate (Activation → Conversion in AARRR) is the critical metric, not a signup rate. Umami must fire a custom event on brief submission, not just form submission, if these are different steps.

### Discovery Sprint 220€ as Entry Point — Verdict: Correct

The Discovery Sprint (1 banner master + 3 adaptations, 220€, 2-day delivery) is the optimal acquisition entry point for three reasons:

1. **Low financial risk for Sophie:** 220€ is "marketing expenses" in any enterprise budget — no procurement approval required at this amount
2. **Delivers proof fast:** In 2 days, Sophie has a tangible deliverable. The guarantee removes the remaining risk.
3. **High AOV expansion path:** A Sophie who starts with a 220€ Discovery Sprint and gets excellent delivery will naturally brief a Content Sprint (660€) within 30 days. The LTV path from 220€ → 12,000€/year is realistic within 3–6 months.

**Acquisition channel alignment:**
- LinkedIn Ads: promote Discovery Sprint 220€ as the conversion offer (not "contact us")
- LinkedIn Organic: case studies demonstrate what comes after the first brief
- Referral: first referred client should be offered Discovery Sprint explicitly as a risk-free entry point

### Guarantee as Acquisition Lever

"First project satisfaction or no invoice" is not just a retention tool — it is an acquisition argument that directly addresses Marc's (procurement) objection: "What if the first delivery is poor?"

**How to use it in acquisition:**
- Feature it above the fold on the pricing page (pricing-strategy.md confirms this)
- Include it in LinkedIn Ads copy as a closing line: "Not satisfied? No invoice."
- Use it in cold outreach subject lines: "We work for free if you're not satisfied"

**Legal constraint (from legal-audit.md):** The guarantee wording needs formal legal definition (scope, deadline, revision process) before being used in advertising. Coordinate with @legal before W3 deployment.

---

## Hypotheses to Validate

- [HYPOTHESIS: LTV = 21,600€ based on 3-year lifespan and 60% gross margin — requires Sarani P&L and churn data to confirm]
- [HYPOTHESIS: LinkedIn CPL 150–500€ for Marketing Director persona — standard B2B benchmark; to validate against actual campaign data after first 30 days of paid]
- [HYPOTHESIS: Lead-to-brief conversion rate target of 25–40% — no historical conversion data available. Sarani team to provide first baseline from manual tracking of current inbounds]
- [HYPOTHESIS: 2,000 sessions/month by M6 — contingent on SEO traction, LinkedIn growth, and referral volume. No baseline exists pre-W4]
- [HYPOTHESIS: Existing Sarani revenue base (DATA NOT FOUND) — the 4M€/6-month target cannot be validated without knowing current annual revenue. Sarani team to provide LTM revenue from Evoliz]

---

**Handoff → @data-analyst**

Files produced:
- `/home/user/Sarani/docs/growth/growth-strategy.md`

Decisions taken:
- **Referral confirmed as primary acquisition channel** — 100% historical growth, infinite LTV/CAC, must be systematized before any paid spend is considered
- **LinkedIn Organic confirmed as channel #2** — zero cost, right audience (Sophie), compounds over time, requires content consistency not budget
- **Paid (LinkedIn Ads) limited to validation test only** — 500€/month cannot drive volume at enterprise CPL rates; use to test messaging, not to scale
- **SEO framed as 12-month compounding asset** — not a 6-month lever; worth investing in from W4 but expectations set accordingly
- **Discovery Sprint 220€ confirmed as the right acquisition entry point** — low risk for Sophie, fast proof of value, clear expansion path to 12,000€/year LTV
- **Guarantee "First project satisfaction or no invoice" identified as an acquisition lever**, not just a retention tool — requires @legal sign-off before use in ads
- **AARRR funnel cannot be measured until W4** (website go-live + Umami) — all M1–M3 growth is untrackable; baseline establishment at W4 is a hard dependency

Points of attention for @data-analyst:
- The contact form must fire two separate Umami events: `form_submit` (lead captured) and `brief_confirmed` (if a separate brief confirmation step exists). Without this split, lead quality cannot be measured.
- The "How did you hear about us?" field on the contact form is the only attribution source for referral traffic before UTM-tracked paid channels are live. This field must be mandatory and its values analyzed from W4 onwards.
- Cohort analysis should be built from M1: all clients acquired in M1, their 30/60/90-day reorder rates, and their first-project AOV. This is the only way to measure the Discovery Sprint → expansion path quantitatively.
- The 4M€/6-month target requires confirmation of the existing Sarani revenue base. Without this number, projections from Section 1 (new accounts only) show a maximum of 133,000–553,000€ in incremental revenue in 6 months — a significant gap vs. 4M€ target.
