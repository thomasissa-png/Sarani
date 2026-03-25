# Phase 3 — UX Audit
*Produced by @ux — 2026-03-25*
*Language: English*
*Target user: Thomas + Ops Lead — agency PM managing Sony, TikTok, Bose. Pressed for time, 40% on mobile.*

---

## Audit Scope

Pages audited in this session:

| Journey | Files |
|---|---|
| Unified Tracker | `src/app/admin/(authenticated)/page.tsx`, `src/app/admin/(authenticated)/tracker/page.tsx` |
| New Project | `src/app/admin/(authenticated)/tracker/new/page.tsx` |
| Quote Generator | `src/app/admin/(authenticated)/quotes/page.tsx` |
| Login + Navigation | `src/app/admin/login/page.tsx`, `src/components/admin/sidebar.tsx`, `src/components/admin/admin-header.tsx` |
| Front-office logos | `src/components/home/client-logos.tsx`, `src/components/ui/logo.tsx` |

---

## Scores Summary

| Dimension | Score | Comment |
|---|---|---|
| 1. Information Architecture | **7.5/10** | Clear hierarchy, one structural gap |
| 2. Task Completion — Desktop | **7.5/10** | Flows work, friction on quotes form |
| 3. Task Completion — Mobile | **6/10** | Tracker OK, quotes form breaks |
| 4. Feedback & States | **8/10** | Strong skeleton+error+stale coverage, one gap |
| 5. Cognitive Load | **7.5/10** | Clean for tracker, heavy for quotes |
| 6. Micro-interactions | **6.5/10** | Functional but sparse |
| **Global** | **7/10** | Production-ready for internal use; 4 blockers before wider rollout |

---

## 1. Information Architecture — 7.5/10

### What works

**Dashboard as command center.** The dashboard correctly positions the Project Tracker as the primary operational feature via a prominent CTA card above the Agents grid. The visual hierarchy (Stats → Tracker CTA → Agents → Recent Outputs) matches the actual usage priority for a busy PM: "what's happening now" before "tools to run tasks".

**Sidebar taxonomy is sensible.** Top-level nav (Dashboard, Quick Brief, Projects, Tracker, Quotes, Clients, Users) separates operational views from tools. The Agents section is grouped into Content / Strategy / Operations — a grouping that maps well to how the Sarani team thinks about work.

**Tracker placement in nav.** Tracker and Quotes appear as peer items in the main nav (`NAV_ITEMS`), consistent with their equal operational importance. The `activity` icon for Tracker and `file-text` for Quotes are semantically appropriate.

### Problems

**P1 — Severity: Major. "Projects" and "Tracker" cause confusion.**
The sidebar has both a "Projects" item (`/admin/projects`) and a "Tracker" item (`/admin/tracker`). From the user's perspective, these sound like the same thing. A PM on mobile opening the nav for the first time will not know which one to tap. The distinction (Projects = internal DB of agent outputs; Tracker = cross-system live view) is not visible from the label alone.

*Fix:* Rename "Projects" to "Agent Outputs" or "AI Outputs" in both sidebar label and page `<h1>`. This makes the distinction unambiguous. Cost: 5 min of rename.

**P2 — Severity: Minor. "Quotes" entry point is sidebar-only.**
The dashboard has a Tracker CTA card but no equivalent card for Quotes. If a user lands on the dashboard after creating a project, the next logical step is often to generate a quote. The dashboard forces them to find Quotes in the sidebar independently.

*Fix:* Add a "Generate Quote" CTA card on the dashboard, positioned next to or below the Tracker card. Mirror the same design pattern (border card with hover effect). Impact: reduces navigation overhead by 1-2 clicks for the most common post-tracker action.

**P3 — Severity: Minor. Admin header title map is incomplete for Phase 3 routes.**
`getPageTitle()` in `admin-header.tsx` handles `/admin/tracker` via fallback (capitalizes last segment = "Tracker"), but `/admin/tracker/new` is not explicitly mapped — it falls through to the fallback which produces "New" (not "New Project"). The `quotes` route also falls through to "Quotes" (acceptable) but could be "Quote Generator" for precision.

*Fix:* Add `"/admin/tracker": "Project Tracker"`, `"/admin/tracker/new": "New Project"`, and `"/admin/quotes": "Quote Generator"` to the `titles` map in `admin-header.tsx`.

