# Review Pipeline Specs — ClickUp → Arya

*Produced by @product-manager — 2026-04-01*

---

## 1. PROTO-REVIEW-INTAKE

### Trigger
ClickUp task status changes to `"Review"` on any task in the monitored lists.

### Detection
The existing cron `src/app/api/admin/cron/project-scan/route.ts` polls ClickUp via `getTasksInList()`.
Extend the scan loop to detect status transitions to `"Review"` and call the intake handler.

### Classification Logic
```
isAIProject(task):
  1. Check task tag "ai-managed" → true if present
  2. Check DB: SELECT * FROM projects WHERE clickup_task_id = task.id AND created_via = '/api/admin/teams'
  3. Else → false (human project)
```

### Intake Handler Output
| Project type | Action |
|---|---|
| Human | Create `inbox_items` row with `type = "review_human"`, `status = "pending"` |
| AI | Trigger Arya pre-verification (see Flow 2), then create inbox item on PASS |

---

## 2. Flow 1 — Human Project Review

**Precondition:** `isAIProject = false`, ClickUp status = `"Review"`

### US-R01 — Detect and route human review
GIVEN a ClickUp task transitions to status `"Review"` and `isAIProject = false`
WHEN the cron runs its next cycle
THEN an `inbox_items` row is created with `type = "review_human"`, `clickup_task_id`, `project_id`, `status = "pending"`, and the PM inbox shows a new "Review Ready" item.

### US-R02 — PM launches asset review
GIVEN an inbox item `type = "review_human"` is visible in the PM dashboard
WHEN the PM clicks "Start Review"
THEN the existing `asset-review` page (`/admin/asset-review`) opens pre-filtered to that project, and the inbox item `status` updates to `"in_review"`.

### US-R03 — PM approves review
GIVEN the PM has completed the asset review with no blocking anomalies
WHEN the PM clicks "Approve"
THEN `updateTaskStatus(taskId, "Approved")` is called on ClickUp, the inbox item `status` updates to `"done"`, and a closure pipeline entry is created in `star_pipeline_items` with `stage = "closure_ready"`.

### US-R04 — PM requests changes
GIVEN the PM identifies issues during asset review
WHEN the PM clicks "Request Changes" with a comment
THEN `addTaskComment(taskId, comment)` is called on ClickUp, `updateTaskStatus(taskId, "In Progress")` resets the task, and the inbox item is archived with `status = "returned"`.

### US-R05 — Closure pipeline link
GIVEN an inbox item has been approved (US-R03)
WHEN the closure pipeline processes `star_pipeline_items` for this project
THEN a `project_closures` record is created and the PM receives a closure checklist in their inbox.

---

## 3. Flow 2 — AI Project Review

**Precondition:** `isAIProject = true`, ClickUp status = `"Review"`

### US-R06 — Trigger Arya pre-verification
GIVEN a ClickUp task transitions to `"Review"` and `isAIProject = true`
WHEN the cron intake handler runs
THEN Arya's LLM check is triggered synchronously (non-blocking to cron — use background job), passing the task brief and deliverable links as context. A verification log entry is created with `attempt = 1`.

### Pre-Verification Criteria (LLM check)
Arya evaluates the deliverables against the brief on 5 criteria:
| Criterion | PASS condition |
|---|---|
| Brief coverage | All brief requirements addressed (no missing item) |
| Format compliance | File formats match specs (dimensions, resolution, naming) |
| Version consistency | Deliverable version matches last approved brief revision |
| Completeness | No placeholder, TODO, or empty section in deliverables |
| Client-ready quality | No visible artefact, watermark, or draft label |

Result: `PASS` (all 5 criteria met) or `FAIL` (1+ criteria failed with detail).

### US-R07 — AI review passes pre-verification
GIVEN Arya's LLM check returns `PASS` on all 5 criteria
WHEN the background job completes
THEN an inbox item `type = "review_ai_ready"` is created with the verification report attached, and the PM sees "AI Review Ready — pre-verified by Arya".

### US-R08 — PM validates AI-ready review
GIVEN an inbox item `type = "review_ai_ready"` with Arya's PASS report
WHEN the PM clicks "Validate & Approve"
THEN same closure flow as US-R03: ClickUp status → `"Approved"`, inbox item → `"done"`, `star_pipeline_items` entry created.

### US-R09 — AI review fails pre-verification
GIVEN Arya's LLM check returns `FAIL` with details
WHEN the background job completes AND `attempt <= 3`
THEN `addTaskComment(taskId, failReport)` is posted on ClickUp, `updateTaskStatus(taskId, "In Progress")` resets the task, `attempt` is incremented on the verification log, and the AI team is notified via inbox item `type = "ai_rework_required"`.

