# Sarani — Umami Tracking Plan
*Produced by @data-analyst — 2026-03-24*
*Language: English*
*Sources: user-flows.md, kpi-framework.md, functional-specs.md*
*Analytics tool: Umami (self-hosted, privacy-first, no cookies)*

---

## 1. Event Taxonomy

### 1.1 Naming Convention

**Format:** `object_action` — all lowercase, underscore separator.

| Object | Action | Example |
|--------|--------|---------|
| `page` | `view` | `page_view` (automatic in Umami) |
| `cta` | `click` | `cta_click` |
| `case_study` | `click` | `case_study_click` |
| `scroll` | `depth` | `scroll_depth` |
| `form` | `view` / `start` / `submit` / `error` | `form_view`, `form_start`, `form_submit`, `form_error` |
| `logo` | `click` | `logo_click` |
| `nav` | `click` | `nav_click` |
| `engagement` | *(section-based)* | `engagement` |

### 1.2 Standard Properties (all manual events)

Every manual `umami.track()` call MUST include these properties where applicable:

| Property | Type | Values | Required |
|----------|------|---------|----------|
| `page` | string | Path string e.g. `"/"`, `"/work/sony-banner-production"` | Always |
| `referrer` | string | From `document.referrer` — pass `"direct"` if empty | On page-level events |
| `device` | string | `"desktop"` / `"mobile"` / `"tablet"` — derive from `window.innerWidth` | Always |

**Privacy rule:** Never pass PII (name, email, company name) in event properties. `company_size` and `attribution` (categorical values from dropdowns) are the only form fields permitted in event properties.

---

## 2. Complete Event Map

### Flow 1 — Sophie: Discovery → Contact

| Flow | Step | Event Name | Trigger | Properties | KPI Linked |
|------|------|------------|---------|------------|------------|
| Flow 1 | Homepage loads | `page_view` (auto) | Page load | `path: "/"` | Site-to-lead (denominator) |
| Flow 1 | Scroll 50% homepage | `scroll_depth` | IntersectionObserver / scroll listener | `{ depth: "50", page: "homepage", device }` | Bounce rate proxy |
| Flow 1 | Scroll 100% homepage | `scroll_depth` | Scroll listener | `{ depth: "100", page: "homepage", device }` | Full engagement signal |
| Flow 1 | Click "See our work" | `cta_click` | onClick | `{ location: "hero", label: "see_our_work", page: "/", device }` | Case study engagement rate |
| Flow 1 | Click "Start a project" (hero) | `cta_click` | onClick | `{ location: "hero", label: "start_a_project", page: "/", device }` | Site-to-lead conversion |
| Flow 1 | Click proof card / case study teaser | `case_study_click` | onClick | `{ client: "[name]", location: "homepage_teaser", page: "/", device }` | Case study engagement rate |
| Flow 1 | Click client logo | `logo_click` | onClick | `{ client: "[name]", page: "/", device }` | Engagement proxy |
| Flow 1 | /work listing loads | `page_view` (auto) | Page load | `path: "/work"` | Case study engagement rate |
| Flow 1 | Click case study card from /work | `case_study_click` | onClick | `{ client: "[name]", location: "work_listing", slug: "[slug]", page: "/work", device }` | Case study engagement rate |
| Flow 1 | Case study page loads | `page_view` (auto) | Page load | `path: "/work/[slug]"` | Case study engagement rate |
| Flow 1 | Scroll 50% case study | `scroll_depth` | IntersectionObserver | `{ depth: "50", page: "[slug]", device }` | Time-on-page proxy |
| Flow 1 | Scroll 100% case study | `scroll_depth` | Scroll listener | `{ depth: "100", page: "[slug]", device }` | Full engagement signal |
| Flow 1 | Click "Start a project" (case study bottom) | `cta_click` | onClick | `{ location: "case_study_bottom", client: "[name]", page: "/work/[slug]", device }` | Site-to-lead conversion |
| Flow 1 | Click related case study | `case_study_click` | onClick | `{ client: "[name]", location: "related_section", page: "/work/[slug]", device }` | Portfolio exploration |
| Flow 1 | Contact page loads | `page_view` (auto) | Page load | `path: "/contact"` | Site-to-lead (funnel entry) |
| Flow 1 | Form enters viewport | `form_view` | IntersectionObserver | `{ page: "/contact", device }` | Form funnel start |
| Flow 1 | First field interaction | `form_start` | First `focus`/`input` (once per session) | `{ page: "/contact", device }` | Form engagement rate |
| Flow 1 | Successful form submit (HTTP 200) | `form_submit` | After HTTP 200 from `/api/contact` | `{ company_size: "[value]", attribution: "[value]", page: "/contact", device }` | Qualified inbound leads |
| Flow 1 | Form server error | `form_error` | After non-200 response | `{ error_type: "server_error", page: "/contact", device }` | Diagnostic / ops |
| Flow 1 | File too large error | `form_error` | Client validation | `{ error_type: "file_too_large", page: "/contact", device }` | Diagnostic |

