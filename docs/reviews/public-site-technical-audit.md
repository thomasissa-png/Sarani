# Public Site Technical Audit — Sarani

**Date:** 2026-03-25
**Audited by:** @qa + @seo
**Scope:** Public-facing site (excludes /admin)
**Build status:** PASS (0 errors)

---

## Technical Score: 7.5 / 10

Strong foundations — well-structured metadata, proper JSON-LD, good accessibility patterns, clean component architecture. Loses points on: missing sitemap coverage for new case studies, broken footer link, missing OG image file, zero usage of `next/image` on most pages, no FAQPage structured data, and Framer Motion bundle weight on every page.

---

## 1. SEO — Critical Issues

### 1.1 CRITICAL — Sitemap incomplete

**File:** `src/app/sitemap.ts`

The sitemap hardcodes only 3 case studies:
- `/case-studies/tiktok-video-production`
- `/case-studies/sony-banner-production`
- `/case-studies/geodis-presentation-rebranding`

But `src/data/case-studies.ts` contains **11 case studies** (adidas-superstar-concert, lego-grand-tournoi, sony-black-friday, sony-tv-launch, tiktok-ugc-edits, tiktok-road-to-paris, tiktok-comedy-club, ikea-summer-tour are missing).

Additionally, the `/work/[slug]` routes are entirely absent from the sitemap. The build confirms these pages exist as SSG routes.

The `/services` page is also missing from the sitemap.

**Impact:** 8 case study pages + all /work/ routes + /services are invisible to search engines via sitemap discovery.

**Fix:** Import `caseStudies` from `@/data/case-studies` and dynamically generate all entries. Add `/services`. Add `/work/[slug]` routes.

### 1.2 CRITICAL — Missing OG image file

**File:** `src/app/layout.tsx` line 36

The metadata references `/images/og/homepage-og.jpg` but the directory `public/images/og/` does not exist. The file is missing.

**Impact:** Social sharing (LinkedIn, Twitter, Slack previews) will show no image for the homepage and any page that inherits the default OG.

**Fix:** Create `public/images/og/homepage-og.jpg` (1200x630px). Consider adding per-page OG images for high-value pages (pricing, case studies).

### 1.3 HIGH — Broken footer link: /how-we-work

**File:** `src/components/layout/footer.tsx` line 5

The footer links to `/how-we-work` but no such page exists (`src/app/how-we-work/` directory not found). This is a 404 link present on every page of the site.

**Impact:** Bad UX, wasted crawl budget, broken internal link signal.

**Fix:** Either create the page or update the footer to link to `/about` (which covers similar content).

### 1.4 HIGH — No FAQPage structured data

**Files:** `src/app/page.tsx` (homepage FAQ section), `src/app/pricing/page.tsx` (pricing FAQ section)

Both pages render FAQ sections with questions and answers, but neither injects `FAQPage` JSON-LD schema. This is a missed opportunity for rich snippets in Google search results.

**Impact:** No FAQ rich snippets in SERPs despite having quality FAQ content.

**Fix:** Add `FAQPage` JSON-LD in both pages, referencing the FAQ items arrays.

### 1.5 MEDIUM — No structured data on Services page

**File:** `src/app/services/page.tsx`

The Services page has no JSON-LD. A `Service` or `OfferCatalog` schema would help search engines understand the service offerings.

### 1.6 MEDIUM — No structured data on Pricing page

**File:** `src/app/pricing/page.tsx`

No pricing-related JSON-LD. An `OfferCatalog` schema with individual `Offer` items would strengthen search presence for pricing-related queries.

### 1.7 LOW — About page missing OG metadata

**File:** `src/app/about/page.tsx`

Has `title` and `description` but no `openGraph` override. Will inherit the homepage OG, which is acceptable but suboptimal.

### 1.8 INFO — Duplicate case study routes

The site serves case studies at both `/case-studies/[slug]` and `/work/[slug]`. Both routes render similar content with the same data source. This creates duplicate content unless one set of URLs is canonicalized to the other.

