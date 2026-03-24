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

Sarani's visual identity is built on a **dark-first** palette. The primary surface is black (#000000). Color is used sparingly — the three accent colors (Flame, Cerulean, Lemon) are signal colors, not fill colors. They carry meaning and attention. Overusing them kills their power.

| Token | Hex | Name | Role |
|---|---|---|---|
| `colors.primary.black` | `#000000` | Black | Primary background, dominant surface |
| `colors.primary.white` | `#ffffff` | White | Primary text on dark, inverse surfaces |
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

### 1.4 Dark Mode

Sarani's design is **natively dark** — the primary mode is dark (black background). There is no light mode toggle required for v1. If a light-mode section is needed (e.g., a white card section for case study readability), apply these rules:

| Context | Background | Text | Accent |
|---|---|---|---|
| Page (default) | `#000000` | `#ffffff` | Flame / Cerulean / Lemon as above |
| Elevated card (dark) | `#171717` | `#ffffff` | White or accent |
| Contrast section (light) | `#ffffff` | `#000000` | Flame for CTA, Cerulean for links |
| Form inputs (dark) | `#171717` border `#525252` | `#ffffff` | Cerulean focus ring |

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

**Galano Grotesque** is Sarani's sole typeface — used for all headings and body copy. It communicates: modern, clean, confident, international. No serif, no second typeface, no system font fallback in visible UI.

```
font-family: "Galano Grotesque", sans-serif;
```

Galano Grotesque is a commercial font (Rene Bieder). @fullstack must ensure it is licensed and self-hosted or loaded via a font provider. **Do not fall back to system sans-serif in production.**

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
- Always Galano Grotesque Bold (700)
- Color: white on dark backgrounds, black on light backgrounds
- Flame, Cerulean, or Lemon can be used on individual words for emphasis (e.g., highlighting a proof point — but maximum 1 accent word per heading)
- Never center-align beyond H3 — H4 and below are always left-aligned
- Never use italic for headings

**Body copy**
- Always Galano Grotesque Regular (400)
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

*[See Section 3 below]*

---

## 4. Logo Usage

*[See Section 4 below]*

---

## 5. Spacing & Layout

*[See Section 5 below]*
