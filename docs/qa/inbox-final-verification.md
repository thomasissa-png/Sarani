# Inbox Final Verification — 2026-04-01

Post-fix verification of 5 audit items + 4 new features.

## Bug Fixes

| # | Item | Verdict | Detail |
|---|---|---|---|
| P1-1 | PROTO-LARK-TRIAGE double display | **PASS** | `LEGACY_PROTOCOL_TO_FILTER` maps it to `PROTO-ENQUIRY`; `filterItems` "other" tab only matches `null`/`archive` protocol — no double display possible (page.tsx L164, L187-193) |
| P1-2 | Inbox API type enum incomplete | **PASS** | `InboxFiltersSchema.type` has 11 values: `email_classified`, `ai_team_complete`, `qa_gates_pass`, `followup_alert`, `noise`, `auto_brief_ready`, `auto_quote_ready`, `lark_message`, `review_human`, `review_ai_ready`, `review_escalated` (inbox/route.ts L13-17) |
| P2-2 | projectType dropped from auto-brief | **PASS** | `ExecuteAutoBriefSchema` includes `projectType: z.string().optional()` and it is used in description parts (execute/route.ts L42, L131) |
| P2-3 | entity not used in ClickUp task name | **PASS** | Task name built as `${body.entity} - ${body.projectName}` when entity provided (execute/route.ts L125-126) |
| P2-4 | Stale closure AutoBriefCard | **PASS** | `handleCreate` useCallback deps include all 17 referenced values: `canCreate, itemId, projectName, selectedSpaceId, entity, brief, contactEmail, startDate, projectType, clients, payload.clientName, addToTracker, createSharepointFolder, assigneeId, onCreated, showToast` (AutoBriefCard.tsx L152-157) |

## New Features

| # | Feature | Verdict | Detail |
|---|---|---|---|
| 6 | DueTodayBanner expandable | **PASS** | State `dueTodayExpanded` toggles compact/expanded view; expanded view groups by `task.client`; API returns `client: t.space?.name` (page.tsx L369, L752-769; due-today/route.ts L62) |
| 7 | @sarani.studio retroactive filter | **PASS** | Client-side filter on fetched items: parses `summary` JSON, checks `from` field for `@sarani.studio` suffix, excludes matches (page.tsx L329-341) |
| 8 | User-ClickUp mapping | **PASS** | Users page exists; `users/route.ts` POST has `autoMatchClickUp` function (L12, L126); `users/assignees/route.ts` exists for ClickUp assignee data |
| 9 | Create Feedback workflow | **PASS** | `ProjectActionModal` has `create_feedback` variant (L13, L38, L365, L441); `clickup/comment/route.ts` and `clickup/reopen/route.ts` both exist |

## New Bugs Found

None.

## Verdict

**Score: 9/10 — GO**

All 5 fixes confirmed in place. All 4 new features verified structurally present and correctly wired. One point held back: no automated test coverage exists for any of these items (unit or E2E), which means regressions are unprotected. Recommend adding integration tests for `filterItems` logic and the `@sarani.studio` filter as priority.
