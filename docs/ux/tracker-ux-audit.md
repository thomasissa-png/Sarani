# Tracker UX Audit — Sarani Admin

> Audited: 2026-03-26 | Auditor: @ux | File: `src/app/admin/(authenticated)/tracker/page.tsx`

---

## Overall Score: 6/10

The tracker is functional and architecturally sound. The core data model is right, filters work, and the mobile/desktop split is implemented. The problems are density, discoverability, and interaction cost — not broken flows. At 5,000+ projects, these frictions compound fast for Thomas and his PMs.

---

## Issues by Severity

| # | Severity | Area | Issue |
|---|---|---|---|
| 1 | Blocking | Desktop table | 10 columns with no visual hierarchy — scannability fails at 50 rows |
| 2 | Blocking | Mobile | No date shown on mobile cards — a critical field missing |
| 3 | Blocking | Mobile | Mobile pagination buttons are 32px tall — below the 44px touch target minimum |
| 4 | Major | Navigation | No way to jump to a specific page — "1 / 100" with Prev/Next means 100 clicks to reach page 50 |
| 5 | Major | Filters | Status filter includes raw ClickUp status strings mixed with "Active" shortcut — confusing mental model |
| 6 | Major | Actions | QuoteIcon, SharePointIcon, ExternalLinkIcon are 16px icon-only buttons — no visible label, low discoverability |
| 7 | Major | Mobile | Filter panel opens inline below search — it pushes ALL cards down, no fixed/overlay behavior |
| 8 | Major | Header | Two visually identical black buttons ("New Project" + "Sync now") — equal visual weight for unequal actions |
| 9 | Minor | Stats | Stats always compute on full `data.projects` (not filtered) — misleading when filters active |
| 10 | Minor | Status bar | Integration status bar (ClickUp / SharePoint / Evoliz dots) is always visible — occupies space even when healthy |
| 11 | Minor | Empty state | "No projects match your filters" has no one-click reset — user must manually clear each filter |
| 12 | Minor | Sorting | Sorting state is not persisted — every page load resets to no sort, forcing Thomas to re-sort every session |

---

## Top 10 Recommendations — Ordered by Impact

### 1. Reduce desktop table to 7 visible columns + overflow toggle (Blocking)

**Problem:** 10 columns (Client, Project, Contact, Status, Category, Value, PO, Invoice, Date, Actions) force horizontal scroll on 1280px screens and make rows impossible to scan in one pass.

**Solution:** Show 7 columns by default: Client, Project, Status, Invoice, Value, Date, Actions. Move Contact, Category, PO behind a row-level expand chevron or a "Columns" toggle in the header. The expand keeps the row compact while making all data accessible in 1 click.

**Impact:** Rows scannable in under 2 seconds. No forced horizontal scroll at standard desktop widths.

---

### 2. Add page jump input to pagination (Blocking for 5000+ projects)

**Problem:** With 50 items/page and 5,000 projects, that is 100 pages. Prev/Next navigation means up to 99 button clicks to reach the last page. Completely unusable at scale.

**Solution:** Replace the `{currentPage} / {totalPages}` text with an input field: `[ 1 ] / 100`. User types a page number, presses Enter, jumps directly. Keep Prev/Next buttons flanking it. On mobile, the same input applies.

**Impact:** Navigation from page 1 to page 47 goes from 46 clicks to 2 interactions.

---

### 3. Add date field to mobile cards (Blocking)

**Problem:** Mobile cards show Client, Project, Status, Invoice, Contact, Value, PO, Category — but omit Date entirely. Date is a sortable column on desktop, clearly important to Thomas.

**Solution:** Add Date as the 5th grid item in the mobile card's 2-column detail grid, replacing or repositioning Category (less frequently needed at a glance).

**Impact:** Mobile and desktop views reach information parity on the fields Thomas uses to track active work.

---

### 4. Increase mobile pagination touch targets to 44px minimum (Blocking — WCAG 2.2)

**Problem:** Pagination buttons use `py-1.5` (approx 32px height). WCAG 2.2 SC 2.5.8 requires minimum 24x24px targets with adequate spacing; Apple HIG and Material both recommend 44px. At 40% mobile usage, this is a daily friction point.

**Solution:** Change mobile pagination buttons to `py-3` (approx 44px). On mobile, also consider replacing Prev/Next text buttons with large arrow icon buttons spanning full tap width.

**Impact:** Eliminates accidental mis-taps on pagination during one-handed scrolling.

---

### 5. Differentiate "New Project" vs "Sync now" visually (Major)