**Recommendation:** Choose one canonical path (suggest `/work/[slug]` since the nav links to `/work`) and redirect the other, or add `<link rel="canonical">` tags.

---

## 2. Performance Issues

### 2.1 HIGH — `next/image` used in only 1 component

**Finding:** Only `src/components/home/project-slider.tsx` uses `next/image`. All other visual content (hero sections, case study imagery, gallery placeholders) uses placeholder `<div>` elements with background colors.

This is partially explained by the placeholders being actual placeholders awaiting real images. However, when real images are added, they MUST use `next/image` with proper `sizes`, `priority` (for above-fold), and `placeholder="blur"`.

**Action for @fullstack:** When adding real images to case study pages and hero sections, use `next/image` with:
- `priority` for above-fold images
- `sizes` attribute matching the responsive layout
- WebP/AVIF via Next.js automatic optimization

### 2.2 HIGH — Framer Motion on every page via shared components

**Files:** `src/components/ui/button.tsx`, `src/components/ui/animated.tsx`, `src/components/layout/header.tsx`, `src/components/home/client-logos.tsx`

The `Button` component uses `motion.div` for hover/tap animations. Since `Button` is used on every page, Framer Motion is included in every page's client bundle. The animation is a simple scale effect that could be achieved with CSS `transform` and `transition`.

**Bundle impact estimate:** Framer Motion adds ~30-40KB gzipped to the client bundle.

**Components where Framer Motion is justified:**
- `animated.tsx` — complex scroll-triggered animations
- `header.tsx` — mobile menu AnimatePresence
- `animated-hero.tsx`, `animated-metrics.tsx`, `animated-services.tsx` — scroll animations

**Components where CSS would suffice:**
- `button.tsx` — `whileHover={{ scale: 1.03 }}` and `whileTap={{ scale: 0.96 }}` can be replaced with CSS `hover:scale-[1.03] active:scale-[0.96] transition-transform`
- `client-logos.tsx` — the fade-in on scroll could use CSS `@starting-style` or a lightweight IntersectionObserver

**Fix for @fullstack:** Replace `motion.div` in `Button` with CSS transforms. This removes Framer Motion from pages that only use `Button` (e.g., legal, about).

### 2.3 MEDIUM — `"use client"` audit

56 files have `"use client"`. The admin section accounts for most (35+), which is expected. For the public site:

**Justified `"use client"` (need interactivity/browser APIs):**
- `contact-form.tsx` — form state, fetch
- `header.tsx` — scroll listener, mobile menu state
- `scroll-tracker.tsx` — IntersectionObserver
- `tracked-cta.tsx` — analytics tracking
- `faq.tsx` — details/summary interaction (could be server if using native `<details>`)
- `error.tsx`, `global-error.tsx` — required by Next.js

**Potentially convertible to server components:**
- `button.tsx` — if Framer Motion is removed (see 2.2), this becomes a pure presentational component
- `client-logos.tsx` — the marquee uses CSS animation; only the fade-in uses Framer Motion
- `case-study-card.tsx` — check if it only uses tracking on click (could use a thin client wrapper)
- `stat-card.tsx` — verify if it has client-side logic

### 2.4 LOW — Font loading is well optimized

`next/font/local` with `display: "swap"` and specific weights (400, 500, 700). This is the correct pattern. No issues.

### 2.5 INFO — CSS animations respect prefers-reduced-motion

`globals.css` includes a `@media (prefers-reduced-motion: reduce)` rule that disables animations. All Framer Motion components also check `useReducedMotion()`. This is excellent.

---

## 3. Accessibility Issues

### 3.1 GOOD — Skip link implemented

`src/app/layout.tsx` includes a skip link (`<a href="#main-content" className="skip-link">`) with proper focus styling in `globals.css`. The `<main>` tag has `id="main-content"`. This is correct.

### 3.2 GOOD — Contact form accessibility

