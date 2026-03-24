# Sarani — User Flows
*Produced by @ux — 2026-03-24*
*Language: English*
*Sources: project-context.md, personas.md, functional-specs.md, kpi-framework.md, brand-voice.md*

> **Purpose:** This document defines the complete user flows for sarani.studio Phase 1. Every screen is justified by a documented user need (personas.md). Every decision point maps to an Umami tracking event (kpi-framework.md). Every fallback covers edge cases from functional-specs.md.

---

## Table of Contents

1. [Navigation Architecture — Sitemap](#1-navigation-architecture--sitemap)
2. [Flow 1 — Sophie: Discovery → Contact](#2-flow-1--sophie-discovery--contact)
3. [Flow 2 — Marc: Evaluation → Contact](#3-flow-2--marc-evaluation--contact)
4. [Flow 3 — SEO Entry → Contact (no homepage context)](#4-flow-3--seo-entry--contact)
5. [Flow 4 — Retention / Expansion (existing client)](#5-flow-4--retention--expansion)
6. [Friction Analysis — Cross-Flow](#6-friction-analysis--cross-flow)
7. [Tracking Events — Decision Points Summary](#7-tracking-events--decision-points-summary)

---

## 1. Navigation Architecture — Sitemap

### 1.1 Page Hierarchy

```
sarani.studio/                    ← Homepage (US-101)
├── /work                         ← Case Study listing
│   └── /work/[slug]              ← Case Study detail (US-102)
│       ├── sony-banner-production
│       ├── geodis-presentation-rebranding
│       └── tiktok-video-production
├── /services                     ← Services overview (Phase 1)
├── /pricing                      ← Pricing transparency (US-104)
├── /about                        ← About page (Phase 1)
├── /contact                      ← Contact / Brief form (US-103)
├── /legal                        ← Legal & GDPR (US-105)
└── /privacy                      ← Privacy policy (US-105)
```

### 1.2 Primary Navigation (Header — all pages)

```
[Sarani Logo]   Work   Services   Pricing   About   [Start a project]
                                                     (flame CTA, tab-order: 6)
```

**Rationale:** "Work" first because Sophie's primary validation behavior is "show me who you've done this for." Pricing before About because Marc needs pricing to qualify. "Start a project" as CTA — not "Contact us" (too generic) — per brand-voice.md Section 4.1.

**Tab order (keyboard navigation):**
1. Logo (home link)
2. Work
3. Services
4. Pricing
5. About
6. "Start a project" CTA

**Mobile:** Logo + hamburger [≡]. Menu opens as full-screen overlay (z-index: 300, black bg). CTA "Start a project" pinned at bottom of overlay.

### 1.3 Footer Links

```
[Logo] | Work | Services | Pricing | About | Contact
team@sarani.studio  |  Legal  |  Privacy
© 2026 Sarani. All rights reserved.
```

### 1.4 Breadcrumbs

Applied on: `/work/[slug]` pages only.
Format: `Home > Work > [Case Study Name]`
Schema: BreadcrumbList JSON-LD (per metadata-templates.md).
Not required on: Homepage, /pricing, /about, /contact (single-level or terminal pages).

### 1.5 Sticky CTA

The "Start a project" CTA in the sticky header is present on ALL pages (desktop nav + mobile overlay). No additional floating CTA button — one visible CTA at a time per viewport rule (design-system.md §3).

---

## 2. Flow 1 — Sophie: Discovery → Contact

**Persona:** Sophie — Head of Marketing, enterprise. Speed-driven, referral-triggered or LinkedIn/Google-found.
**Goal:** Submit a project brief within 3 minutes of landing.
**Time-to-value target:** ≤ 3 min from entry to form submission.
**Aha moment:** Reading the Sony or TikTok case study — "they've done this for someone exactly like me."

### 2.1 Flow Diagram

```
[Entry: Google / LinkedIn / Referral link]
        |
        v
[Homepage — /]
  - Reads H1: "Enterprise-quality creative. Delivered in 24 hours."
  - Sees TikTok, Sony, GEODIS logos above fold
  - Reads proof point: "Sony Black Friday banners — same day, 155€"
        |
        +--[Bounce: doesn't recognize relevance]--> EXIT (soft bounce, tracked)
        |
        +--[Clicks "See our work" or proof card]--+
        |                                          |
        v                                          v
[Work listing — /work]              [Case Study detail — /work/[slug]]
  - Scans 3+ case study cards               |
  - Clicks most relevant case               |
        |                                   |
        v                                   v
[Case Study detail — /work/[slug]] <--------+
  - Reads brief, results, volume numbers
  - Aha moment: "they've done this at my scale"
        |
        +--[Wants more proof]--> [Another case study] --+
        |                                               |
        +--[Clicks "Start a project" CTA at page bottom]+
        |                                               |
        v                                               v
[Contact Form — /contact] <-----------------------------+
  - Fills brief (company, deliverable type, deadline, volume)
  - Sees "First project or no invoice" reassurance
  - Submits
        |
        +--[Validation error]--> [Inline error, stays on /contact]
        |
        v
[Success page / state — /contact?success=true]
  - "We received your brief. Expect a response within the hour."
  - [View our work] link (re-engagement)
        |
        v
[Email confirmation → Sophie's inbox] (async, within 1h)
```

### 2.2 Decision Points

| Step | Action | Decision | Fallback UX |
|------|--------|----------|-------------|
| Homepage | Reads H1 | Relevant → stays; Irrelevant → bounces | Social proof (logos) above fold catches "I've heard of these companies" trigger |
| Homepage | Scrolls past logos | Continues → proof section; Stops → bounce | CTA "Start a project" in sticky nav always visible |
| Work listing | Clicks case study | Enters deep dive | "See all work" link visible from homepage hero |
| Case study | Reads results | Convinced → clicks CTA; Doubts → reads more | Related case studies at bottom of each page |
| Contact form | Starts filling | Completes → submits; Abandons → exits | No forced fields beyond minimum — reduces friction |
| Contact form | Submits | Success → confirmation; Error → inline recovery | Server-side validation with specific, non-generic error messages |

### 2.3 Friction Points — Sophie Specific

| Friction | Location | Solution Applied |
|----------|----------|-----------------|
| "Can they handle my volume?" | Homepage, first 10s | Proof cards: TikTok 1,500+/month, GEODIS 5,700 slides |
| "Will they charge for revisions?" | Anywhere | "Unlimited revisions" visible in value prop section |
| "What if I send a brief at 11pm?" | Contact success | "Expect a response within the hour" — sets the reliability expectation immediately |
| "What do I have to fill in?" | Contact form | Minimum required fields. Optional fields clearly marked. |
| Time pressure — Sophie never has 20 min | Entire flow | 3-min path possible: scan hero → click case study → scan results → click CTA → submit 5 fields |

### 2.4 Metrics per Step

| Step | Umami Event | Conversion Target |
|------|-------------|-------------------|
| Homepage view | `page_view { path: "/" }` | Baseline |
| "See our work" click | `cta_click { label: "see_our_work" }` | — |
| Case study page view | `page_view { path: "/work/[slug]" }` | >40% of sessions |
| Case study scroll 50% | `scroll_depth { depth: "50" }` | >60% of case study visitors |
| Contact form open | `page_view { path: "/contact" }` | — |
| Contact form submission | `form_submit { result: "success" }` | 1–2% site-to-lead |

---

## 3. Flow 2 — Marc: Evaluation → Contact

**Persona:** Marc — Procurement Director, 45. Evaluates after Sophie has already qualified. Goal: verify cost predictability, contract viability, risk level.
**Entry:** Often Homepage → Pricing (direct navigation, not discovery).
**Goal:** Find enough information to present Sarani to procurement committee without a call.

### 3.1 Flow Diagram

```
[Entry: Sophie sends Marc the sarani.studio URL]
        |
        v
[Homepage — /]
  - Scans for indicators of enterprise legitimacy
  - Sees client roster (TikTok, Sony, GEODIS, Adidas)
  - Clicks "Pricing" in nav (not "Start a project" — Marc qualifies first)
        |
        v
[Pricing page — /pricing]
  - Reads per-project price table (5 categories)
  - Sees static banner at 150€ as entry point
  - Compares vs. Superside / network agency benchmarks (if present)
  - Looks for: unit cost, no retainer, no minimum commitment
        |
        +--[Needs references]--> [Back to homepage / Work] --+
        |                                                     |
        +--[Needs legal reassurance]----------------------+   |
        |                                                 |   |
        v                                                 v   v
[Contact Form — /contact]          [Legal page — /legal] [Work listing]
  - Marc fills: company name,
    project type, volume estimate,
    "How did you hear about us"
  - Submits brief
        |
        v
[Success state]
  - "We received your brief. Expect a response within the hour."
```

### 3.2 Decision Points

| Step | Action | Decision | Fallback UX |
|------|--------|----------|-------------|
| Homepage | Scans for enterprise signals | Legitimate → continues; Unclear → exits | Named client logos above fold are the primary legitimacy signal for Marc |
| Pricing page | Reads prices | Acceptable → considers; Too opaque → exits | Dual EUR/USD display; per-unit framing ("per banner, per slide") |
| Pricing page | Looks for contract info | Finds → contacts; Missing → searches site | Link to /legal from pricing page footer |
| Contact form | Fills fields | Submits brief OR books a call (if offered) | Form must not ask for confidential procurement data — just a brief |

### 3.3 Friction Points — Marc Specific

| Friction | Location | Solution Applied |
|----------|----------|-----------------|
| No published framework agreement | Pricing page | "Framework agreement available on request" note. Links to /contact. |
| Prices without VAT indication | Pricing page | Note: "All prices exclude VAT" (legal-audit.md requirement) |
| No visible contract terms | Pricing page | Link to /legal page; brief note on guarantee terms |
| "No minimum commitment" — needs to be explicit | Pricing page | "No retainer. No minimum commitment. Pay per project." (brand-voice.md §1.2) |
| GDPR / data processing concern | — | /privacy page accessible from footer; DPA [HYPOTHESE — @legal to confirm] |

### 3.4 Metrics per Step

| Step | Umami Event | Signal |
|------|-------------|--------|
| Pricing page view | `page_view { path: "/pricing" }` | Marc qualification signal |
| Pricing → Contact navigation | `cta_click { location: "pricing" }` | High-intent signal |
| Legal page view | `page_view { path: "/legal" }` | Marc persona proxy |
| Contact form submission | `form_submit { result: "success" }` | Lead acquired |

---

## 4. Flow 3 — SEO Entry → Contact

**Entry:** Visitor lands directly on `/work/[slug]` via Google search (e.g., "enterprise creative agency case study" or "creative agency TikTok video editing"). Has NOT seen the homepage. The case study must be self-sufficient.

### 4.1 Flow Diagram

```
[Google SERP] → [Click on case study result]
        |
        v
[Case Study detail — /work/[slug]]
  ← User has ZERO prior context about Sarani ←

  Page must provide:
  1. Who is Sarani? (logo + tagline in nav, or intro line)
  2. Is this work real? (client logo, volume numbers, results)
  3. Can they do this for me? (related case studies + CTA)
        |
        +--[Doesn't trust, needs context]--> [Homepage — /] (nav logo click)
        |
        +--[Convinced, needs pricing]--> [/pricing]
        |
        +--[Ready to contact]----> [/contact]
                                       |
                                       v
                                  [Success state]
```

### 4.2 Self-Sufficiency Requirements for Case Study Pages

Each case study page MUST contain (no homepage dependency):
- Sarani name + tagline visible in sticky nav (always present)
- Breadcrumb: "Home > Work > [Case Study]" (orientation context)
- Client logo + client name as text (credibility without brand recognition of Sarani)
- Deliverable type, volume, timeline, cost (answers: "what do they do and at what scale?")
- At least one quantified outcome ("51M views", "8,500€ total")
- "Start a project" CTA with micro-reassurance ("First project or no invoice")
- Related case studies (2 cards, lazy-loaded) — anchors the visitor in the portfolio

### 4.3 Friction Points — SEO Entry Specific

| Friction | Solution |
|----------|----------|
| "Who is Sarani? I've never heard of them." | Sticky nav with logo always visible. Brief "About Sarani" intro line in case study header or sidebar. |
| "This is one case — is this typical?" | Related case studies section (2 cards) at page bottom. |
| "I can't tell if they do what I need." | Deliverable type clearly labeled: "Video editing", "Presentations", "Banners". |
| Page feels like an orphan | Breadcrumb navigation; standard footer with all main links. |

### 4.4 Metrics per Step

| Step | Umami Event | Signal |
|------|-------------|--------|
| Case study page view (from organic) | `page_view { path: "/work/[slug]", referrer: "google.com" }` | SEO acquisition |
| Scroll 50% | `scroll_depth { depth: "50" }` | Content resonance |
| Click "Start a project" | `cta_click { location: "case_study_bottom" }` | High intent |
| Click related case study | `case_study_click { location: "related" }` | Portfolio exploration |

---

## 5. Flow 4 — Retention / Expansion (existing client)

**Trigger:** After a completed project, Sarani sends an email OR publishes a case study featuring the client. Goal: re-engagement, new brief, or referral.

### 5.1 Flow Diagram

```
[Trigger A: Post-project email]
  "Your case study is live — see how we told your story."
  [View case study →]
        |
        v
[Case Study detail — /work/[client-slug]]
  - Client reads their own case study
  - Sees quality of presentation
  - Sees related case studies (signals broader capability)
  - Clicks "Start a project" → new brief
        |
        v
[Contact Form — /contact]
  - Returning client: may recognize the form
  - "How did you hear about us?" → selects "Existing client" or "Colleague"
        |
        v
[Success state] → re-enters CRM workflow

---

[Trigger B: LinkedIn post featuring client work]
  - Client or colleague sees the post
  - Clicks through to case study or homepage
  - Standard Sophie or Marc flow applies
        |
        v
[Referral path] → standard Flow 1 or Flow 2

---

[Trigger C: Colleague referral]
  Sophie tells Marc or a colleague at another company:
  "You have to try these people."
  - Colleague visits sarani.studio directly
  - Standard Flow 1 applies
  - "How did you hear about us?" → "Colleague referral"
```

### 5.2 Retention UX Principles

- **No account, no login** — returning clients use the same contact form as new ones. Friction-free.
- **Case study as relationship asset** — the published case study is a thank-you and a proof point simultaneously.
- **No forced upsell on the site** — expansion is triggered off-site (email, LinkedIn), not on-site.
- **Referral capture** — the form field "How did you hear about us?" is mandatory (kpi-framework.md) and includes "Colleague/client referral" as an option.

---

## 6. Friction Analysis — Cross-Flow

### 6.1 Top Friction Points by Severity

| # | Friction | Affected Flows | Risk | Solution |
|---|----------|---------------|------|----------|
| 1 | Contact form too long / asks for too much | All | Abandonment before submission | Minimum required fields: name, company, email, brief summary, deadline. All else optional. |
| 2 | No visible pricing on first impression | Flow 1 (Sophie) | Bounce due to "I don't know if I can afford this" | Price anchor ("from 155€") in hero section above fold (AC-101-3) |
| 3 | Case study page feels orphaned for SEO entry | Flow 3 | Bounce without context | Self-sufficiency requirements (§4.2) |
| 4 | No indication of response time | All | Anxiety post-submission | Success state copy: "Expect a response within the hour" |
| 5 | Marc can't find contract/legal info | Flow 2 | Marc disqualifies Sarani before Sophie's project closes | /legal page linked from pricing + footer; framework agreement note |

### 6.2 Accessibility — Cross-Flow Requirements

- All interactive elements reachable via Tab key in logical order
- Focus ring visible (Flame #da5126, 2px offset) on all interactive elements
- Skip-to-main-content link as first focusable element on every page
- Form fields: `<label>` associated via `for/id` — no placeholder-only labels
- Error messages: `role="alert"` + `aria-live="polite"` for screen readers
- Navigation: `<nav role="navigation" aria-label="Main">`, `<main role="main">` on all pages

---

## 7. Tracking Events — Decision Points Summary

> For full Umami implementation specs, see docs/analytics/kpi-framework.md.
> The following table maps each flow's critical decision points to expected Umami events.

| Flow | Step | Umami Event | KPI Linked |
|------|------|-------------|------------|
| Flow 1 | Homepage → Work | `cta_click { label: "see_our_work" }` | Case study engagement rate |
| Flow 1 | Case study → Contact | `cta_click { location: "case_study_bottom" }` | Site-to-lead conversion |
| Flow 1 | Form submit success | `form_submit { result: "success" }` | Qualified inbound leads |
| Flow 2 | Homepage → Pricing | `page_view { path: "/pricing" }` | Marc persona proxy |
| Flow 2 | Pricing → Contact | `cta_click { location: "pricing" }` | High-intent signal |
| Flow 3 | SEO entry on case study | `page_view { path: "/work/[slug]" }` | SEO acquisition |
| Flow 3 | Case study → Contact | `cta_click { location: "case_study_bottom" }` | SEO-to-lead |
| Flow 4 | Email → Case study | `page_view { referrer: "email" }` | Retention engagement |
| Flow 4 | Form "source: returning" | `form_submit { source: "existing_client" }` | Expansion revenue |

### Aha Moment Distance (steps before high-value engagement)

| Persona | Entry | Steps to Aha | Steps to Form Submission |
|---------|-------|-------------|--------------------------|
| Sophie (referral) | Homepage | 1 (proof card) | 3 (homepage → case study → contact) |
| Sophie (SEO) | Case study | 0 (already on proof) | 1 (scroll to CTA) |
| Marc | Homepage | 2 (homepage → pricing → data) | 3 (homepage → pricing → contact) |

**Assessment:** All three primary paths achieve aha moment in ≤ 2 steps and form submission in ≤ 3 steps. Target met.

---

## Assumptions to Validate

- [HYPOTHESE] Email address `team@sarani.studio` is operational and monitored 24/7 for the "response within the hour" promise — not confirmed in functional-specs.md.
- [HYPOTHESE] Framework agreement documentation exists or is in preparation by @legal — referenced in Marc's flow but not yet a live document.
- [HYPOTHESE] "How did you hear about us?" field options include: Google, LinkedIn, Colleague/client referral, Existing client, Other — to be confirmed with Sarani team before launch.
- [HYPOTHESE] Post-submission response time of "within the hour" is operationally guaranteed by the 24/7 relay model — to validate with Sarani ops team.
