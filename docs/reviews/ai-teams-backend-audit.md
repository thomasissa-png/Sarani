# AI Project Teams — Backend Technical Audit

*@reviewer — 2026-03-26*

## Global Score: 7.5 / 10

Solid foundation with correct auth, parameterised queries, and good spec alignment. Downgraded for: duplicate DB queries in execute, missing input validation on query params, 60s timeout risk on long prompts, and no UUID validation on path params.

---

## Per-File Scores

| # | File | Score | Severity Summary |
|---|---|---|---|
| 1 | `src/lib/db/schema.ts` (teams section) | 9/10 | 1 minor |
| 2 | `src/lib/db/migrations/0005_add_project_teams.sql` | 9/10 | 1 minor |
| 3 | `src/lib/teams/templates.ts` | 9.5/10 | clean |
| 4 | `src/lib/teams/prompts.ts` | 8/10 | 1 major |
| 5 | `src/app/api/admin/teams/route.ts` (POST+GET) | 7.5/10 | 1 major, 2 minor |
| 6 | `src/app/api/admin/teams/[id]/route.ts` | 8/10 | 1 major |
| 7 | `.../steps/[stepId]/execute/route.ts` | 6.5/10 | 2 major, 2 minor |
| 8 | `.../steps/[stepId]/rerun/route.ts` | 7/10 | 2 major, 1 minor |

---

## Top 5 Issues (by severity)

### 1. MAJOR — Duplicate DB query in execute (performance)
**File:** `execute/route.ts` lines 66-88 then 92-101
Previous steps are fetched TWICE with identical conditions — once for the approval gate check, once for gathering outputs. Merge into a single query.

### 2. MAJOR — 60s timeout insufficient for large prompts
**File:** `src/lib/ai/claude.ts` line 5 (`REQUEST_TIMEOUT_MS = 60_000`)
Team steps inject the full brief + ALL upstream outputs into a single prompt. For a 4-step team, step 4 receives 3 upstream outputs potentially totalling 20K+ tokens. The 60s global timeout is shared with simple single-agent calls and may be too tight. Consider passing a longer timeout for team executions or making it configurable per call.

### 3. MAJOR — No UUID validation on path params
**Files:** `[id]/route.ts`, `execute/route.ts`, `rerun/route.ts`
Path params `id` and `stepId` are used directly in DB queries without UUID format validation. A malformed string will throw a Postgres error caught by the generic 500 handler. Add `z.string().uuid()` validation — return 400 instead of 500.

### 4. MAJOR — No validation on GET query params (clientId)
**File:** `teams/route.ts` GET, line 148
`clientIdFilter` is injected into `eq(projectTeams.clientId, clientIdFilter)` without UUID validation. A non-UUID string causes a Postgres error surfaced as 500. Validate before querying.

### 5. MAJOR — Race condition on concurrent execute calls
**File:** `execute/route.ts`
The status check (`step.status === "running"`) and the update (`set status: "running"`) are not atomic. Two concurrent requests could both pass the check and both start execution. Use a `WHERE status = 'pending'` in the UPDATE and check `rowCount` to implement optimistic locking.

---

## Detailed Findings

### Security
| Check | Status | Notes |
|---|---|---|
| Auth (getUserFromSession + admin) | PASS | All 4 route files check auth correctly |
| Zod input validation | PASS (POST) / FAIL (GET params) | GET routes skip param validation |
| SQL injection | PASS | Drizzle parameterised throughout |
| XSS / path traversal | PASS | No user content reflected unsanitised |
| Rate limiting | ABSENT | No per-user rate limit on execute/rerun — admin-only mitigates risk but a misclick could trigger parallel Claude calls |

### Spec Alignment
| Spec Requirement | Status | Notes |
|---|---|---|
| Approval gate (step N+1 blocked until N completed) | PASS | `execute/route.ts` lines 65-88 |
| Re-run with versioning | PASS | `rerun/route.ts` increments version, preserves old deliverables |
| Re-run comment | PASS | Required by zod, stored in `rerun_comment`, injected in prompt |
| Token cost tracking | PASS | Tracked per step; rerun accumulates correctly (line 146) |
| Token cost shown to user | PASS | Returned in API response |
| Brief edit blocked after execution | NOT ENFORCED | Spec says "edit brief disabled once any step is running or complete" — no PATCH route exists yet, but when added this guard must be implemented |
| Team status transitions | PASS | draft -> in_progress -> completed handled correctly |

### Code Quality
| Check | Status | Notes |
|---|---|---|
| TypeScript strict / no `any` | PASS | Clean types throughout, `as AgentType` casts are acceptable given validated input |
| Error handling | PASS | Nested try/catch in execute correctly marks step as failed on AI error |
| Pattern consistency with codebase | MINOR DEVIATION | Existing copywriter route uses `callClaudeJSON` (structured output); teams use `callClaude` (markdown). Justified by spec — team outputs are markdown deliverables, not JSON. Acceptable. |
| Dead/duplicate code | FAIL | Duplicate previousSteps query in execute (see issue #1) |

### Data Model
| Check | Status | Notes |
|---|---|---|
| FK correctness | PASS | All FKs valid with appropriate CASCADE |
| Indexes | PASS | Indexed on FK columns and status |
| Schema-migration sync | PASS | SQL migration matches Drizzle schema exactly |
| Missing fields | MINOR | No `updated_at` on `team_steps` — useful for tracking last rerun timestamp. `label` field added vs spec (good addition). `version` and `rerun_comment` on deliverables are spec-compliant additions. |

### Performance
| Check | Status | Notes |
|---|---|---|
| N+1 queries | PASS | `[id]/route.ts` fetches steps then deliverables in 2 queries (batch via `inArray`), not N+1 |
| Unnecessary fetches | FAIL | Execute fetches previousSteps twice (see #1). Rerun fetches all team data even though only brief + previous outputs are needed. |
| Timeout | RISK | 60s shared timeout (see #2) |

---

## Recommendations

1. **Merge duplicate queries** in execute — fetch previous steps once, use for both gate check and output gathering.
2. **Add UUID validation** on all path params (`id`, `stepId`) and GET query params (`clientId`). Return 400 on invalid format.
3. **Implement optimistic locking** — `UPDATE ... SET status='running' WHERE status='pending' RETURNING *` to prevent race conditions.
4. **Increase timeout** for team step executions (120-180s) or make `callClaude` accept a custom timeout parameter.
5. **Add `updatedAt`** to `team_steps` table for rerun tracking.

---

**Handoff -> @orchestrator**
- File produced: `docs/reviews/ai-teams-backend-audit.md`
- Verdict: **GO with reserves** — no security blockers, 5 major issues to fix before production hardening
- Agents to rerun: @fullstack for issues #1-5