### US-R10 — Max retries reached — escalate to PM
GIVEN Arya's LLM check returns `FAIL` AND `attempt = 3`
WHEN the background job completes
THEN no further rework cycle is triggered. An inbox item `type = "review_escalated"` is created with the full verification log (3 attempts, failure details). The PM is notified: "AI project blocked after 3 verification rounds — manual review required."

---

## 4. Technical Integration

### Cron modifications — `project-scan/route.ts`
Add to the existing scan loop:
```typescript
// After fetching tasks via getTasksInList()
for (const task of tasks) {
  if (task.status.status === 'review' && !task.alreadyIngested) {
    const isAI = await classifyProject(task.id)
    if (isAI) {
      await triggerAryaVerification(task)   // background job, non-blocking
    } else {
      await createInboxItem({ type: 'review_human', clickupTaskId: task.id })
    }
    await markTaskIngested(task.id)          // prevent duplicate intake
  }
}
```

### New `inbox_items` columns required
| Column | Type | Values |
|---|---|---|
| `type` | enum | `review_human`, `review_ai_ready`, `ai_rework_required`, `review_escalated` |
| `verification_attempt` | int | 1–3, null for human reviews |
| `arya_report` | jsonb | LLM output, null for human reviews |

### `star_pipeline_items` — no schema change
Create entry with `stage = "closure_ready"` on approval. Existing closure pipeline reads this.

### Background job — `triggerAryaVerification`
- Fetches task brief (ClickUp description + attachments)
- Fetches deliverable links (ClickUp attachments on `"Review"` status tasks)
- Calls LLM with structured prompt (brief + deliverables + 5 criteria)
- Writes result to `arya_verification_log` table (new table: `task_id`, `attempt`, `result`, `report`, `created_at`)
- On PASS → `createInboxItem({ type: 'review_ai_ready' })`
- On FAIL + attempt < 3 → `addTaskComment` + `updateTaskStatus("In Progress")` + `createInboxItem({ type: 'ai_rework_required' })`
- On FAIL + attempt = 3 → `createInboxItem({ type: 'review_escalated' })`

---

## 5. Edge Cases

| # | Case | Behavior |
|---|---|---|
| E1 | ClickUp task transitions to `"Review"` twice (e.g. double webhook or cron overlap) | `markTaskIngested` flag prevents duplicate inbox items. Idempotent: second call is a no-op. |
| E2 | Arya LLM call times out (> 30s) | Log error, set verification result to `FAIL` with reason `"LLM timeout"`, treat as a failed attempt (attempt++). PM alerted via `review_escalated` if attempt 3 is reached. |
| E3 | ClickUp API unreachable when cron runs | Cron logs the failure, skips ingestion for this cycle, retries on next scheduled run. No duplicate created. |
| E4 | Project has no associated brief in ClickUp (empty description + no attachments) | Arya returns `FAIL` on "Brief coverage" criterion. Comment added to ClickUp: "Pre-verification blocked — no brief found. Please attach brief before re-submitting to Review." |
| E5 | PM approves a review but ClickUp `updateTaskStatus` call fails | Inbox item remains `"in_review"`, PM sees an error banner. No closure pipeline entry is created. PM retries manually via a "Retry ClickUp sync" action on the inbox item. |

---

## 6. Handoff

**Handoff → @fullstack**

- Files produced: `/home/user/Sarani/docs/product/review-pipeline-specs.md`
- Decisions taken:
  - Classification: DB check on `created_via = '/api/admin/teams'` OR ClickUp tag `"ai-managed"` (OR logic, tag takes precedence for manual overrides)
  - Max AI rework cycles: 3 (hard cap, escalate to PM on 3rd failure)
  - Arya verification runs as a background job (non-blocking to cron)
  - Closure pipeline entry point: `star_pipeline_items` with `stage = "closure_ready"` — no schema change needed
  - New DB artifacts: `arya_verification_log` table + 3 new columns on `inbox_items`
- Points of attention:
  - `markTaskIngested` is critical — implement as a DB flag (`review_ingested_at timestamptz`) on the tasks/projects table to survive cron restarts
  - The LLM prompt for pre-verification needs the 5 criteria encoded as a structured JSON schema response (boolean per criterion + failure detail string) — coordinate with @ia for prompt design
  - Asset-review page (`/admin/asset-review`) already exists; only the pre-filter by `project_id` on entry from inbox item is new
  - Flow 2 inbox item type `"review_ai_ready"` should display Arya's verification report inline in the PM dashboard before the PM validates
