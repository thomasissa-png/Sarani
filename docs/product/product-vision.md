# Sarani — Product Vision
*Produced by @product-manager — 2026-03-24*
*Language: English*

---

## Product Vision Statement

> Build the digital infrastructure that makes Sarani's "always-on enterprise creative partner" promise impossible to miss, impossible to doubt, and impossible to replace — from the first website visit to daily internal operations.

---

## Strategic Context

Sarani is not a traditional agency. It is a new category: the always-on enterprise creative partner, delivering at the speed of digital (D+1), at the quality of premium (TikTok, Sony, Adidas, GEODIS), at 60% below traditional agency costs. The product challenge is threefold:

1. **Acquisition**: Sophie (Head of Marketing, enterprise) must find Sarani before she defaults to Publicis — and immediately trust that Sarani can handle her scale.
2. **Credibility**: Marc (Procurement Director) must validate Sarani in a 15-minute review — price, track record, no lock-in.
3. **Operations**: The internal team of 45 experts across 5 continents must operate without friction — project tracking, client deliverables, AI-assisted production.

No subscription lock-in. Fixed prices. 24h delivery. These are product constraints, not just marketing claims. Everything built must reinforce them.

---

## Product Phases

### Phase 1 — Showcase Website (Priority: NOW)

**Goal:** Convert Sophie into a qualified lead within 90 seconds on the homepage.

**What we build:**
- Full redesign of sarani.studio reflecting the enterprise positioning
- Proof-point-first architecture: named clients (TikTok, Sony, GEODIS), quantified results, fixed price examples visible above the fold
- Contact / brief submission form (the primary CTA — no subscription, no signup wall)
- Case studies section: at minimum Sony (same-day banners), GEODIS (5,700 slides / 3 weeks), TikTok (1,500+ edits/month)
- Pricing transparency page: example rates, no opaque retainers
- Analytics: Umami (self-hosted, privacy-first)

**Stack:** Next.js — deployed on Replit

**Success metric:** Qualified lead form submissions from enterprises with >500M€ revenue (5 new accounts/month target)

**User story (primary):**
> As Sophie, visiting sarani.studio for the first time, I want to see in under 90 seconds that Sarani has delivered for companies like mine at speeds my current agency cannot match — so that I submit a brief before I close the tab.

**Acceptance criteria:**
- Named enterprise client logos visible without scrolling on desktop
- D+1 delivery claim visible with at least one proof case (Sony)
- Fixed price example visible (155€ banner) before the fold break
- Contact form accessible in max 2 clicks from any page
- Umami tracking active on all pages and form conversions

---

### Phase 2 — Autonomous Social & SEO (Priority: NEXT)

**Goal:** Build organic acquisition at zero marginal cost — LinkedIn visibility and LLM-indexed content, operated 100% by the AI agent team.

**What we build:**
- LinkedIn content pipeline: weekly posts, case study threads, proof-point content — produced autonomously by agents, no human in the production loop
- SEO blog: keyword-targeted articles (enterprise creative agency, D+1 delivery, unlimited revisions agency, etc.) — produced autonomously by agents
- LLM-optimization layer: structured content to appear when Sophie or Marc ask an AI assistant "which creative agency delivers fast for enterprise?"

**Constraint:** No human production loop. Agents produce, schedule, and publish. Human review only for brand-critical crises.

**Budget:** 500€/month acquisition budget (paid amplification of organic content only — no paid ads production)

**Success metric:** Monthly organic leads from LinkedIn + SEO (baseline to be set after Phase 1 launch)

**User story (primary):**
> As the Sarani growth engine, I want to publish 3–5 LinkedIn posts per week and 2 SEO articles per month without any human production effort — so that Sarani builds inbound pipeline while the team focuses on delivery.

---

### Phase 3 — Internal Back-Office (Priority: LATER)

**Goal:** Eliminate operational friction for the 35-person team across 5 continents.

**What we build:**

**3a — Project tracking dashboard:**
- ClickUp API integration: real-time project status, deadlines, assignees
- Evoliz API integration: invoice tracking, revenue per client, billing status
- Internal-only access (no client-facing portal in V1)

**3b — AI internal agents:**
- Translation review agent: Sarani's team translates documents; agent reviews for consistency, terminology, and brand voice across 18 languages
- Creative strategist agent: brief input → creative direction suggestions, mood board references, competitive context
- Deck/presentation generator: brief input → auto-generated client presentation link (branded Sarani template)

**Success metric:** Reduction in internal coordination time (baseline survey before launch); zero missed invoices; translation review cycle time

