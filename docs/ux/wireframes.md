# Sarani — Wireframes
*Produced by @ux — 2026-03-24*
*Language: English*
*Sources: functional-specs.md (US-101 to US-106), design-system.md, brand-voice.md, personas.md*

> **Scope:** This document enriches the wireframes in functional-specs.md. It does NOT duplicate the homepage (US-101) or case study listing (US-102) wireframes already specified there. Focus: missing screens (About, Case Study Detail full states, Navigation states) + missing states (all 5 states per screen) + responsive + accessibility annotations.

> **Convention:** Tab order annotated as `← tab: N`. Heading levels as `<h1>`, `<h2>`, `<h3>`. ARIA landmarks as `role="..."`. Focus ring: Flame #da5126, 2px offset. Skip link: first focusable element on all pages.

---

## Table of Contents

1. [Navigation States](#1-navigation-states)
2. [About Page](#2-about-page)
3. [Case Study Detail — Complete Wireframe](#3-case-study-detail--complete-wireframe)
4. [Contact Form — All States](#4-contact-form--all-states)
5. [Pricing Page — Missing States](#5-pricing-page--missing-states)
6. [404 Page](#6-404-page)
7. [Accessibility Summary — All Pages](#7-accessibility-summary--all-pages)

---

## 1. Navigation States

### 1.1 Desktop Nav — Default (scroll position 0)

```
┌─────────────────────────────────────────────────────────────┐
│  [Skip to main content] ← tab:1 (visually hidden, shown     │
│   on focus — white on flame #da5126, top-left)               │
├─────────────────────────────────────────────────────────────┤
│  role="banner" aria-label="Site header"                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Sarani Logo + wordmark] ← tab:2, aria-label="Sarani │  │
│  │   home", links to /                                   │  │
│  │                                                       │  │
│  │  <nav role="navigation" aria-label="Main navigation"> │  │
│  │  Work ← tab:3     Services ← tab:4                    │  │
│  │  Pricing ← tab:5  About ← tab:6                       │  │
│  │                                                       │  │
│  │  [Start a project] ← tab:7                            │  │
│  │  role="link", bg: flame #da5126, text: black          │  │
│  │  border-radius: full (pill shape)                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  bg: #000000, border-bottom: 1px #262626                     │
│  position: sticky, top: 0, z-index: 200                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Desktop Nav — Scrolled State (scroll > 0)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]   Work   Services   Pricing   About   [Start ▸]      │
│  ─────────────────────────────────────────────────────────── │
│  Identical to default — sticky behavior means nav is always  │
│  visible. No change in appearance on scroll (dark bg          │
│  already opaque; no need for scroll-triggered opacity).      │
│  Active page indicator: current nav item gets                │
│  color: white (vs neutral-400 for inactive items)            │
│  and optional bottom border: 1px flame #da5126               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Mobile Nav — Closed State (<768px)

```
┌──────────────────────────────────┐
│  role="banner"                   │
│  [Logo] ← tab:2              [≡] │ ← tab:3, aria-label="Open menu",
│  (sticky, black bg)              │   aria-expanded="false",
│                                  │   aria-controls="mobile-nav"
└──────────────────────────────────┘
```

### 1.4 Mobile Nav — Open State (<768px)

```
┌──────────────────────────────────┐
│  [Logo]                      [✕] │ ← tab:3, aria-label="Close menu"
│  bg: #000000, z-index: 300       │   aria-expanded="true"
│  (full-screen overlay)           │
├──────────────────────────────────┤
│  <nav id="mobile-nav"            │
│   aria-label="Mobile navigation">│
│                                  │
│  Work ← tab:4                    │
│  Services ← tab:5                │
│  Pricing ← tab:6                 │
│  About ← tab:7                   │
│                                  │
│  ────────────────────────────    │
│                                  │
│  [Start a project] ← tab:8       │
│  Full-width, flame #da5126       │
│  Pinned at bottom of overlay     │
│                                  │
│  "First project or no invoice."  │
│  (neutral-500, sm)               │
└──────────────────────────────────┘

Behavior:
- Opens: focus moves to first nav item (Work) — trap focus within overlay
- Escape key: closes overlay, returns focus to hamburger button
- Background scroll: locked (overflow: hidden on body)
- Announcement: aria-live="polite" "Navigation menu opened"
```

### 1.5 Focus State — All Nav Items

```
[Work]           ← default: neutral-400 text
[Work]           ← hover: white text
[Work] ________  ← focus: flame #da5126 outline (2px, 2px offset)
                    visible ring, not just color change (WCAG 2.2 §2.4.11)

[Start a project] ← default: black text on flame bg
[Start a project] ← focus: white outline (2px, 2px offset) over flame bg
```

---

## 2. About Page

### 2.1 Default State — Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  [Skip link] [Nav — standard sticky]                         │
├─────────────────────────────────────────────────────────────┤
│  <main role="main" id="main-content">                        │
│                                                              │
│  HERO — ABOUT                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  <h1> (Outfit Bold, 5xl, white):                      │  │
│  │  "We're the creative team enterprises call            │  │
│  │   when every other agency says two weeks."            │  │
│  │                                                       │  │
│  │  ← tab:8 (first main content element after nav)       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ORIGIN — 2-col (8col + 4col sidebar)                        │
│  <section aria-labelledby="about-origin">                    │
│  ┌──────────────────────────────────┐ ┌──────────────────┐  │
│  │  <h2 id="about-origin">          │ │  AT A GLANCE     │  │
│  │  "Built for the speed            │ │  ──────────────  │  │
│  │   of enterprise."  </h2>         │ │  Founded: 2020   │  │
│  │                                  │ │  Team: 45 experts│  │
│  │  Body (Outfit Regular, base,     │ │  Continents: 5   │  │
│  │  neutral-200):                   │ │  Languages: 18   │  │
│  │  "In 2020, Sarani was built on   │ │  Clients: 24/7   │  │
│  │  one observation: the world's    │ │                  │  │
│  │  largest brands were being slowed│ │  ──────────────  │  │
│  │  down by the agencies they paid  │ │  [Start a        │  │
│  │  to accelerate them..."          │ │   project]       │  │
│  │                                  │ │  ← tab:9         │  │
│  └──────────────────────────────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  CAPABILITIES — 3-col grid                                   │
│  <section aria-labelledby="about-capabilities">              │
│  <h2 id="about-capabilities">                                │
│  "What we do"  </h2>                                         │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ <h3>         │ │ <h3>         │ │ <h3>         │         │
│  │ Video        │ │ Design       │ │ Content      │         │
│  │ Production   │ │ & Branding   │ │ & Copywriting│         │
│  │ </h3>        │ │ </h3>        │ │ </h3>        │         │
│  │ TikTok: 1,500│ │ Sony: 125    │ │ 18 languages │         │
│  │ edits/month  │ │ TV assets    │ │ 5 continents │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  TEAM & COVERAGE — world map visual (optional) + stats       │
│  <section aria-labelledby="about-team">                      │
│  <h2 id="about-team">"45 experts. 5 continents."</h2>        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [World map SVG — continents highlighted]            │   │
│  │  (decorative: aria-hidden="true")                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  Text alternative: "Team members based in Europe,            │
│  North America, South America, Asia, and Africa.             │
│  24/7 coverage through timezone relay model."                │
│  (sr-only or visible below map)                              │
├─────────────────────────────────────────────────────────────┤
│  VALUES — 3 items, icon + text                               │
│  <section aria-labelledby="about-values">                    │
│  <h2 id="about-values">"How we work"</h2>                    │
│                                                              │
│  [⚡ icon aria-hidden]  [∞ icon aria-hidden]  [✓ icon]       │
│  <h3>D+1 delivery</h3>  <h3>Unlimited revisions</h3>         │
│         <h3>Fixed prices</h3>                                │
│  "Standard, not      "Included, not     "Published,          │
│   exception."         billed."           not quoted."        │
├─────────────────────────────────────────────────────────────┤
│  CLOSING CTA                                                  │
│  <h2>"Ready to see what this means for your next            │
│        campaign?"</h2>                                       │
│  [Start a project] ← tab:10  bg: flame #da5126               │
│  "First project satisfaction or no invoice."                  │
├─────────────────────────────────────────────────────────────┤
│  [Footer — standard]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 About — Mobile State (<768px)

```
┌──────────────────────────────┐
│  [Nav — hamburger]           │
├──────────────────────────────┤
│  <h1> (2rem):                │
│  "We're the creative team    │
│  enterprises call when       │
│  every other agency says     │
│  two weeks."                 │
├──────────────────────────────┤
│  ORIGIN (single column)      │
│  <h2>"Built for the speed    │
│        of enterprise."</h2>  │
│  [body copy]                 │
│                              │
│  AT A GLANCE card:           │
│  ┌────────────────────────┐  │
│  │  Founded: 2020         │  │
│  │  Team: 35 · Continents:5│  │
│  │  Languages: 18         │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  CAPABILITIES (1-col stack): │
│  <h3>Video Production</h3>   │
│  <h3>Design & Branding</h3>  │
│  <h3>Content & Copy</h3>     │
├──────────────────────────────┤
│  [Start a project]           │
│  (full-width, flame)         │
├──────────────────────────────┤
│  [Footer]                    │
└──────────────────────────────┘
```

### 2.3 About — Loading State

```
┌─────────────────────────────────────────────────────────────┐
│  [Nav — renders immediately via SSG]                         │
├─────────────────────────────────────────────────────────────┤
│  ████████████████████████████████  ← H1 skeleton (pulse)    │
│  ████████████████████              ← H1 line 2              │
├─────────────────────────────────────────────────────────────┤
│  ████████████████  ← H2 skeleton                            │
│  ████████████████████████████████  ← body skeleton (2 rows) │
│  ████████████████████████████      ← body skeleton          │
│  ┌──────────────────────────────┐                           │
│  │  ████████████████████████   │  ← sidebar skeleton        │
│  └──────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
Note: Page is SSG — loading state only visible on cold first byte.
Skeletons use bg: #171717, pulse animation.
```

### 2.4 About — Error State

```
No API dependencies. Content is static (SSG).
Any error scenario degrades gracefully:
- World map SVG fails → hidden (aria-hidden="true" already)
- Text content renders normally in all failure modes
- Network offline → browser cache serves SSG HTML
```

---

## 3. Case Study Detail — Complete Wireframe

> Note: Skeleton wireframes for the case study detail exist in functional-specs.md §US-102.2.
> This section adds: full content structure annotation, JS-disabled state, accessibility, all 5 states.

### 3.1 Default State — Desktop (full scroll view)

```
┌─────────────────────────────────────────────────────────────┐
│  [Skip link] [Sticky nav]                                    │
│              ← Breadcrumb always in nav or below nav:        │
│  <nav aria-label="Breadcrumb">                               │
│  <ol> <li>Home</li> > <li>Work</li> > <li>[Client]</li></ol> │
│  </nav>                                                      │
├─────────────────────────────────────────────────────────────┤
│  <main role="main" id="main-content">                        │
│                                                              │
│  CASE STUDY HEADER                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [Client Logo — white SVG, 48px height]               │  │
│  │  aria-label="[Client Name] logo"                      │  │
│  │                                                       │  │
│  │  <h1> (Outfit Bold, 4xl, white):                      │  │
│  │  "[Client] needed [X]. We delivered [Y]."             │  │
│  │  (Formula 2 — Problem → Result)                       │  │
│  │                                                       │  │
│  │  META STRIP (neutral-500, sm, flex row):              │  │
│  │  <dl> (definition list for screen readers)            │  │
│  │  <dt>Deliverable</dt><dd>Presentations</dd>  |        │  │
│  │  <dt>Timeline</dt><dd>3 weeks</dd>           |        │  │
│  │  <dt>Volume</dt><dd>5,700 slides</dd>        |        │  │
│  │  <dt>Budget</dt><dd>8,500€</dd>              |        │  │
│  │  </dl>                                                │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  HERO IMAGE                                                  │
│  <figure>                                                    │
│  <img src="/work/geodis/hero.webp"                           │
│       alt="GEODIS presentation rebrand — slide excerpt       │
│            showing Sarani's redesign work"                   │
│       width="1200" height="675" loading="eager" />           │
│  </figure>                                                   │
├─────────────────────────────────────────────────────────────┤
│  BRIEF SECTION — 2-col (8 + 4)                               │
│  <section aria-labelledby="brief-heading">                   │
│  ┌──────────────────────────────┐  ┌──────────────────────┐  │
│  │  <h2 id="brief-heading">     │  │  AT A GLANCE         │  │
│  │  "The brief"  </h2>          │  │  <aside             │  │
│  │                              │  │  aria-label=         │  │
│  │  What [Client] needed: ...   │  │  "Project summary">  │  │
│  │  (body, neutral-200, base)   │  │                      │  │
│  │                              │  │  Client: GEODIS      │  │
│  │  What we delivered: ...      │  │  Deliverable: Decks  │  │
│  │                              │  │  Volume: 5,700       │  │
│  │                              │  │  Timeline: 3 weeks   │  │
│  │                              │  │  Cost: 8,500€        │  │
│  │                              │  │  ─────────────────   │  │
│  │                              │  │  [Start a project]   │  │
│  │                              │  │  ← tab:8             │  │
│  │                              │  │  (sidebar CTA)       │  │
│  │                              │  │  </aside>            │  │
│  └──────────────────────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  RESULTS SECTION                                             │
│  <section aria-labelledby="results-heading">                 │
│  <h2 id="results-heading">"Results"</h2>                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  <strong>    │  │  <strong>    │  │  <strong>    │       │
│  │  5,700       │  │  3 weeks     │  │  8,500€      │       │
│  │  </strong>   │  │  </strong>   │  │  </strong>   │       │
│  │  slides      │  │  on time     │  │  total       │       │
│  │  (lemon)     │  │  (lemon)     │  │  (lemon)     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  (bg: #171717, border: 1px #262626)                          │
│  Lemon numbers: #f1c217 — 10.7:1 contrast on #171717 bg ✓   │
├─────────────────────────────────────────────────────────────┤
│  GALLERY (optional — 4-col grid, lazy-loaded)                │
│  <section aria-labelledby="gallery-heading">                 │
│  <h2 id="gallery-heading" class="sr-only">Work samples</h2>  │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                                    │
│  │   │ │   │ │   │ │   │  Each: <img alt="[description]">   │
│  └───┘ └───┘ └───┘ └───┘  loading="lazy"                    │
├─────────────────────────────────────────────────────────────┤
│  CLOSING CTA                                                 │
│  <section aria-labelledby="cta-heading">                     │
│  <h2 id="cta-heading">                                       │
│  "Ready to start your first project?"  </h2>                 │
│                                                              │
│  [Start a project] ← tab:9  bg: flame #da5126               │
│  "First project satisfaction or no invoice."                 │
│  (neutral-500, sm)                                           │
├─────────────────────────────────────────────────────────────┤
│  RELATED CASE STUDIES                                        │
│  <section aria-labelledby="related-heading">                 │
│  <h2 id="related-heading">"More work"</h2>                   │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ [TikTok thumbnail]  │  │ [Sony thumbnail]    │           │
│  │ <h3>TikTok</h3>     │  │ <h3>Sony</h3>       │           │
│  │ Video editing       │  │ Banner production   │           │
│  │ [Read case study →] │  │ [Read case study →] │           │
│  │ ← tab:10            │  │ ← tab:11            │           │
│  └─────────────────────┘  └─────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  [Footer — standard] <footer role="contentinfo">            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Case Study — JS Disabled State

```
Full page content renders via SSG — all text, headings, CTAs visible.
Scroll depth tracking (JS) does not fire — acceptable per functional-specs EC-102-1.
Gallery images render as standard <img> tags (no lightbox JS).
The only JS-dependent feature is scroll tracking — not content.

Fallback test: Playwright javaScriptEnabled:false →
  verify <h1>, meta strip, results stats, "Start a project" CTA
  all present in DOM.
```

---

## 4. Contact Form — All States

### 4.1 Default State — Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  [Skip link] [Sticky nav]                                    │
├─────────────────────────────────────────────────────────────┤
│  <main role="main" id="main-content">                        │
│  <h1> (Outfit Bold, 4xl): "Start a project."</h1>            │
│  <p> (neutral-400, xl):                                      │
│  "Tell us what you need. We'll come back within the hour."   │
│                                                              │
│  <form aria-labelledby="contact-form-heading" novalidate>    │
│  <h2 id="contact-form-heading" class="sr-only">              │
│  Project brief form</h2>                                     │
│                                                              │
│  [Your name *]  ← tab:8                                      │
│  <input type="text" required autocomplete="name"             │
│         placeholder="Sophie Martin">                         │
│                                                              │
│  [Company *]  ← tab:9                                        │
│  <input type="text" required autocomplete="organization"     │
│         placeholder="TikTok, Sony, Adidas...">               │
│                                                              │
│  [Email *]  ← tab:10                                         │
│  <input type="email" required autocomplete="email"           │
│         placeholder="you@yourcompany.com">                   │
│                                                              │
│  [What do you need? *]  ← tab:11                             │
│  <textarea required rows="5"                                 │
│    placeholder="We need 50 banners in 3 languages by Friday">│
│                                                              │
│  2-col: [Company size *] ← tab:12  |  [How did you hear? *] ← tab:13
│  <select required>                 │  <select required>      │
│  500M€+ / 100–500M€ / Under 100M€  │  Referral/LinkedIn/     │
│  </select>                         │  Search/Other </select> │
│                                                              │
│  [Attachment (optional)]  ← tab:14                           │
│  <input type="file" accept=".pdf,.doc,.docx,.zip,.png,.jpg"> │
│  <p id="attachment-hint" class="text-sm neutral-500">        │
│  PDF, DOC, ZIP, image. Max 10MB.</p>                         │
│                                                              │
│  [Send my brief]  ← tab:15                                   │
│  type="submit", bg: flame #da5126, text: black               │
│                                                              │
│  "First project satisfaction or no invoice.                  │
│   No commitment required." (neutral-500, sm)                 │
│  </form>                                                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Validation Error State

```
┌─────────────────────────────────────────────────────────────┐
│  [Form fields — same layout. Errors appear inline below      │
│   each invalid field. Form does NOT submit.]                 │
│                                                              │
│  Invalid email example:                                      │
│  <input aria-invalid="true" aria-describedby="email-error"   │
│         style="border-color: #da5126">                       │
│  <p id="email-error" role="alert" class="text-sm text-flame">│
│  "Check that email address — it doesn't look right."</p>     │
│                                                              │
│  Empty required field:                                       │
│  <p role="alert" class="text-sm text-flame">                 │
│  "This field is required."</p>                               │
│                                                              │
│  On submit with errors:                                      │
│  - Focus moves to first invalid field                        │
│  - <p aria-live="polite" class="sr-only">                    │
│    "2 fields need attention."</p>  (screen reader only)      │
│  - Umami form_submit event does NOT fire                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Loading / Submitting State

```
┌─────────────────────────────────────────────────────────────┐
│  [Form fields — disabled, opacity: 0.7]                      │
│                                                              │
│  [Sending...]  ← submit button                               │
│  disabled="true", aria-busy="true"                           │
│  text: "Sending..." (per brand-voice.md §4.4)                │
│  bg: flame #da5126, opacity: 80%                             │
│                                                              │
│  If API call > 10s → transition to error state (§4.4)        │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Error State (API failure)

```
┌─────────────────────────────────────────────────────────────┐
│  [Form fields remain filled — do not reset on API error]     │
│                                                              │
│  <div role="alert" aria-live="assertive"                     │
│       class="border border-flame text-flame p-4 rounded">   │
│  "Something went wrong — your brief wasn't sent.            │
│   Try again, or email us: team@sarani.studio"               │
│  </div>                                                      │
│                                                              │
│  [Try again] ← re-enables submit, preserves form data        │
│                                                              │
│  Note: team@sarani.studio is [HYPOTHESE] — validate before  │
│  go-live (functional-specs.md §5 open hypothesis).           │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Success State

```
┌─────────────────────────────────────────────────────────────┐
│  [Form replaced by success message. URL unchanged.]          │
│                                                              │
│  <section role="status" aria-live="polite"                   │
│           aria-labelledby="success-heading">                 │
│                                                              │
│  [✓ icon — cerulean #0babe8, 48px, aria-hidden="true"]       │
│                                                              │
│  <h2 id="success-heading"> "Got it." </h2>                   │
│  (Outfit Bold, 3xl, white)                                   │
│                                                              │
│  <p> "Expect a response within the hour —                    │
│   usually faster." </p>                                      │
│  (neutral-200 — exact copy from brand-voice.md §4.4)         │
│                                                              │
│  [View our work →]  ← tab:8, links to /work                  │
│  (white outline button — keeps visitor engaged)              │
│                                                              │
│  On success: focus moves to <h2 id="success-heading">        │
│  </section>                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 Contact Form — Mobile (<768px)

```
┌──────────────────────────────┐
│  [Nav — hamburger]           │
├──────────────────────────────┤
│  <h1>"Start a project."</h1> │
│  Subhead (sm, neutral-400):  │
│  "Tell us what you need.     │
│   Back within the hour."     │
├──────────────────────────────┤
│  [Your name *]               │
│  [input — full-width]        │
│  [Company *]                 │
│  [input — full-width]        │
│  [Email *]                   │
│  [input type="email"]        │
│  (iOS triggers email keyboard│
│  - no @ button needed)       │
│  [What do you need? *]       │
│  [textarea rows="4"]         │
│  [Company size *]            │
│  [select — full-width]       │
│  (native iOS/Android picker) │
│  [How did you hear? *]       │
│  [select — full-width]       │
│  [Attachment (optional)]     │
│  [file input — full-width]   │
│  [Send my brief]             │
│  full-width, min-h: 44px     │
│  bg: flame #da5126           │
│  "First project or           │
│   no invoice."(neutral-500)  │
└──────────────────────────────┘
```

---

## 5. Pricing Page — Missing States

> Default pricing wireframe exists in functional-specs.md (US-104). This section adds missing states and Marc-specific annotations.

### 5.1 Loading State

```
┌─────────────────────────────────────────────────────────────┐
│  [Nav renders immediately — SSG]                             │
│  ████████████████████████  ← H1 skeleton (pulse)            │
│  ████████████████          ← Subhead skeleton               │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ← Price card skeletons │
│  │████████│  │████████│  │████████│  (bg: #171717, pulse)   │
│  │████████│  │████████│  │████████│                         │
│  └────────┘  └────────┘  └────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Error State

```
No API dependencies — all pricing data is static/hardcoded (SSG).
Page renders normally in all network failure modes.
```

### 5.3 Marc-Specific Annotations (Pricing Page)

```
┌─────────────────────────────────────────────────────────────┐
│  REQUIRED ELEMENTS for Marc qualification (Flow 2, §3.3):   │
│                                                              │
│  "No retainer. No minimum commitment. Pay per project."      │
│  → Visible above price table, prominent, not in footer       │
│                                                              │
│  "All prices exclude VAT." (legal-audit.md requirement)      │
│  → Below price table, sm text, neutral-400                   │
│                                                              │
│  Entry price anchor: Static Banner from 150€                 │
│  → First row of price table (lowest barrier to trial)        │
│                                                              │
│  "Framework agreement available on request."                 │
│  → Note below table, links to /contact                       │
│  → Satisfies Marc's JTBD #5 (renewal/framework agreement)    │
│                                                              │
│  Link to /legal page                                         │
│  → Footnote or pricing page footer section                   │
│                                                              │
│  EUR + USD dual display (static, no geo-detection)           │
│  → Per pricing-strategy.md decision (V1 no JS geo)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 404 Page

```
┌─────────────────────────────────────────────────────────────┐
│  [Skip link] [Sticky nav — standard]                         │
├─────────────────────────────────────────────────────────────┤
│  <main role="main" id="main-content">                        │
│                                                              │
│  <h1> "This page doesn't exist." </h1>                       │
│  (Outfit Bold, 4xl, white)                                   │
│                                                              │
│  <p> "But we do. 45 experts ready to work on your            │
│   next project." </p>                                        │
│  (neutral-400, xl — exact copy from brand-voice.md §4.8)     │
│                                                              │
│  [Start a project]  ← tab:8, bg: flame #da5126               │
│                                                              │
│  [← Back to homepage]  ← tab:9                               │
│  white outline button, links to /                            │
│                                                              │
│  </main>                                                     │
├─────────────────────────────────────────────────────────────┤
│  [Footer — standard]                                         │
└─────────────────────────────────────────────────────────────┘

HTTP status: 404 (not 200 — critical for SEO, per functional-specs EC-102-2)
Next.js: not-found.tsx in app/ directory
```

---

## 7. Accessibility Summary — All Pages

### 7.1 Heading Hierarchy

| Page | h1 | h2 | h3 |
|------|----|----|-----|
| Homepage | "Enterprise-quality creative. Delivered in 24 hours." | Proof Points, Value Prop, Case Studies, Footer CTA | Proof card labels |
| Work listing | "Our work" | — | Case study card titles |
| Case Study detail | "[Client] needed X. We delivered Y." | The brief, Results, Work samples, Ready to start, More work | — |
| Pricing | "Transparent pricing." | Service categories | Service line names |
| About | "We're the creative team enterprises call..." | Built for speed, What we do, 45 experts, How we work | Capability names |
| Contact | "Start a project." | sr-only "Project brief form" | — |
| 404 | "This page doesn't exist." | — | — |

**Rule:** No heading level skips. Validated before go-live.

### 7.2 ARIA Landmarks — All Pages

| Landmark | Element | Pages |
|----------|---------|-------|
| `role="banner"` | `<header>` | All |
| `role="navigation" aria-label="Main navigation"` | `<nav>` | All |
| `role="navigation" aria-label="Breadcrumb"` | `<nav>` | /work/[slug] only |
| `role="main"` | `<main id="main-content">` | All |
| `role="contentinfo"` | `<footer>` | All |
| `aria-label="Mobile navigation"` | overlay `<nav>` | Mobile menu open |

### 7.3 Focus Management Rules

| Trigger | Focus destination |
|---------|------------------|
| Page load | Skip link (first focusable) |
| Mobile menu opens | First nav item ("Work") |
| Mobile menu closes | Hamburger button |
| Form submit — validation error | First invalid field |
| Form submit — success | `<h2 id="success-heading">` |

### 7.4 Skip Link — All Pages

```html
<a href="#main-content"
   class="sr-only focus:not-sr-only focus:absolute focus:top-0
          focus:left-0 focus:bg-flame focus:text-black
          focus:p-3 focus:z-[9999]">
  Skip to main content
</a>
```

First focusable element on every page. Background: flame #da5126, text: black (contrast 5.32:1 — WCAG AA ✓).

### 7.5 WCAG 2.2 AA Key Requirements

| Criterion | Requirement | Covered by |
|-----------|-------------|-----------|
| 1.1.1 | Alt text on all `<img>`, `aria-hidden` on decorative SVGs | functional-specs edge cases |
| 1.3.1 | Semantic HTML — `<label>`, `<nav>`, `<main>`, heading hierarchy | All wireframes above |
| 1.4.3 | Contrast AA — white/black 21:1, black/flame 5.32:1 | design-system.md §1.3 |
| 2.1.1 | All interactive elements reachable via Tab | Tab order annotated on all screens |
| 2.4.7 | Visible focus — flame ring 2px, 2px offset | All interactive elements |
| 2.4.11 | Focus not obscured by sticky nav | z-index: 200 nav, focus ring visible |
| 3.3.1 | Error: `role="alert"` + `aria-invalid="true"` | Contact form §4.2 |
| 3.3.2 | `<label for>` every input, `aria-describedby` for hints | Contact form §4.1 |
| 4.1.3 | Status messages: `aria-live="polite"` | Contact form success §4.5 |

---

## Assumptions to Validate

- [HYPOTHESE] About page copy — body text for "Built for enterprise speed" section references brand-story.md but Thomas's personal origin story is marked [HYPOTHESE] in that document. Version without personal origin story is viable for go-live.
- [HYPOTHESE] World map visual on About page — decorative asset not confirmed as available. Fallback: text-only stat block (45 experts, 5 continents) if map SVG is not produced.
- [HYPOTHESE] Contact form: email `team@sarani.studio` used in error state — validate this address is operational before go-live (functional-specs.md open hypothesis).
- [HYPOTHESE] Attachment field max size of 10MB — per functional-specs.md open hypothesis. Validate with Sarani team before W4.

---

**Handoff → @data-analyst**

Files produced:
- `/home/user/Sarani/docs/ux/user-flows.md`
- `/home/user/Sarani/docs/ux/wireframes.md`

Decisions taken:
- Navigation order: Work → Services → Pricing → About (Sophie-first: portfolio before process)
- Mobile nav: full-screen overlay with CTA pinned at bottom — no slide-in drawer (avoids z-index conflicts)
- Contact form: minimum required fields (6) + 2 optional — Sophie's time pressure justifies minimum friction
- Success state: inline replacement (no redirect) — preserves page context, simpler analytics
- About page: included as missing screen; world map visual marked as [HYPOTHESE] asset dependency
- Case study sidebar CTA: included as persistent in-page entry point for Marc who scrolls vertically evaluating

Points of attention for @data-analyst:
- `form_submit` fires on HTTP 200 only (not validation errors) — tracking plan must respect this
- Mobile nav open/close events are proposed new Umami events not in kpi-framework.md — to validate
- SEO entry flow (Flow 3) requires referrer tracking on case study page views to distinguish SEO vs direct traffic
- "How did you hear about us?" field option values must be finalized before Umami event properties are defined
- Aha moment distance validated: Sophie ≤ 2 steps, Marc ≤ 2 steps, SEO entry ≤ 1 step