`src/components/forms/contact-form.tsx` demonstrates strong accessibility:
- Every field has an associated `<label>` with `htmlFor`
- `aria-invalid` on fields with errors
- `aria-describedby` linking to error or help text
- Error messages use `role="alert"`
- Focus management on validation failure (`setFocus` to first error field)
- Honeypot hidden with `aria-hidden="true"`
- Minimum touch target size enforced (`min-h-[44px]`)
- Success state uses `aria-live="polite"`
- Submit button has `aria-label` for both states

### 3.3 GOOD — Mobile menu accessibility

`src/components/layout/header.tsx`:
- `aria-expanded` on hamburger button
- `aria-controls="mobile-menu"` linking button to menu
- Focus trap implemented (Tab/Shift+Tab cycling)
- Escape key closes menu
- Auto-focus on first link when menu opens
- Body scroll lock when menu is open

### 3.4 MEDIUM — Pricing comparison table missing scope attributes

**File:** `src/app/pricing/page.tsx` lines 186-219

The comparison table uses `<th>` elements but lacks `scope="col"` attributes. Screen readers may struggle to associate data cells with their headers.

**Fix:** Add `scope="col"` to all `<th>` elements.

### 3.5 MEDIUM — FAQ sections use `<details>` without ARIA

**File:** `src/app/pricing/page.tsx` lines 234-249

The FAQ uses native `<details>/<summary>` which is generally accessible, but the `+` icon rotation is purely visual. No issue with screen readers since `<details>` is natively accessible, but the `<summary>` text alone should be sufficient (it is).

However, the homepage FAQ component (`src/components/home/faq.tsx`) should be verified for the same pattern.

### 3.6 LOW — Footer link to legal#privacy targets non-existent anchor

**File:** `src/components/layout/footer.tsx` line 26

Links to `/legal#privacy` but the legal page sections use `id="privacy-policy"`, not `id="privacy"`. The anchor will not scroll to the intended section.

**Fix:** Change the footer link to `/legal#privacy-policy`.

### 3.7 GOOD — Global focus styles

`globals.css` defines `*:focus-visible` with a 3px solid cerulean outline and 2px offset. This provides consistent, visible focus indicators across the site.

### 3.8 INFO — Color contrast