### Flow 2 — Marc: Evaluation → Contact

| Flow | Step | Event Name | Trigger | Properties | KPI Linked |
|------|------|------------|---------|------------|------------|
| Flow 2 | Pricing page loads | `page_view` (auto) | Page load | `path: "/pricing"` | Pricing page visit rate / Marc persona |
| Flow 2 | Scroll 50% pricing | `scroll_depth` | Scroll listener | `{ depth: "50", page: "pricing", device }` | Marc engagement proxy |
| Flow 2 | Scroll 100% pricing | `scroll_depth` | Scroll listener | `{ depth: "100", page: "pricing", device }` | Full pricing read |
| Flow 2 | Click pricing comparison table | `engagement` | onClick / visible | `{ section: "pricing_comparison", page: "/pricing", device }` | Marc persona validation |
| Flow 2 | Click "Start a project" (pricing) | `cta_click` | onClick | `{ location: "pricing_page", label: "start_a_project", page: "/pricing", device }` | High-intent signal |
| Flow 2 | Legal page loads | `page_view` (auto) | Page load | `path: "/legal"` | Marc persona validation proxy |
| Flow 2 | Scroll 50% legal | `scroll_depth` | Scroll listener | `{ depth: "50", page: "legal", device }` | Due diligence engagement |
| Flow 2 | Scroll 100% legal | `scroll_depth` | Scroll listener | `{ depth: "100", page: "legal", device }` | Full compliance read |
| Flow 2 | Nav click (any item) | `nav_click` | onClick on nav links | `{ label: "[nav_item]", page: "[current_path]", device }` | Journey mapping |
| Flow 2 | Contact form submit (from pricing path) | `form_submit` | After HTTP 200 | `{ company_size: "[value]", attribution: "[value]", page: "/contact", device }` | Qualified inbound leads |

### Flow 3 — SEO Entry → Contact

| Flow | Step | Event Name | Trigger | Properties | KPI Linked |
|------|------|------------|---------|------------|------------|
| Flow 3 | Case study page loads (organic) | `page_view` (auto) | Page load | `path: "/work/[slug]"` | SEO acquisition (Umami referrer = google.com) |
| Flow 3 | Scroll 50% case study (SEO entry) | `scroll_depth` | IntersectionObserver | `{ depth: "50", page: "[slug]", device }` | Content resonance (SEO) |
| Flow 3 | Click "Start a project" (SEO entry) | `cta_click` | onClick | `{ location: "case_study_bottom", client: "[name]", page: "/work/[slug]", device }` | SEO-to-lead |
| Flow 3 | Click related case study | `case_study_click` | onClick | `{ client: "[name]", location: "related", page: "/work/[slug]", device }` | Portfolio exploration |
| Flow 3 | Nav logo click → Homepage | `nav_click` | onClick | `{ label: "logo_home", page: "/work/[slug]", device }` | Context-seeking behaviour |
| Flow 3 | Breadcrumb click → /work | `nav_click` | onClick | `{ label: "breadcrumb_work", page: "/work/[slug]", device }` | Navigation pattern |

### Flow 4 — Retention / Expansion

| Flow | Step | Event Name | Trigger | Properties | KPI Linked |
|------|------|------------|---------|------------|------------|
| Flow 4 | Case study loads (email referrer) | `page_view` (auto) | Page load | `path: "/work/[slug]"` — Umami referrer = email domain | Retention engagement |
| Flow 4 | Scroll 100% case study (existing client) | `scroll_depth` | Scroll listener | `{ depth: "100", page: "[slug]", device }` | Client satisfaction signal |
| Flow 4 | Click "Start a project" (returning client) | `cta_click` | onClick | `{ location: "case_study_bottom", client: "[name]", page: "/work/[slug]", device }` | Expansion revenue signal |
| Flow 4 | Form submit (returning/referral client) | `form_submit` | After HTTP 200 | `{ company_size: "[value]", attribution: "existing_client", page: "/contact", device }` | Expansion / referral revenue |

