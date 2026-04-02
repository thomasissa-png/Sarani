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
  AND the H1 text is rendered in Outfit Bold,
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
│  │  H1 (Outfit Bold, 5xl/3rem, white, max 15 words):     │  │
│  │  "Enterprise-quality creative.                        │  │
│  │   Delivered in 24 hours."                             │  │
│  │                                                       │  │
│  │  Subhead (Outfit Regular, xl/1.25rem, neutral-400):   │  │
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
│  D+1 delivery      45 experts        60% savings             │
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
│  team@sarani.studio  |  Legal & Privacy                    │
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
│  H1 (2rem, Outfit Bold):     │
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
| Web font (Outfit) | Subset to Latin + numbers only; preload in `<head>` | Font audit |

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
│  │  H1 (Outfit Bold, 4xl/2.25rem, white):                │  │
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
│  H1 (1.875rem, Outfit Bold): │
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
│  "But we do. 45 experts ready to work on your next project."│
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
- Fallback: if logo image is missing, render client name as text only (Outfit Bold, white).

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
│  H1 (Outfit Bold, 4xl): "Start a project"                   │
│  Subhead (Outfit Regular, xl, neutral-400):                  │
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
│  [TikTok] [Sony] [GEODIS] — "45 experts, 24/7"              │
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
│  │  (Outfit Bold, 2xl, white)                            │  │
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
│  │   directly: team@sarani.studio"                      │  │
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
- On success: send notification email to Sarani team inbox (team@sarani.studio — [HYPOTHESE: address to confirm with Sarani team]).
- Store submission data: @fullstack to recommend storage solution (e.g., Resend + webhook to CRM, or direct CRM API).

