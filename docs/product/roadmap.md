# Sarani — Product Roadmap
*Produced by @product-manager — 2026-03-24*
*Language: English*

---

## 1. Roadmap Overview

| Phase | Feature | Sprint / Week | Owner (agent) | KPI Target |
|---|---|---|---|---|
| **Phase 1 — Showcase Website** | Next.js project setup + Replit deployment config | W1 | @fullstack, @infrastructure | Site live on Replit, zero downtime |
| Phase 1 | Design system + brand tokens (colors, typography, spacing) | W1 | @design | Design system doc published, tokens usable by @fullstack |
| Phase 1 | UX flows + wireframes (Home, Services, Work, About, Contact) | W1 | @ux | Wireframes validated before any frontend implementation |
| Phase 1 | Homepage — proof-point-first layout (logos above fold, D+1 claim, 155€ price) | W2 | @fullstack, @copywriter | Enterprise logos visible without scroll on desktop |
| Phase 1 | Services page | W2 | @fullstack, @copywriter | All 4 expertise pillars covered |
| Phase 1 | Work / Case Studies page (Sony, GEODIS, TikTok — minimum 3) | W2 | @fullstack, @copywriter | At least 3 full case studies with quantified results |
| Phase 1 | About page | W2 | @fullstack, @copywriter | Team + 5 continents + 35 experts visible |
| Phase 1 | Contact / brief form (primary CTA) | W2 | @fullstack | Form submits, email notification confirmed, Umami event tracked |
| Phase 1 | Pricing transparency page | W3 | @fullstack, @copywriter | Fixed price examples visible, no opaque retainers |
| Phase 1 | Umami self-hosted integration — all pages + form conversion event | W3 | @fullstack, @infrastructure | Pageviews + form submission tracked in Umami dashboard |
| Phase 1 | SEO technical baseline (meta tags, sitemap, robots.txt, structured data) | W3 | @seo, @fullstack | Lighthouse SEO score ≥90, sitemap submitted |
| Phase 1 | QA smoke tests + contact form end-to-end test | W4 | @qa | Zero critical bugs, form delivers to inbox in <2 min |
| Phase 1 | Performance audit + Replit prod deployment | W4 | @infrastructure | LCP <2.5s, CLS <0.1, TTFB <600ms |
| Phase 1 | **MILESTONE: Site Go-Live** | **End W4** | @orchestrator | 5 qualified lead form submissions / month target activated |
| **Phase 2 — Autonomous Social & SEO** | Brand voice guardrails document | W5 | @copywriter | Document published before any AI content goes live |
| Phase 2 | LinkedIn content strategy + 90-day editorial calendar | W5–W6 | @social | Calendar covers 3–5 posts/week, mapped to proof-point categories |
| Phase 2 | AI content production pipeline — LinkedIn (agents produce, schedule, publish) | W6–W7 | @social, @ia | First week of posts published autonomously, zero human production effort |
| Phase 2 | 24h lightweight approval workflow for LinkedIn (brand-crisis gate only) | W7 | @ia | Approval step implemented; <5% of posts flagged on avg |
| Phase 2 | SEO keyword map + blog architecture | W6 | @seo | Top 20 priority keywords mapped, blog URL structure defined |
| Phase 2 | First 4 SEO articles (AI-produced, human-validated tone) | W7–W8 | @copywriter, @seo | Published on blog, indexed by Google within 2 weeks |
| Phase 2 | GEO / LLM optimization layer (structured content, FAQ schema) | W8–W9 | @geo | Sarani appears in 1+ LLM response for target queries within 60 days |
| Phase 2 | Ongoing SEO article pipeline (2 articles/month, autonomous) | W9–W10 | @seo, @ia | 2 articles/month published without human writing effort |
| Phase 2 | LinkedIn amplification activation (500€/month budget) | W8 | @growth | Cost per qualified lead tracked, baseline set |
| Phase 2 | **MILESTONE: Autonomous Pipeline Live** | **End W10** | @orchestrator | Organic lead baseline set; hypothesis on 500€/month ROI validated by W14 |
| **Phase 3 — Internal Back-Office** | Internal dashboard architecture + auth (internal-only access) | W11–W12 | @fullstack, @infrastructure | Dashboard accessible only to Sarani team (IP restriction or simple auth) |
| Phase 3 | ClickUp API integration — project status, deadlines, assignees | W12–W14 | @fullstack, @ia | Real-time project data displayed; API failure → manual fallback UI |
| Phase 3 | Evoliz API integration — invoice tracking, revenue per client, billing status | W13–W15 | @fullstack, @ia | Invoice list displayed; API failure → manual fallback UI |
| Phase 3 | Translation review agent (consistency, terminology, brand voice — 18 languages) | W14–W16 | @ia | Agent reviews a 1,000-word doc in <30 seconds with flagged inconsistencies |
| Phase 3 | Creative strategist agent (brief input → creative direction + mood board refs) | W15–W17 | @ia | Agent produces a creative direction summary in <2 minutes from a brief |
| Phase 3 | Deck/presentation generator (brief → branded Sarani presentation) | W16–W18 | @ia, @fullstack | Client manager generates a branded deck in <5 minutes |
| Phase 3 | **MILESTONE: Back-Office V1 Live** | **End W18** | @orchestrator | Baseline internal coordination time measured; zero missed invoices confirmed |