---

## 2. Task Completion — Desktop — 7.5/10

### Journey 1: Finding and reading tracker data

**Happy path: Dashboard → Tracker CTA → Tracker page.** Works cleanly. The CTA card is visually distinct, hover states signal interactivity, the chevron arrow icon reinforces click affordance. One click from dashboard to tracker.

**On the Tracker page:** The filter bar (search + 3 dropdowns) gives the PM four ways to slice the data. Search covers project name, client, contact, and PO number — appropriate for rapid lookup. The client dropdown is dynamically populated from live data, which is correct.

**Status bar (integration health) is well-conceived.** The colored dots (green/yellow/red) for ClickUp, SharePoint, Evoliz are immediately scannable. However, the status text "not configured" vs "connected" vs "error" appears in a small `text-xs` below the dot with no visual separation from neighboring integrations when all three are listed on one line. On a wide viewport this is fine; at 768px breakpoint it could wrap unpredictably.

**Column density is appropriate for an internal tool.** Client / Project / Contact / Status / Category / Value / PO / Invoice / Actions — 9 columns. The Project column truncates at `max-w-[280px]` which handles most project names but long names like "TikTok Global Campaign — Holiday 2026 Phase 2 Execution" will be clipped with no tooltip. The user cannot see the full name without going to ClickUp.

*Fix for truncation:* Add `title={p.project}` to the `<td>` or use a tooltip on hover. Native HTML `title` attribute is sufficient for an internal tool.

**Action links (SharePoint / ClickUp) are icon-only with `title` attributes.** On desktop, the browser renders the title on hover, which is acceptable for an internal power-user tool. The SharePoint icon (document with fold) and ClickUp icon (generic external link) are not instantly recognizable. The SharePoint icon particularly looks like any file icon.

*Fix:* For SharePoint specifically, use the official SharePoint S-document shape or add a text label "SP" next to the icon. For ClickUp, consider adding "CU" text label. Alternatively, replace both with labeled buttons ("SharePoint →", "ClickUp →") that appear on row hover only via `group-hover` to avoid column width issues.

### Journey 2: Creating a new project

**Entry: Tracker page → "New Project" button.** The button is in the top-right of the tracker header, blue, prominent. Clear. One click to the form.

**Form quality:** 6 fields in a single-screen card (Client, Project Name, Contact, Category, Division, Estimated Value). No unnecessary steps. The form correctly starts submission immediately on "Create Project" click without a confirmation dialog — appropriate for an internal tool where the action is reversible.

**Client → Division dynamic behavior is well-implemented.** When a client is selected, division options populate from ClickUp data. If no match is found, the field shows a disabled input with "No divisions found" or "Select a client first". This guided dependency reduces error rate.

**Result screen is excellent.** Step-by-step results (ClickUp Task / SharePoint Folder / Excel Tracker) with green check / red X per step, and a "Retry Failed Steps" button that intelligently skips already-successful steps. This is exactly the right pattern for a multi-system write operation.

**One gap: no "Create Another" button after full success.** After all three steps succeed, the user's only option is to use browser back or click the back arrow. If Thomas is onboarding 5 clients at the start of a project, he has to navigate manually each time.

*Fix:* Add a "Create another project" button next to or below the results block when `allSuccess === true`. Link to `/admin/tracker/new` (or reset form state). Impact: saves 2-3 navigation steps per batch project creation session.

### Journey 3: Generating a quote

**Form field count: 7 input fields + dynamic line item rows.** Fields: Client (select), Contact Name, Project Name, Currency, Purpose of Work (textarea), Scope and Deliverables (textarea), Line Items (table). This is the heaviest form in the back-office.

**Pain point: no required field indicators on most fields.** The validation error only fires on submit ("All fields are required."). Looking at the form, none of the fields have a red asterisk (`*`) — but all of them are required. The user has no way to know this before clicking "Generate PDF". This leads to a frustrating submit-fail-correct loop.

*Fix:* Add `<span className="text-red-500">*</span>` to Client, Contact Name, Project Name, Purpose of Work, and Scope labels (mirroring the pattern already used in the New Project form). Cost: trivial.

**Auto-calculation works correctly.** `quantity × unitPrice = total` updates on change, grand total aggregates properly. This is the core time-saving feature of the form and it works without issues.

