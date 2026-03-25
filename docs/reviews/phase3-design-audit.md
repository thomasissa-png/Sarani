# Phase 3 — Design Audit
*Produced by @design — 2026-03-25*
*Scope: Back-office pages and components added or modified in Phase 3.*
*Language: English.*

---

## Audited Files

### Pages
- `src/app/admin/(authenticated)/tracker/page.tsx` — Unified Tracker
- `src/app/admin/(authenticated)/tracker/new/page.tsx` — New Project form
- `src/app/admin/(authenticated)/quotes/page.tsx` — Quote Generator
- `src/app/admin/(authenticated)/page.tsx` — Dashboard (Tracker card added)
- `src/app/admin/login/page.tsx` — Login (logo updated)

### Components
- `src/components/admin/sidebar.tsx` — Sidebar (Tracker + Quotes nav links)
- `src/components/admin/admin-header.tsx` — Header (logo updated)
- `src/components/ui/logo.tsx` — Logo component (BLK variant)
- `src/components/home/client-logos.tsx` — Client logos (real PNGs)

---

## Scores Summary

| Criterion | Score | Delta |
|---|---|---|
| 1. Design system compliance | 7.5/10 | — |
| 2. Visual hierarchy | 8/10 | — |
| 3. Consistency | 8.5/10 | — |
| 4. Responsive (mobile) | 7/10 | — |
| 5. Accessibility | 7.5/10 | — |
| 6. Brand compliance | 8/10 | — |
| **Global** | **7.8/10** | — |

---

## 1. Design System Compliance — 7.5/10

### What was audited
Verification that all color references, spacing, typography and border-radius values use defined design system tokens (via Tailwind CSS custom properties in `globals.css`) rather than hardcoded arbitrary values.

### Positive findings

**Token usage is solid across the board.** All back-office pages consume `text-brand-black`, `text-brand-cerulean`, `focus:ring-brand-cerulean`, `border-neutral-300`, `bg-white`, `rounded-xl`, `rounded-lg` — all tokens that exist in the `@theme` block of `globals.css`. No rogue hex values were found in JSX class strings.

**Semantic color tokens are used correctly in the Dashboard.** `StatusBadge` in `page.tsx` references `bg-success-light`, `bg-info-light`, `bg-warning-light`, `bg-error-light`, `text-success`, `text-info`, `text-error` — all defined as CSS custom properties.

**Form inputs are consistent.** All inputs, selects and textareas across Tracker new project and Quote Generator share the exact same class string: `border border-neutral-300 bg-white text-sm text-brand-black focus:ring-2 focus:ring-brand-cerulean`. This is a strong sign of a disciplined copy-paste pattern.

**Focus ring is correctly scoped to cerulean.** Matches the design system rule for interactive form elements.

### Issues found

#### [MAJOR] Off-palette color classes in badge components
**File:** `tracker/page.tsx` (functions `getStatusBadgeClasses`, `getInvoiceBadgeClasses`) and `page.tsx` (Dashboard `AgentTypeBadge`)

Raw Tailwind color classes are used: `bg-blue-100 text-blue-700`, `bg-purple-100 text-purple-700`, `bg-green-100 text-green-700`, `bg-red-100 text-red-700`, `bg-amber-100`, `bg-pink-100`, `bg-indigo-100`, `bg-rose-100`, `bg-teal-100`, `bg-lime-100`, `bg-cyan-100`, `bg-slate-100`, `bg-orange-100`.

None of these are in the Sarani token set. The design system defines only: `brand-flame`, `brand-cerulean`, `brand-lemon`, the neutral scale, and the four semantic tokens (`success`, `warning`, `error`, `info`). Every other Tailwind color is off-system.

**Severity: Major** — not a visual blocker since it's internal tooling, but it creates a drift vector that will accumulate.

**Fix:** Map all badge states to the four semantic tokens + neutral. Example:
- `open` → `bg-neutral-200 text-neutral-600` (already done correctly)
- `in progress` → `bg-info-light text-info` (replace `bg-blue-100 text-blue-700`)
- `review` → keep a purple approximation OR use `bg-warning-light text-warning-text` (closest semantic)
- `closed` / `delivered` → `bg-success-light text-success` (replace `bg-green-100 text-green-700`)
- `overdue` → `bg-error-light text-error` (replace `bg-red-100 text-red-700`)
- `paid` → `bg-success-light text-success`
- `invoiced` → `bg-info-light text-info`
- For `AgentTypeBadge`: collapse all per-agent colors into 4 categories mapped to the 4 semantic tokens. Visual variety is preserved through the initial letter — the color is secondary.