**Problem:** Both header buttons share identical styling (`bg-brand-black text-white font-semibold rounded-lg`). "New Project" is a primary action (permanent consequence); "Sync now" is a utility action (reversible, runs in background). Equal visual weight causes decision friction every time Thomas looks at the header.

**Solution:** Keep "New Project" as the primary black button. Make "Sync now" a ghost/secondary button (`border border-neutral-300 bg-white text-brand-black`). Add a rotation animation to the sync icon during loading (already present but only on the spinner, not on the button idle state).

**Impact:** Reduces cognitive load at the top of the page — Thomas's eye lands on the primary action first.

---

### 6. Label action icons or use a context menu (Major)

**Problem:** The Actions column shows 16px icon buttons (QuoteIcon, SharePointIcon, ExternalLinkIcon) with tooltip-only labels (`title` attribute). Tooltips don't work on mobile. The icons are low-contrast neutral-400 by default. New team members will not recognize what QuoteIcon does.

**Solution — Option A (Desktop):** Add a text label next to each icon on hover using a CSS tooltip styled as a pill. Minimum icon+label combination in a compact `<button>` with visible text on `md+` screens.

**Solution — Option B (Mobile + Desktop):** Replace the three separate icon buttons with a single `...` overflow menu per row that expands to: "Generate Quote / Open SharePoint / Open ClickUp". Touch targets become full-width menu items (44px+).

**Recommended:** Option B — reduces visual noise in the table and solves mobile discoverability simultaneously.

**Impact:** Action discoverability improves for new PMs. Mobile users can reliably tap actions without mis-tapping.

---

### 7. Make filter stats context-aware (Major)

**Problem:** The 4 stat cards (Total Projects, Total Value, Open/In Progress, Overdue) always reflect the full unfiltered dataset (`data.projects`). When Thomas filters to "Sony" + "Active", the stats still show global numbers — misleading.

**Solution:** Compute stats from `filteredProjects` (already available in scope) instead of `data.projects`. Add a subtle "(filtered)" label next to "Total Projects" when any filter is active. Keep the global total available as a secondary line: "42 of 5,234 projects."

**Impact:** Stats become actionable — Thomas can filter to "Sony + Overdue" and immediately see the dollar amount at risk for that client.

---

### 8. Add one-click "Clear all filters" to empty state and filter bar (Major)

**Problem:** When filters return zero results, the empty state says "No projects match your filters." but offers no reset action. User must manually revisit each select and reset it. The filter bar also has no visible "Clear" affordance.

**Solution:** In the empty state, add a "Clear all filters" button that resets client, status, and invoice filters to "All" and clears the search string. In the filter bar, show a "Clear" link (text, not button) to the right of the dropdowns when `activeFilterCount > 0`.

**Impact:** Eliminates a dead end. Recoverable errors are a UX basic — a filtered empty state is an error state.

---

### 9. Collapse integration status bar to a single icon by default (Minor)

**Problem:** The status bar always shows 3 integration dots (ClickUp / SharePoint / Evoliz connected/not_configured/error) even when all are healthy. This is 48px of prime vertical space consumed by a "nothing is wrong" message.

**Solution:** When `apiStatus.overall === "healthy"`, collapse the bar to a single green dot with label "All integrations connected" on the right side of the header row (next to Sync now), not a full-width block. Expand to the current detailed bar only when `overall !== "healthy"` or when clicked.

**Impact:** Saves ~48px of vertical real estate above the fold, especially valuable on mobile where every pixel counts.

---

### 10. Persist sort preference in localStorage (Minor)

**Problem:** Sort state (`SortConfig | null`) is React state — it resets on every page load. Thomas sorts by Value descending to see his biggest active projects. Every morning he has to re-sort.

**Solution:** On sort toggle, write the sort config to `localStorage.setItem('tracker-sort', JSON.stringify(sort))`. On component mount, read it back as the initial state value. 4 lines of code, zero backend cost.

**Impact:** The tracker remembers how Thomas works. Reduces daily interaction cost by 2-3 clicks per session.

---

## Wireframes — Tracker Ideal State

