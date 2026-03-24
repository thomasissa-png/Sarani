# Sarani — Product Backlog
*Produced by @product-manager — 2026-03-24*
*Language: English*

---

## 1. Backlog Overview

| ID | Story Title | Persona | Phase | Priority | Linked KPI |
|---|---|---|---|---|---|
| US-101 | Homepage enterprise positioning | Sophie | 1 | Must Have | Site-to-lead conversion rate |
| US-102 | Case study pages with proof data | Sophie | 1 | Must Have | Case study engagement rate |
| US-103 | Contact / brief submission form | Sophie | 1 | Must Have | Qualified inbound leads |
| US-104 | Pricing transparency page | Marc | 1 | Must Have | Contact form quality score |
| US-105 | Legal & GDPR information page | Marc | 1 | Must Have | Contact form quality score |
| US-106 | SEO technical foundation | Sophie / Marc | 1 | Must Have | Organic sessions/month |
| US-201 | LinkedIn discovery via post | Sophie | 2 | Should Have | Monthly organic leads |
| US-202 | SEO blog article discovery | Sophie | 2 | Should Have | Organic sessions/month |
| US-203 | Autonomous LinkedIn publishing pipeline | Sarani Team | 2 | Should Have | LinkedIn post frequency KPI |
| US-204 | Autonomous SEO article publishing pipeline | Sarani Team | 2 | Should Have | Organic sessions/month |
| US-301 | Project tracking dashboard (ClickUp sync) | Sarani Team | 3 | Could Have | Internal coordination time |
| US-302 | Invoice & quote generation (Evoliz sync) | Sarani Team | 3 | Could Have | Zero missed invoices |
| US-303 | Translation review AI agent | Sarani Team | 3 | Could Have | Translation review cycle time |
| US-304 | Creative strategist AI agent | Sarani Team | 3 | Could Have | Internal coordination time |
| US-305 | Client deck generator | Sarani Team | 3 | Could Have | Deck generation time |

---

## 2. User Stories — Phase 1: Showcase Website

#### US-101: Homepage enterprise positioning
**Story:** As Sophie, visiting sarani.studio for the first time, I want to understand Sarani's positioning and see proof of enterprise-scale work in under 10 seconds, so that I don't bounce and start reading.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Site-to-lead conversion rate (target: 1-2%)
**Acceptance Criteria:**
- [ ] Named enterprise client logos (TikTok, Sony, GEODIS, Adidas) visible above the fold on desktop without scrolling
- [ ] D+1 delivery claim visible with at least one quantified proof (e.g., "Sony: same-day banners") above the fold
- [ ] Fixed price example (e.g., "Banner from 155€") visible before fold break
- [ ] Value proposition readable in under 10 seconds (max 15 words headline)
- [ ] Page passes Core Web Vitals (LCP < 2.5s, CLS < 0.1) on mobile and desktop
- [ ] Umami page view tracking active on homepage

---