The design uses `text-neutral-600` (#525252) on white backgrounds. This passes WCAG AA for normal text (contrast ratio ~7:1). The `text-neutral-400` (#a3a3a3) used for secondary text like "Trusted by" may fail AA for small text (contrast ratio ~2.7:1 against white).

**Files affected:** Client logos "Trusted by" label, various helper text, footer copyright text (against black bg, this is fine).

**Recommendation:** Audit `text-neutral-400` on white/light backgrounds. Replace with `text-neutral-500` (#737373, ratio ~4.6:1) where AA compliance is required.

---

## 4. Code Patterns

### 4.1 GOOD — Component architecture

- `Section` component (`src/components/layout/section.tsx`) provides consistent layout (padding, max-width, aria-label) across all pages. Server component, no unnecessary client code.
- Data-driven pages (services, pricing, case studies) use typed arrays with clean separation of data and rendering.
- TypeScript types are well-defined (`ServiceSection`, `PricingCategory`, `CaseStudy`).

### 4.2 GOOD — Animation components respect accessibility

`src/components/ui/animated.tsx` consistently checks `useReducedMotion()` and returns static fallbacks. This is a best practice rarely implemented this thoroughly.

### 4.3 MEDIUM — Button component wraps <a> in motion.div

**File:** `src/components/ui/button.tsx`

When rendering a link, the component wraps `<a>` in `<motion.div>`. This creates a `<div>` inside inline flow, which can cause layout issues. Also, the `<a>` tag is used instead of `next/link`, losing client-side navigation benefits.

**Fix for @fullstack:**
1. Use `next/link` instead of `<a>` for internal hrefs
2. If keeping Framer Motion, use `motion.a` directly instead of wrapping
3. If removing Framer Motion (see 2.2), use plain `<a>` or `Link` with CSS transforms

### 4.4 LOW — No explicit canonical URLs on pages

Pages rely on Next.js `metadataBase` for URL resolution but do not set explicit `alternates.canonical`. Given the duplicate `/case-studies/` vs `/work/` routes (see 1.8), canonical tags are important.

### 4.5 INFO — Clean code, no significant duplication

The two case study detail pages (`src/app/case-studies/[slug]/page.tsx` and `src/app/work/[slug]/page.tsx`) share the same data source and similar layouts but are not deduplicated. This is acceptable if one route is planned for removal; problematic if both stay.

---

## 5. Build Test

**Result: PASS**

`npm run build` completes with 0 errors. All routes generate correctly:
- Static pages: homepage, about, contact, legal, pricing, services, work
- SSG pages: case-studies/[slug] (11 pages), work/[slug] (11 pages)
- Dynamic: API routes, middleware

---

## 6. Recommendations to Reach 9/10

### Priority 1 — Critical (do before launch)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 1 | Make sitemap dynamic — include all case studies, /work/ routes, /services | `src/app/sitemap.ts` | 30 min |
| 2 | Create OG image at `public/images/og/homepage-og.jpg` | Design task | 1h |
| 3 | Fix broken /how-we-work footer link | `src/components/layout/footer.tsx` | 5 min |
| 4 | Fix footer /legal#privacy anchor to /legal#privacy-policy | `src/components/layout/footer.tsx` | 5 min |
| 5 | Resolve /case-studies/ vs /work/ duplicate content — pick canonical, redirect other | Routing decision + middleware | 2h |

### Priority 2 — High (significant SEO/performance gain)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 6 | Add FAQPage JSON-LD to homepage and pricing | `src/app/page.tsx`, `src/app/pricing/page.tsx` | 1h |
| 7 | Remove Framer Motion from Button — use CSS transforms | `src/components/ui/button.tsx` | 1h |
| 8 | Use `next/link` in Button for internal navigation | `src/components/ui/button.tsx` | 30 min |
| 9 | Add `scope="col"` to pricing comparison table headers | `src/app/pricing/page.tsx` | 10 min |
| 10 | Ensure all future images use `next/image` with proper sizing | Convention | Ongoing |

### Priority 3 — Medium (polish)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| 11 | Add OfferCatalog JSON-LD to services page | `src/app/services/page.tsx` | 1h |
| 12 | Add OG overrides to about and legal pages | `src/app/about/page.tsx`, `src/app/legal/page.tsx` | 30 min |
| 13 | Audit text-neutral-400 contrast on light backgrounds | Global | 1h |
| 14 | Add `alternates.canonical` to all pages | Per-page metadata | 1h |
| 15 | Consider extracting shared case study layout to reduce duplication | `src/app/case-studies/`, `src/app/work/` | 2h |

---

## Summary

The site has a solid technical foundation:
- Clean component architecture with TypeScript
- Proper Organization JSON-LD
- Strong accessibility on forms and navigation
- Good font optimization
- prefers-reduced-motion respected everywhere
- Build passes cleanly

The main gaps are SEO completeness (sitemap, structured data, canonical handling) and a Framer Motion dependency that inflates the bundle on pages that do not need it. Fixing the 5 critical items would bring the score to ~8.5/10. Completing Priority 2 items would reach 9/10.

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/reviews/public-site-technical-audit.md`
- Decisions prises : score 7.5/10, 5 issues critiques identifiees, 10 issues secondaires
- Points d'attention :
  - Sitemap dynamique a implementer en priorite (src/app/sitemap.ts)
  - OG image manquante (public/images/og/homepage-og.jpg)
  - Lien footer /how-we-work casse (404 sur toutes les pages)
  - Duplication /case-studies/ vs /work/ a resoudre avant indexation
  - Button component : remplacer Framer Motion par CSS + utiliser next/link
