# Sarani — Functional Specifications
*Produced by @product-manager — 2026-03-24*
*Language: English*
*Sources: backlog.md, roadmap.md, kpi-framework.md, brand-voice.md, design-tokens.json, personas.md*

> **Status:** Phase 1 (Must Have) fully specified. US-101 through US-106 are implementation-ready for @fullstack and test-ready for @qa.
> **Coverage:** All 6 Phase 1 user stories with enriched Given/When/Then criteria, ASCII wireframes (5 states each), business rules, edge cases, Umami tracking events, dependencies, and performance constraints.

---

## Table of Contents

1. [US-101 — Homepage Enterprise Positioning](#us-101--homepage-enterprise-positioning)
2. [US-102 — Case Study Pages](#us-102--case-study-pages)
3. [US-103 — Contact / Brief Form](#us-103--contact--brief-form)
4. [US-104 — Pricing Transparency Page](#us-104--pricing-transparency-page)
5. [US-105 — Legal & GDPR Page](#us-105--legal--gdpr-page)
6. [US-106 — SEO Technical Foundation](#us-106--seo-technical-foundation)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

## US-101 — Homepage Enterprise Positioning

**Story:** As Sophie, visiting sarani.studio for the first time, I want to understand Sarani's positioning and see proof of enterprise-scale work in under 10 seconds, so that I don't bounce and start reading.

**Linked KPI:** Site-to-lead conversion rate (target: 1–2%)
**Priority:** Must Have — Phase 1
**North Star link:** Entry point of the causal chain → US-102 → US-103 → revenue

---

### 1. User Stories — Given/When/Then

**AC-101-1: Enterprise logos above fold on desktop**
```
Given a visitor lands on the homepage on a desktop viewport (>=1024px),
When the page finishes loading (LCP event fires),
Then the logos of TikTok, Sony, GEODIS, and Adidas are visible in the viewport
  without any scrolling action,
  AND each logo renders at a minimum height of 24px,
  AND no logo is hidden behind a CSS overflow or display:none at this viewport width.
```

**AC-101-2: Value proposition headline readable in under 10 seconds**
```
Given a visitor lands on the homepage (any viewport),
When the hero section is rendered,
Then the H1 headline contains at most 15 words,
  AND the H1 text is rendered in Galano Grotesque Bold,
  AND the font size is at minimum 3rem on desktop (>=1024px) and 2rem on mobile (<768px),
  AND the headline is visible in the viewport without scrolling on desktop.
```

**AC-101-3: D+1 delivery claim and price anchor visible above fold**
```
Given a visitor lands on the homepage on a desktop viewport (>=1024px),
When the page renders without any scroll,
Then the text "24 hours" or "D+1" appears in the hero section,
  AND a price anchor (e.g., "from 155€") is visible,
  AND at least one named client proof point is visible (e.g., "Sony: same-day banners").
```

**AC-101-4: Core Web Vitals compliance**
```
Given the homepage is loaded on a simulated 4G mobile connection (Lighthouse throttling),
When a Lighthouse performance audit is run in a CI environment,
Then LCP is < 2.5s,
  AND CLS is < 0.1,
  AND FID (or INP) is < 200ms,
  AND the Lighthouse performance score is >= 80.
```

**AC-101-5: Umami page view event fires on homepage**
```
Given a visitor loads the homepage,
When the page finishes loading (DOMContentLoaded),
Then the Umami tracker sends a page view event for path "/",
  AND no console errors are thrown by the Umami script,
  AND no third-party cookies are set by the analytics script.
```

**AC-101-6: Primary CTA visible above fold on all viewport sizes**
```
Given a visitor lands on the homepage on any device (320px to 1536px wide),
When the page renders,
Then a button with the exact text "Start a project" is visible in the viewport
  without scrolling,
  AND the button color is accent.flame (#da5126) per design tokens,
  AND the button links to /contact or to a contact form anchor (#contact).
```

---

### 2. ASCII Wireframes

#### 2.1 — Default State (Desktop >=1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Sarani Logo — 3 dots + wordmark, white on black]          │
│  Nav: Work | Services | Pricing | About | [Start a project] │
│  (Nav sticky, z-index: 200, bg: #000000, border-bottom 1px  │
│   #262626)                                                   │
├─────────────────────────────────────────────────────────────┤
│                    HERO SECTION                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  H1 (Galano Bold, 5xl/3rem, white, max 15 words):     │  │
│  │  "Enterprise-quality creative.                        │  │
│  │   Delivered in 24 hours."                             │  │
│  │                                                       │  │
│  │  Subhead (Galano Regular, xl/1.25rem, neutral-400):   │  │
│  │  "TikTok, Sony, Adidas trust us with theirs."         │  │
│  │                                                       │  │
│  │  [Start a project]  [See our work]                    │  │
│  │  (flame #da5126 filled) (white outline)               │  │
│  │                                                       │  │
│  │  ↓ micro-reassurance (sm/0.875rem, neutral-500):      │  │
│  │  "First project satisfaction or no invoice."          │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  CLIENT LOGOS STRIP (above fold, must render before scroll) │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [TikTok] [Sony] [GEODIS] [Adidas] [L'Oréal] [PICO] │   │
│  │  (white/grayscale logos, 40px height, gap: 48px)     │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                 PROOF POINTS SECTION (below fold)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Sony        │  │  GEODIS      │  │  TikTok      │      │
│  │  Same-day    │  │  5,700 slides│  │  1,500+      │      │
│  │  banners     │  │  in 3 weeks  │  │  edits/month │      │
│  │  155€        │  │  8,500€      │  │  300–500/wk  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  (3-column grid, card bg: #171717, border: 1px #262626)     │
├─────────────────────────────────────────────────────────────┤
│                 VALUE PROPOSITION SECTION                    │
│  "Unlimited revisions. Fixed prices. Zero surprises."       │
│  (Formula 4 — The Unlimited Stack)                          │
│                                                              │
│  3-column icon + stat layout:                                │
│  [Clock icon]      [Globe icon]      [Star icon]             │
│  D+1 delivery      35 experts        60% savings             │
│  standard          5 continents      vs agencies             │
│                    18 languages                              │
│                    24/7                                       │
├─────────────────────────────────────────────────────────────┤
│                 CASE STUDY TEASER (3 cards)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [TikTok     │  │ [GEODIS     │  │ [Sony        │         │
│  │  thumbnail] │  │  thumbnail] │  │  thumbnail]  │         │
│  │             │  │             │  │              │         │
│  │ TikTok      │  │ GEODIS      │  │ Sony         │         │
│  │ 1,500+ edits│  │ 5,700 slides│  │ 125 assets   │         │
│  │ per month   │  │ 3 weeks     │  │ TV launch    │         │
│  │ [See case →]│  │ [See case →]│  │ [See case →] │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 FOOTER CTA SECTION                           │
│  H2: "The creative agency enterprises call when every       │
│       other agency says two weeks."                         │
│  [Start a project]                                          │
│  "First project satisfaction or no invoice."                │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                      │
│  [Logo] | Work | Services | Pricing | About | Contact       │
│  hello@sarani.studio  |  Legal & Privacy                    │
│  © 2026 Sarani. All rights reserved.                        │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 — Mobile State (<768px)

```
┌──────────────────────────────┐
│ [Logo]           [≡ Menu]    │
│ (sticky nav, black bg)        │
├──────────────────────────────┤
│  HERO                        │
│                              │
│  H1 (2rem, Galano Bold):     │
│  "Enterprise-quality         │
│   creative. Delivered        │
│   in 24 hours."              │
│                              │
│  Subhead (base/1rem):        │
│  "TikTok, Sony, Adidas       │
│   trust us with theirs."     │
│                              │
│  [Start a project]           │
│  (full-width, flame #da5126) │
│                              │
│  "First project satisfaction │
│   or no invoice."            │
│                              │
│  CLIENT LOGOS (horizontal    │
│  scroll, marquee-style):     │
│  ← TikTok Sony GEODIS... →  │
├──────────────────────────────┤
│  PROOF POINTS (1-col stack): │
│  ┌────────────────────────┐  │
│  │ Sony · Same-day banners│  │
│  │ 155€                   │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ GEODIS · 5,700 slides  │  │
│  │ 3 weeks · 8,500€       │  │
│  └────────────────────────┘  │
│  [+ more]                    │
└──────────────────────────────┘
```

#### 2.3 — Loading State

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Nav skeleton (gray bars)                           │
├─────────────────────────────────────────────────────────────┤
│  ████████████████████████  ← H1 skeleton (#262626 pulse)   │
│  ████████████████          ← Subhead skeleton               │
│  ████████  ████████        ← CTA buttons skeleton           │
├─────────────────────────────────────────────────────────────┤
│  ████  ████  ████  ████  ████  ← Logo strip skeleton        │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐                         │
│  │████████│  │████████│  │████████│  ← Proof card skeleton  │
│  │████████│  │████████│  │████████│                         │
│  └────────┘  └────────┘  └────────┘                         │
└─────────────────────────────────────────────────────────────┘
Note: Skeleton uses bg: #171717, animated pulse via CSS keyframes.
No "Loading..." text (per brand-voice.md Section 4.6).
```

#### 2.4 — Error State (critical asset load failure)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Nav                                                 │
├─────────────────────────────────────────────────────────────┤
│  HERO renders normally — hero copy is static text (no API)   │
│  Hero degrades gracefully: no external asset dependency.     │
├─────────────────────────────────────────────────────────────┤
│  CLIENT LOGO STRIP — if one logo fails:                      │
│  [TikTok] [SONY] [  ✕  ] [Adidas]                          │
│  (broken img replaced by invisible placeholder, layout held) │
│  Rule: img src error → display:none (no broken icon shown)  │
├─────────────────────────────────────────────────────────────┤
│  PROOF CARDS — static content, no API dependency             │
│  Renders normally regardless of network conditions.          │
└─────────────────────────────────────────────────────────────┘
```

#### 2.5 — Empty State

```
Not applicable to Homepage. All content is static/hardcoded.
No user-generated or API-driven content on this page.
If a CMS is introduced in a future phase, this state will be defined then.
```

---

### 3. Business Rules

**BR-101-1: Logo rendering**
- All client logos must be served as SVG or WebP format (no PNG >50KB per logo).
- If a logo file is missing from the asset folder, the slot renders empty with `display:none` (no broken image icon).
- Logos must render in white or neutral-200 (#f5f5f5) to maintain contrast on black (#000000) background.
- Logo strip on mobile: horizontal scrollable marquee, auto-play, no controls required. Pause on hover (desktop).

**BR-101-2: Hero section**
- H1 must not exceed 15 words (enforced by copywriter, validated by Playwright `textContent.split(' ').length` check).
- Primary CTA "Start a project" links to `/contact` (scroll-to or page navigation).
- Secondary CTA "See our work" links to `/work`.
- Micro-reassurance text ("First project satisfaction or no invoice.") is placed below the primary CTA, font-size: sm (0.875rem), color: neutral-500.

**BR-101-3: Responsive breakpoints (from design-tokens.json)**
- `>=1024px` (lg): 3-column proof card grid, full logo strip, hero with side-by-side CTA buttons.
- `768px–1023px` (md): 2-column proof card grid, logo strip scrollable, CTA buttons stacked.
- `<768px` (sm/mobile): 1-column layout, full-width CTA button, logo marquee.
- `320px` minimum support: verify no horizontal overflow at 320px viewport width.

**BR-101-4: Sticky navigation**
- Nav sticks to top at `position: sticky; top: 0; z-index: 200`.
- Background: `#000000` with bottom border `1px solid #262626`.
- On mobile: hamburger menu replaces inline nav links; menu opens as full-screen overlay (bg: #000000, z-index: 300).

---

### 4. Edge Cases

**EC-101-1: JavaScript disabled**
- Behavior: Hero section, H1, CTAs, logo strip, and proof cards must render without JavaScript.
- Implementation: Use Next.js SSG/SSR so HTML is pre-rendered. The logo marquee animation degrades to a static horizontal flex row. No content is JS-gated on the homepage.
- Test: Playwright with `javaScriptEnabled: false` — verify H1 text, CTA button, and at least 2 client logos are present in the DOM.

**EC-101-2: 320px viewport**
- Behavior: No horizontal scroll, no content overflow, CTA button must remain full-width and tappable (min 44px height per WCAG 2.1).
- Implementation: All grid sections collapse to single-column. Hero font size reduces to 1.875rem (3xl token). Logo strip enters horizontal scroll mode.
- Test: Playwright viewport `{ width: 320, height: 568 }` — verify `document.body.scrollWidth === 320`.

**EC-101-3: Client logo fails to load**
- Behavior: The layout must not break. The logo slot collapses to zero width (not a broken icon).
- Implementation: `<img>` tags with `onError={() => setVisible(false)}` — hides the element; CSS ensures neighboring logos remain evenly spaced via `gap` (not `margin`).
- Test: Intercept one logo request with Playwright (`route.abort()`) — verify no layout shift, no broken icon, CLS remains < 0.1.

**EC-101-4: Umami script is down or blocked**
- Behavior: The page must load normally. No error thrown. No fallback analytics provider.
- Implementation: Umami script loaded with `async defer` and no error handler needed (silent failure is correct behavior).
- Test: Block Umami script URL in Playwright — verify page loads fully, no console errors of severity > warning.

**EC-101-5: Very slow network (3G simulation)**
- Behavior: Above-fold text (H1, subhead, CTA button) must be visible before images load.
- Implementation: Text is rendered server-side (SSR/SSG). Logo images are lazy-loaded EXCEPT the first 4 logos (above-fold, use `loading="eager"`). All other images: `loading="lazy"`.
- Test: Lighthouse CI with throttling profile — verify H1 FCP < 1.5s even at 3G.

---

### 5. Tracking Events

| User Action | Umami Event Name | Properties | KPI Impacted |
|---|---|---|---|
| Page load — homepage | `page_view` (automatic) | `path: "/"` | Site-to-lead conversion rate (denominator) |
| Click "Start a project" (hero) | `cta_click` | `location: "hero", label: "start_a_project"` | Site-to-lead conversion rate |
| Click "See our work" (hero) | `cta_click` | `location: "hero", label: "see_our_work"` | Case study engagement rate |
| Click any client logo | `logo_click` | `client: "[client_name]"` | Engagement proxy |
| Click a proof card / case study teaser | `case_study_click` | `client: "[client_name]", location: "homepage_teaser"` | Case study engagement rate |
| Scroll to 50% of page | `scroll_depth` | `depth: "50", page: "homepage"` | Bounce rate proxy |
| Scroll to 100% of page | `scroll_depth` | `depth: "100", page: "homepage"` | Full engagement signal |

**Implementation note:** All events use Umami's `umami.track()` API. No third-party event library. Events fire client-side after hydration (React `useEffect` or `onClick` handler).

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| `design-tokens.json` | Internal | Colors, typography, spacing | Done — @design |
| `brand-voice.md` microcopy (Section 4) | Internal | All copy strings | Done — @copywriter |
| Client logo assets (SVG/WebP) | Asset | Logo strip rendering | Requires Sarani team delivery |
| Umami self-hosted instance running | Infrastructure | All tracking events | Requires @infrastructure setup |
| Next.js + Replit deployment | Infrastructure | Page rendering | Requires @fullstack |

---

### 7. Performance Constraints

| Metric | Target | Measurement Method |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s (desktop), < 3.0s (mobile 4G) | Lighthouse CI |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse CI |
| FID / INP | < 200ms | Lighthouse CI |
| TTFB (Time to First Byte) | < 600ms | Lighthouse CI |
| Total page weight | < 1MB (initial load) | Webpack bundle analyzer |
| Hero section text FCP | < 1.0s (SSR/SSG text visible before JS hydration) | Lighthouse CI |
| Logo images (each) | < 30KB (WebP) or < 10KB (SVG) | Asset audit before deployment |
| Web font (Galano Grotesque) | Subset to Latin + numbers only; preload in `<head>` | Font audit |

---

## US-102 — Case Study Pages

**Story:** As Sophie, evaluating whether Sarani can handle my volume and speed, I want to read detailed case studies with specific numbers (assets delivered, turnaround time, client name), so that I can trust Sarani before submitting a brief.

**Linked KPI:** Case study engagement rate (target: >40% of sessions view at least one case study)
**Priority:** Must Have — Phase 1
**North Star link:** Trust-building step between homepage and contact form submission

---

### 1. User Stories — Given/When/Then

**AC-102-1: Minimum 3 case studies live at launch**
```
Given the site is deployed in production (W4 milestone),
When a visitor navigates to /work or /case-studies,
Then at minimum 3 case study pages are accessible:
  - /case-studies/sony-banner-production (or equivalent slug)
  - /case-studies/geodis-presentation-rebranding (or equivalent slug)
  - /case-studies/tiktok-video-production (or equivalent slug),
  AND each page returns HTTP 200,
  AND each page is linked from the /work listing page.
```

**AC-102-2: Each case study contains required structured data**
```
Given a visitor navigates to any case study page,
When the page renders,
Then the visible content includes all of the following:
  - Client name (as text and as logo/image),
  - Deliverable type (e.g., "Video editing", "Presentations", "Banners"),
  - Volume (e.g., "1,500+ edits per month"),
  - Turnaround time (e.g., "Delivered in 24 hours"),
  - At least one quantified outcome (e.g., "51M views", "8,500€ total cost"),
  AND none of these fields are empty or placeholder text.
```

**AC-102-3: Case studies accessible in 1 click from homepage**
```
Given a visitor is on the homepage (path "/"),
When they click any proof card or "See our work" CTA,
Then they arrive on either /work (listing) or a specific /case-studies/[slug] page,
  AND the navigation requires exactly 1 click (no intermediate loading screens),
  AND the target page returns HTTP 200.
```

**AC-102-4: Umami scroll depth events fire at 50% and 100%**
```
Given a visitor is on any case study page (/case-studies/*),
When they scroll to 50% of the page height,
Then Umami fires event "scroll_depth" with { depth: "50", page: "[slug]" },
  AND when they scroll to 100% of the page height,
  Then Umami fires event "scroll_depth" with { depth: "100", page: "[slug]" },
  AND no duplicate events fire for the same depth on the same page load.
```

**AC-102-5: Contact CTA visible at bottom of each case study**
```
Given a visitor has scrolled to the bottom of any case study page,
When the final section renders,
Then a "Start a project" button (bg: #da5126) is visible,
  AND the button links to /contact or #contact anchor,
  AND the micro-reassurance "First project satisfaction or no invoice."
      appears below the button (font-size: sm, color: neutral-500).
```

**AC-102-6: Client logo renders correctly or degrades gracefully**
```
Given a visitor loads a case study page,
When the client logo image request fails (network error or missing file),
Then the layout does not break,
  AND the client name remains visible as text,
  AND no broken image icon is displayed.
```

---

### 2. ASCII Wireframes

#### 2.1 — Case Study Page — Default State (Desktop >=1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Work | Services | Pricing | About | [Start project]│
│  (sticky nav)                                                │
├─────────────────────────────────────────────────────────────┤
│  CASE STUDY HERO                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Client Logo — white, 48px height]                   │  │
│  │                                                       │  │
│  │  H1 (Galano Bold, 4xl/2.25rem, white):                │  │
│  │  "GEODIS needed 350 presentations rebranded.          │  │
│  │   We delivered 5,700 slides in 3 weeks."              │  │
│  │  (Formula 2 — Problem → Result)                       │  │
│  │                                                       │  │
│  │  Meta strip (neutral-500, sm):                        │  │
│  │  Deliverable: Presentations  |  Timeline: 3 weeks     │  │
│  │  Volume: 5,700 slides        |  Budget: 8,500€        │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  HERO IMAGE (16:9 ratio, WebP, preloaded, full-width)       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   [Case study hero visual]                            │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  THE BRIEF (2-col: 8col content + 4col sidebar)             │
│  ┌──────────────────────────┐  ┌──────────────────────┐     │
│  │  What GEODIS needed:     │  │  AT A GLANCE         │     │
│  │  350 rebranded decks     │  │  Client: GEODIS      │     │
│  │  across 12 markets in    │  │  Deliverable: Decks  │     │
│  │  3 weeks, full brand     │  │  Volume: 5,700 slides│     │
│  │  consistency.            │  │  Timeline: 3 weeks   │     │
│  │                          │  │  Cost: 8,500€        │     │
│  │  What we delivered:      │  │  ─────────────────── │     │
│  │  5,700 slides. On time.  │  │  [Start a project]   │     │
│  │  On brand.               │  └──────────────────────┘     │
│  └──────────────────────────┘                                │
├─────────────────────────────────────────────────────────────┤
│  RESULTS (3 stat cards, bg: #171717)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  5,700   │  │  3 weeks │  │  8,500€  │                   │
│  │  slides  │  │  on time │  │  total   │                   │
│  │(#da5126) │  │(#da5126) │  │(#da5126) │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  ASSET GALLERY (optional, 4-col grid, lazy-loaded WebP)     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                                    │
│  │   │ │   │ │   │ │   │                                    │
│  └───┘ └───┘ └───┘ └───┘                                    │
├─────────────────────────────────────────────────────────────┤
│  CLOSING CTA                                                 │
│  H2: "Ready to start your first project?"                    │
│  [Start a project]  (flame #da5126)                         │
│  "First project satisfaction or no invoice."                 │
├─────────────────────────────────────────────────────────────┤
│  RELATED CASE STUDIES (2 cards, lazy-loaded)                 │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ [TikTok thumbnail]  │  │ [Sony thumbnail]    │           │
│  │ TikTok · Video edit │  │ Sony · Banners      │           │
│  │ [Read case study →] │  │ [Read case study →] │           │
│  └─────────────────────┘  └─────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (standard)                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 — Mobile State (<768px)

```
┌──────────────────────────────┐
│ [Logo]          [≡ Menu]     │
├──────────────────────────────┤
│  [Client Logo — 32px]        │
│                              │
│  H1 (1.875rem, Galano Bold): │
│  "GEODIS needed 350          │
│   presentations. We          │
│   delivered 5,700 slides."   │
│                              │
│  Meta (stacked, sm):         │
│  Deliverable: Presentations  │
│  Timeline: 3 weeks           │
│  Volume: 5,700 slides        │
│  Cost: 8,500€                │
├──────────────────────────────┤
│  [Hero image — full width]   │
├──────────────────────────────┤
│  BRIEF (single column)       │
│  What GEODIS needed: ...     │
│  What we delivered: ...      │
├──────────────────────────────┤
│  STATS (scroll-x on mobile): │
│  ← [5,700] [3 weeks] [8,500€]│
├──────────────────────────────┤
│  [Start a project] (full-w)  │
│  "First project satisfaction │
│   or no invoice."            │
└──────────────────────────────┘
```

#### 2.3 — Loading State

```
┌─────────────────────────────────────────────────────────────┐
│  ████  ← Client logo skeleton                               │
│  ████████████████████████████  ← H1 skeleton (pulse)        │
│  ████████████████████          ← H1 line 2 skeleton         │
│  ████████  ████████  ████████  ← Meta strip skeleton        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ██████████████████████████████████████  (hero img)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
Note: All skeletons use bg: #171717 with CSS pulse animation.
No spinner. No "Loading..." text.
```

#### 2.4 — Error State

```
┌─────────────────────────────────────────────────────────────┐
│  Hero image fails → bg: #171717 placeholder block           │
│  Text content renders normally (SSG, no API dependency)     │
│                                                             │
│  404 slug → renders Next.js not-found.tsx:                  │
│  "This page doesn't exist."                                  │
│  "But we do. 35 experts ready to work on your next project."│
│  [Start a project]                                          │
│  [← Back to homepage]                                       │
└─────────────────────────────────────────────────────────────┘
```

#### 2.5 — Empty State (/work with no case studies)

```
┌─────────────────────────────────────────────────────────────┐
│  (Should not occur in production — 3 case studies hardcoded) │
│                                                              │
│  Fallback copy (brand-voice.md Section 4.7):                 │
│  "Nothing here yet for that filter. See all our work →"      │
│  [Start a project]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Business Rules

**BR-102-1: Required fields per case study (no exceptions)**
Every case study page MUST contain: `client_name`, `deliverable_type`, `volume`, `turnaround_time`, `quantified_outcome`, `contact_cta`. Any case study missing a field must not be published.

**BR-102-2: URL structure**
Pattern: `/case-studies/[client-name]-[deliverable-type]`
- `/case-studies/geodis-presentation-rebranding`
- `/case-studies/tiktok-video-production`
- `/case-studies/sony-banner-production`
Slugs are lowercase, hyphen-separated, no special characters, no trailing slash.

**BR-102-3: /work listing page sort order**
Cards sorted by client importance: TikTok → Sony → GEODIS → Adidas → all others alphabetically.

**BR-102-4: Client logo rendering rules**
- Logos rendered as white or neutral-200 (#f5f5f5) variant on dark backgrounds (#000000, #171717).
- No color manipulation, no cropping of logo protected zones.
- Fallback: if logo image is missing, render client name as text only (Galano Bold, white).

**BR-102-5: Scroll depth event deduplication**
Each depth event (50%, 100%) fires only once per page load. Track using a React `useRef` boolean flag per depth level. Reset on page navigation.

---

### 4. Edge Cases

**EC-102-1: JavaScript disabled**
Page renders fully (SSG). Scroll depth tracking does not fire (JS required). Acceptable — content is readable and CTA is functional.
Test: Playwright `javaScriptEnabled: false` → verify all required content fields present in DOM.

**EC-102-2: Non-existent slug (404)**
Return HTTP 404 + render `not-found.tsx` with exact copy from brand-voice.md Section 4.8.
Test: GET `/case-studies/nonexistent-slug` → verify response status 404, verify H1 "This page doesn't exist."

**EC-102-3: Hero image load failure**
Container shows bg: #171717 placeholder. No broken icon. Text and CTA remain visible. CLS < 0.1.
Test: Playwright `route.abort()` on hero image → verify layout intact, no broken icon.

**EC-102-4: 320px viewport**
All content single-column, stat cards horizontally scrollable, no overflow.
Test: Playwright `{ width: 320, height: 568 }` → `document.body.scrollWidth === 320`.

**EC-102-5: Only 1 related case study available**
Show 1 card (not a broken 2-col grid). If 0 related, hide section entirely.
Test: Seed with 1 total case study → verify related section is hidden.

---

### 5. Tracking Events

| User Action | Umami Event Name | Properties | KPI Impacted |
|---|---|---|---|
| Page load — /work | `page_view` (auto) | `path: "/work"` | Case study engagement rate |
| Page load — /case-studies/[slug] | `page_view` (auto) | `path: "/case-studies/[slug]"` | Case study engagement rate |
| Scroll to 50% on case study | `scroll_depth` | `{ depth: "50", page: "[slug]" }` | Time-on-page proxy |
| Scroll to 100% on case study | `scroll_depth` | `{ depth: "100", page: "[slug]" }` | Full engagement signal |
| Click "Start a project" (bottom CTA) | `cta_click` | `{ location: "case_study_bottom", client: "[name]" }` | Site-to-lead conversion |
| Click related case study card | `case_study_click` | `{ client: "[name]", location: "related_section" }` | Case study engagement rate |

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| Client logo assets (SVG/WebP) | Asset | Logo rendering | Requires Sarani team |
| Case study hero images + gallery | Asset | Visual rendering | Requires Sarani team |
| Case study written copy | Content | Page content | Requires @copywriter |
| `design-tokens.json` | Internal | Colors, spacing | Done — @design |
| Umami instance running | Infrastructure | Scroll tracking | Requires @infrastructure |
| `/work` listing route | Code | Navigation | Requires @fullstack |

---

### 7. Performance Constraints

| Metric | Target | Notes |
|---|---|---|
| LCP on case study page | < 2.5s desktop | Hero image is likely largest element; use `priority` on Next.js `<Image>` |
| Hero image file size | < 200KB (WebP) | Compress before deploy |
| Gallery thumbnails | < 50KB each (WebP) | Lazy-load all gallery images |
| Total page weight | < 1.5MB | Heavier than homepage due to visuals — acceptable |
| Slug resolution time | < 100ms | All case studies statically generated (SSG) at build time |

---

## US-103 — Contact / Brief Form

**Story:** As Sophie, ready to test Sarani with a real brief, I want to submit my project details in under 3 minutes without creating an account, so that I get a response the same day.

**Linked KPI:** Qualified inbound leads (target: 5 enterprise form submissions/month)
**Priority:** CRITICAL Must Have — single most important component in Phase 1
**North Star link:** The ONLY digital conversion point. Any failure here = zero leads = zero new accounts.

---

### 1. User Stories — Given/When/Then

**AC-103-1: Form accessible in max 2 clicks from any page**
```
Given a visitor is on any page of the site (homepage, /work, /services, /pricing, /about),
When they click any "Start a project" or "Contact" navigation link,
Then they arrive at the contact form (/contact or #contact anchor)
  within exactly 1 click from the current page (2 clicks max from homepage hero),
  AND the form is visible in the viewport without additional scrolling on desktop.
```

**AC-103-2: All required fields are present and labeled correctly**
```
Given a visitor navigates to the contact form,
When the form renders,
Then the following fields are visible with exact labels from brand-voice.md Section 4.3:
  - "Your name" (text input, required, placeholder: "Sophie Martin"),
  - "Company" (text input, required, placeholder: "TikTok, Sony, Adidas..."),
  - "Email" (email input, required, placeholder: "you@yourcompany.com"),
  - "What do you need?" (textarea, required,
     placeholder: "We need 50 banners in 3 languages by Friday..."),
  - "Company size" (select dropdown, required,
     options: "500M€+ / 100–500M€ / Under 100M€"),
  - "How did you hear about us?" (select dropdown, required,
     options: "Referral / LinkedIn / Search / Other"),
  - "Attachment" (file input, optional, no label text — use aria-label),
  AND the submit button displays exact text "Send my brief".
```

**AC-103-3: Successful submission triggers confirmation and email**
```
Given a visitor has filled all required fields with valid data,
When they click "Send my brief",
Then:
  - The submit button shows text "Sending..." (disabled state) immediately,
  - The form data is submitted to the server-side API route,
  - On successful API response (HTTP 200):
    - The form is replaced by the success message:
      "Got it. Expect a response within the hour — usually faster."
      (exact copy from brand-voice.md Section 4.4),
    - A confirmation email is sent to the submitted email address
      within 5 minutes,
  - The Umami "form_submit" goal event fires,
  - The URL does NOT change (no redirect to a separate thank-you page).
```

**AC-103-4: Validation errors displayed inline, not as modal**
```
Given a visitor clicks "Send my brief" with one or more required fields empty
  or with an invalid email address,
When the form validates on submit,
Then:
  - For each empty required field: the error message
    "This field is required." appears below the field
    (exact copy from brand-voice.md Section 4.5),
  - For an invalid email: the error message
    "Check that email address — it doesn't look right."
    appears below the email field
    (exact copy from brand-voice.md Section 4.5),
  - No modal dialog is shown,
  - The form does NOT submit to the server,
  - Focus moves to the first field with an error,
  - Error messages use color: error #da5126 (semantic.error token),
  AND the Umami "form_submit" event does NOT fire on validation failure.
```

**AC-103-5: Form renders and submits correctly on mobile**
```
Given a visitor is on a mobile device (iOS Safari, Android Chrome,
  viewport width 320px–767px),
When they interact with the contact form,
Then:
  - All fields are tappable (min height 44px per WCAG 2.1),
  - The "Company size" and "How did you hear" dropdowns open native
    mobile select pickers,
  - The textarea expands vertically as the user types (no fixed height),
  - The submit button is full-width,
  - Successful submission shows the exact success message,
  - No horizontal overflow at 320px viewport width.
```

**AC-103-6: Umami goal events fire correctly at each form stage**
```
Given a visitor loads the page containing the contact form,
When the form element enters the viewport,
Then Umami fires event "form_view",
  AND when the visitor starts typing in any form field,
  Then Umami fires event "form_start" (once per session, not per keystroke),
  AND when the form is successfully submitted (HTTP 200 from API),
  Then Umami fires event "form_submit",
  AND no event fires on validation errors or server errors.
```

---

### 2. ASCII Wireframes

#### 2.1 — Default State (Desktop >=1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Work | Services | Pricing | About | [Start project]│
│  (sticky nav)                                                │
├─────────────────────────────────────────────────────────────┤
│  PAGE HEADER                                                 │
│  H1 (Galano Bold, 4xl): "Start a project"                   │
│  Subhead (Galano Regular, xl, neutral-400):                  │
│  "Tell us what you need. We'll get back to you              │
│   within the hour."                                          │
│  (exact copy from brand-voice.md Tone Matrix — contact form) │
├─────────────────────────────────────────────────────────────┤
│  FORM (max-width: 640px, centered on page)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Your name *                                          │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ Sophie Martin                                   │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  Company *                                            │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ TikTok, Sony, Adidas...                         │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  Email *                                              │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ you@yourcompany.com                             │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  What do you need? *                                  │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ We need 50 banners in 3 languages by Friday...  │ │  │
│  │  │                                                 │ │  │
│  │  │ (textarea, min 4 rows, auto-expand)             │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  Company size *                                       │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ Select: 500M€+ / 100–500M€ / Under 100M€    ▾  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  How did you hear about us? *                         │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ Select: Referral / LinkedIn / Search / Other ▾  │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │  Attach a brief or reference (optional)               │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │ [ Choose file ]  No file selected               │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  │  ↑ small text (neutral-500): Max 10MB                 │  │
│  │                                                       │  │
│  │  [Send my brief]  ← full-width, bg: #da5126           │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Below form (neutral-500, sm):                               │
│  "First project satisfaction or no invoice."                 │
├─────────────────────────────────────────────────────────────┤
│  TRUST STRIP (below form)                                    │
│  [TikTok] [Sony] [GEODIS] — "35 experts, 24/7"              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 — Loading State (after "Send my brief" clicked)

```
┌─────────────────────────────────────────────────────────────┐
│  FORM (all fields visible but disabled)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Disabled fields — opacity: 0.5]                     │  │
│  │  ...                                                  │  │
│  │                                                       │  │
│  │  [Sending...]  ← button text, bg: #b03d1c (flame-dark)│  │
│  │  (button disabled, cursor: not-allowed)               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Note: No spinner icon (brand-voice.md: "Sending..." text   │
│  only). Submit is debounced: 1 click max, then disabled.     │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3 — Success State (after successful submission)

```
┌─────────────────────────────────────────────────────────────┐
│  FORM REPLACED BY SUCCESS MESSAGE (no redirect)             │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  [Checkmark icon — color: #16a34a (semantic.success)] │  │
│  │                                                       │  │
│  │  "Got it. Expect a response within the hour —         │  │
│  │   usually faster."                                    │  │
│  │  (exact copy from brand-voice.md Section 4.4)         │  │
│  │  (Galano Bold, 2xl, white)                            │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [← See our work]  (secondary link, neutral-400)            │
└─────────────────────────────────────────────────────────────┘
```

#### 2.4 — Error State (server failure)

```
┌─────────────────────────────────────────────────────────────┐
│  FORM (fields restored to filled state, not cleared)         │
│                                                              │
│  Error banner above submit button:                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  bg: #fde8e2 (semantic.error-light)                   │  │
│  │  border-left: 4px #da5126 (semantic.error)            │  │
│  │                                                       │  │
│  │  "That didn't go through. Try again — or email us     │  │
│  │   directly: hello@sarani.studio"                      │  │
│  │  (exact copy from brand-voice.md Section 4.5)         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Send my brief]  ← re-enabled (not disabled after error)   │
│                                                              │
│  Note: form data is NOT cleared on server error.             │
│  The user should not have to retype their brief.             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.5 — Validation Error State (inline)

```
┌─────────────────────────────────────────────────────────────┐
│  FORM — field-level inline errors                            │
│                                                              │
│  Your name *                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ (empty)                               border:#da5126│    │
│  └─────────────────────────────────────────────────────┘    │
│  ↑ "This field is required."  (color: #da5126, sm font)      │
│                                                              │
│  Email *                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ not-an-email                          border:#da5126│    │
│  └─────────────────────────────────────────────────────┘    │
│  ↑ "Check that email address — it doesn't look right."       │
│    (color: #da5126, sm font)                                 │
│                                                              │
│  [Send my brief]  ← still enabled (user can correct & retry) │
└─────────────────────────────────────────────────────────────┘
```

#### 2.6 — Mobile State (<768px)

```
┌──────────────────────────────┐
│ [Logo]          [≡ Menu]     │
├──────────────────────────────┤
│  H1 (2rem): "Start a project"│
│  "Tell us what you need."    │
│  "We'll get back within      │
│   the hour."                 │
├──────────────────────────────┤
│  FORM (full-width, padding:  │
│   16px / spacing.4)          │
│                              │
│  Your name *                 │
│  ┌────────────────────────┐  │
│  │ Sophie Martin          │  │
│  └────────────────────────┘  │
│  Company *                   │
│  ┌────────────────────────┐  │
│  │ TikTok, Sony...        │  │
│  └────────────────────────┘  │
│  Email *                     │
│  ┌────────────────────────┐  │
│  │ you@yourcompany.com    │  │
│  └────────────────────────┘  │
│  What do you need? *         │
│  ┌────────────────────────┐  │
│  │ 50 banners by Friday.. │  │
│  │ (auto-expand textarea) │  │
│  └────────────────────────┘  │
│  Company size *              │
│  ┌────────────────────────┐  │
│  │ Select...           ▾  │  │
│  └────────────────────────┘  │
│  How did you hear? *         │
│  ┌────────────────────────┐  │
│  │ Select...           ▾  │  │
│  └────────────────────────┘  │
│  [Send my brief] (full-w)    │
│  "First project satisfaction │
│   or no invoice."            │
└──────────────────────────────┘
```

---

### 3. Business Rules

**BR-103-1: Required vs optional fields**
| Field | Required | Type | Validation |
|---|---|---|---|
| Your name | Yes | text | Non-empty, max 100 chars |
| Company | Yes | text | Non-empty, max 200 chars |
| Email | Yes | email | Valid email format (RFC 5322 basic) |
| What do you need? | Yes | textarea | Non-empty, min 10 chars, max 5,000 chars |
| Company size | Yes | select | One of: "500M€+", "100–500M€", "Under 100M€" |
| How did you hear? | Yes | select | One of: "Referral", "LinkedIn", "Search", "Other" |
| Attachment | No | file | Max 10MB, accepted types: .pdf, .doc, .docx, .ppt, .pptx, .jpg, .png, .zip |

**BR-103-2: Server-side processing**
- Form submitted via POST to a Next.js API route (`/api/contact`).
- Server-side re-validation of all required fields (client-side validation is UX only — not security).
- On success: send confirmation email to submitter (transactional email service — TBD by @fullstack).
- On success: send notification email to Sarani team inbox (hello@sarani.studio — [HYPOTHESE: address to confirm with Sarani team]).
- Store submission data: @fullstack to recommend storage solution (e.g., Resend + webhook to CRM, or direct CRM API).

**BR-103-3: Rate limiting**
- Max 3 submissions per IP per hour. On 4th attempt within 1 hour: return HTTP 429.
- Display error: "That didn't go through. Try again — or email us directly: hello@sarani.studio"
- No CAPTCHA required at Phase 1 (adds friction for Sophie; implement if spam becomes an issue post-launch).

**BR-103-4: Duplicate submission prevention**
- Submit button is disabled immediately on first click (prevents double-submit on slow networks).
- Button re-enables only on server error (so user can retry).
- On success: form is replaced by success message (button permanently unavailable after success).

**BR-103-5: File attachment handling**
- [HYPOTHESE: Max 10MB per brand-voice.md Section 4.5. @fullstack to confirm Replit storage constraints.]
- If file exceeds 10MB: inline error "That file is too large. Max 10MB — or share a link instead." (exact copy brand-voice.md Section 4.5).
- File stored securely (not publicly accessible). Storage method TBD by @fullstack.
- File optional — form must submit successfully without an attachment.

**BR-103-6: Umami event sequencing rules**
- `form_view`: fire when the form element first enters viewport (IntersectionObserver).
- `form_start`: fire on first `focus` or `input` event on any form field. Once per session only.
- `form_submit`: fire ONLY after receiving HTTP 200 from `/api/contact`. Never fire on client-side validation errors or server errors.

---

### 4. Edge Cases

**EC-103-1: JavaScript disabled**
- Form fields render (native HTML form elements). Client-side validation does not run.
- Form submits via native HTML POST action (fallback action attribute on `<form>`).
- Must be handled server-side: redirect to a `/contact/success` page on success, or back to `/contact?error=1` on error.
- Success page shows: "Got it. Expect a response within the hour — usually faster."
- Test: Playwright `javaScriptEnabled: false` → fill and submit form → verify server handles it and success message shown.

**EC-103-2: Form submitted 10 times in 1 minute (spam / bot)**
- After 3 submissions from same IP within 60 minutes: return HTTP 429.
- Response shown to user: server error state ("That didn't go through. Try again — or email us directly: hello@sarani.studio").
- Do NOT reveal that the limit has been reached (no "too many attempts" message — avoids gaming).
- Test: Submit form 4 times with rate-limited test IP → verify 4th submission returns 429 and error state renders.

**EC-103-3: File upload > 10MB**
- Behavior: Client-side pre-validation before submit. Inline error below file input.
- Exact error copy: "That file is too large. Max 10MB — or share a link instead."
- Form data is NOT lost (other fields remain filled).
- Test: Attempt to attach an 11MB file → verify inline error appears, form does not submit.

**EC-103-4: Network timeout during submission**
- Behavior: If API route does not respond within 15 seconds, abort the request and show the server error state.
- User retains all their form data (not cleared).
- Test: Intercept `/api/contact` in Playwright and delay response by 20 seconds → verify timeout error state renders.

**EC-103-5: 320px viewport**
- All fields full-width. No horizontal overflow. Native select dropdowns use full mobile width.
- Test: Playwright `{ width: 320, height: 568 }` → `document.body.scrollWidth === 320`, all fields tappable.

**EC-103-6: Umami down or blocked by ad-blocker**
- Behavior: Form submits and succeeds normally. Umami events silently fail (no retry, no error shown to user).
- Test: Block Umami script URL → verify form submission succeeds and success message shown.

**EC-103-7: Invalid "Company size" or "How did you hear" value injected via curl**
- Server-side validation must reject values not in the allowed list.
- Return HTTP 400 with generic error state (not exposing validation logic).
- Test: Vitest unit test on API route with invalid select values → verify HTTP 400 response.

---

### 5. Tracking Events

| User Action | Umami Event Name | Properties | KPI Impacted |
|---|---|---|---|
| Form enters viewport | `form_view` | `{ page: "/contact" }` | Form funnel start |
| First keypress / focus on any field | `form_start` | `{ page: "/contact" }` | Form engagement rate |
| Successful form submission (HTTP 200) | `form_submit` | `{ company_size: "[value]", attribution: "[value]" }` | Qualified inbound leads |
| Server error on submit | `form_error` | `{ error_type: "server_error" }` | Diagnostic / ops |
| File too large error | `form_error` | `{ error_type: "file_too_large" }` | Diagnostic |
| Page load — /contact | `page_view` (auto) | `path: "/contact"` | Site-to-lead denominator |

**Privacy note:** `company_size` and `attribution` values are included in `form_submit` because these are non-PII categorical fields. Do NOT include name, email, or brief content in Umami events.

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| Transactional email service (Resend or equivalent) | External | Confirmation email to prospect | @fullstack to select |
| Sarani team notification email address | Configuration | Team alert on new submission | [HYPOTHESE: hello@sarani.studio — confirm] |
| Umami goal events configuration | Infrastructure | KPI tracking | Requires @infrastructure |
| Rate limiting middleware | Code | Spam prevention | Requires @fullstack |
| File storage solution (Replit-compatible) | Infrastructure | Attachment handling | Requires @infrastructure/@fullstack |
| `/api/contact` Next.js API route | Code | Form submission | Requires @fullstack |

---

### 7. Performance Constraints

| Metric | Target | Notes |
|---|---|---|
| Form render time | < 500ms (FCP of form on /contact page) | Form is static HTML — SSR/SSG ensures fast initial render |
| API route response time | < 2s (p95) | Include email sending time; use async email dispatch if needed |
| Form submission timeout | 15s max | Abort and show error after 15s |
| File upload throughput | Min 1MB/s effective | Replit constraint — test with 10MB file |
| Form accessibility | WCAG 2.1 AA | All fields have labels, error messages are associated via aria-describedby |

---

## US-104 — Pricing Transparency Page

**Story:** As Marc, evaluating Sarani as a potential vendor, I want to see published pricing with clear per-asset or per-project rates, so that I can benchmark Sarani against our incumbent agency without needing a discovery call.

**Linked KPI:** Pricing page visit rate (target: >20% of sessions include a pricing page visit)
**Priority:** Must Have — Phase 1
**North Star link:** Marc removes the procurement blocker; enables Sophie to get sign-off without a call.

---

### 1. User Stories — Given/When/Then

**AC-104-1: At least 3 service types with example fixed prices**
```
Given a visitor navigates to /pricing,
When the page renders,
Then at minimum 3 service categories are displayed with named prices:
  - Banner production (e.g., "from 155€ per banner"),
  - Video editing (e.g., "from 360€ per video"),
  - Presentation design (e.g., "from 8,500€ per project"),
  AND each price is a fixed number or range (not "contact us for pricing"),
  AND no price requires a form submission or login to be visible.
```

**AC-104-2: Comparison against traditional agency pricing is explicit**
```
Given a visitor is on the pricing page,
When they view any service category,
Then at least one price comparison is visible on the page stating
  savings vs. traditional agencies (e.g., "Up to 60% savings vs. network agencies"),
  AND the "First project satisfaction or no invoice." guarantee is visible
  on the page without scrolling on desktop (>=1024px).
```

**AC-104-3: "No minimum commitment" and "unlimited revisions" stated**
```
Given a visitor is on the pricing page,
When the page is fully loaded,
Then the text "No retainer. No minimum commitment." appears on the page,
  AND the text "Unlimited revisions" or "unlimited revisions included"
  appears on the page,
  AND both claims are visible without scrolling on desktop (>=1024px).
```

**AC-104-4: Contact CTA present on pricing page**
```
Given a visitor is on the pricing page,
When they view the page on any viewport,
Then at least one "Start a project" button (bg: #da5126) is visible,
  AND the button links to /contact or #contact anchor,
  AND the micro-reassurance "First project satisfaction or no invoice."
      appears below the button.
```

**AC-104-5: Umami page view tracking active on pricing page**
```
Given a visitor loads /pricing,
When the page finishes loading,
Then Umami fires a page_view event for path "/pricing",
  AND no third-party cookies are set,
  AND no console errors are thrown by the Umami script.
```

---

### 2. ASCII Wireframes

#### 2.1 — Default State (Desktop >=1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Work | Services | Pricing | About | [Start project]│
│  (sticky nav)                                                │
├─────────────────────────────────────────────────────────────┤
│  PAGE HERO                                                   │
│  H1 (Galano Bold, 4xl): "Fixed prices. Zero surprises."     │
│  Subhead (xl, neutral-400):                                  │
│  "No retainer. No minimum commitment.                        │
│   Unlimited revisions. Up to 60% savings vs agencies."      │
│  (Formula 4: The Unlimited Stack + Formula 10 from Do/Don't) │
│                                                              │
│  GUARANTEE STRIP (bg: #171717, border: 1px #262626)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  "Not satisfied with your first project? No invoice." │  │
│  │  (Galano Bold, white, centered)                       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  PRICING GRID (3 columns, desktop)                           │
│                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────┐  │
│  │  CONTENT         │ │  VIDEO           │ │  STRATEGY   │  │
│  │  CREATION        │ │  PRODUCTION      │ │  & PLANNING │  │
│  │                  │ │                  │ │             │  │
│  │  Banners         │ │  Video editing   │ │  Deck       │  │
│  │  from 155€       │ │  from 360€       │ │  from 360€  │  │
│  │                  │ │                  │ │             │  │
│  │  Full rebranding │ │  Video turnkey   │ │  Marketing  │  │
│  │  from 5,000€     │ │  3,800–99,800€   │ │  plan TBD   │  │
│  │                  │ │                  │ │             │  │
│  │  Infographic     │ │  Sizzle reel     │ │             │  │
│  │  180€ + 35€/lang │ │  360–900€        │ │             │  │
│  │                  │ │                  │ │             │  │
│  │  Newsletter      │ │                  │ │             │  │
│  │  450–600€/edition│ │                  │ │             │  │
│  │                  │ │                  │ │             │  │
│  │  Website         │ │                  │ │             │  │
│  │  5,000–8,000€    │ │                  │ │             │  │
│  └──────────────────┘ └──────────────────┘ └─────────────┘  │
│                                                              │
│  ┌──────────────────┐ ┌──────────────────┐                   │
│  │  OPERATIONS      │ │  ON-DEMAND       │                   │
│  │  MARKETING       │ │  RETAINER        │                   │
│  │                  │ │                  │                   │
│  │  LinkedIn mgmt   │ │  Monthly pack    │                   │
│  │  1,800–2,500€/mo │ │  Custom quote    │                   │
│  │                  │ │                  │                   │
│  │  Paid ads fee    │ │                  │                   │
│  │  8% of budget    │ │                  │                   │
│  │                  │ │                  │                   │
│  │  SEO (project)   │ │                  │                   │
│  │  Custom quote    │ │                  │                   │
│  └──────────────────┘ └──────────────────┘                   │
│  (card bg: #171717, border: 1px #262626, border-radius: md)  │
├─────────────────────────────────────────────────────────────┤
│  COMPARISON SECTION                                          │
│  H2: "Up to 60% savings vs traditional agencies"             │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐      │
│  │  SARANI                │  │  NETWORK AGENCY         │      │
│  │  ─────────────────     │  │  ─────────────────      │      │
│  │  Banner: 155–470€      │  │  Banner: 500–2,000€     │      │
│  │  Revisions: included   │  │  Revisions: 200–800€/ea │      │
│  │  Turnaround: 24h       │  │  Turnaround: 10–15 days │      │
│  │  Commitment: none      │  │  Retainer required      │      │
│  └────────────────────────┘  └────────────────────────┘      │
│  (Sarani column: accent cerulean #0babe8 for labels)         │
├─────────────────────────────────────────────────────────────┤
│  CLOSING CTA                                                 │
│  H2: "Start your first project today."                       │
│  [Start a project]  (flame #da5126)                         │
│  "First project satisfaction or no invoice."                 │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (standard)                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 — Mobile State (<768px)

```
┌──────────────────────────────┐
│ [Logo]          [≡ Menu]     │
├──────────────────────────────┤
│  H1 (2rem): "Fixed prices.   │
│   Zero surprises."           │
│  "No retainer. No minimum    │
│   commitment. Unlimited      │
│   revisions."                │
│  GUARANTEE (full-width bar): │
│  "Not satisfied? No invoice."│
├──────────────────────────────┤
│  PRICING CARDS (1-col stack):│
│  ┌────────────────────────┐  │
│  │  CONTENT CREATION      │  │
│  │  Banners: from 155€    │  │
│  │  Full rebranding: 5K€  │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  VIDEO PRODUCTION      │  │
│  │  Editing: from 360€    │  │
│  └────────────────────────┘  │
│  [Start a project] (full-w)  │
│  "First project satisfaction │
│   or no invoice."            │
└──────────────────────────────┘
```

#### 2.3 — Loading State

```
┌─────────────────────────────────────────────────────────────┐
│  H1 skeleton (████████████████████████)                     │
│  Subhead skeleton (████████████████)                        │
│  Guarantee strip skeleton (bg: #171717 pulse bar)           │
│  ┌────────┐ ┌────────┐ ┌────────┐  ← Pricing card skeletons│
│  │████████│ │████████│ │████████│                           │
│  └────────┘ └────────┘ └────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2.4 — Error State

```
All content is static/hardcoded — no API dependency on pricing page.
Error state only applies if the page itself 404s (should not occur).
```

#### 2.5 — Empty State

```
Not applicable — pricing data is hardcoded at Phase 1.
No CMS or dynamic pricing at launch.
```

---

### 3. Business Rules

**BR-104-1: All prices are public (no gating)**
Confirmed decision (project-context.md 2026-03-24): pricing page is open, not behind a contact form. No price is hidden.

**BR-104-2: Price display format**
- Format: `from [amount]€` for minimums; `[min]–[max]€` for ranges; `[amount]€` for fixed.
- European convention: `155€` not `€155` (per brand-voice.md Section 3.5).
- Source of prices: deck commercial data (project-context.md Notes Libres section):
  - Banner: 155–470€
  - Rebranding: 5,000€
  - Video sizzle: 360–900€
  - Video production turnkey: 3,800–99,800€
  - LinkedIn management: 1,800–2,500€/month
  - Newsletter: 450–600€/edition
  - Website: 5,000–8,000€
  - Paid ads: 8% of managed budget
  - Infographic: 180€ + 35€/language

**BR-104-3: Guarantee statement**
The exact phrase "First project satisfaction or no invoice." must appear verbatim on the pricing page (brand-voice.md Section 3.2). No paraphrase.

**BR-104-4: Comparison table**
The comparison table shows Sarani vs. "network agencies" (not naming Publicis, WPP etc. by name — legal risk). Use generic "Network agency" or "Traditional agency" label.

**BR-104-5: Responsive pricing grid**
- Desktop (>=1024px): 3-column card grid for top tier, 2-column for second row.
- Tablet (768px–1023px): 2-column grid.
- Mobile (<768px): 1-column stack.

---

### 4. Edge Cases

**EC-104-1: JavaScript disabled**
Page renders fully (static SSG). Umami tracking does not fire. Acceptable.
Test: Playwright `javaScriptEnabled: false` → verify all price items visible in DOM.

**EC-104-2: 320px viewport**
Pricing cards stack vertically. Comparison table collapses to 2 stacked blocks.
No horizontal overflow.
Test: Playwright `{ width: 320, height: 568 }` → `document.body.scrollWidth === 320`.

**EC-104-3: Very long price description text**
Price cards use CSS `word-break: break-word` and fixed card width. No card expands beyond its grid column.
Test: Playwright snapshot test — verify no card overflows its container.

**EC-104-4: Umami down**
Page renders normally. Event silently fails. No user-visible error.
Test: Block Umami script → verify pricing page loads and all content is visible.

---

### 5. Tracking Events

| User Action | Umami Event Name | Properties | KPI Impacted |
|---|---|---|---|
| Page load — /pricing | `page_view` (auto) | `{ path: "/pricing" }` | Pricing page visit rate |
| Click "Start a project" (pricing page) | `cta_click` | `{ location: "pricing_page", label: "start_a_project" }` | Site-to-lead conversion |
| Scroll to 50% | `scroll_depth` | `{ depth: "50", page: "pricing" }` | Marc engagement proxy |
| Scroll to 100% | `scroll_depth` | `{ depth: "100", page: "pricing" }` | Full pricing read |
| Click comparison table | `engagement` | `{ section: "pricing_comparison" }` | Marc persona validation |

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| Pricing data validation | Content | Accurate prices | Sarani team must confirm prices before go-live |
| `design-tokens.json` | Internal | Colors, layout | Done — @design |
| Umami tracking | Infrastructure | Event capture | Requires @infrastructure |

---

### 7. Performance Constraints

| Metric | Target | Notes |
|---|---|---|
| LCP on /pricing | < 2.5s desktop | Page is mostly text — should be very fast |
| Total page weight | < 500KB | No heavy images on pricing page |
| TTFB | < 600ms | SSG page, served from Replit CDN |

---