#### US-102: Case study pages with quantified results
**Story:** As Sophie, evaluating whether Sarani can handle my volume and speed, I want to read detailed case studies with specific numbers (assets delivered, turnaround time, client name), so that I can trust Sarani before submitting a brief.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Case study engagement rate (target: >40% of visitors view at least one case study)
**Acceptance Criteria:**
- [ ] At minimum 3 case studies live at launch: Sony (same-day banners), GEODIS (5,700 slides / 3 weeks), TikTok (1,500+ edits/month)
- [ ] Each case study contains: client name, deliverable type, volume, turnaround time, one quantified outcome
- [ ] Case study pages accessible from homepage in max 1 click
- [ ] Umami scroll depth events firing at 50% and 100% on each case study page
- [ ] Client logo usage confirmed with written approval before deployment (Open Question #2 from product-vision.md)
- [ ] Contact CTA visible at bottom of each case study page

---

#### US-103: Contact and brief submission form
**Story:** As Sophie, ready to test Sarani with a real brief, I want to submit my project details in under 3 minutes without creating an account, so that I get a response the same day.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Qualified inbound leads (target: 5 new enterprise accounts/month)
**Acceptance Criteria:**
- [ ] Form accessible in max 2 clicks from any page on the site
- [ ] Required fields: name, company, email, brief description, timeline
- [ ] Mandatory field: "Company size" dropdown (options include ">500M€ revenue" tier)
- [ ] Mandatory field: "How did you first hear about Sarani?" (free text — referral attribution)
- [ ] Optional field: file attachment for creative brief or reference assets
- [ ] Umami goal events active: `form_view`, `form_start`, `form_submit`
- [ ] Form submission triggers confirmation email to prospect within 5 minutes (automated)
- [ ] No login, no account creation required
- [ ] Form renders and submits correctly on mobile (iOS Safari, Android Chrome)
- [ ] Edge case: duplicate submission prevention (disable submit button after first click)
- [ ] Edge case: form validation messages in English, no silent failures

---

#### US-104: Pricing transparency page
**Story:** As Marc, evaluating Sarani as a potential vendor, I want to see published pricing with clear per-asset or per-project rates, so that I can benchmark Sarani against our incumbent agency without needing a discovery call.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Pricing page visit rate (target: >20% of sessions include pricing page visit)
**Acceptance Criteria:**
- [ ] Pricing page lists at minimum 3 service types with example fixed prices (banner, video edit, presentation)
- [ ] Comparison against traditional agency pricing is explicit (e.g., "vs. 500–2,000€ at network agencies")
- [ ] "No minimum commitment" and "unlimited revisions included" are stated clearly
- [ ] "First project or no invoice" guarantee is visible and explained
- [ ] No contact-gate before pricing is visible (prices are public, not hidden behind a form)
- [ ] CTA to contact form is present on pricing page
- [ ] Umami page view tracking active on pricing page

---

#### US-105: Legal and GDPR information page
**Story:** As Marc, responsible for vendor compliance, I want to find Sarani's legal information, data processing details, and contract terms without asking, so that I can complete my vendor due diligence independently.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Contact form quality score (proxy: enterprise-size submissions)
**Acceptance Criteria:**
- [ ] Legal page includes: company registration details, registered address, VAT number
- [ ] Privacy policy addresses data processing locations (team on 5 continents — GDPR implications)
- [ ] Data processing agreement (DPA) available on request or downloadable
- [ ] Page references framework agreement availability for enterprise accounts
- [ ] Content validated by @legal agent before deployment
- [ ] Page linked from site footer on all pages

---

#### US-106: SEO technical foundation
**Story:** As a potential Sophie who has never heard of Sarani, I want to find the site when searching for "enterprise creative agency fast delivery" or similar queries, so that Sarani appears before I default to a known incumbent.
**Phase:** 1
**Priority:** Must Have
**Linked KPI:** Organic sessions/month (baseline to be set post-launch)
**Acceptance Criteria:**
- [ ] All pages have unique, keyword-optimized `<title>` and `<meta description>` tags
- [ ] `sitemap.xml` generated and submitted to Google Search Console
- [ ] `robots.txt` configured correctly (no critical pages blocked)
- [ ] Structured data (Organization schema) implemented on homepage
- [ ] Canonical URLs set on all pages to prevent duplicate content
- [ ] All images have descriptive `alt` attributes
- [ ] Page slugs are human-readable and keyword-relevant (e.g., `/case-studies/tiktok-video-production`)
- [ ] Site loads in under 3 seconds on 4G mobile (Lighthouse performance score >80)

---

## 3. User Stories — Phase 2: Autonomous Social & SEO

#### US-201: LinkedIn discovery by Sophie
**Story:** As Sophie, scrolling LinkedIn on a Wednesday morning, I want to encounter a Sarani post that directly addresses a pain I have today (deadline pressure, revision cost, volume capacity), so that I visit the site and submit a brief.
**Phase:** 2
**Priority:** Should Have
**Linked KPI:** Monthly organic leads from LinkedIn (baseline post-Phase 1)
**Acceptance Criteria:**
- [ ] LinkedIn posts are published at minimum 3x per week on the Sarani company page
- [ ] Each post references at least one quantified proof point (client name, number, timeframe)
- [ ] Posts are written in Sophie's vocabulary (see personas.md: "EOD", "24h turnaround", "no extra charge for revisions")
- [ ] Each post includes a CTA linking to a relevant case study or the contact form (UTM-tagged per convention in kpi-framework.md)
- [ ] Engagement rate per post tracked manually or via LinkedIn Analytics (likes + comments / impressions)

---

#### US-202: SEO blog article discovery
**Story:** As Sophie, searching Google for "enterprise creative agency unlimited revisions" or "agency 24h delivery large volume", I want to find a Sarani article that answers my question precisely, so that Sarani gains authority before I even know the brand.
**Phase:** 2
**Priority:** Should Have
**Linked KPI:** Organic sessions/month, case study engagement rate
**Acceptance Criteria:**
- [ ] Minimum 2 SEO articles published per month targeting enterprise buyer keywords
- [ ] Each article targets a primary keyword with >100 monthly searches and <60 keyword difficulty
- [ ] Articles are minimum 1,200 words with a clear H1, H2 structure, and internal links to case studies and contact form
- [ ] Articles pass a readability check (Flesch score >60 or equivalent)
- [ ] Umami page view tracking active on all blog pages
- [ ] Articles are indexed by Google within 7 days of publication (Search Console monitoring)

---

#### US-203: Autonomous LinkedIn publishing pipeline
**Story:** As the Sarani internal team, I want LinkedIn posts to be produced, scheduled, and published by AI agents without any human in the production loop, so that the team's time is 100% on client delivery.
**Phase:** 2
**Priority:** Should Have
**Linked KPI:** LinkedIn post frequency (target: 3-5 posts/week); Monthly organic leads
**Acceptance Criteria:**
- [ ] Agent pipeline produces a draft batch of 5 posts per week from a brief input (topic, case study reference, target frustration)
- [ ] Posts are scheduled via LinkedIn API or an approved scheduling tool (e.g., Buffer, Later)
- [ ] Brand voice guardrails document (from @copywriter) is embedded as a system prompt constraint before Phase 2 launch
- [ ] A 24h lightweight review window is available (not mandatory production — a human CAN review but is not required)
- [ ] If a post fails to publish (API error), the system logs the failure and retries once within 2 hours
- [ ] Edge case: agent must not publish if brand voice guardrail file is missing or empty

---

#### US-204: Autonomous SEO article publishing pipeline
**Story:** As the Sarani internal team, I want SEO articles to be researched, written, and published to the blog by AI agents without human writing effort, so that organic content compounds without operational cost.
**Phase:** 2
**Priority:** Should Have
**Linked KPI:** Organic sessions/month (target growth curve to be defined after Phase 1 baseline)
**Acceptance Criteria:**
- [ ] Agent pipeline produces a full draft article (1,200+ words, H1/H2 structure, internal links) from a keyword brief input
- [ ] Article is published to the Next.js blog section via CMS or direct file creation
- [ ] Each published article automatically generates an updated `sitemap.xml` entry
- [ ] Factual claims in articles must reference existing Sarani case study data — agent must not invent client names, numbers, or results
- [ ] Edge case: if keyword brief is missing or ambiguous, agent outputs a clarification request rather than publishing a generic article

---

## 4. User Stories — Phase 3: Internal Back-Office

#### US-301: Project tracking dashboard with ClickUp sync
**Story:** As a Sarani client manager, I want to see all active project statuses, deadlines, and assignees in one dashboard without switching between tools, so that I can answer a client status question in under 30 seconds.
**Phase:** 3
**Priority:** Could Have
**Linked KPI:** Internal coordination time reduction (baseline survey before launch)
**Acceptance Criteria:**
- [ ] Dashboard displays all active ClickUp tasks: project name, status, assignee, deadline
- [ ] Data refreshes every 15 minutes from ClickUp API (or on-demand refresh button)
- [ ] Internal-only access: no public URL, authentication required
- [ ] Graceful degradation: if ClickUp API is unavailable, dashboard shows last cached state with a timestamp and "API unavailable" notice
- [ ] Edge case: ClickUp API rate limit hit → queue requests, do not crash the dashboard

---

#### US-302: Invoice and quote generation with Evoliz sync
**Story:** As a Sarani account manager, I want to generate a client invoice or quote from the back-office without opening Evoliz directly, so that billing is never delayed by tool-switching friction.
**Phase:** 3
**Priority:** Could Have
**Linked KPI:** Zero missed invoices per month
**Acceptance Criteria:**
- [ ] Back-office form allows creation of invoice/quote: client name, project, line items, amounts
- [ ] On submit, data is pushed to Evoliz API and a draft invoice/quote is created in Evoliz
- [ ] Confirmation of successful creation shown in the back-office UI within 10 seconds
- [ ] Invoice list view shows billing status per client (paid / pending / overdue) pulled from Evoliz
- [ ] Graceful degradation: if Evoliz API fails, back-office shows error with a direct link to Evoliz web app for manual entry
- [ ] Edge case: duplicate invoice prevention (warn if an invoice for the same client + project already exists in the current month)

---

#### US-303: Translation review AI agent
**Story:** As a Sarani translator or project manager, I want to submit a translated document and receive a structured review (consistency, terminology, brand voice across 18 languages) from an AI agent, so that human QA time is cut by 50%.
**Phase:** 3
**Priority:** Could Have
**Linked KPI:** Translation review cycle time (target: <1 hour per document review)
**Acceptance Criteria:**
- [ ] Agent accepts document input (paste text or upload .docx / .txt)
- [ ] Agent returns a structured review: flagged inconsistencies, suggested corrections, brand terminology violations
- [ ] Agent operates in the source language and target language simultaneously (bilingual review output)
- [ ] Review output is exportable as a .txt or .docx comment file
- [ ] Agent references a brand terminology glossary (to be provided by Sarani team before deployment)
- [ ] Edge case: if glossary file is missing, agent flags this and requests it before processing

---

#### US-304: Creative strategist AI agent
**Story:** As a Sarani creative director or account manager, I want to input a client brief and receive creative direction suggestions, mood board references, and competitive context from an AI agent, so that I spend my time refining ideas rather than generating them.
**Phase:** 3
**Priority:** Could Have
**Linked KPI:** Internal coordination time reduction
**Acceptance Criteria:**
- [ ] Agent accepts brief input: client name, campaign objective, target audience, formats needed, tone keywords
- [ ] Agent outputs: 3 creative direction options (each with headline, mood descriptor, 3 visual reference suggestions), 2-3 competitor campaign references (with reasoning)
- [ ] Output is formatted for direct sharing with a client (clean, no internal jargon)
- [ ] Agent does not fabricate client names or claim competitor data as fact — all references are framed as "inspiration" or "benchmark"
- [ ] Edge case: if brief input is fewer than 50 words, agent asks for more detail rather than producing a low-quality output

---

#### US-305: Client presentation deck generator
**Story:** As a Sarani client manager, I want to generate a branded client presentation from a brief input in under 5 minutes, so that I spend my time on the relationship, not on formatting.
**Phase:** 3
**Priority:** Could Have
**Linked KPI:** Deck generation time (target: <5 minutes from brief to shareable link)
**Acceptance Criteria:**
- [ ] Agent accepts brief input: client name, campaign/project overview, key deliverables, timeline, Sarani team contact
- [ ] Agent generates a presentation following the Sarani branded template (colors, fonts, logo placement defined by @design)
- [ ] Output is a shareable link (Google Slides, Canva, or equivalent) — not a manual download
- [ ] Deck includes minimum: cover slide, project overview, deliverables list, timeline, next steps, contact slide
- [ ] Generation completes in under 5 minutes from brief submission
- [ ] Edge case: if branded template is unavailable or corrupted, agent outputs an error and links to the template source for manual recovery

---

## 5. Technical Constraints

| Constraint | Details | Impacted Stories |
|---|---|---|
| **Deployment** | Replit — all phases. No Docker, no custom server config outside Replit | All |
| **Frontend** | Next.js — SSR/SSG for SEO-critical pages (Phase 1), API routes for form submission | US-101 to US-106 |
| **Analytics** | Umami self-hosted — no Google Analytics, no third-party cookies | US-101, US-102, US-103, US-104 |
| **ClickUp API** | Rate limits apply. Auth via API token (stored as Replit secret). Read-only scope sufficient for Phase 3a | US-301 |
| **Evoliz API** | Read + Write scope required. Confirm API key availability before Phase 3 sprint (Open Question #5) | US-302 |
| **LinkedIn API** | Publishing via LinkedIn API requires OAuth 2.0 app approval (1-4 week approval window). Plan ahead. | US-203 |
| **AI agents (Phase 2-3)** | All agent calls must have timeout handling (max 30s) and fallback error states. No blocking UI awaiting LLM response. | US-203, US-204, US-303, US-304, US-305 |
| **AI development** | All code produced by AI agents — no human developer review. @qa smoke test required before every Phase 1 deployment. | All |

---

## 6. Open Questions

1. **Client logo approvals (blocks US-102):** Which named clients (TikTok, Sony, GEODIS, Adidas) have given explicit written approval for logo and case study use on the public site? This is a hard blocker for Phase 1 launch.
2. **Current site stack (impacts Phase 1 effort):** What is the current sarani.studio built on? Greenfield Next.js build or migration from an existing CMS?
3. **LinkedIn account ownership (blocks US-203):** Who controls the Sarani LinkedIn company page? What is the current follower count and posting frequency (Phase 2 baseline)?
4. **Evoliz API key (blocks US-302):** Is an Evoliz API key available and is billing data current and clean enough for integration?
5. **Phase 3 build order (US-303 vs US-305):** Is the translation review agent or the deck generator the higher-priority Phase 3 feature? Determines sprint sequencing.
6. **Pricing page decision (impacts US-104):** Confirmed approach is open pricing (not gated). Sarani team to validate this is aligned with current commercial strategy before dev starts.
7. **Brand voice guardrail document:** @copywriter must deliver this before Phase 2 agent pipeline goes live (US-203, US-204). What is the agreed timeline?

---

**Handoff → @data-analyst**
- Files produced: `/home/user/Sarani/docs/product/backlog.md`
- Decisions taken:
  - 15 user stories across 3 phases, all mapped to KPIs from kpi-framework.md
  - Phase 1 (6 stories) = Must Have — blocks all other phases
  - Phase 2 (4 stories) = Should Have — requires @copywriter brand voice doc before launch
  - Phase 3 (5 stories) = Could Have — requires ClickUp and Evoliz API access confirmation
  - All Phase 3 AI agent stories include graceful degradation requirements (no hard API dependencies)
  - Contact form includes two mandatory analytics fields (company size + attribution source) as specified in kpi-framework.md
- Points of attention:
  - Verify KPI coverage per story — particularly Phase 2 stories where organic lead baselines are not yet defined
  - US-102 is hard-blocked by client logo approval (Open Question #1)
  - US-203 is hard-blocked by LinkedIn API OAuth approval timeline (plan 1-4 weeks ahead)
  - @fullstack should treat US-103 (contact form) as the single most critical component — any bug here kills the lead pipeline
  - @qa smoke test checklist required before Phase 1 deployment (product-vision.md Risk 1)
  - @copywriter brand voice document required before Phase 2 agent content goes live (product-vision.md Risk 3)