**PDF download UX is standard and correct.** The browser download trigger (`<a>` click) is the most reliable cross-browser approach. No issues.

**Past quotes table is not responsive on desktop.** The table has no overflow-x-auto wrapper, which means at narrow desktop widths (e.g. 900px with sidebar open) the table may overflow. The tracker table correctly has `overflow-x-auto` on its container — the same pattern should be applied to the quotes history table.

*Fix:* Wrap the past quotes `<table>` in `<div className="overflow-x-auto">`. One line.

**Downloading past quotes requires SharePoint URL.** When `q.pdfUrl` is null, the cell shows "No link" with no re-download option. If the SharePoint upload failed at generation time, the quote is permanently inaccessible from the UI.

*Fix (medium-effort):* Store the PDF data or a re-generation trigger. Minimum viable: add a "Re-generate" button that re-fetches the quote data from the `quote_data` JSONB snapshot and triggers a new PDF download.

---

## 3. Task Completion — Mobile — 6/10

### Journey 1: Tracker on mobile

**Mobile card layout is well-designed.** Each project becomes a card with Client name (small, neutral), Project name (prominent), status badges, and a 2-column grid for Contact / Value / PO / Category. External links (SharePoint, ClickUp) move to the top-right of each card. This is the correct pattern — the table is hidden via `hidden md:block` and mobile cards via `md:hidden`.

**Filter bar on mobile stacks vertically.** `flex-col sm:flex-row` means on narrow screens the 4 filter controls (1 text input + 3 selects) stack into a column. This is correct behavior. However, 4 stacked controls occupy approximately 200px of vertical space before the user even sees data. For a power user checking one client's projects on mobile, this is a lot of scroll before reaching content.

*Fix consideration:* Add a collapsed "Filters" toggle on mobile that expands the filter bar on tap. On mobile, show only the search input by default and hide the 3 dropdowns behind a "Filter" button with a badge showing active filter count. This reduces the default vertical footprint without removing functionality.

**Stale data warning is text-only inline.** The stale indicator appears as `(cached X min ago)` inside the subtitle paragraph below the page title. On mobile this is easy to miss — the header area is small and the user's eye jumps directly to the cards. If data is stale by an hour, the user may act on wrong information.

*Fix:* On mobile, promote the stale warning to a visible banner (yellow background, full width) when data is older than 15 minutes. Mirror the same pattern as the error banner.

### Journey 2: New Project on mobile

**The form is mobile-friendly by design.** The `sm:grid-cols-2` grid collapses to single column on mobile — all 6 fields stack vertically with correct touch target sizes (`py-2.5` = approximately 44px height, meeting WCAG 2.2 AA minimum).

**Client → Division dependency works on mobile.** The cascade updates correctly regardless of screen size since it is state-driven.

**Back button (arrow icon only) has a small touch target.** The back arrow in the New Project header is `w-5 h-5` (20px) with no padding. The tappable area is too small for reliable mobile use.

*Fix:* Wrap the back arrow in a `p-2` container to expand tap area to 36px, or replace with a text link "← Back to Tracker" which is more legible and has a naturally larger tap target.

**Results screen on mobile: steps list is readable.** The `StepResultRow` component has adequate spacing (`gap-3`) and the green/red icons are large enough (`w-5 h-5`) to distinguish at a glance.

### Journey 3: Quotes on mobile — Critical issues

**The line items table uses a fixed 5-column CSS grid:** `grid-cols-[1fr_100px_120px_120px_40px]`. On a 375px screen (iPhone 14), the fixed columns total approximately 100+120+120+40 = 380px + the flexible description column. This means the table extends beyond the viewport and the user must scroll horizontally inside the table — but there is no `overflow-x-auto` wrapper on the line items grid container.

*Fix (blocking):* Wrap the line items grid in `overflow-x-auto` OR switch to a stacked card layout on mobile where each line item shows as a card with labeled fields. The card approach is preferable because it eliminates the horizontal scroll entirely. Use `hidden sm:grid` on the table header and `sm:hidden` card layout below.

**Two textareas (Purpose of Work, Scope and Deliverables) with `rows={3}`.** On a 375px viewport, each textarea is approximately 100px tall. Two of them plus all other fields means the form requires roughly 1000px of vertical scroll on mobile. This is acceptable for a form this complex, but the cognitive load section addresses the field count issue separately.

