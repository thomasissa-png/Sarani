# Sarani — Orchestration Plan

*Produced by @orchestrator — 2026-03-24*
*Living document — updated after each phase*

---

## Project Type: Site Vitrine International (Enterprise Creative Agency)

**North Star KPI:** 10M€ CA at 20% EBITDA
**Current Revenue:** 3.5M€ (2026 baseline)
**6-Month Target:** 4M€ CA
**Timeline:** ASAP — 18 weeks roadmap

---

## Phase Overview

| Phase | Name | Status | Agents | Dependencies |
|-------|------|--------|--------|-------------|
| 0 | Strategy Foundations | COMPLETE | @creative-strategy, @product-manager, @data-analyst | None |
| 1 | Design & Content Foundations | COMPLETE | @design, @copywriter, @ux, @seo, @geo, @legal, @growth | Phase 0 |
| 2 | Functional Specifications | COMPLETE | @product-manager, @qa, @data-analyst | Phase 1 |
| 3 | Development (Code) | NOT STARTED | @fullstack, @infrastructure | Phase 2 |
| 4 | QA & Pre-Launch | NOT STARTED | @qa, @infrastructure, @legal | Phase 3 |
| 5 | Launch & Post-Launch | NOT STARTED | @orchestrator, @reviewer, @data-analyst, @growth, @social | Phase 4 |

---

## Phase 0 — Strategy Foundations: COMPLETE

**Agents executed:** @creative-strategy, @product-manager, @data-analyst
**Duration:** Session 1

### Deliverables produced:
- [x] `docs/strategy/brand-platform.md` — Brand territory, tone, positioning
- [x] `docs/strategy/personas.md` — Sophie (Head of Marketing) + Marc (Procurement)
- [x] `docs/strategy/competitive-benchmark.md` — 5 competitors analyzed (Superside, Design Pickle, ManyPixels, Penji, networks)
- [x] `docs/strategy/creative-brief.md` — Creative direction
- [x] `docs/product/product-vision.md` — 3 phases defined
- [x] `docs/product/roadmap.md` — 18 weeks, 3 phases, critical path identified
- [x] `docs/product/backlog.md` — 15 user stories, MoSCoW prioritized
- [x] `docs/analytics/kpi-framework.md` — North Star decomposed, AARRR metrics, feature-KPI mapping

### Key decisions:
- Positioning: "always-on enterprise creative partner" — unoccupied space
- Tone: Assured, Direct, Warm
- Contact form = #1 critical component (blocks revenue directly)
- Umami analytics (privacy-first, cookieless)
- Greenfield stack (start from zero)

### Drift check: Persona aligned? YES. North Star aligned? YES.

---

## Phase 1 — Design & Content Foundations: COMPLETE

**Agents executed:** @design, @copywriter, @ux, @seo, @geo, @legal, @growth, @creative-strategy, @product-manager
**Duration:** Session 1

### Deliverables produced:
- [x] `docs/design/design-tokens.json` — Tailwind-ready tokens
- [x] `docs/design/design-system.md` — 605 lines, 5 sections + appendix
- [x] `docs/copy/brand-voice.md` — 9 sections, 12 message variants
- [x] `docs/copy/brand-story-content.md` — About page, elevator pitch, 3 social posts
- [x] `docs/copy/ux-writing-guide.md` — Error/success/loading states, CTAs, accessibility
- [x] `docs/strategy/value-proposition.md` — 6-part operational value prop
- [x] `docs/strategy/brand-story.md` — Origin, manifesto, GEO entities
- [x] `docs/strategy/messaging-matrix.md` — 50 cases persona × canal × funnel
- [x] `docs/seo/metadata-templates.md` — Meta tags, JSON-LD, OG, internal linking
- [x] `docs/geo/geo-strategy.md` — 17 entities, 13 monitoring queries
- [x] `docs/legal/legal-audit.md` — 5 risks ranked, pre-go-live checklist
- [x] `docs/growth/growth-strategy.md` — Unit economics, AARRR funnel, 4 channels
- [x] `docs/product/pricing-strategy.md` — Competitor benchmark, per-project model, 3 bundles
- [x] `docs/ux/user-flows.md` — 4 flows, navigation architecture
- [x] `docs/ux/wireframes.md` — All screens with 5 states, WCAG 2.2 AA

### Key decisions:
- Dark-first palette: Black #000000, Flame #da5126, Cerulean #0babe8, Lemon #f1c217
- Galano Grotesque Bold/Regular (commercial font — licensing required)
- H1 Hero: "Enterprise creative. Delivered in 24 hours. No surprises."
- CTA: "Start a project" (non-negotiable)
- Per-project pricing (no subscription) — key differentiator
- Satisfaction guarantee needs CGV clause (cap 2000€, 5 days notice)
- Umami cookieless = no consent banner needed
- LTV/CAC: Referral infinite, LinkedIn Organic 43x, SEO 144x, Paid 14x

