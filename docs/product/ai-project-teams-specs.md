# AI Project Teams — Functional Specs (Part 1)

*Produced by @product-manager — 2026-03-26*
*Language: English*

---

## Section 1 — Concept

### What is an AI Project Team?

An AI Project Team is a named, persistent configuration of multiple Sarani back-office agents pre-briefed for a specific client engagement. Instead of invoking agents one-by-one with repeated context, Thomas creates a team once — selects the agents, attaches the client brief, defines the deliverables — and the team operates as a coordinated unit across sequential execution steps.

### How it differs from individual agents

| Individual Agent | AI Project Team |
|---|---|
| Single agent, single task | Multiple agents, multi-step campaign |
| Brief re-entered each time | Brief stored once, inherited by all agents |
| No step sequencing | Steps run in order, each feeding the next |
| No shared memory between agents | Each agent reads upstream deliverables |
| Ad-hoc | Reusable via templates |

### Workflow

1. **Create team** — Thomas picks a template (or builds from scratch), selects the client, writes the master brief
2. **Configure agents** — each agent is auto-populated with the team brief; Thomas can override per-agent instructions
3. **Execute steps** — steps run sequentially; each step's output becomes input for the next
4. **Review deliverables** — Thomas reviews and approves each step before the next is unlocked
5. **Export** — final deliverables bundled and sent to client or stored in the project record

---

## Section 2 — Project Templates

### Template 1 — Social Media Management

**Agents:** Creative Strategist IA, Copywriter IA, Social IA, QA / Proofreader IA

| Step | Agent | Deliverable |
|---|---|---|
| 1. Platform & audience audit | Creative Strategist IA | Platform strategy doc (target audience, tone, posting frequency per channel) |
| 2. Monthly editorial calendar | Social IA | Calendar with post topics, formats, publish dates |
| 3. Post copy & captions | Copywriter IA | All post texts, hashtags, CTAs — per platform |
| 4. Proofreading & brand check | QA / Proofreader IA | Corrected copy, brand compliance report |

---

### Template 2 — SEO Content Campaign

**Agents:** Creative Strategist IA, SEO IA, Copywriter IA, QA / Proofreader IA

| Step | Agent | Deliverable |
|---|---|---|
| 1. Keyword & topic research | SEO IA | Keyword clusters, priority topics, search intent map |
| 2. Content strategy | Creative Strategist IA | Content pillars, article briefs, internal linking plan |
| 3. Article writing | Copywriter IA | Full articles (word count per brief), meta titles, meta descriptions |
| 4. SEO & quality review | QA / Proofreader IA | Final articles, SEO score per article, corrections log |

---

### Template 3 — Brand Identity / Rebranding

**Agents:** Creative Strategist IA, Copywriter IA, QA / Proofreader IA

| Step | Agent | Deliverable |
|---|---|---|
| 1. Brand audit & positioning | Creative Strategist IA | Current state analysis, positioning statement, brand pillars |
| 2. Brand voice & messaging | Copywriter IA | Brand manifesto, tagline options (×3), brand voice guidelines |
| 3. Naming & copy assets | Copywriter IA | Product/service names, key messages per audience segment |
| 4. Final review | QA / Proofreader IA | Consistency audit across all copy assets |

---

### Template 4 — Video Production Campaign

**Agents:** Creative Strategist IA, Video Script IA, Copywriter IA, QA / Proofreader IA

| Step | Agent | Deliverable |
|---|---|---|
| 1. Campaign concept & moodboard brief | Creative Strategist IA | Creative concept, key visual direction, target emotions |
| 2. Video scripts | Video Script IA | Full scripts per video (hook, body, CTA), shot list suggestions |
| 3. Voiceover & caption copy | Copywriter IA | VO text, on-screen text, subtitles template |
| 4. Script & copy review | QA / Proofreader IA | Corrected scripts, brand and tone compliance report |

---

### Template 5 — Translation Campaign

**Agents:** Translator IA, QA / Proofreader IA, Copywriter IA (optional — for transcreation)

| Step | Agent | Deliverable |
|---|---|---|
| 1. Source asset intake & language mapping | Project Manager IA | Asset inventory, language pairs, glossary (brand terms, do-not-translate list) |
| 2. Translation | Translator IA | Translated assets per language pair |
| 3. Transcreation (if needed) | Copywriter IA | Culturally adapted versions for markets requiring more than literal translation |
| 4. QA & final review | QA / Proofreader IA | Reviewed translations, error log, sign-off checklist |

---

### Template 6 — Ad Campaign (Paid Media)

**Agents:** Creative Strategist IA, Copywriter IA, Social IA, QA / Proofreader IA

| Step | Agent | Deliverable |
|---|---|---|
| 1. Campaign strategy & audience brief | Creative Strategist IA | Campaign objective, audience segments, channel mix, KPIs |
| 2. Ad copy — all formats | Copywriter IA | Headlines, body copy, CTAs for each ad format (social, display, search) |
| 3. Ad scheduling & platform specs | Social IA | Publishing plan, platform-specific format specs, budget allocation recommendation |
| 4. Final copy & compliance check | QA / Proofreader IA | Proofed ads, platform policy compliance notes |

---

## Section 3 — User Stories

**US-01 — Create a team from a template**
Given Thomas is on the AI Project Teams page,
When he selects the "Social Media Management" template and fills in the client (TikTok) and master brief,
Then a new project team is created with 4 pre-configured agents, steps sequenced, and all agents pre-loaded with the master brief.

