# Sarani -- QA Strategy
*Produced by @qa -- 2026-03-24*
*Language: English*
*Sources: functional-specs.md, backlog.md, roadmap.md, kpi-framework.md, brand-voice.md, design-tokens.json*

> **Scope:** Phase 1 (US-101 through US-106). This document defines acceptance criteria audit, E2E critical path scenarios, test matrix, testing infrastructure recommendations, and priority/risk classification. Every scenario is designed to be directly translatable into Playwright or Vitest code by @fullstack.

---

## Table of Contents

1. [Section 1: Acceptance Criteria Audit](#section-1-acceptance-criteria-audit)
2. [Section 2: E2E Test Scenarios -- Critical Paths](#section-2-e2e-test-scenarios--critical-paths)
3. [Section 3: Test Matrix](#section-3-test-matrix)
4. [Section 4: Testing Infrastructure](#section-4-testing-infrastructure)
5. [Section 5: Priority & Risk](#section-5-priority--risk)

---

## Section 1: Acceptance Criteria Audit

For each Phase 1 user story (US-101 to US-106), every acceptance criterion is evaluated for: automatic testability, tool recommendation, and clarity. Criteria that are too vague or untestable are flagged with a proposed reformulation.

### US-101 -- Homepage Enterprise Positioning (6 criteria)

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-101-1 | Enterprise logos above fold on desktop | Yes | Playwright | -- | -- |
| AC-101-2 | H1 max 15 words, correct font, min font-size | Yes | Playwright | Font-family check requires computed style assertion; fragile if font fails to load | Add fallback assertion: verify computed font-family includes "Galano" OR verify a known fallback scenario is documented |
| AC-101-3 | D+1 claim + price anchor + client proof above fold | Yes | Playwright | -- | -- |
| AC-101-4 | Core Web Vitals (LCP <2.5s, CLS <0.1, INP <200ms, Perf >=80) | Yes | Lighthouse CI | -- | -- |
| AC-101-5 | Umami page_view fires, no console errors, no third-party cookies | Partially | Playwright | Cookie assertion is hard to make deterministic in CI (cookies may come from Replit infra, not Umami) | Reformulate: "No cookies with a domain matching the Umami tracker origin are set as third-party" |
| AC-101-6 | "Start a project" CTA visible above fold on all viewports 320-1536px | Yes | Playwright | -- | -- |

**Verdict: 6 criteria, all testable. 1 partial (AC-101-5 cookie check). 0 missing.**

### US-102 -- Case Study Pages (6 criteria)

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-102-1 | Min 3 case studies live, each returns HTTP 200, linked from /work | Yes | Playwright | -- | -- |
| AC-102-2 | Each case study has client name, deliverable type, volume, turnaround, quantified outcome | Yes | Playwright | "none of these fields are empty or placeholder text" -- need to define what counts as placeholder | Add assertion: none of the 5 fields contain "TBD", "Lorem", "placeholder", or empty string |
| AC-102-3 | Case studies accessible in 1 click from homepage | Yes | Playwright | -- | -- |
| AC-102-4 | Umami scroll_depth at 50% and 100%, no duplicate events | Partially | Playwright | Verifying "no duplicate events" requires intercepting Umami network calls and counting -- complex but feasible | No reformulation needed; test via `page.route()` interception counting POST calls to Umami endpoint |
| AC-102-5 | Contact CTA at bottom of each case study | Yes | Playwright | -- | -- |
| AC-102-6 | Logo graceful degradation (no broken icon, layout holds) | Yes | Playwright | -- | -- |

**Verdict: 6 criteria, all testable. 1 complex (AC-102-4 event dedup). 0 missing.**

### US-103 -- Contact / Brief Form (6 criteria) -- CRITICAL

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-103-1 | Form accessible in max 2 clicks from any page | Yes | Playwright | -- | -- |
| AC-103-2 | All required/optional fields present with exact labels and placeholders | Yes | Playwright | -- | -- |
| AC-103-3 | Successful submission: button "Sending...", success message replaces form, confirmation email within 5 min, form_submit fires, no URL change | Partially | Playwright + Vitest | "Confirmation email sent within 5 minutes" is not testable in Playwright alone -- requires email service mock or mailbox check | Split into: (a) Playwright E2E verifies UI success state + Umami event (testable). (b) Vitest integration test on /api/contact verifies email service is called with correct payload (testable via mock). (c) Email delivery SLA (5 min) is an operational metric, not an automated test -- monitor via email service dashboard post-launch. |
| AC-103-4 | Validation errors inline, no modal, focus to first error, error color #da5126, form_submit does NOT fire | Yes | Playwright | -- | -- |
| AC-103-5 | Mobile: 44px touch targets, native selects, textarea auto-expand, full-width submit, no horizontal overflow at 320px | Yes | Playwright | -- | -- |
| AC-103-6 | Umami events: form_view (on viewport entry), form_start (once per session), form_submit (on HTTP 200 only) | Partially | Playwright | form_view via IntersectionObserver is timing-sensitive in CI; form_start "once per session" requires multi-interaction assertion | Test via network interception: count Umami POST calls per event name during a controlled interaction sequence |

**Verdict: 6 criteria, all testable (2 partially -- email delivery and Umami timing). 0 missing. Recommendation: add an explicit criterion for server-side validation (AC-103-7 equivalent from EC-103-7).**

> **ESCALATION to @product-manager:** The functional specs define EC-103-7 (server-side validation of select values via curl injection) but it is not listed as an acceptance criterion. It should be promoted to AC-103-7 because server-side validation is a security requirement, not just an edge case. Proposed AC-103-7:
> ```
> Given an attacker sends a POST to /api/contact with a "Company size" value not in the allowed list,
> When the server processes the request,
> Then the API returns HTTP 400 and the submission is rejected.
> ```

### US-104 -- Pricing Transparency Page (5 criteria)

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-104-1 | Min 3 service types with fixed prices, no form gate | Yes | Playwright | -- | -- |
| AC-104-2 | Savings comparison visible + guarantee visible above fold on desktop | Yes | Playwright | -- | -- |
| AC-104-3 | "No retainer. No minimum commitment." + "Unlimited revisions" visible above fold | Yes | Playwright | -- | -- |
| AC-104-4 | "Start a project" CTA with #da5126 bg, links to /contact | Yes | Playwright | -- | -- |
| AC-104-5 | Umami page_view fires, no cookies, no console errors | Yes | Playwright | Same cookie caveat as AC-101-5 | Same reformulation as AC-101-5 |

**Verdict: 5 criteria, all testable. 0 missing. Note: only 5 criteria (below the 3-minimum threshold but adequate for a static page). Recommendation: add a 6th criterion for 320px viewport no-overflow (currently only an edge case EC-104-2, should be an AC for consistency with other pages).**

### US-105 -- Legal & GDPR Page (5 criteria)

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-105-1 | Company registration, address, VAT visible, no "TBD" | Yes | Playwright | -- | -- |
| AC-105-2 | Privacy policy mentions: data collected, processing countries, retention, deletion rights | Partially | Playwright | "Mentions" is testable by text search, but content correctness (GDPR compliance) is not automatable | Automated test: verify presence of keywords ("data collected", "retention", "deletion", "transfer"). Legal accuracy: requires @legal sign-off (process gate, not automated test). |
| AC-105-3 | DPA available on request, email address visible | Yes | Playwright | -- | -- |
| AC-105-4 | "Legal & Privacy" link in footer on ALL pages | Yes | Playwright | -- | -- |
| AC-105-5 | @legal sign-off before deployment | No | Process | This is a process/governance criterion, not an automated test | Not reformulable as automated test. Implement as: CI pipeline checks for `docs/reviews/legal-signoff.md` file existence before production deploy. If missing, deploy is blocked. |

**Verdict: 5 criteria, 4 testable, 1 process-only (AC-105-5). 0 too vague. Recommendation: add criterion for JS-disabled rendering (currently EC-105-3 only).**

### US-106 -- SEO Technical Foundation (6 criteria)

| AC ID | Criterion Summary | Testable? | Tool | Problem | Reformulation |
|-------|-------------------|-----------|------|---------|---------------|
| AC-106-1 | All pages have unique title + meta description, keyword-relevant, correct lengths | Yes | Playwright | -- | -- |
| AC-106-2 | /sitemap.xml returns 200, contains all page URLs, referenced in robots.txt | Yes | Playwright + Vitest | "Submitted to Google Search Console" is a manual action, not automatable | Automated: verify sitemap exists, correct content-type, contains expected URLs, referenced in robots.txt. Manual: GSC submission is a post-launch task (document in TESTING.md). |
| AC-106-3 | robots.txt returns 200, allows /, disallows /api/*, includes Sitemap line | Yes | Playwright | -- | -- |
| AC-106-4 | Organization schema JSON-LD on homepage, valid structure | Yes | Vitest + Playwright | -- | -- |
| AC-106-5 | All images have non-empty, non-generic alt attributes | Yes | Playwright + axe-core | -- | -- |
| AC-106-6 | Lighthouse SEO >=90, Performance >=80, no blocking SEO issues, canonical URLs set | Yes | Lighthouse CI | -- | -- |

**Verdict: 6 criteria, all testable (1 has a manual component -- GSC submission). 0 too vague.**

### Audit Summary

| US | Total Criteria | Fully Testable | Partially Testable | Not Automatable | Min 3 Met? |
|----|---------------|----------------|-------------------|-----------------|------------|
| US-101 | 6 | 5 | 1 (AC-101-5) | 0 | Yes |
| US-102 | 6 | 5 | 1 (AC-102-4) | 0 | Yes |
| US-103 | 6 | 4 | 2 (AC-103-3, AC-103-6) | 0 | Yes |
| US-104 | 5 | 5 | 0 | 0 | Yes |
| US-105 | 5 | 4 | 0 | 1 (AC-105-5) | Yes |
| US-106 | 6 | 5 | 1 (AC-106-2) | 0 | Yes |
| **Total** | **34** | **28** | **5** | **1** | **All pass** |

**Key findings:**
1. All 34 criteria meet the minimum testability bar -- no criterion is too vague to write a test for.
2. 1 criterion (AC-105-5) is a process gate, not automatable -- recommend CI file-existence check as proxy.
3. Email delivery (AC-103-3) cannot be verified E2E -- recommend Vitest mock + operational monitoring.
4. Umami event assertions (AC-101-5, AC-102-4, AC-103-6) require network interception -- complex but feasible in Playwright.
5. **Proposed additions:** AC-103-7 (server-side validation), AC-104-6 (320px viewport), AC-105-6 (JS-disabled rendering).

---

## Section 2: E2E Test Scenarios -- Critical Paths

These 3 scenarios map to the causal chain: Sophie/Marc enters the site -> builds trust -> submits a brief. Each scenario includes detailed steps, assertions, Umami event expectations, and unhappy paths. All scenarios are designed for direct Playwright implementation.

### Scenario 1: Sophie Discovers -> Contacts

**Path:** Homepage -> Case Study -> Contact Form -> Success
**Persona:** Sophie (Head of Marketing, enterprise)
**Business value:** This is THE conversion funnel. If this path breaks, revenue is zero.

#### Happy Path

| Step | User Action | URL | Assertion | Umami Event |
|------|-------------|-----|-----------|-------------|
| 1 | Sophie lands on homepage | `/` | H1 visible, contains <=15 words. Client logos (TikTok, Sony, GEODIS, Adidas) visible in viewport. "Start a project" CTA visible with bg #da5126. | `page_view { path: "/" }` |
| 2 | Sophie sees proof points, clicks a case study teaser card (e.g. GEODIS) | `/` -> `/case-studies/geodis-presentation-rebranding` | Navigation occurs in 1 click. Target page returns HTTP 200. | `case_study_click { client: "geodis", location: "homepage_teaser" }` |
| 3 | Sophie reads the case study page | `/case-studies/geodis-presentation-rebranding` | All 5 required fields visible: client name "GEODIS", deliverable type, volume "5,700 slides", turnaround "3 weeks", quantified outcome "8,500EUR". None are empty or placeholder. | `page_view { path: "/case-studies/geodis-..." }` |
| 4 | Sophie scrolls to 50% of page | Same | Scroll depth fires once | `scroll_depth { depth: "50", page: "geodis-..." }` |
| 5 | Sophie scrolls to bottom, sees CTA | Same | "Start a project" button visible at bottom, bg #da5126, links to /contact. Micro-reassurance text visible. | `scroll_depth { depth: "100", page: "geodis-..." }` |
| 6 | Sophie clicks "Start a project" CTA at bottom of case study | `/contact` | Contact form page loads. Form is visible in viewport without scrolling on desktop. | `cta_click { location: "case_study_bottom", client: "geodis" }`, then `page_view { path: "/contact" }` |
| 7 | Form enters viewport | `/contact` | Form element is in the DOM with all required fields visible. | `form_view { page: "/contact" }` |
| 8 | Sophie fills name field ("Sophie Martin") | `/contact` | Input accepts text, no error shown | `form_start { page: "/contact" }` (fires once on first interaction) |
| 9 | Sophie fills all required fields: name, company ("TikTok"), email ("sophie@tiktok.com"), brief ("We need 50 banners..."), company size ("500M EUR+"), attribution ("Referral") | `/contact` | All fields populated. No validation errors visible. Submit button enabled with text "Send my brief". | -- |
| 10 | Sophie clicks "Send my brief" | `/contact` | Button text changes to "Sending...", button is disabled. | -- |
| 11 | Server responds HTTP 200 | `/contact` | Form is replaced by success message: "Got it. Expect a response within the hour -- usually faster." URL does NOT change. No redirect. | `form_submit { company_size: "500M EUR+", attribution: "Referral" }` |

#### Unhappy Path 1: Network Error During Form Submission

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1-9 | Same as happy path steps 1-9 | Same |
| 10 | Sophie clicks "Send my brief" (API route intercepted, returns 500) | Button shows "Sending..." then error banner appears: "That didn't go through. Try again -- or email us directly: hello@sarani.studio". Form data is NOT cleared. Submit button re-enables. `form_submit` does NOT fire. `form_error { error_type: "server_error" }` fires. |

#### Unhappy Path 2: Validation Errors

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1-6 | Same as happy path steps 1-6 | Same |
| 7 | Sophie clicks "Send my brief" with empty name and invalid email "not-an-email" | Inline error below name: "This field is required." Inline error below email: "Check that email address -- it doesn't look right." Error color is #da5126. No modal. Focus moves to first error field (name). Form does NOT submit. `form_submit` does NOT fire. |

#### Unhappy Path 3: Rate Limiting

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1-11 | Sophie submits form successfully 3 times (with different data each time) | All 3 succeed |
| 12 | Sophie submits a 4th time within 1 hour | Server returns HTTP 429. Error banner shown (same generic error message -- does not reveal rate limit). Form data preserved. |

---

### Scenario 2: Marc Evaluates Pricing

**Path:** Homepage -> Pricing -> Contact Form -> Success
**Persona:** Marc (Procurement Director, enterprise)
**Business value:** Marc removes the procurement blocker. If pricing is unclear or contact form fails, the deal stalls.

#### Happy Path

| Step | User Action | URL | Assertion | Umami Event |
|------|-------------|-----|-----------|-------------|
| 1 | Marc lands on homepage | `/` | H1, logos, CTA visible. Navigation includes "Pricing" link. | `page_view { path: "/" }` |
| 2 | Marc clicks "Pricing" in navigation | `/pricing` | Page loads HTTP 200. | `page_view { path: "/pricing" }` |
| 3 | Marc sees pricing page content | `/pricing` | Min 3 service types with fixed prices visible (banner from 155EUR, video from 360EUR, presentation). No price requires form/login. "No retainer. No minimum commitment." visible. "Unlimited revisions" visible. Guarantee "First project satisfaction or no invoice." visible above fold on desktop. | -- |
| 4 | Marc sees comparison section | `/pricing` | Comparison table visible: Sarani vs "Network agency" or "Traditional agency". Sarani column shows lower prices. "Up to 60% savings" text present. | -- |
| 5 | Marc scrolls to 50% | `/pricing` | -- | `scroll_depth { depth: "50", page: "pricing" }` |
| 6 | Marc scrolls to 100% | `/pricing` | -- | `scroll_depth { depth: "100", page: "pricing" }` |
| 7 | Marc clicks "Start a project" CTA on pricing page | `/contact` | Contact form loads. | `cta_click { location: "pricing_page", label: "start_a_project" }`, then `page_view { path: "/contact" }` |
| 8-12 | Marc fills and submits form (same as Scenario 1, steps 7-11, with company size "500M EUR+" and attribution "Search") | `/contact` | Same assertions as Scenario 1. Success message displayed. | `form_view`, `form_start`, `form_submit { company_size: "500M EUR+", attribution: "Search" }` |

#### Unhappy Path 1: Pricing Page on 320px Mobile

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1 | Marc loads /pricing on a 320px viewport | No horizontal overflow: `document.body.scrollWidth === 320`. Pricing cards stack vertically. Comparison table collapses to stacked blocks. All prices remain readable. CTA button full-width. |

#### Unhappy Path 2: Network Timeout on Form Submit

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1-7 | Same as happy path | Same |
| 8 | Marc fills form and clicks submit (API response delayed 20s, exceeds 15s timeout) | After 15s: error banner appears with server error message. Form data is NOT cleared. Submit button re-enables. |

---

### Scenario 3: SEO Entry via Case Study

**Path:** Case Study page (direct entry from search) -> Contact Form -> Success
**Persona:** Sophie (arriving via organic search, no homepage visit)
**Business value:** Validates that the site converts even without the homepage funnel -- critical for SEO ROI.

#### Happy Path

| Step | User Action | URL | Assertion | Umami Event |
|------|-------------|-----|-----------|-------------|
| 1 | Sophie lands directly on a case study from Google | `/case-studies/tiktok-video-production` | Page returns HTTP 200. H1 present. Client name "TikTok" visible. All 5 required fields present (client, deliverable, volume, turnaround, outcome). Navigation bar is present with all links. | `page_view { path: "/case-studies/tiktok-..." }` |
| 2 | Sophie checks meta tags (automated, not user action) | Same | `<title>` is unique, <=60 chars, contains keyword. `<meta description>` is unique, 120-160 chars. `<link rel="canonical">` present with absolute URL. | -- |
| 3 | Sophie scrolls through case study | Same | All sections render. Stat cards visible. Gallery lazy-loads. | `scroll_depth { depth: "50" }`, `scroll_depth { depth: "100" }` |
| 4 | Sophie clicks "Start a project" at bottom | `/contact` | Form page loads. | `cta_click { location: "case_study_bottom", client: "tiktok" }` |
| 5-9 | Sophie fills and submits form (same as Scenario 1, steps 7-11) | `/contact` | Success message displayed. | `form_view`, `form_start`, `form_submit` |

#### Unhappy Path 1: Non-Existent Case Study Slug (404)

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1 | Sophie lands on `/case-studies/nonexistent-slug` | HTTP 404 returned. Custom not-found page renders: H1 "This page doesn't exist." Body includes "But we do. 35 experts ready to work on your next project." "Start a project" CTA present. "Back to homepage" link present. |

#### Unhappy Path 2: JavaScript Disabled

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1 | Sophie loads case study page with JS disabled | Page renders fully (SSG). H1, client name, all 5 required fields visible in DOM. CTA button present and functional (links to /contact). Scroll depth tracking does NOT fire (acceptable). |

#### Unhappy Path 3: Case Study Hero Image Fails

| Step | User Action | Assertion |
|------|-------------|-----------|
| 1 | Sophie loads case study page; hero image request is intercepted and aborted | Layout does not break. Placeholder bg #171717 shown. No broken image icon. CLS < 0.1. All text content and CTA remain fully visible and functional. |

---

## Section 3: Test Matrix

Each cell describes what is tested. Empty cells (--) mean that test type is not applicable for that feature.

### Feature x Test Type Matrix

| Feature | Unit (Vitest) | Integration (Vitest) | E2E (Playwright) | Visual Regression | Accessibility (axe-core) | Performance (Lighthouse CI) |
|---------|--------------|---------------------|-------------------|-------------------|--------------------------|----------------------------|
| **US-101 Homepage** | H1 word count <=15 (text validation util) | -- | Logos above fold, CTA visible, proof cards render, navigation links work, 320px no-overflow | Screenshot: hero section desktop + mobile, logo strip, proof cards | axe-core scan: all images have alt, CTA has accessible name, heading hierarchy, color contrast | LCP <2.5s, CLS <0.1, INP <200ms, Perf >=80, page weight <1MB |
| **US-102 Case Studies** | Case study data schema validation (all 5 required fields non-empty per BR-102-1) | -- | 3 case studies return 200, required fields visible, 1-click from homepage, scroll depth events fire, CTA at bottom, 404 slug renders not-found | Screenshot: case study hero + stat cards desktop, mobile layout | axe-core: images alt text, heading hierarchy, CTA accessible name, link purpose | LCP <2.5s, hero image <200KB, total page <1.5MB |
| **US-103 Contact Form** | /api/contact route: valid submission returns 200, missing fields return 400, invalid email returns 400, invalid select values return 400, rate limit returns 429 | Email service called on success (mock), notification sent to team inbox (mock), file upload validation (10MB limit, accepted types) | Full form happy path (fill + submit + success msg), validation errors inline, mobile 320px, duplicate submit prevention, network timeout error state, Umami events (form_view/form_start/form_submit) | Screenshot: form default state, validation error state, success state, server error state | axe-core: all fields have labels, errors linked via aria-describedby, focus management on error, 44px touch targets | Form FCP <500ms, API p95 <2s |
| **US-104 Pricing** | Price data format validation (EUR convention "155EUR" not "EUR155") | -- | Min 3 services with prices visible, comparison table present, guarantee text exact match, CTA present, 320px no-overflow | Screenshot: pricing grid desktop + mobile, comparison table | axe-core: heading hierarchy, color contrast on price cards, CTA accessible | LCP <2.5s, page weight <500KB |
| **US-105 Legal** | -- | -- | Company registration fields not "TBD", privacy keywords present, DPA mention + email, footer link on ALL pages (iterate all routes), 404 renders correctly | -- | axe-core: heading hierarchy, ToC links, text readability | Page weight <100KB, LCP <1.5s |
| **US-106 SEO Foundation** | JSON-LD Organization schema structure validation, robots.txt content validation | Sitemap contains all expected URLs, no duplicate meta descriptions across pages | All pages have unique title + meta description, /sitemap.xml returns 200 with correct content-type, /robots.txt returns 200, canonical URLs on all pages, all images have descriptive alt | -- | axe-core full site scan: all images alt, heading structure, landmark regions | Lighthouse SEO >=90, Perf >=80, Accessibility >=85 |

### Cross-Cutting Components

| Component | Unit (Vitest) | E2E (Playwright) | Visual Regression | Accessibility |
|-----------|--------------|-------------------|-------------------|---------------|
| `<Navigation>` | -- | Sticky on scroll, hamburger on mobile opens full-screen overlay, all links navigate correctly, "Start a project" CTA present | Screenshot: desktop nav, mobile hamburger open/closed | Keyboard navigation, focus trap in mobile menu, aria-expanded on hamburger |
| `<Footer>` | -- | "Legal & Privacy" link present on every page, email visible, all nav links work | Screenshot: desktop footer | Link purpose, landmark role |
| `<CTAButton>` | Props validation (label, href, variant) | Click navigates to /contact | Screenshot: primary + secondary variants | Accessible name, focus visible, contrast ratio |
| `<ScrollDepthTracker>` | useRef dedup logic (fires once per depth per load) | Events fire at 50% and 100%, no duplicates on same load | -- | -- |
| `<ErrorInline>` | Error message rendering for each validation type | Visible below field, correct color | Screenshot: error state | aria-describedby linked to field, color not sole indicator |

---

## Section 4: Testing Infrastructure

### 4.1 Test Stack

| Layer | Tool | Version | Purpose |
|-------|------|---------|---------|
| Unit + Integration | Vitest | latest | React component tests (with @testing-library/react), API route tests, utility function tests, JSON-LD validation |
| E2E | Playwright | latest | Full user journey tests, cross-browser, cross-viewport, network interception for Umami/API mocking |
| Accessibility | @axe-core/playwright | latest | WCAG 2.1 AA automated checks integrated into Playwright tests |
| Performance | @lhci/cli (Lighthouse CI) | latest | Core Web Vitals, SEO score, Accessibility score -- runs in CI on every deployment |
| Visual Regression | Playwright built-in screenshots | -- | `page.screenshot()` + `expect(screenshot).toMatchSnapshot()` with configurable threshold. No external tool needed for Phase 1. |
| Mocking | msw (Mock Service Worker) | latest | Mock email service (Resend), Umami endpoint, external APIs in Vitest integration tests |

**Installation commands:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test @axe-core/playwright
npm install -D @lhci/cli
npm install -D msw
npx playwright install --with-deps chromium firefox webkit
```

### 4.2 Configuration Files

**vitest.config.ts** -- key settings:
- `environment: 'jsdom'` for React component tests
- `environment: 'node'` for API route tests (use `environmentMatchGlobs`)
- `coverage.thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 }` on critical paths (src/app/api/*, src/components/ContactForm/*)
- `setupFiles: ['./tests/setup.ts']` for @testing-library/jest-dom matchers

**playwright.config.ts** -- key settings:
- `projects`: Chromium (desktop 1280x720), Firefox (desktop), WebKit (desktop), Mobile Chrome (375x667), Mobile Safari (375x667), Mobile minimum (320x568)
- `timeout: 30000` (30s per test)
- `expect.timeout: 10000` (10s per assertion)
- `retries: 1` in CI (flaky test mitigation -- see Section 5)
- `use.baseURL`: from environment variable `BASE_URL` (defaults to `http://localhost:3000`)
- `webServer`: start Next.js dev server before tests (`npm run dev`, port 3000, reuseExistingServer in CI)

### 4.3 CI Pipeline

**Pipeline stages (GitHub Actions):**

```
Trigger: push to any branch, pull request to main

Stage 1: Lint (parallel with Stage 2)
  - ESLint + TypeScript type check
  - ~1 min

Stage 2: Unit + Integration Tests (parallel with Stage 1)
  - vitest run --coverage
  - Coverage report uploaded as artifact
  - Fail if coverage < 80% on critical paths
  - ~2 min

Stage 3: Build (depends on Stage 1 + 2)
  - next build
  - Bundle size check (fail if > 1MB initial load)
  - ~3 min

Stage 4: E2E Tests (depends on Stage 3)
  - Playwright tests against built app (next start)
  - 6 browser/viewport projects in parallel (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, 320px)
  - Screenshots compared against baselines
  - axe-core accessibility checks
  - ~4 min

Stage 5: Lighthouse CI (depends on Stage 3, parallel with Stage 4)
  - Runs against built app
  - Assertions:
    - Performance >= 80
    - Accessibility >= 95
    - SEO >= 90
    - Best Practices >= 90
  - Fail pipeline if any threshold breached
  - ~2 min

Total estimated pipeline time: ~6 minutes (well under 10-minute target)
```

**Pre-commit hooks (Husky + lint-staged):**
- `*.ts,*.tsx`: ESLint fix + Prettier
- `src/app/api/**`: run related Vitest tests (`vitest related`)
- `src/components/ContactForm/**`: run related Vitest tests
- No E2E on pre-commit (too slow)

### 4.4 Lighthouse CI Thresholds

| Metric | Threshold | Page(s) | Rationale |
|--------|-----------|---------|-----------|
| Performance | >= 80 | All | AC-101-4, AC-106-6 |
| Accessibility | >= 95 | All | WCAG 2.1 AA is a go-live requirement; 95 leaves room for Lighthouse-specific items that may not be WCAG violations |
| SEO | >= 90 | All | AC-106-6 |
| Best Practices | >= 90 | All | Catches HTTPS, console errors, deprecated APIs |
| LCP | < 2.5s | Homepage, Case Studies | AC-101-4 |
| LCP | < 3.0s | All (mobile 4G) | AC-106 performance constraints |
| CLS | < 0.1 | All | AC-101-4 |
| INP | < 200ms | All | AC-101-4 |

### 4.5 Visual Regression Strategy

**Approach:** Playwright built-in `toMatchSnapshot()` with PNG comparison.

**Baseline pages (13 screenshots per update cycle):**
1. Homepage -- desktop 1280px
2. Homepage -- mobile 375px
3. Homepage -- minimum 320px
4. Case study (GEODIS) -- desktop
5. Case study (GEODIS) -- mobile
6. Contact form -- default state desktop
7. Contact form -- validation error state
8. Contact form -- success state
9. Contact form -- mobile
10. Pricing page -- desktop
11. Pricing page -- mobile
12. Legal page -- desktop
13. 404 page -- desktop

**Threshold:** `maxDiffPixelRatio: 0.01` (1% pixel difference allowed for anti-aliasing).
**Update process:** `npx playwright test --update-snapshots` after intentional visual changes. Snapshots committed to git.

---

## Section 5: Priority & Risk

### P0 -- Blocks Go-Live (must pass before W4 deploy)

These tests, if failing, mean the site cannot ship. A single P0 failure = no production deployment.

| Test | Type | Why P0 | Linked AC |
|------|------|--------|-----------|
| Contact form E2E happy path (fill, submit, success message) | E2E Playwright | The ONLY digital conversion point. Broken form = zero leads = zero revenue. | AC-103-1 to AC-103-6 |
| Contact form /api/contact server-side validation | Unit Vitest | Invalid data reaching the inbox = garbage leads. Injection attacks if no server validation. | AC-103-4, EC-103-7 |
| Contact form mobile (320px-767px) | E2E Playwright | Sophie uses mobile. If form doesn't work on mobile, 40-60% of traffic cannot convert. | AC-103-5 |
| Contact form rate limiting | Integration Vitest | No rate limit = spam flood = real leads buried. | EC-103-2 (BR-103-3) |
| WCAG 2.1 AA compliance (axe-core on all pages) | E2E Playwright + axe-core | Enterprise clients have accessibility requirements. Failing WCAG may be a deal-breaker for Marc's procurement. | Cross-cutting |
| Core Web Vitals: LCP <2.5s, CLS <0.1 | Lighthouse CI | Google ranking signal. Poor CWV = lower organic traffic = fewer Sophies. | AC-101-4, AC-106-6 |
| Lighthouse SEO score >= 90 | Lighthouse CI | SEO foundation is a Phase 1 must-have. Score < 90 means technical SEO issues that block organic discovery. | AC-106-6 |
| Footer "Legal & Privacy" link on ALL pages | E2E Playwright | Marc cannot complete vendor due diligence without this. Missing link = blocked enterprise deal. | AC-105-4 |
| /sitemap.xml exists and contains all pages | E2E Playwright | Without sitemap, Google cannot index the site. Blocks organic discovery entirely. | AC-106-2 |
| robots.txt allows crawling, references sitemap | E2E Playwright | Misconfigured robots.txt can deindex the entire site. | AC-106-3 |

### P1 -- Must Be Done by W4 (can be fixed after initial deploy to staging, but before production go-live)

| Test | Type | Why P1 | Linked AC |
|------|------|--------|-----------|
| Homepage enterprise logos above fold | E2E Playwright | Social proof is critical for Sophie's first 10 seconds. Missing logos = higher bounce rate. | AC-101-1 |
| Homepage H1 word count and CTA visibility | E2E Playwright | Value proposition clarity. Too long = Sophie doesn't read it. | AC-101-2, AC-101-6 |
| Case study pages: 3 live, all required fields present | E2E Playwright | Trust-building step. Missing case studies = Sophie can't validate Sarani's claims. | AC-102-1, AC-102-2 |
| Case study 1-click access from homepage | E2E Playwright | Funnel continuity. Extra clicks = drop-off. | AC-102-3 |
| Pricing page: min 3 services with prices, guarantee text | E2E Playwright | Marc's evaluation path. Missing prices = deal stalls. | AC-104-1, AC-104-2, AC-104-3 |
| Unique meta title + description per page, no duplicates | E2E Playwright | Duplicate meta tags = Google confusion = poor ranking. | AC-106-1 |
| Organization schema JSON-LD validation | Unit Vitest | Invalid schema = missed rich results in search. | AC-106-4 |
| All images have descriptive alt text | E2E Playwright + axe-core | SEO + accessibility requirement. Generic alt = penalty. | AC-106-5 |
| Canonical URLs on all pages | E2E Playwright | Prevents duplicate content penalties. | AC-106-6 |
| Umami form events (form_view, form_start, form_submit) | E2E Playwright | Without these events, KPI measurement is blind. Cannot validate funnel conversion. | AC-103-6 |
| Contact form validation error states (inline, no modal, focus) | E2E Playwright | Bad error UX = Sophie abandons form. | AC-103-4 |
| Legal page: no "TBD" placeholder content | E2E Playwright | "TBD" on legal page = unprofessional for enterprise. | AC-105-1 |
| Visual regression baselines (13 screenshots) | E2E Playwright | Establishes the visual baseline. Without it, no regression detection post-launch. | Cross-cutting |

### P2 -- Post-Launch (can be completed W5-W6, does not block go-live)

| Test | Type | Why P2 | Linked AC |
|------|------|--------|-----------|
| Umami page_view events on all pages | E2E Playwright | Analytics nice-to-have for launch week. Missing pageviews are detectable manually. | AC-101-5, AC-104-5 |
| Umami scroll_depth events on case studies and pricing | E2E Playwright | Engagement metrics. Important but not blocking revenue. | AC-102-4, AC-104 tracking |
| Cross-browser tests (Firefox, WebKit) | E2E Playwright | Chromium covers ~65% of enterprise users. Firefox/WebKit are important but lower risk. | Cross-cutting |
| JS-disabled rendering on all pages | E2E Playwright | Edge case. SSG/SSR means pages should render without JS, but <5% of enterprise users disable JS. | EC-101-1, EC-102-1, EC-103-1 |
| Case study hero image failure graceful degradation | E2E Playwright | Edge case. Images rarely fail. Layout should hold but this is defensive. | AC-102-6, EC-102-3 |
| Client logo failure graceful degradation on homepage | E2E Playwright | Same rationale as above. | EC-101-3 |
| Umami script blocked by ad-blocker resilience | E2E Playwright | Verifies page works without analytics. Low risk since Umami is self-hosted (rarely blocked). | EC-101-4, EC-103-6 |
| 404 page custom not-found rendering | E2E Playwright | Important for UX but not blocking conversion. | EC-102-2 |
| Contact form file upload edge cases (>10MB, wrong type) | E2E Playwright + Unit Vitest | File attachment is optional. Edge cases are low frequency. | EC-103-3 |
| Contact form network timeout (15s) handling | E2E Playwright | Rare edge case. Important for robustness but not blocking launch. | EC-103-4 |
| Privacy policy content keyword verification | E2E Playwright | Content should be checked by @legal. Automated keyword check is supplementary. | AC-105-2 |
| Bundle size monitoring (< 1MB homepage) | CI check | Important for long-term performance but initial build is controlled. | Performance constraints |
| Lighthouse Best Practices >= 90 | Lighthouse CI | Supplementary quality signal. | Cross-cutting |

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Contact form /api/contact has no server-side validation at launch | Medium | Critical | P0 unit test on /api/contact. Flag to @fullstack: client-side validation is UX only, server-side is security. |
| Umami instance not running at go-live | Medium | High | @infrastructure must confirm Umami is live before W4. If not, all tracking events are lost. Recommend: health check endpoint in CI. |
| Replit deployment causes different performance profile than local | High | Medium | Lighthouse CI must run against Replit staging URL, not localhost. Configure `BASE_URL` env var in CI. |
| Visual regression screenshots differ between CI and local (font rendering) | High | Low | Use Docker-based CI environment with consistent font rendering. Accept `maxDiffPixelRatio: 0.01`. Update baselines from CI, not local. |
| Legal page shipped with "TBD" placeholders | Medium | High | P1 Playwright test that scans for forbidden strings ("TBD", "placeholder", "coming soon") on /legal. |
| Flaky E2E tests from Umami event timing | High | Medium | Umami event tests use `page.waitForResponse()` with explicit URL match, not timing-based waits. Mark known flaky tests with `// FLAKY:` tag and isolate in separate test file. |
| No @legal sign-off before W4 | Medium | Critical | CI file-existence check for `docs/reviews/legal-signoff.md`. Pipeline blocks production deploy if missing. Escalate to @product-manager at W3 if not received. |

---

**Handoff -> @infrastructure**
- Files produced: `/home/user/Sarani/docs/qa/qa-strategy.md`
- Decisions taken:
  - Test stack: Vitest + Playwright + axe-core + Lighthouse CI + msw (no Jest, no Cypress)
  - 6 browser/viewport projects in Playwright (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, 320px minimum)
  - Lighthouse CI thresholds: Performance >=80, Accessibility >=95, SEO >=90, Best Practices >=90
  - Visual regression via Playwright built-in screenshots (no Percy/Chromatic -- overkill for Phase 1)
  - Coverage threshold 80% on critical paths (src/app/api/*, src/components/ContactForm/*)
  - Pipeline target: <6 minutes total (lint + unit + build + E2E + Lighthouse in parallel where possible)
  - 1 retry in CI for flaky test mitigation
- Points of attention:
  - Umami self-hosted instance MUST be running before E2E tests that verify tracking events can pass
  - `BASE_URL` environment variable required in CI for Playwright and Lighthouse to target correct environment
  - Playwright browsers must be installed in CI (`npx playwright install --with-deps`)
  - Docker-based CI recommended for consistent font rendering in visual regression tests
  - `docs/reviews/legal-signoff.md` file-existence check should be added to production deploy gate