#### [MINOR] Token value discrepancy — Flame and Cerulean hex
The `design-system.md` specifies `#da5126` (Flame) and `#0babe8` (Cerulean). The actual `globals.css` implementation uses `#e35019` (Flame) and `#0bb3f0` (Cerulean). These are slightly different hex values. The WCAG contrast ratios documented in the design system were calculated on the spec values, not the implemented values. The delta is small and contrast outcomes are unchanged, but the token spec should be updated to reflect the actual implementation values to avoid confusion during future WCAG re-checks.

**Severity: Minor** — cosmetic documentation gap, no visual impact.

**Fix:** Update `design-tokens.json` and the WCAG table in `design-system.md` to reflect `#e35019` and `#0bb3f0`.

#### [MINOR] `red-500` / `red-200` hardcoded in error states
**Files:** `tracker/new/page.tsx`, `quotes/page.tsx` error divs use `bg-red-50 border-red-200 text-red-700` and required-field asterisks use `text-red-500`.

These should be replaced with `bg-error-light border-error text-error` using the defined semantic token. `text-red-500` asterisks should be `text-error`.

**Severity: Minor** — functionally identical, but breaks token encapsulation.

---

## 2. Visual Hierarchy — 8/10

### Positive findings

**Page-level H1 pattern is consistent.** Every page opens with `text-2xl font-bold text-brand-black` + a `text-neutral-500 text-sm` subtitle. This is a reliable and readable pattern. Users always know where they are.

**Dashboard information architecture is well-layered.** The read sequence is natural: stats (4 cards) → Tracker CTA → Agent grid → Recent Outputs. Each section is visually distinct via background color (white cards on the implicit neutral background) and heading weight differences.

**Tracker stat cards.** The `lg` value with `font-bold` at `text-lg` creates a good number-to-label ratio. The "Overdue" danger variant (`text-red-600`) draws the right level of alarm without screaming.

**Form hierarchy on New Project and Quote Generator.** Labels → inputs → submit button follow a top-to-bottom reading flow. Required field asterisks (`*`) provide a clear visual signal. The inline note `(auto-detected from ClickUp)` on the Division field is exemplary — it reduces cognitive load before the user hits confusion.

**Tracker page dual-mode (desktop table / mobile cards).** The decision to switch rendering modes rather than force a scrollable table on mobile is architecturally correct. Each mobile card is self-contained with the most critical fields (client, project, badges, value) at the top.

### Issues found

#### [MAJOR] Primary CTA inconsistency on Tracker page
The "New Project" button uses `bg-brand-cerulean` while "Sync now" uses `bg-brand-black`. This is the only page in the back-office where two different button backgrounds appear at the same hierarchy level in the same header row.

The design system specifies Flame (`#e35019`) as the primary CTA color and Cerulean for trust/information/secondary interactive elements. Both buttons are primary actions — they should share a single visual weight.

**Severity: Major** — creates false hierarchy (looks like primary/secondary when both are primary-equivalent).

**Fix option A (aligned with design system):** "New Project" → `bg-brand-flame text-white` (primary CTA role), "Sync now" → `bg-brand-black text-white` (secondary/utility role). This creates a clear primary/secondary distinction.

**Fix option B (neutral-first):** Both use `bg-brand-black` — "New Project" gets a left icon (plus sign) to differentiate. Safer, avoids introducing Flame into the admin palette.

Recommendation: Option B. The admin context benefits from restraint. Flame should remain rare.

#### [MINOR] Dashboard "Agents" section lacks visual grouping
The 14 quick-action cards in the "Agents" grid are displayed without sub-grouping. The sidebar organises these into Content / Strategy / Operations. The dashboard should mirror this grouping with sub-headers to reduce scan time.

**Severity: Minor** — functional, just slower to scan.

**Fix:** Add the same three group labels above the relevant cards, matching the sidebar's `AGENT_GROUPS` structure.

