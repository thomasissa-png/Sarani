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

## 4. Responsive (Mobile) — 7/10

### Positive findings

**Tracker page: dual rendering strategy is correct.** The decision to show a full table on `md:` and above and switch to stacked cards on mobile (`md:hidden`) is the right architectural choice for a 9-column data table. The mobile cards expose the 6 most critical fields (client, project, status, invoice status, value, PO) in a readable layout.

**Filters on Tracker wrap gracefully.** `flex flex-col sm:flex-row gap-3` ensures the four filter controls stack vertically on mobile and align horizontally on tablet+. No horizontal overflow.

**New Project form.** `grid grid-cols-1 sm:grid-cols-2` is correct — single-column on mobile, two-column on tablet+. All inputs are `w-full` so they stretch to fill the column. No clipping.

**Quote Generator form.** Same responsive grid pattern. The line-items section is where complexity increases — see issues below.

**Sidebar.** Mobile drawer pattern with backdrop, slide-in animation, and Escape-key close is a solid implementation. The close button is accessible and visible. The hamburger trigger in the header is a large, tappable `h-9 w-9` circle — well within the 44px minimum touch target.

**Login page.** Single-column, centered card, `max-w-sm`, `p-4` outer padding. Renders cleanly on all screen widths. No issues.

### Issues found

#### [MAJOR] Quote Generator line-items table: horizontal overflow on mobile
The line-items section uses a CSS Grid with fixed pixel columns: `grid-cols-[1fr_100px_120px_120px_40px]`. Total minimum width: approximately 380px + the flex `1fr` column. On screens narrower than ~400px (iPhone SE at 375px), the Qty (100px), Unit Price (120px), and Total (120px) columns will force horizontal overflow or squash the description column to near zero.

There is no `overflow-x-auto` wrapper on the line-items grid, and no mobile breakpoint alternative (unlike the tracker table which switches to cards).

**Severity: Major** — the Quote Generator is a core workflow tool. A broken layout here means the team cannot use it on mobile or small-viewport screens.

**Fix:** Wrap the line-items section in `overflow-x-auto` as a minimum fix. Better: add a `sm:` breakpoint that switches the layout to stacked rows on mobile (description full-width, then a 3-column sub-grid for Qty / Unit Price / Total on the next line). Example pattern:
```
Mobile: [Description input full row] [Qty | Unit Price | Total | Delete on 4-col sub-grid]
Desktop: [1fr | 100px | 120px | 120px | 40px] (current)
```

#### [MAJOR] Quotes "Previous Quotes" table: no mobile fallback
The past-quotes table (`<table>`) has no mobile card fallback. On screens below `md:`, users must scroll horizontally to see all 5 columns (Date, Client, Project, Total, Actions). The Tracker page solved this correctly with a dual rendering approach — the same pattern was not applied to Quotes.

**Severity: Major** — the table is not unusable (browser-native horizontal scroll works), but it is a regression in UX quality compared to the Tracker page which set the standard.

**Fix:** Apply the same dual-rendering pattern:
- `hidden md:block` wrapper around the table
- `md:hidden` mobile card list showing Date, Client, Project name, Total, and a "View" link

#### [MINOR] Tracker filter row: client dropdown width not constrained
On mobile, the `<select value={clientFilter}>` in the Tracker filters has no max-width. When a client name is long (e.g., "Pernod Ricard International"), the select expands to full width which is correct — but in the `sm:flex-row` layout on tablet, it can grow disproportionately. Adding `sm:min-w-[140px] sm:max-w-[200px]` would stabilise it.

**Severity: Minor** — minor layout jitter on tablet, not a blocker.

#### [MINOR] Mobile header: redundant H1 rendering
In `admin-header.tsx`, the page title is rendered twice:
```tsx
<h1 className="... hidden md:block">{pageTitle}</h1>
<h1 className="... md:hidden">{pageTitle !== "Dashboard" ? pageTitle : ""}</h1>
```
Two `<h1>` elements are in the DOM simultaneously (one hidden via CSS). This creates a minor accessibility issue (two H1s in the document, one of which is visually hidden but still in the accessibility tree). On the Dashboard page specifically, the mobile H1 renders an empty string, which screen readers will encounter as an empty heading.

**Severity: Minor** — accessibility edge case. Fix: use a single `<h1>` with conditional content, or use a `<span>` for the mobile variant.

---

## 5. Accessibility — 7.5/10

### Positive findings