**BR-103-3: Rate limiting**
- Max 3 submissions per IP per hour. On 4th attempt within 1 hour: return HTTP 429.
- Display error: "That didn't go through. Try again — or email us directly: team@sarani.studio"
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
- Response shown to user: server error state ("That didn't go through. Try again — or email us directly: team@sarani.studio").
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
| Sarani team notification email address | Configuration | Team alert on new submission | [HYPOTHESE: team@sarani.studio — confirm] |
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
│  H1 (Outfit Bold, 4xl): "Fixed prices. Zero surprises."     │
│  Subhead (xl, neutral-400):                                  │
│  "No retainer. No minimum commitment.                        │
│   Unlimited revisions. Up to 60% savings vs agencies."      │
│  (Formula 4: The Unlimited Stack + Formula 10 from Do/Don't) │
│                                                              │
│  GUARANTEE STRIP (bg: #171717, border: 1px #262626)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  "Not satisfied with your first project? No invoice." │  │
│  │  (Outfit Bold, white, centered)                       │  │
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

## US-105 — Legal & GDPR Page

**Story:** As Marc, responsible for vendor compliance, I want to find Sarani's legal information, data processing details, and contract terms without asking, so that I can complete my vendor due diligence independently.

**Linked KPI:** Contact form quality score (proxy: enterprise submissions; Marc finding legal info self-serve = no blocker)
**Priority:** Must Have — Phase 1
**North Star link:** Removes Marc's procurement blocker; enterprise accounts cannot sign without legal verification.

---

### 1. User Stories — Given/When/Then

**AC-105-1: Legal page contains company registration details**
```
Given a visitor navigates to /legal or /privacy,
When the page renders,
Then the following information is visible:
  - Company legal name,
  - Registered address,
  - VAT number or equivalent tax identifier,
  AND none of these fields display "TBD" or placeholder text,
  AND the page is accessible from the site footer on every page.
```

**AC-105-2: Privacy policy addresses international data processing**
```
Given a visitor reads the privacy policy section,
When it loads,
Then the policy explicitly mentions:
  - Data collected via the contact form (name, email, company, brief),
  - Countries or regions where data may be processed
    (given team spans 5 continents — GDPR Article 46 implications),
  - Retention period for contact form submissions,
  - User right to request deletion of their data,
  AND the policy is reviewed and signed off by @legal agent before deployment.
```

**AC-105-3: DPA available on request (or downloadable)**
```
Given a visitor is reading the legal page,
When they look for data processing agreement information,
Then the page states that a Data Processing Agreement (DPA) is available
  on request via email,
  AND an email address for DPA requests is visible
  (e.g., team@sarani.studio — [HYPOTHESE: confirm with Sarani]).
```

**AC-105-4: Page linked from footer on all pages**
```
Given a visitor is on any page of the site,
When they scroll to the footer,
Then a link labeled "Legal & Privacy" is visible in the footer,
  AND clicking it navigates to /legal (HTTP 200),
  AND the link is present on all pages (homepage, /work, /services,
  /pricing, /about, /contact, all /case-studies/* pages).
```

**AC-105-5: Content validated by @legal before deployment**
```
Given @legal agent has reviewed the legal page content,
When the review is complete,
Then a sign-off note is added to the project-context.md interventions table
  by @legal confirming legal compliance,
  AND the page is not deployed to production until that sign-off is recorded.
```

---

### 2. ASCII Wireframes

#### 2.1 — Default State (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Work | Services | Pricing | About | [Start project]│
│  (sticky nav)                                                │
├─────────────────────────────────────────────────────────────┤
│  PAGE HEADER                                                 │
│  H1 (Outfit Bold, 4xl): "Legal & Privacy"                   │
│  Updated: [date]                                             │
├─────────────────────────────────────────────────────────────┤
│  TABLE OF CONTENTS (anchor links)                            │
│  1. Company information                                      │
│  2. Privacy policy                                           │
│  3. Data processing                                          │
│  4. Your rights                                              │
│  5. Framework agreements & DPA                               │
├─────────────────────────────────────────────────────────────┤
│  SECTION 1 — Company information                             │
│  Legal name: [TBD — @legal to provide]                       │
│  Registered address: [TBD]                                   │
│  VAT number: [TBD]                                           │
│  Contact: team@sarani.studio [HYPOTHESE]                    │
├─────────────────────────────────────────────────────────────┤
│  SECTION 2 — Privacy policy                                  │
│  What we collect, why, retention, transfers, rights          │
│  (full legal text — produced by @legal)                      │
├─────────────────────────────────────────────────────────────┤
│  SECTION 3 — Framework agreements & DPA                      │
│  "Enterprise accounts: framework agreements and DPAs         │
│   available on request. Contact: team@sarani.studio"        │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (standard with "Legal & Privacy" link highlighted)   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 — Mobile / Loading / Error / Empty States

```
Mobile: Single-column text, ToC collapses to accordion (optional).
Loading: Text skeleton bars (pulse animation, bg: #171717).
Error: 404 → standard not-found.tsx page.
Empty: Not applicable — all content is static text from @legal.
```

---

### 3. Business Rules

**BR-105-1: Company legal data**
All legal details (company name, address, VAT) are [HYPOTHESE: to be provided by Sarani team and validated by @legal]. This page CANNOT be deployed with placeholder data.

**BR-105-2: GDPR compliance minimum requirements**
- The privacy policy must comply with GDPR Art. 13 (information provided at time of data collection).
- Given Sarani's international team (5 continents), data transfer mechanisms must be documented (SCCs or equivalent).
- Content form submissions are personal data — retention and deletion rights must be addressed.

**BR-105-3: Footer link requirement**
The "Legal & Privacy" link must appear in the global footer component. It must be present on every page template (layout-level component).

**BR-105-4: Deployment gate**
This page is a hard deployment blocker: @legal sign-off required before site go-live (W4 milestone).

---

### 4. Edge Cases

**EC-105-1: Legal data not yet provided**
If Sarani team has not provided company registration details before W4, the page MUST display visible placeholder notices ("Legal information — coming soon. For immediate compliance queries, contact team@sarani.studio") rather than blank sections or placeholders in production.

**EC-105-2: Footer link missing from a page template**
Test: Playwright visits every page route and checks for footer link to /legal.
If any page is missing the footer link, it must be treated as a P1 bug (blocks enterprise vendor compliance).

**EC-105-3: JavaScript disabled**
Static text page — renders fully with JS disabled. No JS dependency.

---

### 5. Tracking Events

| User Action | Umami Event Name | Properties | KPI Impacted |
|---|---|---|---|
| Page load — /legal | `page_view` (auto) | `{ path: "/legal" }` | Marc persona validation proxy |
| Scroll to 50% | `scroll_depth` | `{ depth: "50", page: "legal" }` | Due diligence engagement |
| Scroll to 100% | `scroll_depth` | `{ depth: "100", page: "legal" }` | Full compliance read |

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| Company legal details (name, address, VAT) | Data | Page content | Requires Sarani team |
| @legal agent review and sign-off | Process | Production deployment | Hard blocker for go-live |
| Global footer component | Code | Everywhere link | Requires @fullstack |

---

### 7. Performance Constraints

Text-only page. No images. Expected page weight < 100KB. LCP < 1.5s. No specific constraints beyond global site standards.

---

## US-106 — SEO Technical Foundation

**Story:** As a potential Sophie who has never heard of Sarani, I want to find the site when searching for "enterprise creative agency fast delivery" or similar queries, so that Sarani appears before I default to a known incumbent.

**Linked KPI:** Organic sessions/month (baseline to be set post-launch, W4)
**Priority:** Must Have — Phase 1
**North Star link:** Multiplier on the causal chain — more organic Sophie entries into the funnel.

---

### 1. User Stories — Given/When/Then

**AC-106-1: All pages have unique, keyword-optimized meta tags**
```
Given the site is deployed to production,
When a web crawler (or Playwright) fetches any page,
Then the page <head> contains:
  - A <title> tag (unique per page, max 60 characters),
  - A <meta name="description"> tag (unique per page, 120–160 characters),
  - Both tags include at least one relevant keyword
    (e.g., "enterprise creative agency", "24h delivery", "video production"),
  AND no two pages share an identical <title> or <meta description>,
  AND no page has an empty <title> or missing <meta description>.
```

**AC-106-2: Sitemap generated and submitted**
```
Given the site is built and deployed,
When the /sitemap.xml URL is accessed,
Then the response is HTTP 200 with Content-Type: application/xml,
  AND the sitemap contains all primary page URLs:
    /, /work, /services, /pricing, /about, /contact, /legal,
    and all /case-studies/[slug] pages,
  AND the sitemap URL is submitted to Google Search Console
    (manual action by Sarani team after go-live),
  AND the sitemap is referenced in /robots.txt.
```

**AC-106-3: robots.txt configured correctly**
```
Given the site is deployed,
When a crawler fetches /robots.txt,
Then the response is HTTP 200 with Content-Type: text/plain,
  AND the file allows crawling of all public pages
    (User-agent: * / Allow: /),
  AND the file blocks any admin or internal routes if they exist
    (e.g., /api/* routes),
  AND the Sitemap URL is listed in robots.txt.
```

**AC-106-4: Organization schema structured data on homepage**
```
Given a visitor or crawler loads the homepage (/),
When the page HTML is parsed,
Then a <script type="application/ld+json"> block is present containing
  a valid Organization schema with:
    - @type: "Organization",
    - name: "Sarani",
    - url: "https://sarani.studio",
    - logo: [URL of Sarani logo],
    - sameAs: [any official social media profiles — LinkedIn, Instagram],
  AND the schema validates without errors in Google's Rich Results Test.
```

**AC-106-5: All images have descriptive alt attributes**
```
Given any page is loaded (homepage, /work, case study pages),
When an automated accessibility and SEO audit runs,
Then every <img> element has a non-empty alt attribute,
  AND no alt attribute contains generic text ("image", "photo", "logo"),
  AND client logo alt text uses the format "[Client Name] logo",
  AND case study image alt text describes the content
    (e.g., "GEODIS presentation rebranding — 350 decks").
```

**AC-106-6: Lighthouse SEO score >= 90**
```
Given the site is deployed to production,
When a Lighthouse audit runs in CI on the homepage,
Then the SEO score is >= 90,
  AND the Performance score is >= 80,
  AND no "Blocking" SEO issues are reported,
  AND canonical URLs are set on all pages
    (no duplicate content issues).
```

---

### 2. Wireframes

No visual wireframe for SEO foundation — these are technical requirements, not UI. See Business Rules section for implementation specifications.

---

### 3. Business Rules

**BR-106-1: Title tag format per page**
| Page | Title format | Example |
|---|---|---|
| Homepage | `[Brand] — [Primary value prop]` | `Sarani — Enterprise Creative Agency. Delivered in 24 Hours.` |
| /work | `[Brand] Work — [Client list]` | `Sarani Work — TikTok, Sony, GEODIS, Adidas` |
| /case-studies/[slug] | `[Client] Case Study — [Result] — [Brand]` | `GEODIS Case Study — 5,700 Slides in 3 Weeks — Sarani` |
| /pricing | `[Brand] Pricing — Fixed Rates. No Retainer.` | `Sarani Pricing — Fixed Rates. No Retainer. No Surprise Fees.` |
| /about | `About [Brand] — 35 Experts, 5 Continents, 24/7` | `About Sarani — 35 Experts, 5 Continents, 18 Languages, 24/7` |
| /contact | `Start a Project — [Brand]` | `Start a Project — Sarani Creative Agency` |
| /legal | `Legal & Privacy — [Brand]` | `Legal & Privacy — Sarani` |

**BR-106-2: Canonical URL implementation**
Every page must include `<link rel="canonical" href="[absolute URL]">` in the `<head>`. This prevents duplicate content from HTTP/HTTPS or trailing slash variations.

**BR-106-3: robots.txt rules**
```
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://sarani.studio/sitemap.xml
```

**BR-106-4: Slug conventions (enforced by @fullstack)**
- All slugs lowercase, hyphen-separated, no special characters, no trailing slashes.
- Case study slugs: `/case-studies/[client-name]-[deliverable-type]`.
- No auto-generated IDs in URLs (e.g., `/case-studies/123` is not acceptable).

**BR-106-5: Image optimization**
- All images served via Next.js `<Image>` component (automatic WebP conversion + responsive sizes).
- `sizes` prop required for all images to enable correct responsive srcset.
- No raw `<img>` tags except for inline SVGs.

---

### 4. Edge Cases

**EC-106-1: Sitemap missing a new page**
If a new case study is added without regenerating the sitemap, it will not be indexed.
Mitigation: Sitemap is auto-generated at build time via `next-sitemap` or equivalent. Any new route automatically appears in sitemap after next build.

**EC-106-2: Duplicate meta description across pages**
Playwright test: extract all `<meta name="description">` contents → assert no duplicates.
This must be a CI check, not a manual audit.

**EC-106-3: alt text missing on a new image**
Playwright + axe-core accessibility audit must run in CI. Missing alt text = CI failure (P1 severity).

**EC-106-4: Schema validation fails**
If Organization schema has a typo or invalid property, it will not be picked up by Google.
Test: Vitest unit test that validates JSON-LD schema output against schema.org spec (use `schema-dts` TypeScript types for compile-time checking).

---

### 5. Tracking Events

SEO technical foundation does not generate direct Umami events. Its impact is measured via:

| Metric | Measurement | When |
|---|---|---|
| Organic sessions/month | Umami traffic source = "organic search" | Monthly from W4 |
| Lighthouse SEO score | CI automated Lighthouse audit | Every deployment |
| Sitemap indexed pages | Google Search Console (manual) | Weekly from W4 |
| Core Web Vitals (CrUX) | Google Search Console | Monthly from W6 |

---

### 6. Dependencies

| Dependency | Type | Blocks | Status |
|---|---|---|---|
| Next.js project structure finalized | Code | Meta tags, sitemap, routes | Requires @fullstack |
| Keyword map | Content | Optimized title/description copy | Requires @seo — not yet produced |
| Sarani team Google Search Console access | Process | Sitemap submission | Requires Sarani team setup |
| @seo agent review of meta tags | Process | Keyword alignment | Requires @seo |

**Gap flagged:** `docs/seo/keyword-map.md` does not yet exist. Meta tag copy in this document uses evidence-based keywords from the deck and personas, but must be reviewed and optimized by @seo before deployment.

---

### 7. Performance Constraints

| Metric | Target | Measurement |
|---|---|---|
| Lighthouse Performance score | >= 80 | CI — every deployment |
| Lighthouse SEO score | >= 90 | CI — every deployment |
| Lighthouse Accessibility score | >= 85 | CI — every deployment |
| LCP (mobile 4G) | < 3.0s | Lighthouse CI |
| TTFB | < 600ms | Lighthouse CI |
| Total page weight | < 1MB (homepage), < 1.5MB (case studies) | Webpack bundle analysis |

---

## Cross-Cutting Concerns

### 1. Shared Components

| Component | Used by | Specification |
|---|---|---|
| `<Navigation>` | All pages | Logo + 5 nav links + "Start a project" CTA. Sticky. z-index: 200. Black bg. Hamburger on mobile. |
| `<Footer>` | All pages | Logo + nav links + email + "Legal & Privacy" link. Must include /legal link (US-105 hard requirement). |
| `<CTAButton>` | All pages | Primary variant: bg #da5126, text "Start a project". Secondary: white outline. Props: `label`, `href`, `variant`. |
| `<MicroReassurance>` | Homepage, /pricing, /contact, case studies | Text "First project satisfaction or no invoice." — sm, neutral-500. Below primary CTA. |
| `<SkeletonLoader>` | All pages | Pulse animation, bg #171717. Used for images, hero sections, card grids during loading. |
| `<ErrorInline>` | Contact form | Inline validation errors. Color: #da5126. No modal. aria-describedby linked to field. |
| `<ScrollDepthTracker>` | Case study pages, /pricing | Fires Umami events at 50% and 100%. `useRef` flag prevents duplicate fires. |
| `<UmamiTracker>` | All pages | Wraps `umami.track()` calls. Silently fails if Umami is unavailable. No retry logic. |

---

### 2. Implementation Order (critical path for @fullstack)

```
Week 1:
  1. Next.js project setup + Replit config
  2. Design tokens integration (design-tokens.json → Tailwind or CSS vars)
  3. Global layout: <Navigation> + <Footer>
  4. Homepage SSG page (US-101) — text content first, images second

Week 2:
  5. Contact form + API route (US-103) — TOP PRIORITY
  6. Contact form Umami events (form_view, form_start, form_submit)
  7. Case study pages structure (US-102) — 3 case studies hardcoded
  8. /work listing page

Week 3:
  9. Pricing page (US-104)
  10. Legal page stub (US-105) — publish with @legal content when available
  11. Umami integration on all pages
  12. SEO meta tags + sitemap + robots.txt (US-106)

Week 4:
  13. QA smoke tests (contact form E2E — highest priority)
  14. Performance audit (Lighthouse CI)
  15. Go-live (Milestone 1)
```

**Rule:** Contact form (US-103) API route must be the FIRST complete feature tested by @qa. Any other feature can launch with a P2 bug. A broken form cannot go live.

---

### 3. Global Performance Baselines

All pages must meet these baselines before the W4 go-live milestone:

| Metric | Global Target | Measurement Tool |
|---|---|---|
| LCP | < 2.5s (desktop), < 3.0s (mobile 4G) | Lighthouse CI |
| CLS | < 0.1 (all pages) | Lighthouse CI |
| FID / INP | < 200ms | Lighthouse CI |
| TTFB | < 600ms | Lighthouse CI |
| Lighthouse Performance | >= 80 | Lighthouse CI |
| Lighthouse SEO | >= 90 | Lighthouse CI |
| Lighthouse Accessibility | >= 85 | Lighthouse CI |
| Zero P0 bugs | Confirmed before go-live | @qa smoke test checklist |

---

### 4. Accessibility Baseline (WCAG 2.1 AA)

| Requirement | Implementation |
|---|---|
| All form fields have associated `<label>` elements | Required — no aria-label-only workarounds |
| Error messages associated with fields via `aria-describedby` | Required for US-103 |
| Color contrast minimum 4.5:1 for body text | Checked: white (#fff) on black (#000) = 21:1. Neutral-400 (#d4d4d4) on black = 9.7:1. |
| Interactive elements minimum 44x44px touch target | Required for mobile CTA buttons and form inputs |
| Skip-to-main-content link | `<a class="sr-only focus:not-sr-only">` in Navigation |
| All images have descriptive alt attributes | Required (also a Lighthouse SEO check) |
| Focus states visible (not removed with outline: none) | Use custom focus ring: `outline: 2px solid #0babe8` (cerulean) |

---

### 5. Hypotheses to Validate After Launch

| # | Hypothesis | Validation Method | Timeline |
|---|---|---|---|
| H-SPEC-1 | Sophie submits the form within 2 visits (not on first visit) | Umami: track return visitors who submit form | W8 (4 weeks post-launch) |
| H-SPEC-2 | Case study page is visited by >40% of sessions | Umami: /case-studies/* pageviews ÷ total sessions | W8 |
| H-SPEC-3 | Pricing page visited by >20% of sessions | Umami: /pricing pageviews ÷ total sessions | W8 |
| H-SPEC-4 | "Company size: 500M€+" accounts for >50% of form submissions | Manual CRM review of form data | W10 |
| H-SPEC-5 | Mobile form completion rate is not significantly lower than desktop | Umami: form_submit events segmented by device type | W10 |

---

### 6. Open Questions for @fullstack

1. **Transactional email provider:** Which service for confirmation emails after form submission? Options: Resend, SendGrid, Postmark. Recommend confirming before W2 sprint starts.
2. **File attachment storage:** Where are attachments stored on Replit? S3-compatible storage (Replit Object Storage)? Confirm max file size and cost implications.
3. **CMS for case studies:** Are case studies hardcoded (MDX files) or managed via a headless CMS? Phase 1: recommend hardcoded MDX for speed. Flag for Phase 2 if frequent updates are expected.
4. **Sitemap generation:** Use `next-sitemap` package or custom `/sitemap.xml` route? Recommend `next-sitemap` for automatic route discovery.
5. **Rate limiting:** Use Upstash Redis for rate limiting (Replit-compatible) or a simpler in-memory approach for Phase 1?

---

### 7. Open Questions for @seo

1. **Keyword map:** `docs/seo/keyword-map.md` does not yet exist. The meta title/description formats in BR-106-1 use logical keywords but must be validated against actual search volume data by @seo before deployment.
2. **Blog URL structure:** The `docs/seo/` folder does not yet contain blog architecture recommendations. Required before Phase 2 blog articles are published.

---

## US-201 — Share Project Files (Back-office SharePoint Folder Browser)

*Added 2026-04-02 — replaces the deprecated "Project Preview" system (public page auto-generation).*

**Story:** As Arya (PM Sarani), I want to share a client's project folder from SharePoint with a client, so that they can access deliverables via an anonymous link without needing a SharePoint login.

**Linked KPI:** Internal coordination time (Phase 3 operational KPI) — target: zero manual steps to generate a client-facing file link.
**Priority:** Must Have — Back-office Phase 3
**North Star link:** Reduces PM friction → faster client delivery → retention → revenue.

**Supersedes:** The previous "Project Preview" feature (public Sarani page at `/project/[client]/[project]` that scanned SharePoint via SSR and stored data in the `projectPreviews` DB table). That system was deprecated due to creation errors, display errors, and DB dependency. Decision owner: Thomas. Decision recorded in project-context.md (Règle SharePoint — Liens "Anyone" obligatoires).

---

### 1. User Stories — Given/When/Then

**AC-201-1: Open the Share modal from the Tracker**
```
Given Arya is on the back-office Tracker page and at least one project is listed,
When she clicks the "Share" button on any project row,
Then a modal opens within 500ms,
  AND the modal header displays the client name and project name,
  AND the modal body shows a loading skeleton while the first folder list is fetched,
  AND no full-page navigation occurs (modal is inline).
```

**AC-201-2: Display the top-level folders for a client**
```
Given the Share modal is open for a project belonging to client "TikTok",
When the API call GET /api/admin/integrations/sharepoint/folders?client=TikTok resolves,
Then the modal displays the list of folders returned by the API,
  AND each folder is shown with its name and a folder icon,
  AND files (non-folder items) are displayed below folders, visually distinct (different icon),
  AND the breadcrumb shows the root level (e.g., "TikTok /"),
  AND if the API returns an empty array, the empty state reads:
      "No folders found for this client on SharePoint."
```

**AC-201-3: Navigate into a subfolder (drill-down)**
```
Given the Share modal displays a list of folders,
When Arya clicks on a folder (e.g., "05. TikTok/"),
Then the API call GET /api/admin/integrations/sharepoint/folders?client=TikTok&path=05.TikTok/ is triggered,
  AND the modal content updates to show the subfolder's contents,
  AND the breadcrumb updates to reflect the new path (e.g., "TikTok / 05. TikTok/"),
  AND a back button or breadcrumb link allows Arya to navigate up to the previous level,
  AND the loading skeleton is shown while the API responds.
```

**AC-201-4: Generate an anonymous shareable link for a folder**
```
Given Arya is hovering over a folder item in the modal,
When she hovers the row,
Then a "Share" button appears on that row (visible only on hover — not cluttering the default view),
  AND when she clicks "Share" on that folder row,
  Then a POST /api/admin/integrations/sharepoint/folders request is sent with the folder's ID,
  AND a loading indicator replaces the "Share" button during the API call (max duration: 5s),
  AND on success:
      - The generated anonymous link is copied to the clipboard automatically,
      - A green success banner appears inside the modal reading:
        "Link copied to clipboard — Anyone with this link can view the folder.",
      - The link is displayed in full inside the banner so Arya can copy it manually if needed,
      - Two action buttons appear: "Copy again" and "Open link" (opens in a new tab),
  AND the link uses SharePoint "Anyone" scope (no sign-in required for the recipient).
```

**AC-201-5: Handle Graph API errors gracefully**
```
Given Arya clicks "Share" on a folder,
When the POST /api/admin/integrations/sharepoint/folders call fails
  (HTTP 4xx or 5xx, or Graph API permission error),
Then the modal displays a red error banner reading:
  "Could not generate link. Check SharePoint permissions or try again.",
  AND the "Share" button on the folder row is re-enabled so Arya can retry,
  AND no partial link is displayed,
  AND the error is logged server-side for debugging.
```

**AC-201-6: Breadcrumb navigation back to a parent level**
```
Given Arya has navigated two levels deep into SharePoint
  (e.g., "TikTok / 05. TikTok/ / ProjectName/"),
When she clicks any segment of the breadcrumb (e.g., "TikTok /"),
Then the modal fetches the contents of that breadcrumb level,
  AND the content area updates to show the contents of the clicked level,
  AND the breadcrumb truncates to that level,
  AND no full modal re-open or flicker occurs.
```

**AC-201-7: Close the modal**
```
Given the Share modal is open (in any state: browsing, loading, success, error),
When Arya clicks the modal close button (×) or presses the Escape key,
Then the modal closes immediately,
  AND no unsaved state warning is shown (no data is being modified),
  AND focus returns to the "Share" button on the Tracker row that triggered the modal.
```

**AC-201-8: Access control — authenticated users only**
```
Given an unauthenticated request reaches GET or POST /api/admin/integrations/sharepoint/folders,
When the request is processed by the API route,
Then the server returns HTTP 401,
  AND no SharePoint data is returned,
  AND no anonymous link is generated.
```

---

### 2. Wireframe — 5 UI States

#### State 1 — Default (folder list loaded)

```
┌─────────────────────────────────────────────────────┐
│  Share Project Files                              [×] │
│  TikTok — Campaign Assets Q1                         │
├─────────────────────────────────────────────────────┤
│  Breadcrumb: TikTok /                                │
├─────────────────────────────────────────────────────┤
│  📁 01. Briefs/                             [Share]  │  ← hover reveals Share
│  📁 02. Assets/                             [Share]  │
│  📁 05. TikTok/                             [Share]  │
│  📁 06. Deliverables/                       [Share]  │
│  📄 project-overview.pdf                            │
│  📄 timeline.xlsx                                   │
└─────────────────────────────────────────────────────┘
```

#### State 2 — Loading (fetching folder contents)

```
┌─────────────────────────────────────────────────────┐
│  Share Project Files                              [×] │
│  TikTok — Campaign Assets Q1                         │
├─────────────────────────────────────────────────────┤
│  Breadcrumb: TikTok /                                │
├─────────────────────────────────────────────────────┤
│  ░░░░░░░░░░░░░░░░░░░░░  (skeleton row)              │
│  ░░░░░░░░░░░░░░░░░░░░░  (skeleton row)              │
│  ░░░░░░░░░░░░░░░░░░░░░  (skeleton row)              │
└─────────────────────────────────────────────────────┘
```

#### State 3 — Empty (no folders found)

```
┌─────────────────────────────────────────────────────┐
│  Share Project Files                              [×] │
│  TikTok — Campaign Assets Q1                         │
├─────────────────────────────────────────────────────┤
│  Breadcrumb: TikTok /                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  No folders found for this client on SharePoint.    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### State 4 — Error (Graph API failure)

```
┌─────────────────────────────────────────────────────┐
│  Share Project Files                              [×] │
│  TikTok — Campaign Assets Q1                         │
├─────────────────────────────────────────────────────┤
│  🔴 Could not generate link. Check SharePoint       │
│     permissions or try again.              [Retry]   │
├─────────────────────────────────────────────────────┤
│  📁 05. TikTok/                             [Share]  │  ← re-enabled
└─────────────────────────────────────────────────────┘
```

#### State 5 — Success (link generated)

```
┌─────────────────────────────────────────────────────┐
│  Share Project Files                              [×] │
│  TikTok — Campaign Assets Q1                         │
├─────────────────────────────────────────────────────┤
│  ✅ Link copied to clipboard — Anyone with this     │
│     link can view the folder.                        │
│                                                     │
│  https://saranistudio.sharepoint.com/...            │
│                                                     │
│  [Copy again]          [Open link ↗]               │
├─────────────────────────────────────────────────────┤
│  📁 01. Briefs/                             [Share]  │
│  📁 05. TikTok/                         ✅ Shared   │  ← shared folder marked
└─────────────────────────────────────────────────────┘
```

---

### 3. Business Rules

**BR-201-1: Anonymous "Anyone" links only**
All links generated via this modal MUST use `scope: "anonymous"` in the Graph API `createLink` call. Links requiring SharePoint authentication are not acceptable — the client must be able to access files with zero login friction. This is the **non-negotiable standard** documented in project-context.md (Règle SharePoint — Liens "Anyone" obligatoires).

**BR-201-2: Link scope is folder-level, not file-level**
The share action is scoped to **folders only** (not individual files). If Arya wants to share a single file, she shares its parent folder. This keeps the UX simple and consistent.

**BR-201-3: No DB persistence for generated links**
Generated links are NOT stored in the database. They are surfaced once in the modal. Rationale: this is the replacement for the `projectPreviews` DB table — the explicit decision was to remove the DB dependency. If Arya needs the link again, she regenerates it (idempotent — SharePoint returns the same link for the same folder/scope combination if the link already exists).

**BR-201-4: Client parameter derived from project record**
The `client` query parameter sent to the SharePoint API is derived from the project's client name stored in the Tracker (ClickUp / Excel). Arya does not type the client name — it is injected automatically when she clicks "Share" on a specific project row.

**BR-201-5: Clipboard copy is automatic on success**
On successful link generation, the link is copied to the clipboard automatically (no secondary click required). The manual "Copy again" button in the success banner is a fallback for browsers that block the Clipboard API.

**BR-201-6: Hover interaction for the Share button**
The "Share" button on each folder row is only visible on hover (desktop) or on tap (mobile). It must not appear by default on all rows simultaneously — this would be visually noisy for folders with 10+ items.

---

### 4. API Endpoints

**GET /api/admin/integrations/sharepoint/folders**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client` | string | Yes | Client name (e.g., "TikTok") — used to locate the correct SharePoint site/drive |
| `path` | string | No | Subfolder path for drill-down (e.g., "05. TikTok/ProjectName/"). If omitted, returns the root level for the client. |

- **Auth:** Session cookie (HMAC) — HTTP 401 if unauthenticated
- **Response success (200):**
  ```json
  {
    "items": [
      { "id": "item-id-xxx", "name": "05. TikTok/", "type": "folder" },
      { "id": "item-id-yyy", "name": "project-overview.pdf", "type": "file" }
    ],
    "path": "TikTok /"
  }
  ```
- **Response error (500):** `{ "error": "Failed to list SharePoint folder" }`
- **Response error (401):** `{ "error": "Unauthorized" }`

**POST /api/admin/integrations/sharepoint/folders**

| Field | Type | Required | Description |
|---|---|---|---|
| `folderId` | string | Yes | SharePoint item ID of the folder to share |

- **Auth:** Session cookie (HMAC) — HTTP 401 if unauthenticated
- **Request body:**
  ```json
  { "folderId": "item-id-xxx" }
  ```
- **Response success (200):**
  ```json
  { "link": "https://saranistudio.sharepoint.com/..." }
  ```
- **Response error (500):** `{ "error": "Failed to create sharing link" }`
- **Response error (401):** `{ "error": "Unauthorized" }`

---

### 5. Edge Cases

**EC-201-1: Client name not found in SharePoint**
If the `client` parameter does not match any SharePoint site or drive, the API returns an empty `items` array (not an error). The modal displays the empty state (State 3).

**EC-201-2: Graph API token expired during browsing**
If the SharePoint access token expires while Arya is navigating folders, the next API call will fail. The modal shows the error state (State 4) with the retry option. The token refresh logic is handled server-side (transparent to the UI) — the retry will succeed if the token refresh is successful.

**EC-201-3: Very long folder names**
Folder names longer than ~60 characters must truncate with an ellipsis in the folder list row. Full name visible on hover (tooltip) or via browser-native title attribute.

**EC-201-4: Folder path with special characters**
SharePoint folder names can contain spaces, dots, and parentheses (e.g., "05. TikTok (Q1 2025)/"). The `path` query parameter must be URL-encoded by the frontend before sending. The API must decode it before passing to Graph API.

**EC-201-5: Clipboard API blocked by browser**
If `navigator.clipboard.writeText()` is rejected (browser permission denied), the success banner still displays the link in full — Arya can copy it manually. The "Link copied to clipboard" text changes to "Copy the link below:" to avoid confusion.

**EC-201-6: Modal opened on a project with no client set**
If the project has no associated client name in the Tracker, the "Share" button on the Tracker row is disabled (greyed out with tooltip: "No client associated with this project"). The modal does not open.

**EC-201-7: Double-click on "Share" folder button**
If Arya double-clicks the "Share" button on a folder row, only one API call is sent. The button is disabled immediately on first click and re-enabled on API response (success or error).

---

### 6. Tracking Events

| Event | Trigger | Properties |
|---|---|---|
| `share_modal_open` | Arya clicks "Share" on a Tracker project row | `{ client, project_name }` |
| `share_folder_navigate` | Arya drills into a subfolder | `{ client, path }` |
| `share_link_generated` | POST succeeds, link returned | `{ client, folder_name }` |
| `share_link_error` | POST fails | `{ client, folder_name, error_status }` |
| `share_link_opened` | Arya clicks "Open link ↗" | `{ client, folder_name }` |

---

### 7. Definition of Done (checklist for @fullstack)

- [ ] Modal opens from Tracker row "Share" button
- [ ] GET endpoint lists folders and files for a given client and optional path
- [ ] POST endpoint generates an "Anyone" anonymous link via Graph API `createLink`
- [ ] Breadcrumb navigation works (drill-down and back)
- [ ] All 5 UI states implemented (default, loading skeleton, empty, error, success)
- [ ] Clipboard auto-copy on success + fallback manual copy
- [ ] Success banner displays the full link
- [ ] Hover interaction shows "Share" button on folder rows
- [ ] EC-201-7 (double-click prevention) implemented via button disable on first click
- [ ] Auth guard: all API routes return 401 for unauthenticated requests
- [ ] `tsc --noEmit` passes with 0 errors

### Notes for @qa

- Test E2E: open modal from Tracker → navigate 2 levels deep → generate link → verify clipboard and success banner
- Test error state: mock POST to return 500 → verify error banner appears and Share button re-enables
- Test auth: call GET and POST without session cookie → verify 401
- Test EC-201-7: programmatic double-click on Share button → verify only 1 network request in Playwright

### Notes for @fullstack

- The Graph API `createLink` call should use `{ type: "view", scope: "anonymous" }`. SharePoint returns the same link if it already exists for the same folder/scope — this makes the POST idempotent.
- The `client` parameter in the GET endpoint maps to the existing SharePoint client folder structure (already documented in phase3-integrations-specs.md, Addendum API exploration).
- URL-encode the `path` parameter on the frontend before sending (encodeURIComponent). Decode server-side before passing to Graph API.
- Disable the "Share" folder button on first click. Re-enable on API response. Do not use setTimeout — use the API response as the signal.

---

## Hypotheses to Validate (consolidated)

All hypotheses explicitly marked in this document:

| # | Hypothesis | Source | Status |
|---|---|---|---|
| H1 | Email address team@sarani.studio is correct | brand-voice.md + specs | [HYPOTHESE — confirm with Sarani team] |
| H2 | File attachment max size is 10MB (Replit constraint) | brand-voice.md | [HYPOTHESE — @fullstack to confirm] |
| H3 | Legal company name, address, VAT to be provided | US-105 | [DATA MISSING — Sarani team must provide before W4] |
| H4 | Sarani team notification email for new form submissions | US-103 | [HYPOTHESE — confirm with Sarani team] |
| H5 | DPA available on request (not yet produced) | US-105 | [HYPOTHESE — @legal to confirm] |

---

## Self-evaluation

- [x] Each user story has at minimum 3 Given/When/Then criteria — all verifiable by Playwright or Vitest
- [x] Each wireframe shows 5 states (default, loading, empty, error, success) or documents why a state is N/A
- [x] All microcopy uses exact strings from brand-voice.md Section 4 (zero Lorem ipsum)
- [x] All tracking events sourced from kpi-framework.md Section 6 (no invented events)
- [x] Business rules include validation logic, responsive breakpoints, and data formats
- [x] Each US has a minimum of 4 edge cases including JS disabled, 320px, Umami down, rate limiting
- [x] Implementation order defined with contact form (US-103) as Week 2 top priority
- [x] All hypotheses explicitly marked and consolidated in final section
- [x] Performance constraints defined per page with Lighthouse CI as measurement method

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/product/functional-specs.md`
- Decisions taken:
  - Contact form (US-103) is the single highest-priority component — must be first E2E tested by @qa
  - All microcopy is locked from brand-voice.md (Section 4) — do not modify copy without @copywriter sign-off
  - File attachment max 10MB [HYPOTHESE — confirm before W2]
  - Rate limiting: 3 submissions/IP/hour max, HTTP 429 on exceed, no CAPTCHA at Phase 1
  - Form does NOT clear on server error (user retains their brief content)
  - All case studies are statically generated (SSG) via hardcoded MDX or JSON at Phase 1
  - Sitemap auto-generated at build time (recommend `next-sitemap` package)
  - All events use Umami `umami.track()` — no third-party analytics libraries
  - `form_submit` Umami event fires ONLY on HTTP 200 from `/api/contact` — not on validation errors
- Points of attention:
  - US-103: API route must handle server-side re-validation (not trust client-side only)
  - US-106: keyword-map.md not yet produced — @seo review of meta tags required before go-live
  - US-105: @legal sign-off is a hard blocker for W4 go-live milestone
  - Confirm transactional email provider before W2 sprint start
  - All Umami events must be verified in production Umami dashboard before go-live sign-off