#### [MINOR] Tracker stat cards: value font size inconsistency
The Tracker page uses `text-lg font-bold` for stat values while the Dashboard page uses `text-3xl font-bold`. These are two instances of the same `StatCard` component pattern but with different implementations (separate local components, not shared). The Dashboard version reads more clearly as a "metric" — the Tracker version reads closer to body text.

**Severity: Minor** — context justifies a smaller size on the Tracker (the page is data-dense), but the discrepancy should be documented as intentional.

---

## 3. Consistency — 8.5/10

### Positive findings

**Sidebar navigation structure is coherent.** The addition of "Tracker" and "Quotes" to `NAV_ITEMS` follows the exact same pattern as existing items: `{ label, href, icon }`. The chosen icons (`activity` for Tracker, `file-text` for Quotes) are reasonable. `file-text` is also used for "Proposal" — a minor collision addressed below.

**Form input pattern is 100% consistent.** Across all four new/modified pages, every `<input>`, `<select>`, and `<textarea>` uses the same class string. There is no drift. This is the most consistent aspect of Phase 3.

**Card pattern is consistent.** `bg-white rounded-xl border border-neutral-300` is the universal card container. `rounded-xl` + `border-neutral-300` appear reliably. No page uses a different border color or radius.

**Table pattern is consistent.** Both Tracker and Quotes use the same `<table>` structure: `<Th>` with `px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider`, rows with `border-b border-neutral-100 hover:bg-neutral-200/50`. The visual DNA is identical.

**Error state pattern is consistent.** All error display uses `bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700` (or `rounded-lg` variant). Consistent styling, if slightly off-token (addressed in Section 1).

**Back arrow navigation.** The New Project page uses an SVG back arrow as a link to `/admin/tracker`. This pattern exists elsewhere in the back-office and is applied correctly.

**Logo usage in Sidebar and Header.** Both directly consume `/sarani-logo-black.png` via `next/image`. This bypasses the `Logo` component — addressed in Section 6.

### Issues found

#### [MINOR] Icon collision: `file-text` used for both Quotes and Proposal
In `sidebar.tsx`, both `{ label: "Quotes", href: "/admin/quotes", icon: "file-text" }` and `{ label: "Proposal", href: "/admin/agents/proposal", icon: "file-text" }` share the same icon. On a dark reading, both look identical in the nav, which impairs scannability.

**Severity: Minor** — only noticed when both items are visible simultaneously and you are looking for differences.

**Fix:** Change Quotes to `receipt` or `calculator` icon. If those SVGs are not in the current `NavIcon` registry, add one. A simple cash-register or tag shape differentiates "billing document" from "sales proposal."

#### [MINOR] `admin-header.tsx` — `getPageTitle` missing entries for Tracker routes
The `titles` map in `admin-header.tsx` does not include `/admin/tracker` or `/admin/tracker/new` or `/admin/quotes`. These fall through to the "extract last segment" fallback, which produces `"Tracker"`, `"New"`, and `"Quotes"` respectively. `"New"` is ambiguous as a page title — a user landing on that page via a direct link would not know what they are creating.

**Severity: Minor** — the fallback produces acceptable results for Tracker and Quotes, but `"New"` is too generic.

**Fix:** Add to the `titles` map:
```
"/admin/tracker": "Project Tracker",
"/admin/tracker/new": "New Project",
"/admin/quotes": "Quote Generator",
```

#### [MINOR] `SidebarContent` does not use the `Logo` component
The sidebar logo renders directly with `<Image src="/sarani-logo-black.png" ...>`. The `Logo` component exists precisely to centralise this — it provides the correct `alt`, `width/height`, `priority`, and future variant switching in one place. Same pattern in `admin-header.tsx`.

**Severity: Minor** — no visual difference today, but creates a divergence point if the logo file is ever renamed or the aspect ratio changes.

**Fix:** Replace the inline `<Image>` in `SidebarContent` and `AdminHeader` with `<Logo variant="dark" width={100} />` and `<Logo variant="dark" width={80} />` respectively. Remove the `Link` wrapper in `SidebarContent` (the `Logo` component already renders a `Link` to `"/"`). Note: the `Logo` component links to `"/"` — in the admin context you may want `href="/admin"`. Consider adding an optional `href` prop to `Logo`.