**No mobile-optimized layout for the past quotes table.** The past quotes section uses a `<table>` with 5 columns and no mobile card alternative (unlike the tracker which correctly implements `hidden md:block` / `md:hidden`). On mobile the table will overflow its container horizontally.

*Fix (major):* Add a mobile card layout for past quotes following the same pattern as the tracker. Each card: Date + Client name at top, Project name, Total in large font, SharePoint link button.

**"Generate PDF" button is at the bottom of a long form.** On mobile, the user scrolls past 8-10 input interactions before reaching the submit button. There is no sticky submit affordance. For a time-pressured PM filling out a quote on mobile, this increases perceived form length.

*Fix (minor, medium-effort):* Make the "Generate PDF" button sticky at the bottom of the viewport on mobile only (`sticky bottom-0` inside the form card, visible only on `md:hidden`). Or add a floating action button. This is a quality-of-life improvement rather than a blocker.

---

## 4. Feedback & States — 8/10

### What works

**Loading skeleton on Tracker is well-executed.** `TrackerSkeleton` renders 4 stat cards + 8 table rows with `animate-pulse`, matching the final layout's structure. The skeleton accurately predicts what the loaded state will look like — the gold standard for skeleton screens.

**Error state on Tracker is complete.** The red banner shows the API error message, includes a "Retry" link, and the message differentiates technical errors from empty states. This follows WCAG 2.2 guidance on error identification.

**Stale data indicator is present.** When `isAnyCached` is true, the subtitle shows `(cached X min ago)` using `timeAgo()`. The integration status bar provides per-source granularity (ClickUp / SharePoint / Evoliz status dots) — particularly useful during a partial outage.

**New Project result screen distinguishes partial vs full success.** The `allSuccess` vs `hasPartialFailure` logic drives different UI states — heading changes, retry button appears conditionally, each step shows its own status icon. This is the correct multi-step feedback pattern.

**Login error state has `role="alert"` and `aria-live="polite"`.** The error message will be announced by screen readers without requiring the user to navigate to it. The `aria-invalid` attribute on the password field is correctly set when an error exists.

**Quote generation: success and error banners are both implemented.** The success message distinguishes "uploaded to SharePoint" from "SharePoint upload skipped" — this contextual differentiation prevents false confidence.

### Problems

**P1 — Severity: Major. No progress indicator during PDF generation.**
When the user clicks "Generate PDF", `generating` flips to true and the button label changes to "Generating...". PDF generation may take 3-10 seconds. For a PM on a slow mobile connection, the button label change alone is insufficient — the user may think the app has frozen.

*Fix:* Add a pulsing bar or spinner inside the form card during generation, with text: "Generating your PDF — this takes a few seconds..." This sets correct expectations and prevents duplicate submissions.

**P2 — Severity: Minor. Empty state for past quotes is not actionable.**
When `pastQuotes.length === 0`, the card shows "No quotes found." with no contextual message or CTA.

*Fix:* When filter is empty and quotes are 0: "No quotes generated yet. Fill out the form above to create your first quote." When a filter is active: "No quotes for [client name]. [Clear filter]"

**P3 — Severity: Minor. Sync button provides no success confirmation.**
After a successful sync, the button reverts to "Sync now" with no momentary confirmation. The user must infer success from data updating.

*Fix:* After successful sync, briefly show "Synced ✓" on the button (2 seconds) then revert. Add a `syncSuccess` state boolean, reset via `setTimeout(2000)`.

---

## 5. Cognitive Load — 7.5/10

### What works

**Tracker page: data density is appropriate for the user.** Thomas and the ops team are power users managing 20-50+ projects across 10+ clients. The table approach with 9 columns is correct for this persona. Filters allow immediate narrowing.

**New Project form: minimal and purposeful.** 6 fields, one card, one button. Every field serves a direct purpose in the automation. Cognitive load is low.

**Dashboard stats (4 cards) are instantly scannable.** Total Clients / Active Clients / Total Outputs / Outputs This Week — one number each.

**Progressive disclosure for division field.** The division dropdown only appears as a real dropdown when divisions exist for the selected client — otherwise it shows a disabled informational input.

### Problems

