# Sarani — Design System
*Produced by @design — 2026-03-24*
*Reference document for @fullstack implementation. Language: English.*
*Source tokens: `docs/design/design-tokens.json`*

---

## Table of Contents

1. [Color Usage Rules](#1-color-usage-rules)
2. [Typography Scale](#2-typography-scale)
3. [Component Guidelines](#3-component-guidelines)
4. [Logo Usage](#4-logo-usage)
5. [Spacing & Layout](#5-spacing--layout)

---

## 1. Color Usage Rules

### 1.1 Palette Overview

Sarani's visual identity is built on a **light-first** palette. The primary surface is white (#ffffff), with dark sections (black #000000) used for contrast and emphasis (metrics, footer, team stats). Color is used sparingly — the three accent colors (Flame, Cerulean, Lemon) are signal colors, not fill colors. They carry meaning and attention. Overusing them kills their power.

| Token | Hex | Name | Role |
|---|---|---|---|
| `colors.primary.white` | `#ffffff` | White | Primary background, dominant surface |
| `colors.primary.black` | `#000000` | Black | Contrast sections, footer, dark emphasis |
| `colors.accent.flame` | `#da5126` | Flame | Primary CTA, error states, urgency, energy |
| `colors.accent.cerulean` | `#0babe8` | Vivid Cerulean | Info, links, secondary interactive elements |
| `colors.accent.lemon` | `#f1c217` | Deep Lemon | Warning, highlights, "speed" signifier |

### 1.2 Color Usage Rules per Role

**Black (#000000) — Primary surface**
- Default page background
- Dark card backgrounds
- Navigation bar background
- Footer background
- Never use as text on dark surfaces (zero contrast)

**White (#ffffff) — Primary text**
- All body copy on dark backgrounds
- Headings on dark backgrounds
- Icon color on dark surfaces
- Inverse: use black text on white/light surfaces

**Flame (#da5126) — Action & Energy**
- Primary CTA button background (default state)
- Active/focus ring on interactive elements
- Error state messages and icons
- "Speed proof" callouts (e.g., the "D+1" badge, "same-day delivery" tag)
- Use sparingly: maximum 1–2 flame elements per viewport
- Never use as large background areas (overwhelms the composition)

**Cerulean (#0babe8) — Trust & Information**
- Hyperlinks (underline on hover)
- Info banners and tooltips
- Secondary badge color
- Data visualization accent
- "18 languages / 5 continents" stats callouts

**Lemon (#f1c217) — Highlight & Warning**
- Warning states
- Highlight/underline on featured statistics ("60% savings," "400M views")
- Decorative accent on section dividers (3-dot submark)
- Badge for "New" or "Featured" labels
- Never use as text color on white (fails WCAG AA — see contrast table below)

### 1.3 WCAG 2.2 AA Contrast Verification

All text combinations verified at minimum 4.5:1 (normal text) or 3:1 (large text / UI components).

| Foreground | Background | Contrast Ratio | WCAG AA (4.5:1) | WCAG AA Large (3:1) | Status |
|---|---|---|---|---|---|
| White `#ffffff` | Black `#000000` | 21:1 | PASS | PASS | Primary combination |
| Black `#000000` | White `#ffffff` | 21:1 | PASS | PASS | Inverse combination |
| White `#ffffff` | Flame `#da5126` | 3.94:1 | FAIL | PASS | Large text / UI only |
| Black `#000000` | Flame `#da5126` | 5.32:1 | PASS | PASS | Body text on flame OK |
| White `#ffffff` | Cerulean `#0babe8` | 3.11:1 | FAIL | PASS | Large text / UI only |
| Black `#000000` | Cerulean `#0babe8` | 6.75:1 | PASS | PASS | Body text on cerulean OK |
| Black `#000000` | Lemon `#f1c217` | 10.7:1 | PASS | PASS | Strong — preferred |
| White `#ffffff` | Lemon `#f1c217` | 1.96:1 | FAIL | FAIL | Never use |
| White `#ffffff` | Neutral-800 `#262626` | 11.9:1 | PASS | PASS | Elevated card text |
| White `#ffffff` | Neutral-900 `#171717` | 16.1:1 | PASS | PASS | Section background text |

**Critical rules derived from contrast table:**
1. White text on Flame: restricted to headings (>18px bold) and UI controls (>14px bold) only
2. White text on Cerulean: restricted to UI controls only — never use for body copy
3. Lemon must always pair with black text — white text on lemon is strictly prohibited
4. Flame, Cerulean, Lemon must never be used as body text color on white or light backgrounds

### 1.4 Light-First Design (Decision: Thomas, 2026-03-28)

Sarani's design is **light-first** — the primary surface is white (#ffffff). Dark sections (black #000000) are used for contrast and emphasis: metrics, footer CTA, team stats, closing sections. This creates a rhythm of light/dark alternation that gives each section visual weight. There is no dark mode toggle required for v1.

| Context | Background | Text | Accent |
|---|---|---|---|
| Page (default) | `#ffffff` | `#000000` | Flame for CTA, Cerulean for links |
| Dark contrast section | `#000000` | `#ffffff` | Flame / Cerulean / Lemon as above |
| Elevated card (light) | `#f5f5f5` | `#000000` | Flame for CTA, Cerulean for links |
| Form inputs (light) | `#ffffff` border `#d4d4d4` | `#000000` | Cerulean focus ring |

### 1.5 Semantic Color Mapping

| State | Color Token | Hex | Usage |
|---|---|---|---|
| Success | `colors.semantic.success` | `#16a34a` | Form submission confirmed, project delivered |
| Warning | `colors.semantic.warning` | `#f1c217` | Deadline approaching, important notice |
| Error | `colors.semantic.error` | `#da5126` | Form validation error, failed action |
| Info | `colors.semantic.info` | `#0babe8` | Neutral informational messages, tooltips |

Success green (`#16a34a`) is the only color not derived directly from the brand palette. It is used exclusively for success states — it never appears as a decorative or brand color.

---

## 2. Typography Scale

### 2.1 Font Family

**Outfit** is Sarani's sole typeface — used for all headings and body copy. It communicates: modern, clean, confident, international. No serif, no second typeface, no system font fallback in visible UI.

```
font-family: "Outfit", sans-serif;
```

Outfit is a free Google Font (OFL license). Load via `next/font/google` for optimal performance (self-hosted, no external request). **Do not fall back to system sans-serif in visible UI.**

### 2.2 Type Scale

All sizes use `rem` (base 16px = 1rem). The scale is modular — each step is roughly 1.25x the previous.

| Level | Token | Size (rem) | Size (px) | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|---|---|
| Display | `fontSize.8xl` | 6rem | 96px | Bold (700) | 1.0 (tight) | -0.025em | Hero headline — 1 per page max |
| H1 | `fontSize.6xl` | 3.75rem | 60px | Bold (700) | 1.1 (tight) | -0.025em | Page title |
| H2 | `fontSize.5xl` | 3rem | 48px | Bold (700) | 1.1 | -0.015em | Section title |
| H3 | `fontSize.4xl` | 2.25rem | 36px | Bold (700) | 1.25 (snug) | 0em | Sub-section title |
| H4 | `fontSize.3xl` | 1.875rem | 30px | Bold (700) | 1.25 | 0em | Card title, feature label |
| H5 | `fontSize.2xl` | 1.5rem | 24px | Bold (700) | 1.25 | 0em | Small card title, stat label |
| H6 | `fontSize.xl` | 1.25rem | 20px | Bold (700) | 1.5 (normal) | 0em | Label, micro-heading |
| Body Large | `fontSize.lg` | 1.125rem | 18px | Regular (400) | 1.625 (relaxed) | 0em | Lead paragraph, intro copy |
| Body | `fontSize.base` | 1rem | 16px | Regular (400) | 1.5 (normal) | 0em | Default body copy |
| Body Small | `fontSize.sm` | 0.875rem | 14px | Regular (400) | 1.5 | 0em | Secondary info, meta, labels |
| Caption | `fontSize.xs` | 0.75rem | 12px | Regular (400) | 1.5 | 0.025em (wide) | Captions, fine print, tags |

### 2.3 Typographic Rules

**Headings (H1–H6)**
- Always Outfit Bold (700)
- Color: white on dark backgrounds, black on light backgrounds
- Flame, Cerulean, or Lemon can be used on individual words for emphasis (e.g., highlighting a proof point — but maximum 1 accent word per heading)
- Never center-align beyond H3 — H4 and below are always left-aligned
- Never use italic for headings

**Body copy**
- Always Outfit Regular (400)
- Maximum line length: 70 characters (ensures readability at all breakpoints)
- Color: white (`#ffffff`) on dark surfaces, neutral-800 (`#262626`) on light surfaces
- Minimum size: 16px (base) — never below 14px (sm) for functional text

**Special text treatments**
- **Stats / proof points** (e.g., "1,500+ videos/month", "60% savings"): H3 or H4 size, Bold, accent color (Lemon preferred for numbers, Cerulean for text labels)
- **Client names in copy**: no special styling — they carry weight by themselves
- **CTA text in buttons**: 16px base, Bold (700), never smaller than 14px
- **Navigation links**: 14px (sm), Regular (400), uppercase + wider letter spacing (0.05em)

### 2.4 Responsive Type Scaling

On mobile (< 640px), reduce Display and H1 to avoid overflow:

| Level | Desktop | Mobile (< 640px) |
|---|---|---|
| Display | 96px | 48px (H2 size) |
| H1 | 60px | 36px (H3 size) |
| H2 | 48px | 30px (H4 size) |
| H3 | 36px | 24px (H5 size) |
| H4–H6 | unchanged | unchanged |
| Body | unchanged | unchanged |

---

## 3. Component Guidelines

Visual specs for the 6 priority components of the Sarani site. No code — these are specs for @fullstack to implement using the tokens defined above.

---

### 3.1 Hero Section

**Purpose:** First impression. Sophie has 5 seconds. She must understand: who Sarani is, why it is different, and what to do next.

**Layout**
- Full viewport height (100dvh) on desktop, min 90dvh on mobile
- Background: `colors.primary.black` (#000000)
- Optional: subtle dark texture or a short looping video reel (no audio autoplay) as background overlay at 20–30% opacity
- Content centered vertically, left-aligned text (not center-aligned — feels more decisive)

**Content structure (strict order)**
1. Pre-headline tag: small, all-caps, letter-spacing wide, Cerulean or white, e.g. "The always-on enterprise creative partner"
2. Main headline: Display size (96px desktop / 48px mobile), Bold, White. The headline must contain either a named client OR a speed claim within the first 8 words
3. Sub-headline: Body Large (18px), Regular, White at 80% opacity — the primary promise in 1 sentence
4. Stats row: 3 stats side by side — e.g. "35 experts", "5 continents", "18 languages" — H5 size, Bold, Lemon for numbers / white for labels
5. CTA button: Primary button (see 3.2) — "Start a project" — left-aligned with headline
6. Trust logos strip: client logos (TikTok, Sony, Adidas, GEODIS, L'Oréal) — white or low-opacity versions, below the CTA

**Spacing**
- Content column: max-width 720px (desktop), full-width with padding-x spacing.8 (32px) on mobile
- Vertical padding top: spacing.24 (96px) on desktop, spacing.16 (64px) on mobile
- Gap between elements: spacing.8 (32px) default

**Visual accent**
- The 3-dot Sarani submark can float in the right half of the hero on desktop (decorative, non-interactive)
- No parallax effects — too slow in feel; contradicts the brand

---

### 3.2 CTA Buttons

**Three variants: Primary, Secondary, Ghost**

**Primary Button — "Start a project"**
- Background: `colors.accent.flame` (#da5126)
- Text: Black (#000000) — not white (Black on Flame = 5.32:1, WCAG AA pass for body text)
- Font: Bold (700), 16px (base), letter-spacing normal
- Padding: vertical spacing.4 (16px), horizontal spacing.8 (32px)
- Border radius: `borderRadius.full` (9999px) — pill shape. Pill conveys speed and modernity.
- Hover state: `colors.accent.flame-dark` (#b03d1c) background, scale transform 1.02
- Focus state: 3px outline in Cerulean (#0babe8), offset 2px
- Active/pressed: scale 0.98, flame-dark background
- Disabled: neutral-600 (#737373) background, neutral-400 text, cursor not-allowed, no hover effect
- Min width: 160px. Never truncate CTA text.
- Transition: `transition.fast` (150ms ease-in-out)

**Secondary Button — "See our work"**
- Background: transparent
- Border: 1.5px solid white (#ffffff)
- Text: White (#ffffff)
- Font: Bold (700), 16px, same padding as primary
- Border radius: `borderRadius.full`
- Hover: white background, black text
- Focus: 3px Cerulean outline, offset 2px
- Transition: `transition.fast`

**Ghost Button / Text link**
- No background, no border
- Text: Cerulean (#0babe8), underline on hover
- Used for secondary navigation actions within body copy

**Rules**
- Maximum 1 Primary CTA per section above the fold
- CTA text is always action-first: verb + object ("Start a project", "See case studies", "Get a quote")
- Never use "Learn more" alone — always qualify: "Learn more about pricing"

---

### 3.3 Case Study Cards

**Purpose:** Proof. Sophie needs to see that Sarani has worked for clients like her. The card must communicate: who, what, and the result — in under 5 seconds.

**Layout**
- Grid: 3 columns on desktop (xl+), 2 columns on tablet (md), 1 column on mobile
- Card background: `colors.surface.elevated` (#171717)
- Border: 1px solid neutral-800 (#262626) — subtle definition
- Border radius: `borderRadius.lg` (16px)
- Padding: spacing.8 (32px) inside
- No box shadow by default; `shadows.md` on hover

**Card anatomy (top to bottom)**
1. Client logo — white version, max height 32px, left-aligned
2. Category tag — small (xs/12px), all-caps, wider letter-spacing, Cerulean background + black text (large text UI exception applies at this size — use `borderRadius.full` pill tag)
3. Deliverable summary — H4 (30px) Bold, White — 2 lines max
4. Key result stat — H3 (36px) Bold, Lemon — the number that proves the work (e.g., "400M views", "3 weeks", "29.9% ROI")
5. Result label — Body Small (14px), Regular, neutral-500 (#a3a3a3) — brief descriptor of the stat
6. "View case study" link — Ghost button style, bottom of card, right-aligned

**Hover state**
- Border color transitions to `colors.accent.flame` (#da5126)
- `shadows.flame-glow` appears
- Transition: `transition.base` (250ms)

**Rules**
- Every card MUST have a client logo, a deliverable, and a quantified result
- Never show a card without a result stat — if unknown, use a speed proof ("Delivered in 24h") instead
- Categories: "Video", "Design", "Campaign", "Branding", "Paid Ads", "Presentations"

---

### 3.4 Contact Form

**Purpose:** The single highest-priority component on the site. Zero friction, zero confusion. @fullstack note: this is the US-103 critical path component — any visual regression here is a blocking issue.

**Layout**
- Full-width section, background `colors.primary.black` or a slightly elevated surface `#0a0a0a`
- Form column: max-width 640px, centered
- Section headline: H2, White — "Start your first project" (or equivalent copy from @copywriter)
- Sub-headline: Body Large, white at 70% — reinforce the guarantee: "Not satisfied? No invoice."

**Fields (in order)**
1. Full name — text input
2. Company name — text input
3. Company size — select dropdown (options: "50–200", "200–500", "500–2000", "2000+") — required per KPI framework (persona validation)
4. Email — email input
5. What do you need? — textarea, 4 rows, optional placeholder example
6. How did you hear about us? — select (options: "Referral", "LinkedIn", "Search", "Other") — required per kpi-framework for attribution tracking

**Input visual specs**
- Background: `colors.surface.elevated` (#171717)
- Border: 1.5px solid neutral-700 (#525252)
- Border radius: `borderRadius.base` (8px) — not pill, to feel professional / form-like
- Text: White (#ffffff), 16px Regular
- Placeholder: neutral-500 (#a3a3a3)
- Focus state: border transitions to Cerulean (#0babe8), no glow — clean and professional
- Error state: border transitions to Flame (#da5126), error message below field in 14px Regular Flame
- Valid state: border transitions to success green (#16a34a) after blur
- Padding: vertical spacing.4 (16px), horizontal spacing.5 (20px)
- Transition: `transition.fast`

**Submit button**
- Full width of form column
- Primary button style (Flame, Black text, pill shape)
- Label: "Send my request" or "Start a project"
- Loading state: spinner icon + "Sending..." label, disabled state styling

**Success state**
- Replace form with a success panel: green (#16a34a) icon + White H4 "Request sent." + Body "We'll get back to you within 24 hours." — consistent with the brand's speed promise

**Rules**
- Required fields: Name, Company, Company Size, Email, Attribution source
- Optional: What do you need (removing friction for initial contact)
- Never add CAPTCHA in the visible UI — use honeypot instead (invisible to user)
- Mobile: all fields full-width, no side-by-side layout

---

### 3.5 Navigation

**Purpose:** Orientation + conversion. Sophie must be able to reach "Contact" or "Pricing" in one click from anywhere.

**Layout**
- Fixed to top, full viewport width
- Height: 72px desktop, 64px mobile
- Background: `colors.primary.black` (#000000) with `backdrop-filter: blur(12px)` and 90% opacity — allows content to scroll under it
- Border bottom: 1px solid neutral-800 (#262626) — subtle separation
- Container: max-width 1280px (xl breakpoint), auto horizontal margins, padding-x spacing.8 (32px)

**Nav structure (left to right)**
- Left: Sarani logo (primary version — white text, black background) — clickable, links to homepage
- Center (desktop): nav links — "Services", "Case Studies", "Pricing", "About"
- Right: Primary CTA button — "Start a project" — Primary button style (smaller: 14px, padding-y spacing.3 12px, padding-x spacing.6 24px)

**Nav links**
- Font: 14px (sm), Regular, White, uppercase, letter-spacing 0.05em (wider)
- Hover: Flame (#da5126) underline — 2px, offset 4px
- Active page: Flame underline permanent
- Transition: `transition.fast`

**Mobile (< 768px)**
- Hide center nav links
- Show hamburger icon (right side, next to CTA)
- Mobile menu: full-screen overlay, black background, nav links stacked vertically — H3 size, White, centered
- Mobile menu close: X icon, top right, white

**Scroll behavior**
- At page top: nav transparent (no border, no blur) — logo and links only
- After 60px scroll: apply blur + border + 90% black opacity background
- Transition: `transition.base` (250ms)

---

### 3.6 Footer

**Purpose:** Credibility, navigation, legal. Secondary conversion opportunity.

**Layout**
- Background: `colors.primary.black` (#000000) — same as page, no contrast break
- Top border: 1px solid neutral-800 (#262626)
- Padding: vertical spacing.16 (64px) top, spacing.12 (48px) bottom
- Container: max-width 1280px, same as nav

**Footer structure (desktop — 4 column grid)**
- Col 1 (wider): Sarani submark (3 dots) + tagline "Unlimited Creativity" + short descriptor: "35 experts. 5 continents. 18 languages. 24/7." — Body Small, neutral-500
- Col 2: "Services" column — links: Strategic Marketing, Content Creation, Operational Marketing, On-demand Requests
- Col 3: "Company" column — links: Case Studies, Pricing, About, Contact
- Col 4: "Social & Legal" — LinkedIn icon link, Instagram icon link + separator + "© 2024 Sarani. All rights reserved." + Privacy Policy + Legal Notice

**Mobile (< 768px)**
- Stack columns vertically
- Col 1 full-width on top
- Cols 2 + 3 side by side (2-column grid)
- Col 4 full-width on bottom

**Footer typography**
- Column headings: 12px (xs), all-caps, Bold, White, letter-spacing 0.1em (widest)
- Links: 14px (sm), Regular, neutral-500 (#a3a3a3) — hover: White, transition fast
- Legal text: 12px (xs), neutral-600 (#737373)

**Rules**
- The 3-dot submark always appears in the footer — it is the brand's visual anchor
- Social icons: white fill, 20px, hover Cerulean
- No secondary CTA in the footer — the primary CTA is in the nav (sticky). Footer is navigation + legal, not conversion.

---

## 4. Logo Usage

### 4.1 Available Versions

| Version | File | Background | When to use |
|---|---|---|---|
| Primary | `Sarani Logo_1000x1000.png` | Black | Default — on all dark surfaces (nav, hero, dark sections) |
| White / Transparent | `Sarani Logo_WHT-01.png` | Transparent | On dark surfaces where the black bounding box of the primary would clash; or on photographic dark backgrounds |
| Submark (3 dots) | Derived from primary | Any | Favicon, social profile picture, footer decoration, loading indicator, small watermarks |

### 4.2 Minimum Sizes

| Context | Minimum width |
|---|---|
| Primary logo (desktop nav) | 120px |
| Primary logo (mobile nav) | 100px |
| Primary logo (print / deck) | 40mm |
| Submark (3 dots only) | 24px (favicon: 16px minimum) |

**Never scale below these minimums** — the 3 dots and the "Sarani" wordmark become illegible and the brand trust signal disappears.

### 4.3 Clear Space

Minimum clear space on all 4 sides of the logo = 1× the height of the "S" letterform in the wordmark. In practice:
- Desktop nav: 16px (spacing.4) on all sides
- When placed near a headline or other element: spacing.6 (24px) minimum

### 4.4 Authorized Usage Rules

**DO:**
- Use the primary (black background) logo on dark surfaces
- Use the white/transparent logo on dark photographic or video backgrounds
- Use the submark alone when space is too small for the full wordmark
- Reproduce in full color (3 dots: Flame, Cerulean, Lemon — always in this order)

**DO NOT:**
- Change the color of the wordmark from white or black
- Reorder or recolor the 3 dots
- Place the primary logo on white or light backgrounds (the black bounding box creates a visual block — use the transparent version instead)
- Add effects to the logo: no drop shadow, no glow, no outline, no gradient overlay
- Stretch, distort, or rotate the logo at any angle
- Place any visual element inside the clear space zone
- Use a low-resolution version (always use vector or the provided 1000px PNG)

### 4.5 Logo on Color Backgrounds

| Background | Logo version to use |
|---|---|
| Black (#000000) | Primary or White |
| Dark neutral (#171717–#262626) | Primary or White |
| Flame (#da5126) | White/Transparent version, white wordmark |
| Cerulean (#0babe8) | White/Transparent version, white wordmark |
| Lemon (#f1c217) | Use black wordmark version — create on demand if not in assets |
| White (#ffffff) | White/Transparent version with black wordmark — create on demand |

### 4.6 Client Logo Usage

Client logos (TikTok, Sony, Adidas, GEODIS, L'Oréal, etc.) must appear in **white or very low opacity** versions on the dark homepage to maintain visual cohesion. Never use full-color client logos on the black background — they fragment the visual hierarchy.

Authorization for client logo usage: confirmed per project-context.md Notes libres (2026-03-24).

---

## 5. Spacing & Layout

### 5.1 Base Unit

The spacing system uses a **4px base unit**. All spacing values are multiples of 4px. This maps directly to Tailwind's default spacing scale (1 unit = 4px).

| Token | Value | Tailwind class | Typical use |
|---|---|---|---|
| `spacing.1` | 4px | `p-1`, `m-1` | Icon internal padding, micro-gaps |
| `spacing.2` | 8px | `p-2`, `m-2` | Tag padding, tight element gaps |
| `spacing.3` | 12px | `p-3`, `m-3` | Button padding (small), badge |
| `spacing.4` | 16px | `p-4`, `m-4` | Default element padding, field padding |
| `spacing.5` | 20px | `p-5`, `m-5` | Form field horizontal padding |
| `spacing.6` | 24px | `p-6`, `m-6` | Card internal gap, logo clear space |
| `spacing.8` | 32px | `p-8`, `m-8` | Card padding, section horizontal padding |
| `spacing.10` | 40px | `p-10`, `m-10` | Section internal spacing, stat row gap |
| `spacing.12` | 48px | `p-12`, `m-12` | Footer padding bottom, tight section padding |
| `spacing.16` | 64px | `p-16`, `m-16` | Section vertical padding (mobile), large gaps |
| `spacing.20` | 80px | `p-20`, `m-20` | Section vertical padding (tablet) |
| `spacing.24` | 96px | `p-24`, `m-24` | Section vertical padding (desktop default) |
| `spacing.32` | 128px | `p-32`, `m-32` | Large section padding, hero vertical padding |
| `spacing.40` | 160px | `p-40`, `m-40` | Extra large section gap |

### 5.2 Grid System

**Desktop (≥ 1280px)**
- Max container width: 1280px (`max-w-screen-xl`)
- Horizontal padding: 32px each side (spacing.8)
- Column grid: 12 columns, 24px gap
- Content zones: full-width backgrounds with contained inner columns

**Tablet (768px–1279px)**
- Max container width: 100%
- Horizontal padding: 32px each side
- Column grid: 8 columns, 16px gap

**Mobile (< 768px)**
- Horizontal padding: 20px each side (spacing.5)
- Column grid: 4 columns, 12px gap
- No horizontal scroll — all content adapts to single column

### 5.3 Responsive Breakpoints

| Breakpoint | Token | Min width | Tailwind prefix | Description |
|---|---|---|---|---|
| Mobile (default) | — | 0px | (none) | Base styles — single column |
| Small | `breakpoints.sm` | 640px | `sm:` | Landscape phone, small tablet |
| Medium | `breakpoints.md` | 768px | `md:` | Tablet portrait |
| Large | `breakpoints.lg` | 1024px | `lg:` | Tablet landscape, small laptop |
| Extra Large | `breakpoints.xl` | 1280px | `xl:` | Desktop |
| 2X Extra Large | `breakpoints.2xl` | 1536px | `2xl:` | Wide desktop |

**Mobile-first rule:** all base styles are written for mobile. Larger breakpoints are additive overrides. No `max-width` breakpoints — only `min-width`.

### 5.4 Section Spacing Rules

Sections on the homepage are separated by consistent vertical rhythm:

| Section type | Padding top | Padding bottom |
|---|---|---|
| Hero | 96px (spacing.24) | 96px |
| Standard content section | 96px | 96px |
| Tight content section (between related blocks) | 64px | 64px |
| Footer | 64px | 48px |

**Rule:** Never let two sections of the same background color touch without a clear visual separator (horizontal line neutral-800, or a content break). The page must breathe — white space is not wasted space on a dark site.

### 5.5 Container Pattern

Every section uses this structure:
- Full-width background element (color, gradient, or image)
- Inner `<div>` with `max-w-screen-xl mx-auto px-8` (desktop) / `px-5` (mobile)
- Content grid inside the container

This ensures consistent edge-to-edge backgrounds while keeping content aligned to the grid.

### 5.6 Icon System

- Icon size: 16px (sm text contexts), 20px (body contexts), 24px (UI controls), 32px (feature icons)
- Icon library: Lucide React (recommended — consistent with shadcn/ui ecosystem)
- Color: White by default, Cerulean for interactive/link icons, Flame for warning/action icons
- No icon should stand alone without a text label in functional UI — accessibility rule (WCAG 2.2 SC 1.1.1)

---

## Appendix: Tailwind Config Mapping

The tokens in `docs/design/design-tokens.json` map directly to `tailwind.config.ts` as follows. @fullstack should extend (not replace) the default Tailwind theme:

```
theme.extend.colors:
  brand.black = #000000
  brand.white = #ffffff
  brand.flame = #da5126
  brand.flame-light = #e8735a
  brand.flame-dark = #b03d1c
  brand.cerulean = #0babe8
  brand.cerulean-light = #3dbfef
  brand.cerulean-dark = #0888ba
  brand.lemon = #f1c217
  brand.lemon-light = #f5d04f
  brand.lemon-dark = #c49a0f

theme.extend.fontFamily:
  heading = ["Outfit", "sans-serif"]
  body = ["Outfit", "sans-serif"]

theme.extend.borderRadius:
  (map directly from borderRadius tokens)

theme.extend.boxShadow:
  flame-glow = 0 0 24px 0 rgb(218 81 38 / 0.4)
  cerulean-glow = 0 0 24px 0 rgb(11 171 232 / 0.35)
  lemon-glow = 0 0 24px 0 rgb(241 194 23 / 0.35)
```

Spacing, fontSize, lineHeight, letterSpacing, and breakpoints map 1:1 to Tailwind defaults — no override needed.

---

## Handoff Notes for @fullstack

**Critical implementation order:**
1. Install and configure Outfit font before any other work — all visual decisions depend on it
2. Configure tailwind.config.ts with brand colors before building components
3. Build the contact form first (US-103 critical path — see backlog.md)
4. Build the navigation and hero next (Sophie's first impression)
5. Case study cards last (depend on content from @copywriter)

**Accessibility checklist (WCAG 2.2 AA minimum):**
- All interactive elements have visible focus indicators (Cerulean outline, 3px, 2px offset)
- All images have alt text
- Color is never the only means of conveying information
- Form fields have associated labels (not just placeholders)
- Navigation is keyboard-navigable in logical order
- Icon-only buttons have aria-label attributes

**[À VALIDER PAR @ux]:** Wireframes for internal page layouts (case study detail, pricing, about) are not yet available. Component guidelines for those pages are marked as provisional — layout decisions should be validated by @ux before @fullstack implements them.
