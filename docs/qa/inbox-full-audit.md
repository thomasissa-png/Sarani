# Inbox Full Audit -- Session April 2026

**Auditor**: @qa
**Date**: 2026-04-01
**Scope**: 18 files (API routes, components, libs) modified during inbox session
**Score**: 7.5 / 10

---

## Per-File Verdict

| # | File | Verdict | Comment |
|---|---|---|---|
| 1 | `api/admin/emails/classify/route.ts` | PASS | Auth, rate limit, Zod validation, graceful ClickUp degradation. Solid. |
| 2 | `api/admin/cron/poll-emails/route.ts` | PASS | Cron secret auth, dedup, Sarani filter, noise, auto-brief pipeline. Aligned with classify. |
| 3 | `api/admin/inbox/route.ts` | PASS (minor) | Auth, Zod. Type enum misses `lark_message`, `auto_quote_ready`, `review_*` -- filter works because field is optional but API rejects explicit filter for these types. |
| 4 | `api/admin/clickup/search/route.ts` | PASS | Auth, rate limit, Zod, clean response. |
| 5 | `api/admin/clickup/due-today/route.ts` | PASS | Auth, rate limit, graceful degradation if no API key. |
| 6 | `api/admin/clickup/comment/route.ts` | PASS | Auth, rate limit, Zod, proper error handling. |
| 7 | `api/admin/clickup/reopen/route.ts` | PASS | Auth, rate limit, Zod. Uses `updateTaskStatus` correctly. |
| 8 | `api/webhooks/lark/route.ts` | PASS | Token verification, challenge response, chat ID filter, DM handling. No rate limit (webhook -- acceptable). |
| 9 | `api/auto-brief/execute/route.ts` | PASS (minor) | Auth + role check, retry-safe. Missing `projectType` in Zod schema (see P2-3). |
| 10 | `admin/(authenticated)/page.tsx` | FAIL | PROTO-LARK-TRIAGE double-display bug (see P1-1). Otherwise well-structured. |
| 11 | `components/inbox/EmailCard.tsx` | PASS | Backward compat for legacy categories. `showToast` prop unused (dead code). |
| 12 | `components/inbox/DraftReplyModal.tsx` | PASS | Focus trap, Escape, body lock, Arya analysis section. Clean. |
| 13 | `components/inbox/ProjectActionModal.tsx` | PASS | 3 variants working. ClickUp search, feedback post + reopen workflow. Proper disabled states. |
| 14 | `components/inbox/CreateBriefModal.tsx` | PASS | Entity field, assignee dropdown, checkboxes. Focus trap. Client auto-match. |
| 15 | `components/inbox/AutoBriefCard.tsx` | PASS | Entity, assignee, checkboxes. Handles extraction errors. |
| 16 | `lib/integrations/clickup.ts` | PASS | `searchTaskByName` with two-tier matching, `matchScore` word overlap, retry logic. Solid. |
| 17 | `lib/integrations/config.ts` | PASS | 37 team members, PM mapping. Helper functions clean. |
| 18 | `lib/ai/prompts/brief-extractor.ts` | PASS | Entity field, 6 project types, Zod schema. Aligned with auto-brief pipeline. |

---

## Bug List

### P0 -- None detected

### P1 -- High

**P1-1: PROTO-LARK-TRIAGE items display in two tabs simultaneously**
- **File**: `src/app/admin/(authenticated)/page.tsx`, lines 162-199
- **Issue**: `LEGACY_PROTOCOL_TO_FILTER` maps `PROTO-LARK-TRIAGE` to `PROTO-ENQUIRY`, causing these items to appear in the "Enquiries" tab. But the "Others" filter (lines 192-194) also explicitly includes `i.protocol === "PROTO-LARK-TRIAGE"`. Result: old Lark items show in both "Enquiries" AND "Others" tabs.
- **Fix**: Remove line 194 (`return i.protocol === "PROTO-LARK-TRIAGE";`). The legacy mapping already routes them to Enquiries. If the intent was "Others only", remove the `LEGACY_PROTOCOL_TO_FILTER` entry for `PROTO-LARK-TRIAGE` instead.

**P1-2: Inbox API type filter rejects valid item types**
- **File**: `src/app/api/admin/inbox/route.ts`, line 13-14
- **Issue**: The `type` enum in `InboxFiltersSchema` only includes 6 types: `email_classified`, `ai_team_complete`, `qa_gates_pass`, `followup_alert`, `noise`, `auto_brief_ready`. Missing: `auto_quote_ready`, `lark_message`, `review_human`, `review_ai_ready`, `review_escalated`. If the frontend ever sends `?type=lark_message`, the API returns 400.
- **Impact**: Currently no frontend code filters by these types explicitly, so it works by accident. Will break when someone adds a Lark-specific filter.
- **Fix**: Add all item types to the Zod enum or use `z.string()` with server-side validation.

### P2 -- Medium