---

## 3. Funnel Events (Ordered)

The conversion funnel for Sarani, from first touch to qualified lead:

| Step | Event | Type | Notes |
|------|-------|------|-------|
| 1 | `page_view` path=`/` | Auto | Funnel entry — denominator for site-to-lead |
| 2 | `case_study_click` | Manual | First engagement signal |
| 3 | `page_view` path=`/work/[slug]` | Auto | Case study view — Sophie's aha moment |
| 4 | `scroll_depth` depth=`50` | Manual | Reading confirmation |
| 5 | `cta_click` location=`case_study_bottom` | Manual | Intent signal — click to contact |
| 6 | `page_view` path=`/contact` | Auto | Contact page view |
| 7 | `form_view` | Manual | Form enters viewport |
| 8 | `form_start` | Manual | First field interaction — committed |
| 9 | `form_submit` | Manual | HTTP 200 confirmed — qualified lead |

**Drop-off analysis:** compare session counts step by step. The gaps between steps 1→3, 5→7, and 8→9 are the highest-leverage optimisation points.

---

## 4. Coverage Audit

### 4.1 KPI Coverage — Every KPI Has an Event

| KPI (from kpi-framework.md) | Covering Event(s) | Status |
|-----------------------------|-------------------|--------|
| Site-to-lead conversion rate | `page_view /` (denom) + `form_submit` (numer) | COVERED |
| Case study engagement rate | `page_view /work/[slug]` ÷ `page_view /` | COVERED |
| Time on case study pages | `scroll_depth` 50% + 100% on `/work/[slug]` (proxy) | COVERED |
| Qualified inbound leads | `form_submit { company_size, attribution }` | COVERED |
| Contact form quality score | `form_submit.company_size` value (categorical) | COVERED |
| Referral source attribution | `form_submit.attribution` + Umami referrer | COVERED |
| Pricing page visit rate | `page_view /pricing` ÷ total sessions | COVERED |
| Organic sessions/month | Umami traffic source = organic (automatic) | COVERED |
| Return visitor rate | Umami session tracking by anonymous ID (automatic) | COVERED |

### 4.2 User Flow Decision Points Coverage

| Flow | Decision Point | Event | Status |
|------|---------------|-------|--------|
| Flow 1 | Homepage — stays vs. bounces | `scroll_depth 50 homepage` | COVERED |
| Flow 1 | Homepage → Work listing | `cta_click see_our_work` | COVERED |
| Flow 1 | Case study — convinced vs. doubts | `scroll_depth 100 [slug]` | COVERED |
| Flow 1 | Case study → Contact | `cta_click case_study_bottom` | COVERED |
| Flow 1 | Form — completes vs. abandons | `form_start` fired but no `form_submit` = abandonment | COVERED |
| Flow 1 | Form — success vs. error | `form_submit` / `form_error` | COVERED |
| Flow 2 | Homepage → Pricing (Marc entry) | `page_view /pricing` | COVERED |
| Flow 2 | Pricing → needs legal reassurance | `page_view /legal` | COVERED |
| Flow 2 | Pricing → Contact | `cta_click pricing_page` | COVERED |
| Flow 3 | SEO entry — context-seeking | `nav_click logo_home` | COVERED |
| Flow 3 | SEO entry → convinced | `scroll_depth 50` on case study | COVERED |
| Flow 3 | SEO entry → Contact | `cta_click case_study_bottom` | COVERED |
| Flow 4 | Existing client → new brief | `form_submit attribution=existing_client` | COVERED |

### 4.3 Consistency with functional-specs.md

All events defined in functional-specs.md US-101 through US-105 are present in this tracking plan. No event names conflict. Two additions made here (not in specs) are fully compatible:

| Added event | Reason | Compatible? |
|-------------|--------|-------------|
| `nav_click` | Journey mapping for Flow 2/3 — breadcrumb and logo navigation | Yes — no spec conflict |
| `form_error { error_type: "file_too_large" }` | Diagnostic event documented in US-103 spec | Already in spec — included for completeness |