### Desktop (1280px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Project Tracker                          [New Project]  [○ Sync now]        │
│ Unified view · ClickUp / SharePoint / Evoliz · cached 3 min ago  [● All OK]│
├─────────────────────────────────────────────────────────────────────────────┤
│ [Total: 5,234]  [Value: €2.4M]  [Active: 47]  [Overdue: 3 ▲]               │
│                       ← stats reflect current filter context                │
├─────────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search projects, clients, contacts...]   [Columns ▾]  [Clear filters]  │
│ [All Clients ▾]  [Active ▾]  [All Invoices ▾]                              │
├────────────┬─────────────────────────┬──────────┬──────────┬───────┬───────┤
│ Client ↕   │ Project ↕               │ Status   │ Invoice  │ Value↕│ Date ↕│ ···│
├────────────┼─────────────────────────┼──────────┼──────────┼───────┼───────┤
│ Sony       │ Black Friday Banners    │ [Active] │ [Paid]   │ €150  │ 12/24 │ [···]│
│ TikTok     │ Weekly Edit Batch #47   │ [Active] │ [Open PO]│ €3,2K │ 03/26 │ [···]│
│ PICO       │ Launch Film Q1          │ [Review] │ [Invoiced│ €18K  │ 01/26 │ [···]│
├────────────┴─────────────────────────┴──────────┴──────────┴───────┴───────┤
│ Showing 1–50 of 234    [← Prev]  [ 1  ] / 5  [Next →]                      │
└─────────────────────────────────────────────────────────────────────────────┘

[···] row expands to: "Generate Quote | Open SharePoint | Open ClickUp"
[Columns ▾] toggles visibility of: Contact / Category / PO
```

### Mobile (375px)

```
┌─────────────────────────────────────┐
│ Project Tracker         [+] [↻]     │
│ 234 active · €2.4M                  │
├─────────────────────────────────────┤
│ [🔍 Search...          ] [Filters 2]│
│ ── filter drawer (overlay) ─────── │
│  [All Clients ▾]                    │
│  [Active ▾]                         │
│  [All Invoices ▾]                   │
│  [Apply]  [Clear all]               │
│ ─────────────────────────────────── │
├─────────────────────────────────────┤
│ SONY                        [···]   │
│ Black Friday Banners                │
│ [Active]  [Paid]                    │
│ Contact: J. Park  │ Value: €150     │
│ Date: 2024-12-01  │ PO: PO-2024-089 │
├─────────────────────────────────────┤
│ TIKTOK                      [···]   │
│ Weekly Edit Batch #47               │
│ [Active]  [Open PO]                 │
│ Contact: L. Chen  │ Value: €3,200   │
│ Date: 2026-03-26  │ PO: --          │
├─────────────────────────────────────┤
│ [←] 1 of 5  [→]                    │
│ Showing 1–50 of 234                 │
└─────────────────────────────────────┘

[···] = bottom sheet with: Generate Quote / SharePoint / ClickUp
Filter drawer = full-width overlay with Apply/Clear — does NOT push cards down
Touch targets: all buttons min 44px height
```

---

## Tests UX — Tracker

| Test | Criterion | Status |
|---|---|---|
| Persona: Thomas finds all active Sony projects in < 3 taps | Filter to Sony + Active, see result | ✅ Works |
| Cognitive load: <= 3 actions per screen | Desktop row shows 3 icons — but unlabeled | ⚠️ Labeling needed |
| Time-to-value: reach a project and open ClickUp in <= 3 steps | Filter → find row → click ClickUp icon (mobile: untappable) | ⚠️ Mobile blocked |
| Edge case: empty filter state | No reset affordance | ❌ Fix needed |
| Edge case: error state | Retry button present, message shown | ✅ Works |
| Edge case: loading state | Skeleton present | ✅ Works |
| Accessibility WCAG 2.2 AA: touch targets >= 44px | Mobile pagination = ~32px | ❌ Fix needed |
| Accessibility: keyboard nav | Sort buttons and filters are keyboard-accessible | ✅ Works |
| Accessibility: icon-only actions have text alternative | title attributes only — no screen reader label on actions | ⚠️ aria-label needed |

---

## Hypotheses to Validate

- [HYPOTHESE] The "Category" column may be more important than "Contact" for Thomas's daily scanning — validate with Thomas before hiding it in the overflow toggle.
- [HYPOTHESE] 50 items/page is assumed adequate for the "Active" default filter (which likely returns 15-30 projects). If Thomas typically works unfiltered, the page jump input becomes more critical.

---

*Handoff below*

---

**Handoff → @fullstack**
- Files produced: `/home/user/Sarani/docs/ux/tracker-ux-audit.md`
- Decisions taken: 10 prioritized recommendations, desktop column reduction to 7 defaults, mobile filter as overlay, page-jump pagination, stats scoped to filtered set, localStorage sort persistence
- Critical fixes (blocking): touch targets on mobile pagination, missing date field on mobile cards, page jump for large datasets, column reduction
- Major fixes: action icon discoverability (overflow menu pattern), filter stats context-awareness, empty state reset CTA, button visual hierarchy
- Minor fixes: integration status bar collapse, sort persistence
- No code was modified — all recommendations only