**User story (primary):**
> As a Sarani client manager, I want to generate a branded client presentation from a brief in under 5 minutes — so that I spend my time on the relationship, not on formatting.

---

## Target Users

| User | Phase | Primary need |
|---|---|---|
| Sophie (Head of Marketing, enterprise) | Phase 1 | Trust Sarani instantly, submit a brief without friction |
| Marc (Procurement Director) | Phase 1 | Validate pricing, track record, contract simplicity |
| Sarani internal team (45 experts, 5 continents) | Phase 3 | Track projects, generate client materials, AI assistance |

---

## Technical Constraints

- **Deployment:** Replit (all phases)
- **Frontend:** Next.js
- **Analytics:** Umami (self-hosted, privacy-first — no Google Analytics)
- **Third-party integrations:** ClickUp API (Phase 3), Evoliz API (Phase 3)
- **Development model:** 100% AI agents — no additional human developers
- **Language:** English (all user-facing content and documentation)

---

## Product Risks

### Risk 1 — AI-only development quality and velocity
**Description:** All development is produced by AI agents without human developers to review or debug. Complex integrations (ClickUp, Evoliz) and edge cases may accumulate undetected.
**Impact:** High — a broken contact form on Phase 1 directly kills lead generation.
**Mitigation:** @qa agent with automated test coverage required before any Phase 1 deployment. Define a manual smoke test checklist for every release. Phase 3 integrations must have fallback states (API unavailable → manual entry mode).

### Risk 2 — Third-party API dependencies (ClickUp, Evoliz)
**Description:** Phase 3 operational value depends entirely on two external APIs. Rate limits, breaking changes, or authentication failures could block the team's daily workflow.
**Impact:** Medium — Phase 3 is internal-only, business continuity is not at risk, but team efficiency suffers.
**Mitigation:** Build Phase 3 with graceful degradation from day one. API calls should fail silently with a manual fallback UI. No hard dependency on real-time data for any critical workflow.

### Risk 3 — AI-generated LinkedIn/SEO content — tone and authenticity risk
**Description:** 100% autonomous content production (Phase 2) may produce posts that are technically correct but tonally off-brand, or that lack the authentic voice of a team that has actually delivered for TikTok and Sony.
**Impact:** Medium — a single poorly-toned post can damage enterprise credibility faster than 10 good posts can build it.
**Mitigation:** Define a brand voice guardrail document (by @copywriter) before Phase 2 launch. Implement a 24h review window for LinkedIn posts (not production, but a lightweight approval step). Monitor engagement metrics weekly for the first 8 weeks.

---

## Open Questions

1. **Current site audit:** What is the current sarani.studio built on? Is there existing content/code to migrate or is this a greenfield build?
2. **Case study approvals:** Which named clients (TikTok, Sony, GEODIS, Adidas) have given explicit written approval for their logos and case studies to appear on the public site?
3. **Pricing page decision:** Should fixed pricing be published openly on the website, or gated behind a contact form? (Current brand platform states "transparent pricing published openly" — confirming this is the intended approach.)
4. **LinkedIn account ownership:** Who controls the Sarani LinkedIn company page? What is the current posting frequency and follower count (baseline for Phase 2)?
5. **Evoliz access:** Is there an existing Evoliz API key and the billing data is current and clean enough for Phase 3 integration?
6. **Phase 3 priority:** Is the translation review agent or the deck generator the higher-priority Phase 3 feature? (Determines build order.)

---

## Hypotheses to Validate

- [HYPOTHESE : Sophie converts primarily via case studies (social proof), not via pricing page — to validate with first 20 leads: which page did they visit before submitting the form?]
- [HYPOTHESE : 500€/month amplification budget on LinkedIn is sufficient to generate 2–3 inbound leads/month from organic reach — to validate after 60 days of Phase 2 operation]

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/product/product-vision.md`
- Decisions taken:
  - Phase 1 (showcase website) is the immediate priority — Next.js on Replit
  - Phase 2 (autonomous LinkedIn + SEO) is next — no human in production loop
  - Phase 3 (back-office: ClickUp + Evoliz APIs + AI agents) is later
  - Umami confirmed as analytics stack (no Google Analytics)
  - No subscription, no login wall, no e-commerce — pure lead generation in Phase 1
- Points of attention:
  - Contact form is the single most critical component — any bug here kills the lead pipeline
  - Named client logos require explicit approval confirmation before going live (see Open Questions #2)
  - Phase 3 API integrations must be built with graceful degradation from day one
  - @qa must produce a smoke test checklist before Phase 1 deployment
  - @copywriter should produce brand voice guardrails before Phase 2 agent content goes live