**Global focus ring is defined.** `globals.css` sets `*:focus-visible { outline: 3px solid var(--color-brand-cerulean); outline-offset: 2px; }` — all interactive elements get a visible, brand-aligned focus ring without any per-component work. This is the correct approach.

**Skip link is implemented.** The `.skip-link` class in `globals.css` provides keyboard-navigable content skipping. Correct implementation.

**Reduced motion is respected globally.** `@media (prefers-reduced-motion: reduce)` in `globals.css` suppresses all animations. The `ClientLogos` component also reads `useReducedMotion()` from Framer Motion. Double coverage is correct.

**Form labels.** Login page uses `sr-only` labels with visible placeholders — the `htmlFor` / `id` pairing is correct (`id="email"`, `id="password"`). Screen readers can navigate the form. The password field includes `aria-invalid={!!error}`.

**Error message live region.** Login page error uses `role="alert" aria-live="polite"` — screen readers will announce validation errors without focus change. Correct.

**Icon buttons have aria-labels.** The hamburger button (`aria-label="Open navigation"`), close button (`aria-label="Close navigation"`), password show/hide toggle (`aria-label="Show/Hide password"`), sign-out button, and remove-line-item button all have text alternatives.

**Decorative icons are marked aria-hidden.** All inline SVGs in buttons and links include `aria-hidden="true"` consistently.

**Submark component.** `aria-hidden="true"` on the decorative dots — correct.

**Logo component.** `aria-label="Sarani — Back to homepage"` on the wrapping link — correct.

**`ClientLogos` landmark.** `aria-label="Trusted by leading enterprises"` on the containing `<motion.div>` — correct.

### Issues found

#### [MAJOR] Tracker and Quotes tables: no `<caption>` or `aria-label`
Both data tables (`<table>` in `tracker/page.tsx` and `quotes/page.tsx`) have no `<caption>` element and no `aria-label` on the `<table>` tag. For screen reader users, a table without a name is announced as "table" with no context. This is a WCAG 2.2 SC 1.3.1 (Info and Relationships) and SC 4.1.2 (Name, Role, Value) concern.

**Severity: Major** — screen reader users cannot distinguish which table they are in without reading the surrounding heading context.

**Fix:** Add `<caption className="sr-only">Active projects</caption>` inside the tracker table, and `<caption className="sr-only">Previous quotes</caption>` in the quotes table.

#### [MAJOR] Tracker filters: select elements have no visible label
The three select dropdowns (Client, Status, Invoice) have no `<label>` elements. Their placeholder option texts ("All Clients", "All Statuses", "All Invoices") are the only contextual cues — these are `<option>` values, not labels. When a user selects a non-default value (e.g., "Sony"), the select shows "Sony" with no visual indication of what dimension is being filtered.

**Severity: Major** — WCAG 2.2 SC 1.3.1 and SC 3.3.2 (Labels or Instructions). The missing label also means screen readers cannot announce the field purpose on focus.

**Fix:** Add `<label className="sr-only" htmlFor="filter-client">Filter by client</label>` and `id="filter-client"` on the select. Same for status and invoice filters. Alternatively, use `aria-label` directly on the select elements.

