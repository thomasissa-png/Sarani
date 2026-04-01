# Inbox Overhaul -- Arya PM Review

**Reviewer:** Arya (client-manager, PM perspective)
**Date:** 2026-04-01
**Scope:** Full inbox review -- 6 fixes + existing behavior
**Score: 7.5 / 10**

---

## Fix-by-Fix Verdict

### Fix 1 -- Draft Reply pre-filled with draftReply: PASS
The DraftReplyModal (line 36-39) correctly uses `payload.classification.draftReply` as default value for the reply textarea, with `suggestedAction` shown separately as "Arya's Analysis". The PM sees a real reply she can edit and send, not an internal analysis. Clean separation. The "Pre-filled with Arya's suggested reply" hint (line 290-293) is helpful.

### Fix 2 -- Open ClickUp with disabled state: FAIL
**Critical bug.** ProjectActionModal (lines 131-133) extracts `clickupUrl` and `taskId` directly from the `EmailPayload` object via unsafe cast, but `EmailPayload` only contains `classification.clickupProjectHint` (a string like "Sony"). The modal never calls `/api/admin/clickup/search` to resolve the hint into a task URL. Result: `hasClickUpLink` is always `false`, the "Open in ClickUp" button is always disabled. The disabled state UI works (greyed out + fallback text at line 298-309), but the button is never functional. **The `/api/admin/clickup/search` endpoint exists and works but is never called.**

### Fix 3 -- 4 email categories: PASS
Classification route (line 10-12) uses exactly 4 categories: `enquiry`, `new_project`, `project_feedback`, `other`. Zod schema validates this (line 40). EmailCard has backward-compat mappings for legacy categories (`client_brief` -> New Project, `client_followup` -> Project Feedback, etc. at lines 76-101). LLM prompt is clear and well-structured.

### Fix 4 -- 7 filter tabs: PASS
Filter tabs defined at lines 141-149 of page.tsx: All, New Projects, Project Feedback, Enquiries, Project Reviews, Others, Managed. Filter logic (lines 153-191) correctly maps each tab to its protocol, with legacy protocol support (`PROTO-PITCH` and `PROTO-CLIENT-REPLY` mapped to `PROTO-ENQUIRY`). Tab counts are computed live (line 677).

### Fix 5 -- followup_alert replaced by DueTodayBanner: PASS
`followup_alert` items are filtered from display (line 315) but stay in DB. DueTodayBanner (lines 654-671) fetches from `/api/admin/clickup/due-today` and renders clickable task links. Graceful degradation if ClickUp is not configured (returns empty array). The banner is visually distinct (lemon background).

### Fix 6 -- Managed tab: PASS
Managed tab shows `done` and `dismissed` items (line 172), sorted by `processedAt` DESC (lines 608-613). Action badges are clear: "Brief created", "Replied", "Feedback added", "Archived", "Done" (lines 195-213). Restore button works (lines 408-427 + EmailCard lines 371-381). Read-only mode correctly hides action buttons and suggested actions.

### Fix 7 -- Lark messages: PASS
Lark webhook (lark/route.ts) uses identical 4 categories, same routing map (lines 83-88), and includes `draftReply` in the classification prompt. The `parseEmailPayload` function (EmailCard lines 531-592) handles both email and Lark formats. Lark items get a "Lark" badge (line 297-300) and a chat bubble icon (lines 252-265). Same action buttons as emails.

---

## Bugs and Frictions

1. **[P0] Open ClickUp never works** -- ProjectActionModal.tsx lines 131-133. The `clickupProjectHint` from classification is never used to search ClickUp. The search API exists at `/api/admin/clickup/search` but nothing calls it. The modal should call search on mount using `payload.classification.clickupProjectHint` as query, then set `clickupUrl`/`taskId` from the response.

2. **[P1] Lark sender shows raw open_id** -- EmailCard `extractSenderName` (line 115) splits on `@` and title-cases, which works for emails but produces garbage for Lark open_ids (e.g., "ou_abc123" becomes "Ou Abc123"). The Lark webhook stores `open_id` as senderId (lark/route.ts line 177). Consider resolving Lark user names via API, or at minimum displaying "Lark User" instead of the raw ID.

3. **[P2] ClickUp search is basic substring match** -- `/api/admin/clickup/search` (line 62-67) fetches page 0 of ALL open tasks then does a substring match. For workspaces with many tasks, page 0 may not contain the match. No pagination, no fuzzy matching.

4. **[P2] EmailCard "Add ClickUp Comment" label is misleading** -- EmailCard line 430 says "Add ClickUp Comment" but the modal actually opens the project, it does not add a comment. Should say "Open Project" for consistency with the modal title "Project Follow-up".

5. **[P2] DueTodayBanner fetches only once** -- The banner fetches on mount but does not refresh with the 30-second interval (page.tsx line 343-356 uses empty deps). If a task becomes due during the session, the PM won't see it until page reload.

---

## Recommendations (by priority)

1. **Fix ClickUp integration in ProjectActionModal** -- Call `/api/admin/clickup/search` with `payload.classification.clickupProjectHint` on modal open. Set the result in state. This unblocks the entire "Open in ClickUp" workflow.

2. **Resolve Lark sender names** -- Either call Lark's user info API during webhook processing to store the real name in the summary, or show a generic "Lark message" label when the sender is an open_id.

3. **Rename "Add ClickUp Comment" to "Open Project"** -- On EmailCard line 430, the button label should match what actually happens.

4. **Include DueTodayBanner in the 30s refresh cycle** -- Move the fetch into the main `fetchItems` callback or add it to the interval.

5. **Improve ClickUp search** -- Add pagination support or use ClickUp's search endpoint instead of listing all tasks.

---

## Verdict: GO with reserves

The inbox overhaul delivers real value: the Draft Reply flow is excellent, categories and filters are well-structured, the Managed tab works as expected, Lark parity is solid. But the **Open ClickUp button is completely broken** (P0) -- the PM cannot open a project from the inbox, which defeats the purpose of Fix 2. Fix the ClickUp integration before shipping.

---

**Handoff -> @fullstack**
- Files reviewed: `page.tsx`, `EmailCard.tsx`, `DraftReplyModal.tsx`, `ProjectActionModal.tsx`, `classify/route.ts`, `lark/route.ts`, `clickup/search/route.ts`, `clickup/due-today/route.ts`
- P0 fix required: ProjectActionModal must call `/api/admin/clickup/search` with `clickupProjectHint` to resolve task URL
- P1 fix recommended: Lark sender name resolution
- P2 fixes: button label, banner refresh, search pagination