---

## 2. Critical Path

The following sequence is **blocking** — no step can begin until the previous one is complete:

```
[W1] Design system + UX wireframes
        ↓
[W2] Homepage + Contact form implementation
        ↓
[W3] Umami integration + SEO technical baseline
        ↓
[W4] QA smoke tests → SITE GO-LIVE
        ↓
[W5] Brand voice guardrails
        ↓
[W6–W7] AI content pipeline (LinkedIn + SEO)
        ↓
[W8] Amplification budget activation
        ↓
[W11+] Back-office (no dependency on Phase 2 completion)
```

**Single most critical component:** The contact / brief form (W2). A broken form in Phase 1 kills the entire lead pipeline. It must be the first component tested end-to-end by @qa before go-live.

**Phase 3 is independent.** Back-office development can begin at W11 regardless of Phase 2 progress. It does not block organic acquisition.

---

## 3. Dependencies Map

| Feature | Depends on | Blocks |
|---|---|---|
| Homepage implementation | Design system (tokens), UX wireframes, brand-platform.md (@creative-strategy) | All other pages |
| Contact form | Homepage layout, Umami integration | QA smoke test, Site Go-Live |
| Umami integration | Replit deployment config | Analytics baseline, KPI tracking |
| SEO technical baseline | Next.js structure finalized | SEO content strategy (Phase 2) |
| Brand voice guardrails | brand-platform.md (done — @creative-strategy) | AI content pipeline (LinkedIn + SEO) |
| AI LinkedIn pipeline | Brand voice guardrails, LinkedIn editorial calendar | Amplification budget activation |
| SEO blog articles | SEO keyword map, brand voice guardrails | GEO layer, LLM visibility |
| GEO / LLM layer | SEO articles published | LLM visibility measurement |
| ClickUp API integration | Internal dashboard architecture | Translation agent, Deck generator context |
| Evoliz API integration | Internal dashboard architecture | Zero-missed-invoices KPI |
| Translation review agent | AI architecture (@ia), brand voice guardrails | Creative strategist agent (shared infra) |
| Deck generator | Creative strategist agent (shared pipeline), Sarani branded template asset | Client manager 5-min workflow |

---

## 4. Risk Mitigation Timeline

| Risk | Mitigation action | Deadline | Owner |
|---|---|---|---|
| **Risk 1 — AI-only dev quality** (broken form = no leads) | @qa automated tests + manual smoke test checklist before go-live | End W4 (before Site Go-Live) | @qa |
| **Risk 1 — ongoing** | QA regression tests on every Phase 2 and Phase 3 deployment | Continuous from W4 | @qa |
| **Risk 2 — ClickUp/Evoliz API failure** | Build graceful degradation (API down → manual fallback UI) from first line of code | W12 (start of ClickUp integration) | @fullstack, @ia |
| **Risk 2 — ongoing** | API health monitoring + alerting on Replit | W15 | @infrastructure |
| **Risk 3 — AI content tone/authenticity** | Brand voice guardrails doc published before any AI post goes live | W5 (before pipeline start) | @copywriter |
| **Risk 3 — ongoing** | 24h lightweight approval gate for LinkedIn posts | W7 | @ia, @social |
| **Risk 3 — monitoring** | Weekly engagement metrics review for first 8 weeks of Phase 2 | W8–W16 | @data-analyst |
| **Open Question: client logo approvals** | Confirm written approval from TikTok, Sony, GEODIS, Adidas before homepage go-live | W3 at the latest | Sarani team (human action) |
| **Open Question: LinkedIn account access** | Confirm who controls Sarani LinkedIn page and current posting baseline | W5 (before pipeline launch) | Sarani team (human action) |