**P1 — Severity: Major. Quotes form requires 7 mandatory fields before any line items.**
Client, Contact Name, Project Name, Currency, Purpose of Work, Scope and Deliverables — all required, all blank on every visit. For a PM generating a routine quote for an existing repeat client, filling 6 metadata fields from scratch is unnecessarily repetitive.

*Fix (medium effort):* Pre-populate Contact Name from the client record in DB. Add a "Load from last quote" button next to the client selector that auto-fills Purpose of Work and Scope from the `quote_data` JSONB snapshot of the most recent quote for that client.

**P2 — Severity: Major. No currency symbol in Unit Price input fields.**
The Unit Price column header says "Unit Price" but the input is a bare number with no currency symbol. The Total column shows formatted currency (`€1,000`), but the input context is ambiguous — the user cannot confirm they are entering amounts in the correct currency without looking at the Currency dropdown.

*Fix:* Add a currency symbol prefix to the Unit Price column header: `Unit Price (€)`. Update reactively when the Currency dropdown changes. Alternatively, use a styled input prefix group: `€ [input]`.

**P3 — Severity: Minor. Dashboard "Recent Outputs" list is not clickable through to the output.**
Clicking a client name goes to `/admin/clients/[id]`. The user cannot navigate directly to the output. A PM who wants to retrieve a "done" translation from 2h ago must navigate through the client page.

*Fix:* Make each output row link to the output detail page, or add a visible "Open" icon button on row hover.

---

## 6. Micro-interactions — 6.5/10

### What works

**Hover states are consistently applied** across all interactive elements: nav items, table rows, CTA cards, buttons. The system is coherent and predictable.

**Focus rings are consistently applied.** All interactive inputs use `focus:ring-2 focus:ring-brand-cerulean`. This meets WCAG 2.2 AA contrast requirements for focus indicators.

**Active nav state is clear.** `bg-brand-black text-white` on the active nav item provides maximum contrast. The active state logic correctly distinguishes dashboard (exact match) from sub-pages (startsWith).

**Mobile drawer animation.** `animate-in slide-in-from-left duration-200` provides smooth entrance. Escape key dismissal and route-change dismissal are both implemented correctly.

**Tracker skeleton.** `animate-pulse` provides appropriate visual rhythm. Structure mirrors the final layout.

**"Trusted by" section respects `prefers-reduced-motion`.** `useReducedMotion()` hook disables the scroll-triggered fade for users who have set the accessibility preference.

### Problems

**P1 — Severity: Major. Mobile marquee ignores `prefers-reduced-motion`.**
The `animate-marquee` class runs unconditionally on mobile. The `prefersReduced` check disables the `whileInView` fade but not the continuous CSS marquee. Users with vestibular disorders may experience discomfort from continuous horizontal scrolling animation.

*Fix:* Apply `animate-marquee` conditionally only when `!prefersReduced`. When reduced motion is preferred, show a static centered layout on mobile (same as desktop static grid).

**P2 — Severity: Major. Mobile drawer backdrop appears without fade transition.**
The drawer has `animate-in slide-in-from-left duration-200` but the backdrop (`bg-black/40`) appears instantaneously. The content is suddenly dimmed while the drawer slides in — jarring.

*Fix:* Add `animate-in fade-in duration-200` to the backdrop div. This requires the animation classes from the same Tailwind animation package already in use.

**P3 — Severity: Minor. Back arrow on New Project has undersized touch target.**
The back arrow link in the New Project header is `w-5 h-5` (20px icon) with no padding. WCAG 2.2 AA minimum touch target is 24×24px; best practice is 44×44px.

*Fix:* Wrap in `p-2` container or replace with a text link "← Back to Tracker" which naturally has a larger tap area.

**P4 — Severity: Minor. No success micro-animation on "Sync now" button.**
(See Section 4 P3.) Beyond the functional gap, the absence of a confirmatory cue makes the back-office feel less responsive.

*Fix:* Brief color pulse on button: `bg-brand-black` → `bg-green-600` → `bg-brand-black` over 1.5s on sync success.

**P5 — Severity: Minor. SharePoint / ClickUp action icons have no mobile label.**
On desktop, `title` attribute provides a hover tooltip (acceptable for internal tool). On mobile, icon-only action buttons provide no label — the user cannot confirm which system they are opening before tapping.

*Fix:* On mobile cards, replace icon-only buttons with short labeled buttons: "SP →" and "CU →". Use `md:hidden` / `hidden md:inline` to show labels only on mobile.

