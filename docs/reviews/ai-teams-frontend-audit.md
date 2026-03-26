# Frontend Audit — AI Teams + Session Modifications — 2026-03-26

**Auditor:** @reviewer | **Scope:** 10 files across AI Teams, Pricing, Tracker, Quotes, Integrations

## Overall Score: 8.2 / 10

Solid implementation with good design consistency and UX patterns. Five issues require attention, two of them high severity.

---

## Audit by File

| # | File | Score | Key Issues | Severity |
|---|---|---|---|---|
| 1 | `teams/page.tsx` | 8.5 | Missing aria-label on filter select; status filter buttons lack `role="tablist"` | LOW |
| 2 | `teams/new/page.tsx` | 8.5 | No "Custom team" option (spec Section 6 requires 6 templates + Custom); non-null assertion `selectedTemplate!` | MED |
| 3 | `teams/[id]/page.tsx` | 7.5 | `fetchTeam` in useEffect dependency causes re-fetch loop (stale `selectedStepId` closure); modal lacks focus trap; no Download button (spec requires .txt/.docx) | HIGH |
| 4 | `sidebar.tsx` | 9.0 | AI Teams link present and correct. Good mobile drawer with Escape handler | -- |
| 5 | `pricing/page.tsx` | 9.0 | Clean dual currency, FAQ schema.org, good responsive grid. Table comparison not fully responsive on <375px | LOW |
| 6 | `tracker/page.tsx` | 8.5 | Good Active filter default, Quote link, debug empty state. Search input missing `aria-label` | LOW |
| 7 | `quotes/page.tsx` | 8.0 | Pre-fill from tracker works. `Suspense` wrapper correct for `useSearchParams`. Client select uses `value={c.name}` — fragile if two clients share a name; should use `c.id` | MED |
| 8 | `tracker-merge.ts` | 9.0 | Clean merge logic. `fuzzyMatch` with bidirectional `includes` is correct for this use case | -- |
| 9 | `excel-parser.ts` | 9.0 | Dynamic header detection is robust. `maxScanRows=20` is sensible | -- |
| 10 | `evoliz.ts` | 9.0 | OAuth2 rewrite with token cache, retry on 401/429/5xx, graceful degradation. Well structured | -- |

---

## Top 5 Issues (by Severity)

### 1. HIGH — Team Detail: fetchTeam re-render loop risk
**File:** `teams/[id]/page.tsx` line 84-114
`fetchTeam` depends on `selectedStepId` via its `useCallback` deps. Every time `selectedStepId` changes, `fetchTeam` is recreated, which triggers `useEffect` line 112-114 to re-fetch. During the first render, `setSelectedStepId` inside `fetchTeam` will create a new `selectedStepId`, which recreates `fetchTeam`, which re-fires the effect — potentially causing a double-fetch on every load. The `if (!selectedStepId)` guard prevents an infinite loop but wastes a network call.
**Fix:** Move auto-selection logic out of `fetchTeam` into a separate effect or use a ref for `selectedStepId`.

### 2. HIGH — Team Detail: No Download action (spec gap)
**File:** `teams/[id]/page.tsx`
Spec Section 6 requires: *"Copy" and "Download (.txt / .docx)" actions*. Only "Copy" and "Re-run" are implemented. Download is missing entirely.
**Fix:** Add a download button that creates a Blob from the output text and triggers a browser download.

### 3. MED — New Team: Missing "Custom" template option
**File:** `teams/new/page.tsx`
Spec Section 6 states: *"6 template cards + Custom option"*. The template picker renders only the 6 defined templates from `TEAM_TEMPLATES`. There is no "Custom" card allowing manual agent selection (US-05). The `TemplateType` union also excludes `"custom"`.
**Fix:** Add a 7th card for "Custom" that opens a manual step-builder form.

### 4. MED — Quotes: Client matching by name instead of ID
**File:** `quotes/page.tsx` line 289-299
The client `<select>` uses `value={c.name}` and the form submits `clientName` as a string. If two clients have the same display name, the wrong client could be selected. This is fragile for a B2B tool.
**Fix:** Use `c.id` as the select value and resolve the name for display/PDF generation server-side.

### 5. LOW — Rerun modal: No focus trap, no `role="dialog"` / `aria-modal`
**File:** `teams/[id]/page.tsx` line 544-586
The rerun modal overlay intercepts clicks but lacks: `role="dialog"`, `aria-modal="true"`, and focus trapping (Tab cycles through background elements). Screen reader users cannot identify it as a modal.
**Fix:** Add ARIA attributes and implement focus trap (or use a dialog component).

---

## Additional Observations

- **Design consistency:** All three AI Teams pages reuse the same card/badge/button patterns as Tracker, Quotes, and Clients. Color palette is coherent (brand-black CTAs, sky-50/cerulean for active states, green for success, red/flame for errors).
- **Status color mapping:** Consistent across Teams list (`in_progress` = sky/cerulean) and Team detail steps (`running` = sky/cerulean, `completed` = green, `failed` = red). Matches Tracker badge conventions.
- **Mobile responsive:** Teams list uses responsive grid (`grid-cols-1 md:2 xl:3`). Team detail uses `flex-col lg:flex-row` for timeline/content split. Tracker has dedicated mobile card layout. Pricing grid is responsive. All pass at 375px. The comparison table on Pricing requires horizontal scroll at 320px — acceptable for a data table.
- **"use client"** is correctly applied to all 4 client-side pages.
- **No memory leaks detected:** The polling interval in Team detail (`setInterval` for running steps) is properly cleaned up via `return () => clearInterval(interval)`.
- **MarkdownRenderer:** Custom implementation is adequate for agent output rendering. Handles headers, lists, code blocks, bold/italic/inline code. Does not handle tables or images — acceptable for V1 agent text output.
- **Evoliz OAuth2 rewrite:** Properly caches tokens with 60s buffer before expiry, handles 401 (token refresh), 429 (rate limit with Retry-After), and 5xx (retry once). Graceful degradation when credentials missing.

---

## Recommendations

1. **Fix the fetchTeam dependency loop** — decouple selectedStepId from the fetch callback to avoid unnecessary API calls.
2. **Add Download button** in team detail deliverables panel to match spec.
3. **Add Custom team creation flow** — even a simplified version (manual agent picker + step labeling) satisfies US-05.
4. **Add `role="dialog"` and focus trap** to the rerun modal for WCAG AA compliance.
5. **Switch Quotes client select to use IDs** instead of names for data integrity.

---

**Handoff -> @orchestrator**
- File produced: `docs/reviews/ai-teams-frontend-audit.md`
- Recommendation: GO WITH RESERVES — no blockers for deployment, but Issues #1-#3 should be addressed before production use of AI Teams feature
- Agents to re-invoke: @fullstack for fixes #1, #2, #3, #5; @ux for Custom team flow design