### 4.4 Gaps Identified

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| About page (`/about`) has no custom events | Low — not on critical funnel path | Add `page_view` (auto) + `scroll_depth 50` if /about is added to Phase 1 scope |
| Form abandonment (field-level) | Medium — cannot identify which field causes drop | Not possible in Umami without custom per-field events. Add `form_field_blur { field: "[name]" }` as Phase 2 enhancement if abandonment rate is high |
| Return visitor identification | Medium — Umami uses anonymous session IDs, no cross-session identity | Cannot be solved without cookies. Use "Multi-visit before contact" as proxy via session count analysis in Umami dashboard |
| LinkedIn traffic source granularity | Low — Umami groups under "social" unless UTM tags present | Enforce UTM convention from kpi-framework.md Section 3.6 on all LinkedIn posts |

---

## 5. Implementation Guide for @fullstack

### 5.1 Umami Script Setup (Next.js)

Install or load the Umami tracker script in `_app.tsx` or `layout.tsx`:

```tsx
// app/layout.tsx (Next.js App Router)
<Script
  src="https://[YOUR_UMAMI_HOST]/script.js"
  data-website-id="[YOUR_WEBSITE_ID]"
  strategy="afterInteractive"
  async
  defer
/>
```

Umami auto-tracks `page_view` for every route change in Next.js — no manual call needed for page views.

### 5.2 Manual Event Tracking

All manual events use:

```ts
umami.track('event_name', { property1: 'value', property2: 'value' })
```

Wrap in a safe caller to prevent errors when Umami is blocked:

```ts
// lib/analytics.ts
export function track(eventName: string, properties?: Record<string, string>) {
  if (typeof window !== 'undefined' && typeof window.umami !== 'undefined') {
    window.umami.track(eventName, properties)
  }
  // Silent fail if Umami is unavailable — required by all edge cases in functional-specs.md
}
```

### 5.3 Automatic vs. Manual Events

| Event | Method | Notes |
|-------|--------|-------|
| `page_view` | **Automatic** — Umami script handles all route changes | No code needed |
| `cta_click` | **Manual** — `onClick` handler on CTA buttons | Pass `location` + `label` |
| `case_study_click` | **Manual** — `onClick` on case study cards | Pass `client` + `location` + `slug` |
| `logo_click` | **Manual** — `onClick` on client logo images | Pass `client` |
| `nav_click` | **Manual** — `onClick` on nav links | Pass `label` |
| `scroll_depth` | **Manual** — `<ScrollDepthTracker>` component | See Section 5.4 |
| `form_view` | **Manual** — IntersectionObserver | Fire once when form enters viewport |
| `form_start` | **Manual** — first `focus`/`input` event | Fire once per session using a `useRef` flag |
| `form_submit` | **Manual** — after HTTP 200 from `/api/contact` | Never fire on validation errors |
| `form_error` | **Manual** — after non-200 response or client validation | Pass `error_type` |
| `engagement` | **Manual** — onClick or visibility | Only on pricing comparison table |

### 5.4 Scroll Depth Tracking

Use the `<ScrollDepthTracker>` component specified in functional-specs.md cross-cutting concerns:

```tsx
// components/ScrollDepthTracker.tsx
'use client'
import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

interface Props {
  page: string // slug or page name, e.g. "homepage" or "sony-banner-production"
}

export function ScrollDepthTracker({ page }: Props) {
  const fired50 = useRef(false)
  const fired100 = useRef(false)

  useEffect(() => {
    const device = window.innerWidth >= 1024 ? 'desktop' : window.innerWidth >= 768 ? 'tablet' : 'mobile'

    const handleScroll = () => {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      const pct = (scrolled / total) * 100

      if (pct >= 50 && !fired50.current) {
        fired50.current = true
        track('scroll_depth', { depth: '50', page, device })
      }
      if (pct >= 100 && !fired100.current) {
        fired100.current = true
        track('scroll_depth', { depth: '100', page, device })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page])

  return null
}
```

Place `<ScrollDepthTracker page="homepage" />` on Homepage and `<ScrollDepthTracker page={slug} />` on each case study page, `/pricing`, and `/legal`.