**P2-1: `showToast` prop unused in EmailCard**
- **File**: `src/components/inbox/EmailCard.tsx`, line 43
- **Issue**: `showToast` is declared in `EmailCardProps` and passed by the parent, but never used inside the component. Dead code.
- **Fix**: Remove from interface and parent call sites, or use it for inline error handling.

**P2-2: `projectType` sent to API but silently dropped**
- **Files**: `src/components/inbox/CreateBriefModal.tsx` (line 174), `src/components/inbox/AutoBriefCard.tsx` (line 91), `src/app/api/auto-brief/execute/route.ts` (schema lines 37-51)
- **Issue**: Both modals send `projectType` in the request body but `ExecuteAutoBriefSchema` does not define this field. Zod's `.parse()` strips it silently. The PM selects a project type but it is never persisted or used downstream.
- **Fix**: Add `projectType: z.string().optional()` to the schema and include it in the ClickUp task name or as a custom field.

**P2-3: `entity` sent to auto-brief API but not propagated to ClickUp**
- **File**: `src/app/api/auto-brief/execute/route.ts`
- **Issue**: The `entity` field is in the Zod schema (line 42) but is never used in the route body -- not included in the ClickUp task name, not in the tracker row, not in the brief comment. The PM fills "Sony France" in the entity field and it disappears.
- **Fix**: Include entity in the ClickUp task name or as a separate comment/custom field.

**P2-4: AutoBriefCard missing dependencies in useCallback**
- **File**: `src/components/inbox/AutoBriefCard.tsx`, line 131-135
- **Issue**: `handleCreate` useCallback dependency array omits `entity`, `addToTracker`, `createSharepointFolder`, `assigneeId`. If these values change after initial render, the callback uses stale values.
- **Fix**: Add missing deps or use a ref pattern.

---

## Workflow Walkthrough

| Scenario | Result | Notes |
|---|---|---|
| PM receives enquiry email, clicks "Draft Reply" | PASS | DraftReplyModal opens with pre-filled Arya draft, original email context, Arya analysis. Submit creates Outlook draft and marks item done. |
| PM receives new_project email, clicks "Create Brief" | PASS | CreateBriefModal opens with auto-matched client, entity field, assignee dropdown, checkboxes. Submit creates ClickUp task + SP folder + tracker row. |
| PM receives project_feedback email, clicks "Create Feedback" | PASS | ProjectActionModal (create_feedback variant) opens. ClickUp search resolves project. PM edits feedback text. Post comments to ClickUp and reopens task. |
| PM goes to "Others" tab | PASS (with P1-1 caveat) | Shows items with null/archive protocol. Correctly excludes noise and review types. But may show PROTO-LARK-TRIAGE items that also appear in Enquiries. |
| PM goes to "Managed" tab | PASS | Shows done/dismissed items with action badges (Replied, Brief created, etc.) and processed date. Restore button works. |

---

## Cohérence classify <-> poll-emails

| Field | classify/route.ts | cron/poll-emails/route.ts | Match |
|---|---|---|---|
| Categories | enquiry, new_project, project_feedback, other | enquiry, new_project, project_feedback, other | OK |
| RouteTo | PROTO-ENQUIRY, PROTO-EMAIL-INTAKE, PROTO-CLIENT-RETURN, archive | Same (via protocolFromCategory) | OK |
| Zod schema | ClassificationResultSchema (identical) | ClassificationResultSchema (identical) | OK |
| draftReply field | Present | Present | OK |
| clickupProjectHint | Present | Present | OK |
| ClickUp search | For project_feedback | For project_feedback | OK |
| Noise filter | NOISE_SENDERS list | Same NOISE_SENDERS list | OK |
| Sarani filter | Not present (manual classify) | isSaraniEmail() | OK (intentional) |

---

## Lark <-> Email Compatibility

- Lark webhook stores items as `type: "lark_message"` with `sourceType: "lark"`
- `parseEmailPayload()` in EmailCard has a Lark branch that maps `senderId` -> `from`, `content` -> `subject` + `bodyPreview`
- Lark classification uses same 4 categories, same route map
- **OK**: Lark items render correctly in the inbox through the EmailCard adapter

---

## Verdict: GO WITH RESERVES

The inbox system is functional and well-architected. Auth on all endpoints. Rate limiting on ClickUp routes. Zod validation on all inputs. Backward compatibility for legacy categories and protocols. Graceful degradation on ClickUp API failures.

**Blocking issues**: P1-1 (double display) must be fixed -- it causes user confusion.
**Non-blocking but important**: P1-2 (type enum gap), P2-2 (projectType dropped), P2-3 (entity dropped), P2-4 (stale closure).

---

**Handoff -> @fullstack**
- Fichiers produits : `docs/qa/inbox-full-audit.md`
- Decisions prises : 18 fichiers audites, 2 P1 et 4 P2 identifies
- Points d'attention : P1-1 (PROTO-LARK-TRIAGE double display) est le bug le plus impactant -- fix rapide (1 ligne). P2-2 et P2-3 sont des "lost data" bugs -- le PM saisit des donnees qui ne sont jamais persistees.
