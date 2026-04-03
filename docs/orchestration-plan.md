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
| 3 | Development (Code) — Phase 1 Site | COMPLETE | @fullstack, @infrastructure | Phase 2 |
| 3b | Phase 2 — Autonomous Pipeline (LinkedIn + SEO + GEO) | COMPLETE | @social, @seo, @copywriter, @geo | Phase 3 |
| 3c | Phase 3 — Back-Office V1 (ClickUp + SharePoint + Evoliz + Tracker + Quotes) | COMPLETE | @fullstack, @product-manager, @infrastructure, @agent-factory | Phase 3 |
| 3d | Phase 3 — Back-Office V2 (Brief, Email Import, Quote Redesign, Sidebar) | COMPLETE | @fullstack, @product-manager, @ux, @design | Phase 3c |
| 3e | Front-Office Polish (Page consistency, Services images, Footer, Case studies) | COMPLETE | @fullstack, @design, @ux | Phase 3 |
| 3f | Back-Office V3 — Video AI Preview (Storyboard + Video) | VIDEO PROVIDERS INTEGRATED (Veo 3.1/Runway Gen-4/Kling 3.0 + fal.ai Flux.1 Pro images) | @fullstack, @ia, @qa, @infrastructure | Phase 3d |
| 3g | AI Case Study Generator (auto-scan + auto-gen) | MULTI-AGENT PIPELINE COMPLETE — 3-step LLM (creative-strategy → copywriter → social), visual suggestions SharePoint, per-channel publish, dedicated /case-studies/[slug] page, LinkedIn buffer. S15 fixes : pipeline 404 model→claude-sonnet-4-latest, 409 race condition candidates, pipeline status display, source param | @fullstack, @creative-strategy, @ia | Phase 3d |
| 3h | Landing Page Generator | LLM INTEGRATED | @fullstack, @design, @ia | Phase 3d |
| 3i | Project Presentation Link / Share Link | COMPLETE — S15 fixes : video playback root cause (mimeType fallback), comment badges by itemId, asset dedup by itemId, multi-folder selection, TikTok folder matching (stripNumberPrefix + Projects subfolder), cleanEmailSubject for matching, auto-refresh on link creation | @fullstack, @product-manager, @qa | Phase 3d |
| 3j | Arya (@client-manager) — Agent + Protocols + Capabilities | COMPLETE — agent 311 lignes, 10 protocoles, 12 AI templates, quality gates, inbox UI, asset review, search, knowledge bases | @agent-factory, @fullstack, @product-manager, @elon, @ia | Phase 3d |
| 3k | Arya V2 — Closure + Star + Knowledge + Reviews + Webhooks + Auto-Brief + Auto-Quote | COMPLETE (~98%) — DB, star score, closures page, email scan, review pipeline, webhooks ClickUp/Lark, auto-brief with modals, auto-quote with finalize, purpose-of-work pre-fill, save-draft on quotes. Manque : Lark bot activation (Thomas config manuelle) | @fullstack, @product-manager, @elon, @qa | Phase 3j |
| 4 | QA & Pre-Launch | IN PROGRESS (~75%) — 80 unit tests, CI pipeline complete, security RBAC, rate limits, Zod. Manque : Lighthouse CI, visual regression, E2E LLM integration tests | @qa, @infrastructure, @legal | Phase 3k |
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

### Blockers resolved (Session 1 continued):
- [x] Font: Galano Grotesque → **Outfit** (Google Fonts, free, OFL license)
- [x] Legal entity: SARANI SAS, SIREN 881687503, SIRET 88168750300022, TVA FR76881687503, 4 rue des Artisans 25300 Arçon
- [x] Email: **team@sarani.studio** (confirmed)
- [x] Founder story: NO individualization — About page focuses on team, not Thomas
- [x] LinkedIn: https://www.linkedin.com/company/sarani-studio/
- [x] Instagram: https://www.instagram.com/sarani.studio

### Blockers remaining:
- [ ] Twitter/X handle confirmation (for twitter:site meta tag)
- [ ] Galano Grotesque → Outfit migration validated in brand-voice.md references

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

## Phase 3f — Back-Office V3 — Video AI Preview: NOT STARTED

**Agents to execute:** @fullstack, @ia, @infrastructure, @qa
**Prerequisites:** Phase 3d COMPLETE (DONE) + 5 hypothèses validées par Thomas (H-01 à H-05 dans docs/product/video-ai-specs.md)

### Specs de référence
- `docs/product/video-ai-specs.md` — specs complètes (user stories, architecture, UI/UX, risques)

### Planned sequence (3 sessions):

**Session A — Routes API + intégration PiAPI + stockage :**
- @ia : Prompt engineering `videoScene → Kling text-to-video prompt`, choix du mode Standard/Pro, abstraction `VideoGenerationProvider`
- @fullstack : 6 routes API (`/generate`, `/status`, `/regenerate`, `/assemble`, `/share`, `/preview/[token]`), intégration PiAPI, stockage SharePoint

**Session B — UI back-office + assemblage FFmpeg + page partage public :**
- @fullstack : Grille scènes + player modal + modal partage + watermark FFmpeg + page `/preview/[token]`
- @infrastructure : Config FFmpeg Replit, env vars PiAPI key, monitoring coût IA

**Session C — Tests E2E (parallélisable avec Session B) :**
- @qa : Tests génération scène, polling statut, régénération, assemblage, expiration lien, approbation client

### Go/No-Go criteria:
- [ ] `POST /api/video-preview/generate` retourne un job_id, génération parallèle toutes les scènes
- [ ] Page `/preview/[token]` accessible sans auth, Approve/Request changes fonctionnels
- [ ] Assemblage FFmpeg produit un MP4 valide avec watermark
- [ ] Lien expiré retourne message correct (pas de 500)
- [ ] Coût estimé affiché avant toute génération (US-VA-07)

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