---

## 5. Milestones — Go / No-Go Criteria

### Milestone 1 — Site Go-Live (End of Week 4)

| Criterion | Go condition | No-Go condition |
|---|---|---|
| Contact form | Delivers to inbox, Umami conversion event fires | Any failure in submission or tracking |
| Enterprise logos | TikTok, Sony, GEODIS, Adidas visible above fold (or written approval confirmed) | No logo approvals confirmed |
| Proof points | D+1 claim + Sony case study + 155€ price visible before scroll | Missing any of the 3 acceptance criteria from product-vision.md |
| SEO | Lighthouse SEO ≥90, sitemap submitted | Score <80 or sitemap missing |
| Performance | LCP <2.5s on desktop | LCP >3s |
| QA | Zero P0/P1 bugs on smoke test checklist | Any P0 bug open |

**KPI activated at Go-Live:** 5 qualified lead form submissions / month (enterprises >500M€ revenue)

---

### Milestone 2 — Autonomous Pipeline Live (End of Week 10)

| Criterion | Go condition | No-Go condition |
|---|---|---|
| Brand voice | Guardrails doc published and validated by Sarani team | Doc missing or not validated |
| LinkedIn pipeline | 3–5 posts/week published autonomously for 2 consecutive weeks | Human intervention required in production |
| SEO blog | 4 articles published and indexed | Fewer than 2 articles indexed |
| Approval gate | 24h gate operational | No review mechanism for brand-critical posts |
| Baseline set | Organic lead count tracked in Umami from W1 | No baseline data available |

**KPI activated at Go-Live:** Monthly organic leads from LinkedIn + SEO (hypothesis: 2–3 leads/month at W14 with 500€ amplification)

---

### Milestone 3 — Back-Office V1 Live (End of Week 18)

| Criterion | Go condition | No-Go condition |
|---|---|---|
| ClickUp integration | Real-time data displayed; fallback UI tested and working | No fallback state implemented |
| Evoliz integration | Invoice list displayed with billing status; fallback UI tested | No fallback state implemented |
| Translation agent | Reviews 1,000-word doc in <30s with flagged inconsistencies | Response time >2 minutes |
| Deck generator | Client manager produces branded deck in <5 minutes from brief | Deck takes >10 minutes or requires formatting work |
| Access control | Dashboard accessible only to Sarani internal team | Public access possible |

**KPI activated at Go-Live:** Baseline internal coordination time survey sent (before W11); reduction measured at W22

---

## Hypotheses to Validate

- [HYPOTHESE : 500€/month LinkedIn amplification generates 2–3 inbound enterprise leads/month — to validate at W14 (6 weeks after Phase 2 go-live)]
- [HYPOTHESE : Sophie converts primarily via case studies (Sony, TikTok, GEODIS), not via pricing page — to validate with first 20 leads using Umami page path analysis before form submission]
- [HYPOTHESE : Translation review agent is higher-priority than deck generator for Phase 3 (team of 18 languages uses it daily) — to confirm with Sarani operations team before W11]

---

**Handoff → @orchestrator**
- Files produced: `/home/user/Sarani/docs/product/roadmap.md`
- Decisions taken:
  - 3-phase roadmap fully sequenced across 18 weeks
  - Contact form identified as single most critical component — @qa smoke tests mandatory before Phase 1 go-live
  - Brand voice guardrails (@copywriter) confirmed as hard dependency before any AI content pipeline launches (W5)
  - Phase 3 back-office declared independent from Phase 2 — can start W11 in parallel
  - Go/No-Go criteria defined for all 3 milestones with measurable conditions
  - Client logo written approvals (TikTok, Sony, GEODIS, Adidas) flagged as human action required by W3
- Points of attention:
  - Next immediate deliverable: `backlog.md` — break down Phase 1 features into sprint-ready stories with RICE scores
  - @data-analyst should map KPI tracking events to each milestone (Umami events, form field naming conventions)
  - Open Question #2 (logo approvals) is a potential blocker for Phase 1 go-live — must be resolved by Sarani team by W3
  - Open Question #4 (LinkedIn account access) must be resolved before Phase 2 pipeline starts at W6