**US-02 — Execute a step and unlock the next**
Given a team has been created and Step 1 is ready,
When Thomas clicks "Run Step 1" and the Creative Strategist IA completes its deliverable,
Then the output is stored, Step 1 is marked complete, and Step 2 becomes available to run.

**US-03 — Review and download deliverables**
Given Step 3 (Post copy) is complete,
When Thomas opens the deliverables panel,
Then he can read the full output inline, copy it, and download it as a .docx or .txt file.

**US-04 — Edit the master brief after team creation**
Given a team has been created but no steps have been run yet,
When Thomas edits the master brief and saves,
Then all agent pre-loaded briefs are updated to reflect the new brief, and a confirmation message is shown.

**US-05 — Launch a team from scratch without a template**
Given Thomas needs a custom project type not covered by existing templates,
When he selects "Custom team", picks agents manually, defines steps and deliverables,
Then a team is created with his custom configuration, and it behaves identically to a template-based team during execution.

---

*Continued in Part 2 — Data model, back-office UI specs, acceptance criteria, edge cases*

---

## Section 4 — Data Model

```ts
// project_teams
export const projectTeams = pgTable("project_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  templateType: varchar("template_type", { length: 50 }), // social_media | seo_content | brand_identity | video | translation | ad_campaign | custom
  brief: text("brief").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | in_progress | completed | archived
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_project_teams_client").on(table.clientId),
  index("idx_project_teams_status").on(table.status),
]);

// team_steps
export const teamSteps = pgTable("team_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => projectTeams.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  agentType: varchar("agent_type", { length: 50 }).notNull(), // creative_strategist | copywriter | seo | social | qa | video_script | translator | project_manager
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | running | completed | failed
  input: jsonb("input").$type<Record<string, unknown>>(),  // master brief + upstream step outputs injected at runtime
  output: text("output"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_team_steps_team").on(table.teamId),
]);

// team_deliverables
export const teamDeliverables = pgTable("team_deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepId: uuid("step_id").notNull().references(() => teamSteps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  format: varchar("format", { length: 20 }).notNull().default("markdown"), // markdown | plain_text | json
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_team_deliverables_step").on(table.stepId),
]);
```

---

## Section 5 — API Routes

| Method | Route | Description | Request body / Params |
|---|---|---|---|
| POST | `/api/admin/teams` | Create a team from a template or custom config | `{ name, clientId, templateType?, brief, steps: [{ agentType, stepOrder }] }` |
| GET | `/api/admin/teams` | List all teams with status and client name | Query params: `clientId?`, `status?` |
| GET | `/api/admin/teams/[id]` | Get team detail including all steps and their statuses | Path param: `id` |
| POST | `/api/admin/teams/[id]/steps/[stepId]/execute` | Execute a step — calls Claude with master brief + upstream outputs injected | Path params: `id`, `stepId` |
| GET | `/api/admin/teams/[id]/deliverables` | Return all deliverables for a team, grouped by step | Path param: `id` |

**Notes:**
- `execute` endpoint injects `output` from all `completed` preceding steps into the Claude prompt automatically.
- Response pattern mirrors `callClaudeJSON` used in existing agent routes.
- All routes require admin session (same auth guard as existing `/api/admin/agents/*`).

---

## Section 6 — UI Pages

### `/admin/teams` — Team list
- Grid of cards, one per team
- Card shows: team name, client name, template type badge, status badge (draft / in progress / completed), step progress bar (e.g. 2/4 steps done)
- Filters: by status, by client
- CTA: "New team" button → `/admin/teams/new`

### `/admin/teams/new` — Create from template picker
- Step 1: template picker (6 template cards + "Custom" option)
- Step 2: form — team name, client selector, master brief textarea
- Step 3: step review (pre-populated from template, editable agent order)
- Submit → POST `/api/admin/teams` → redirect to `/admin/teams/[id]`

### `/admin/teams/[id]` — Team detail
- Header: team name, client, status, master brief (expandable)
- **Step timeline** (vertical): each step shows agent type, status, "Run" button (enabled only when previous step is complete)
- **Deliverables panel** (right side or below): rendered markdown output per step, with "Copy" and "Download (.txt / .docx)" actions
- Edit brief button (disabled once any step is running or complete)

---

## Section 7 — Open Questions for Thomas

1. **Step approval gate** — should Thomas be required to explicitly approve a step output before the next step unlocks, or should "Run Step N+1" be available immediately after Step N completes?
2. **Parallel steps** — some templates could theoretically run steps in parallel (e.g. translation of multiple language pairs). Should the system support parallel execution, or strictly sequential for V1?
3. **Brief override per step** — beyond the master brief, should Thomas be able to add step-specific instructions per agent at team creation time, or only at execution time?
4. **Re-run a step** — if Thomas is unhappy with a step output, can he re-run it (overwriting the previous output)? Should previous outputs be versioned?
5. **Custom template persistence** — when Thomas builds a "Custom team", should that configuration be saveable as a named template for future reuse?
6. **Export format** — is `.docx` download a hard requirement for V1, or is copy-to-clipboard + `.txt` sufficient to start?
7. **Client visibility** — should clients ever have read access to their team deliverables via a portal, or is this strictly an internal back-office tool?
8. **Upstream context injection** — for long campaigns (6+ steps), injecting all previous outputs into each Claude call may hit token limits. Should we summarise upstream outputs, or pass them in full?