---

## 7. Global Assessment — 7/10

### Overall verdict

Phase 3 delivers a functional, coherent back-office for a small internal team. The core flows are completable without friction on desktop. Code quality is high — skeleton loading, error handling, stale data detection, and retry logic on multi-step writes are all production-grade. The mobile tracker (card layout) is well designed.

The score stops at 7/10 because of four issues that block or significantly degrade the experience for the target user.

### 4 Blockers before wider rollout

| # | Problem | File | Impact | Fix cost |
|---|---|---|---|---|
| B1 | Quotes line item table overflows viewport on mobile | quotes/page.tsx | PM on mobile cannot fill line items | Medium (2-3h) |
| B2 | Past quotes table has no mobile card layout | quotes/page.tsx | Past data inaccessible on mobile | Medium (1-2h) |
| B3 | Required field markers absent on quotes form | quotes/page.tsx | Submit-fail loop on every first use | Low (30 min) |
| B4 | Mobile marquee ignores prefers-reduced-motion | client-logos.tsx | Accessibility regression before public launch | Low (30 min) |

### 7 Majors to address in next sprint

| # | Problem | Section ref | Fix cost |
|---|---|---|---|
| M1 | "Projects" vs "Tracker" nav label confusion | IA | Low — rename label |
| M2 | No "Quotes" CTA card on dashboard | IA | Low — copy Tracker card pattern |
| M3 | No "Create another" button after project creation | Task/Desktop | Low |
| M4 | No progress indicator during PDF generation | Feedback | Low-Medium |
| M5 | No currency symbol in Unit Price input fields | Cognitive Load | Low |
| M6 | Mobile drawer backdrop appears without fade | Micro-interactions | Low |
| M7 | Admin header title map missing Tracker/Quotes routes | IA | Low — add 3 entries |

### What to ship as-is

- Tracker desktop experience (smooth PM workflow)
- New Project form and retry logic (correct multi-step UX)
- Login page (clean, accessible, password toggle, error state)
- Sidebar navigation structure and mobile drawer (Escape key, route-change close)
- Integration status bar (clear, scannable health indicators)
- Tracker skeleton (correctly structured against final layout)
- Client logos fade animation on front-office (reduce-motion respected — just fix marquee)

---

## Hypotheses to Validate

- [HYPOTHESE] A PM generating quotes typically reuses the same client and contact across multiple quotes. Pre-filling from last quote would save 60-90 seconds per quote. To confirm: ask Thomas if repeat-client quotes represent more than 50% of usage.
- [HYPOTHESE] The 40% mobile usage (project-context.md) likely concentrates on Tracker (read-only scan) rather than the Quotes form (complex write). If confirmed, blocker severity on quotes/mobile may be lower in practice. To confirm: add Umami events per page and device type.

---

## Auto-evaluation

| Criterion | Status |
|---|---|
| Each screen justified by persona need | Yes — Sophie/Thomas PM persona drives every recommendation |
| Edge cases and error states covered | Yes — all identified, gaps explicitly flagged |
| Steps to aha moment documented | Yes — Tracker: 1 click from dashboard. New Project: 6 fields + 1 click. Quote: 8 fields + 1 click |
| WCAG 2.2 AA compliance | Partial — focus rings pass, marquee fails reduced-motion, back arrow fails touch target |
| Consistency with functional specs | Yes — all spec features (retry, stale data, partial results) covered |

---

**Handoff → @orchestrator**

- Files produced: `/home/user/Sarani/docs/reviews/phase3-ux-audit.md`
- Decisions taken: 4 blockers identified (quotes mobile overflow, past quotes no mobile layout, missing required field markers, marquee accessibility). 7 majors for next sprint. Desktop tracker and new project flows are production-ready.
- Points of attention:
  - B1 and B2 (quotes mobile) must be assigned to @fullstack before any rollout to ops team members who are on mobile
  - B3 (required field markers) is a 30-minute fix — include in next PR
  - B4 (marquee reduced-motion) is an accessibility regression — must fix before public launch
  - M5 (currency symbol) is low-effort, high-clarity — include in same PR as B3
  - M1 ("Projects" vs "Tracker" naming) should be aligned with @product-manager before renaming to keep DB model labels consistent