### 5.5 Form Funnel Tracking Sequence

```tsx
// Strict sequencing — matches BR-103-6 in functional-specs.md
const formRef = useRef<HTMLFormElement>(null)
const formStartFired = useRef(false)

// 1. form_view — when form enters viewport
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      track('form_view', { page: '/contact', device })
      observer.disconnect()
    }
  })
  if (formRef.current) observer.observe(formRef.current)
  return () => observer.disconnect()
}, [])

// 2. form_start — first field interaction only
const handleFieldInteraction = () => {
  if (!formStartFired.current) {
    formStartFired.current = true
    track('form_start', { page: '/contact', device })
  }
}

// 3. form_submit — ONLY after HTTP 200
const handleSubmit = async (data: FormData) => {
  const res = await fetch('/api/contact', { method: 'POST', body: data })
  if (res.ok) {
    track('form_submit', {
      company_size: data.get('company_size') as string,
      attribution: data.get('attribution') as string,
      page: '/contact',
      device
    })
    // show success state
  } else {
    track('form_error', { error_type: 'server_error', page: '/contact', device })
    // show error state
  }
}
```

### 5.6 Umami Goal Configuration (Dashboard)

In the Umami admin dashboard, create the following Goals to enable funnel reporting:

| Goal Name | Event | Condition |
|-----------|-------|-----------|
| Lead acquired | `form_submit` | Event fires |
| Form started | `form_start` | Event fires |
| Case study engagement | `page_view` | path contains `/work/` |
| Pricing interest | `page_view` | path = `/pricing` |
| High intent click | `cta_click` | location = `case_study_bottom` |

### 5.7 UTM Parameters

All external links to sarani.studio (LinkedIn posts, emails, paid campaigns) must use the convention defined in kpi-framework.md Section 3.6. Umami reads UTM parameters automatically — no additional code needed.

---

## Hypotheses to Validate

| # | Hypothesis | Validation Method | Timeline |
|---|-----------|-------------------|----------|
| H1 | `form_start` → `form_submit` conversion rate > 70% | Umami funnel: form_start vs form_submit count | W8 post-launch |
| H2 | >40% of sessions visit at least one case study page | Umami: /work/* page views ÷ total sessions | W8 post-launch |
| H3 | `scroll_depth 100` on case study pages > 60% of case study visitors | Umami custom event count ÷ page_view count for /work/* | W8 post-launch |
| H4 | SEO organic traffic accounts for <20% of sessions at launch | Umami traffic source breakdown | W5 (first month) |

---

**Handoff → @fullstack + @qa**

Files produced:
- `/home/user/Sarani/docs/analytics/tracking-plan.md`

Decisions taken:
- Analytics tool confirmed: Umami (self-hosted, privacy-first) — consistent with kpi-framework.md
- Naming convention: `object_action` format, all lowercase, underscore separator
- Standard properties on every event: `page`, `device` — `referrer` on page-level events
- `form_submit` fires ONLY after HTTP 200 from `/api/contact` — never on validation errors (BR-103-6)
- Scroll depth tracked at 50% and 100% on: homepage, all case study pages, /pricing, /legal
- 5-step form funnel: `form_view` → `form_start` → `form_submit` (with `form_error` diagnostic branch)
- No PII in event properties — only categorical values (`company_size`, `attribution`)

Points of attention for @fullstack:
- Implement `lib/analytics.ts` safe wrapper before any `umami.track()` calls — required for silent failure on ad-block (EC-101-4, EC-103-6, EC-104-4)
- `<ScrollDepthTracker>` must use `useRef` flags to prevent duplicate events on same page load (AC-102-4)
- `form_start` must fire exactly once per session — `useRef` flag required (BR-103-6)
- Umami Goals must be configured in the dashboard (Section 5.6) — without Goals, funnel analysis is not available in Umami UI
- UTM parameters are read automatically by Umami — no code needed, but all external links must follow the convention

Points of attention for @qa:
- Test: block Umami script URL in Playwright → verify page loads + form submits successfully (zero console errors > warning)
- Test: verify `form_submit` does NOT fire on validation error responses
- Test: verify `scroll_depth` fires exactly once per depth threshold per page load (no duplicates on back/forward navigation)
- Test: verify no PII fields (name, email, brief text) appear in Umami event properties