### Blockers resolved:
- [x] Client logo authorization confirmed
- [x] Greenfield stack confirmed
- [x] Pricing page open (public)
- [x] Phase 3 equal priority confirmed
- [x] Current revenue baseline: 3.5M€

### Blockers remaining:
- [ ] Galano Grotesque font licensing (required before dev)
- [ ] Sarani legal entity details (SIRET, address, VAT) for mentions légales
- [ ] Email address confirmation (hello@sarani.studio — [HYPOTHESE])
- [ ] Thomas founder story validation (for About page)
- [ ] Social media handles confirmation (LinkedIn, Instagram URLs)

### Drift check: Persona aligned? YES. North Star aligned? YES.

---

## Phase 2 — Functional Specifications: COMPLETE

**Agents executed:** @product-manager, @qa, @data-analyst
**Duration:** Session 1

### Deliverables produced:
- [x] `docs/product/functional-specs.md` — 1900+ lines, 6 features, Given/When/Then, ASCII wireframes
- [x] `docs/qa/qa-strategy.md` — 34 criteria audited, 3 E2E scenarios, test matrix
- [x] `docs/analytics/tracking-plan.md` — IN PROGRESS (@data-analyst running)

### Key decisions:
- US-103 (Contact Form) = #1 implementation priority
- Rate limiting: 3 submissions/IP/hour, HTTP 429
- Honeypot anti-spam (no CAPTCHA)
- Case studies in SSG (MDX or JSON, Phase 1)
- Vitest + Playwright + axe-core + Lighthouse CI
- CI pipeline target: <6 minutes
- 10 P0 tests blocking go-live

### Drift check: Persona aligned? YES. North Star aligned? YES.

---

## Phase 3 — Development (Code): NOT STARTED

**Agents to execute:** @fullstack, @infrastructure
**Prerequisites:** All Phase 2 deliverables + tracking-plan.md

### Planned sequence:

**Sprint 1 (W1-W2): Foundation + Critical Path**
- @fullstack: Next.js project setup, Tailwind config from design-tokens.json
- @fullstack: Shared components (Nav, Footer, CTA Button, Layout)
- @fullstack: Contact Form (US-103 — critical path)
- @infrastructure: Replit deployment config

**Sprint 2 (W2-W3): Content Pages**
- @fullstack: Homepage (US-101)
- @fullstack: Case Studies index + detail (US-102)
- @fullstack: Pricing page (US-104)

**Sprint 3 (W3-W4): SEO, Legal, Analytics**
- @fullstack: About page
- @fullstack: Legal pages (US-105) — requires legal entity details
- @fullstack: SEO foundation (US-106) — meta tags, JSON-LD, sitemap
- @fullstack: Umami integration (US-105)

**Parallelizable:** @infrastructure can run alongside @fullstack from Sprint 1.

---

## Phase 4 — QA & Pre-Launch: NOT STARTED

**Agents to execute:** @qa, @infrastructure, @legal
**Prerequisites:** Phase 3 code complete

### Planned sequence:
1. @qa: Implement P0 tests (contact form E2E, WCAG AA, Core Web Vitals)
2. @qa: Implement P1 tests (all features)
3. @infrastructure: Performance audit, Lighthouse CI
4. @legal: Final legal sign-off (mentions légales, privacy policy, CGV)
5. @reviewer: Cross-review coherence audit

### Go/No-Go criteria (from roadmap.md):
- [ ] Contact form works E2E (submit → email received)
- [ ] Lighthouse: Performance >=80, Accessibility >=95, SEO >=90
- [ ] All P0 tests passing
- [ ] Legal pages published
- [ ] Umami tracking live

---

## Phase 5 — Launch & Post-Launch: NOT STARTED

**Agents to execute:** @orchestrator, @reviewer, @data-analyst, @growth, @social
**Prerequisites:** Phase 4 Go/No-Go passed

### Planned:
1. Go-live
2. @data-analyst: Verify Umami tracking in production
3. @growth: Activate referral systematization + LinkedIn organic
4. @social: First social posts (brand-story-content.md ready)
5. @reviewer: Final cross-review
6. @orchestrator: Project synthesis

---

## Multi-Session Resume Protocol

To resume in a new session:
```
Lis project-context.md et docs/orchestration-plan.md, continue où on s'est arrêté.
```

### Current state (end of Session 1):
- **Phases 0-2:** COMPLETE (25 deliverables)
- **Phase 3:** READY TO START — all prerequisites met except tracking-plan.md (in progress)
- **Next action:** Launch @fullstack for Phase 3 Sprint 1
- **Blockers to resolve with user:** Font licensing, legal entity details, email confirmation, social handles

---

## Orchestration Metrics

| Metric | Value |
|--------|-------|
| Total agents invoked | 11 unique agents |
| Total deliverables | 25 files (26 with tracking-plan) |
| Phases completed | 3/6 (0, 1, 2) |
| Blockers resolved | 5/10 |
| Hypotheses flagged | ~15 across all deliverables |
| Agent timeouts | 2 (growth, seo — both recovered via relaunch) |
| Cross-agent coherence | Validated (all agents reference project-context.md) |