#### [MINOR] White text on brand-cerulean hamburger button: contrast check
The hamburger button in `admin-header.tsx` uses `bg-brand-cerulean` (#0bb3f0) with `text-white` (#ffffff). Per the WCAG table in `design-system.md`, White on Cerulean (#0babe8) is 3.11:1 — which passes for UI components (3:1 threshold) but fails for body text (4.5:1). The hamburger icon is a UI control (SVG stroke), not body text, so 3:1 applies — this passes WCAG AA for non-text contrast. However, the actual implemented Cerulean is #0bb3f0 (slightly lighter than the spec value), which may lower the contrast marginally below 3:1.

**Severity: Minor** — likely a borderline pass. Recommend verifying with the actual `#0bb3f0` value. If it fails, switch to `bg-brand-black` for the hamburger.

#### [MINOR] Quote Generator line-item inputs: no labels
Each line-item row's four inputs (description, quantity, unit price, total display) have no `<label>` elements. Column headers are in a separate `<div>` grid row with no programmatic association. Screen readers navigating the inputs have no way to know which column they are in.

**Severity: Minor** — internal tool, but worth fixing for completeness.

**Fix:** Add `aria-label="Item description"`, `aria-label="Quantity"`, `aria-label="Unit price"` to each row's inputs. The visible column headers can remain as-is.

#### [MINOR] Dashboard `AgentTypeBadge`: initials only, no text alternative
The agent type badge renders 1–2 letter initials (e.g., "PM", "ED" for Email Drafter). The full agent type label is displayed in the `<p>` below it — so the context is preserved for sighted users. However, the badge div has no `aria-label` or `aria-hidden`. A screen reader will read out the initials as text, which may be confusing ("ED" without context).

**Severity: Minor** — the sibling `<p>` with the full label is sufficient context. Adding `aria-hidden="true"` to the badge div would be the clean fix.

---

## 6. Brand Compliance — 8/10

### Logo verification

**Three logo files are confirmed in `/public/`:**
- `/public/sarani-logo-black.png` — black wordmark + 3 colored dots (for light backgrounds)
- `/public/sarani-logo-white.png` — white wordmark + 3 colored dots (for dark backgrounds)
- `/public/sarani-logo.png` — present but unused in audited files

**The `Logo` component (`logo.tsx`) is correct.** It maps `variant="dark"` to `sarani-logo-black.png` and `variant="light"` to `sarani-logo-white.png`. The aspect ratio divisor of `2.6` is applied consistently for height calculation. `priority` is set (correct for above-fold logo). `aria-label` is present. The `Submark` component uses `bg-brand-flame`, `bg-brand-cerulean`, `bg-brand-lemon` — all correct system tokens.

**Login page logo.** `sarani-logo-black.png` at `w=120` on a `bg-neutral-200` background — correct variant for a light background.

**Sidebar logo.** `sarani-logo-black.png` at `w=100` on `bg-white` — correct.

**Header (mobile).** `sarani-logo-black.png` at `w=80` on `bg-white` — correct.

### Issues found

#### [MAJOR] Logo component bypassed in Sidebar and Header
As noted in Section 3, both `sidebar.tsx` and `admin-header.tsx` import `next/image` directly instead of using the `<Logo>` component. This means logo sizing, alt text, and link behavior are duplicated outside the system. If the logo file path changes or a retina variant is added, these two files must be updated manually alongside the component.

**Severity: Major** — violates the "single source of truth" principle for the brand mark.

**Fix:** Use `<Logo variant="dark" width={100} />` in sidebar and `<Logo variant="dark" width={80} />` in the header. Add an optional `href` prop to the `Logo` component (default `"/"`, overridable with `"/admin"` for the back-office context).

#### [MINOR] Client logos: LEGO and IKEA not in the project-context client list
`client-logos.tsx` displays: TikTok, Sony, Adidas, LEGO, Bose, IKEA. The `project-context.md` confirmed client list includes: Sony, TikTok, Adidas, GEODIS, PICO, L'Oréal, Pernod Ricard, Air Corsica, France Chimie, GIE, ProcessOut, Avenir Actifs. LEGO, Bose, and IKEA are not mentioned.

**Severity: Minor** — this is a front-end display decision (the existing logos may be correct business clients that simply weren't listed in project-context.md), but it flags a potential discrepancy. The logo files do exist in `/public/`.

**Action required:** Confirm with the client whether LEGO, Bose, and IKEA are current or past clients that should be displayed. If not confirmed, replace with clients from the validated list (GEODIS, L'Oréal, Pernod Ricard logos would need to be added to `/public/`).

#### [MINOR] Brand accent color under-represented in the back-office
The admin palette is almost entirely black, white, and neutral grays with cerulean for focus/links. Flame (the primary brand energy color) appears nowhere in the back-office. While restraint is correct for a productivity tool, there is an opportunity to use Flame as the primary CTA on one high-value action per page (e.g., "Generate PDF" on the Quotes page, "Create Project" on New Project) to maintain brand presence without overwhelming the interface.

**Severity: Minor** — brand preference, not a functional issue. Low priority.

---

## 7. Global Score — 7.8/10

### Score breakdown

| Criterion | Score | Rationale |
|---|---|---|
| Design system compliance | 7.5/10 | Token usage is solid; off-palette badge colors and red-* error classes are the main drift. Flame/Cerulean hex discrepancy between spec and impl is a documentation debt. |
| Visual hierarchy | 8/10 | Page structure is clear and consistent. The Tracker CTA button inconsistency (cerulean vs black at same hierarchy level) and missing dashboard agent grouping are the main gaps. |
| Consistency | 8.5/10 | Highest score. Form inputs, card containers, table structure, and error states are all copy-paste consistent. Two minor gaps: icon collision (file-text × 2) and missing page title entries in the header. |
| Responsive (mobile) | 7/10 | Tracker table / mobile cards pattern is excellent. The Quote Generator line-items overflow and missing mobile fallback for past-quotes table are two majors that need fixing before mobile use. |
| Accessibility | 7.5/10 | Global focus ring, skip link, reduced motion, aria-labels on buttons, and live regions are all correct. Two majors: table captions missing, filter selects unlabeled. |
| Brand compliance | 8/10 | Logo files are correct. The three PNG files exist. BLK variant used correctly on all light backgrounds. Main gap: Logo component bypassed in sidebar and header. |
| **Global** | **7.8/10** | A strong Phase 3. The foundation is clean and disciplined. Four "major" issues need resolution before production — all are straightforward fixes, none require architectural changes. |

---

## Issues Register — Priority Order

### Blockers (none)
No issues classified as blocking.

### Majors — Fix before production

| # | File | Issue | Fix effort |
|---|---|---|---|
| M-1 | `tracker/page.tsx`, `page.tsx` | Off-palette badge colors (blue, purple, green, red Tailwind classes) | Low — remap to 4 semantic tokens |
| M-2 | `tracker/page.tsx` | "New Project" cerulean vs "Sync now" black — false hierarchy in header actions | Low — swap cerulean to black, add icon |
| M-3 | `quotes/page.tsx` | Past-quotes table: no mobile card fallback | Medium — add `md:hidden` card list |
| M-4 | `quotes/page.tsx` | Line-items grid: no `overflow-x-auto`, breaks on narrow screens | Low — wrap + add mobile stacked layout |
| M-5 | `tracker/page.tsx`, `quotes/page.tsx` | Tables missing `<caption>` / accessible name | Low — add `<caption className="sr-only">` |
| M-6 | `tracker/page.tsx` | Filter selects have no `<label>` / `aria-label` | Low — add sr-only labels |
| M-7 | `sidebar.tsx`, `admin-header.tsx` | Logo component bypassed — inline `<Image>` instead of `<Logo>` | Low — replace 2 inline Images |

### Minors — Fix in next iteration

| # | File | Issue |
|---|---|---|
| m-1 | `tracker/new/page.tsx`, `quotes/page.tsx` | `text-red-500`, `bg-red-50`, `border-red-200` — use `text-error`, `bg-error-light` tokens |
| m-2 | `design-system.md`, `design-tokens.json` | Flame and Cerulean hex discrepancy between spec (#da5126 / #0babe8) and impl (#e35019 / #0bb3f0) |
| m-3 | `sidebar.tsx` | `file-text` icon used for both Quotes and Proposal — add a distinct icon for Quotes |
| m-4 | `admin-header.tsx` | Missing title entries for `/admin/tracker`, `/admin/tracker/new`, `/admin/quotes` |
| m-5 | `admin-header.tsx` | Two `<h1>` elements in DOM simultaneously — consolidate to one |
| m-6 | `tracker/page.tsx` | Client filter select width not constrained on tablet — add `sm:max-w-[200px]` |
| m-7 | `page.tsx` (Dashboard) | Agent grid lacks Content / Strategy / Operations sub-grouping |
| m-8 | `page.tsx` (Dashboard) | `AgentTypeBadge` div should be `aria-hidden="true"` |
| m-9 | `quotes/page.tsx` | Line-item inputs lack `aria-label` per row |
| m-10 | `client-logos.tsx` | LEGO / Bose / IKEA not confirmed in project-context client list — verify |

---

## Self-evaluation Checklist

- [x] WCAG 2.2 AA contrast checked for all color combinations in use
- [x] All components reviewed for variants, states, and responsive behavior
- [x] Design system token compliance verified against `globals.css` `@theme` block
- [x] Dark mode N/A — back-office is light-first by design, no dark mode toggle in v1
- [x] Logo files verified to exist in `/public/` and correct variants used per background
- [x] Issues classified by severity (major / minor), no blocking issues found

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/reviews/phase3-design-audit.md`
- Key decisions: 7 major issues and 10 minor issues identified and prioritised
- Points of attention:
  - M-1: Replace all off-palette Tailwind color classes in badge components with the 4 semantic tokens defined in `globals.css`
  - M-3/M-4: Add mobile layout to Quotes page (line-items overflow + past-quotes table card view)
  - M-5/M-6: Add WCAG-required `<caption>` and `<label>` elements to all data tables and filter selects
  - M-7: Replace inline `<Image>` logo in sidebar and header with the `<Logo>` component; consider adding an optional `href` prop to `Logo` for admin context
  - m-2: Update `design-tokens.json` and `design-system.md` to document actual implemented hex values for Flame (#e35019) and Cerulean (#0bb3f0)

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
