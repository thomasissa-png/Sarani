# Auto-Brief Pipeline — Functional Specs
# Email/Message → Auto Brief → PM Review → ClickUp + SharePoint + Tracker

---

## 1. Full Flow

```
[poll-emails classifies email as client_brief]
            |
            v
  STEP 1 — AUTO-PREPARE (Arya, no human)
  LLM extracts: client, project title, brief body, contact
  Generates: project_name = "[Client] - [Title]"
  Creates inbox item  type: "auto_brief_ready"
            |
            v
  STEP 2 — PM REVIEW (human)
  PM sees inbox card with pre-filled data
  PM edits if needed → clicks "Create Project" or "Dismiss"
            |
            v
  STEP 3 — AUTO-CREATE (Arya, no human)
  1. createTask() in correct ClickUp space
  2. createFolder() in correct SharePoint path
  3. addTaskComment() with SharePoint link
  4. addTaskComment() with full brief body
  5. POST /api/tracker/add-row with project data
  6. inbox item status → "done"
```

---

## 2. Step 1 — Auto-Prepare

### User Stories

**US-01 — Extract brief data from email**
- GIVEN an inbox item with type `client_brief` and status `pending`
- WHEN the auto-brief pipeline triggers
- THEN Arya calls the LLM extraction prompt and stores the result as a new inbox item with type `auto_brief_ready` and status `pending_review`

**US-02 — Match client name against CLIENT_MAPPINGS**
- GIVEN the LLM returns a client name string
- WHEN Arya resolves the client
- THEN `getMappingBySpaceName()` is called; if a match is found the `clickupSpaceId` and `sharepointCustomerFolder` are stored on the inbox item; if no match, `clientResolved: false` is stored and the PM sees an "Unknown client" warning on the card

**US-03 — Generate project name**
- GIVEN the LLM has returned a client name and a project title
- WHEN Arya composes the project name
- THEN `project_name = "[ClientName] - [ProjectTitle]"` is stored on the inbox item (max 100 chars, truncate title if needed)

### LLM Extraction Prompt

```
You are Arya, PM assistant at Sarani, a creative agency.

Extract the following fields from the email below and return valid JSON only.

Fields:
- client_name: string — name of the client company sending the email (use the exact company name, not the sender's personal name)
- project_title: string — short title for the project (5-10 words max), derived from the email subject or first sentence
- contact_email: string — sender's email address
- project_type: "generic" | "design" | "video" | "translation" — best match based on content
- brief_introduction: string — 1-2 sentence summary of the project goal
- brief_body: string — full brief extracted and reformatted using this exact structure:

🌟 Introduction / Goal:
[extracted from email]

✈️ Brief:
[extracted from email — paste relevant content verbatim if unclear]

🚚 Deliverables:
[extracted or "To be confirmed"]

📍 Source Files:
[extracted or "To be provided by client"]

💬 Branding / Inspirations:
[extracted or "See brand guidelines on SharePoint"]

➡️ Others:
[extracted or "N/A"]

Rules:
- Never invent data. If a field cannot be extracted, use the placeholder shown above.
- Keep the emoji section headers exactly as written.
- Return ONLY the JSON object, no explanation.

---
EMAIL SUBJECT: {{email_subject}}
EMAIL BODY:
{{email_body}}
```

---

## 3. Step 2 — PM Review UI

### Inbox Card — ASCII Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  AUTO BRIEF READY                        [●] pending    │
│  Received: 2024-03-15 09:42                             │
├─────────────────────────────────────────────────────────┤
│  Project Name                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Sony - CES 2025 Campaign Recap Video              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Client              Contact                           │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Sony      ▼  │    │ john.doe@sony.com             │  │
│  └──────────────┘    └──────────────────────────────┘  │
│  [!] Unknown client — select manually if wrong         │
│                                                         │
│  Start Date                                            │
│  ┌──────────────┐                                       │
│  │ 2024-03-15   │                                       │
│  └──────────────┘                                       │
│                                                         │
│  Brief (editable)                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🌟 Introduction / Goal:                           │  │
│  │ [extracted text...]                               │  │
│  │                                                   │  │
│  │ ✈️ Brief:                                          │  │
│  │ [extracted text...]                               │  │
│  │                                                   │  │
│  │ 🚚 Deliverables:                                  │  │
│  │ [extracted text...]                               │  │
│  │                                                   │  │
│  │ 📍 Source Files:                                  │  │
│  │ [extracted text...]                               │  │
│  │                                                   │  │
│  │ 💬 Branding / Inspirations:                       │  │
│  │ [extracted text...]                               │  │
│  │                                                   │  │
│  │ ➡️ Others:                                         │  │
│  │ [extracted text...]                               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [  Dismiss  ]                  [  Create Project  →  ] │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Step 3 — Auto-Create

### User Stories

**US-04 — Create ClickUp task**
- GIVEN the PM clicks "Create Project" and `clientResolved: true`
- WHEN Arya calls `createTask()`
- THEN a task is created in the resolved `clickupSpaceId` with name = `project_name`, status = `"Open"`, and due date = start date

**US-05 — Create SharePoint folder and link back to ClickUp**
- GIVEN the ClickUp task was created successfully
- WHEN Arya calls `createFolder()`
- THEN a folder is created at `ASSETS_CUSTOMERS_BASE_PATH / sharepointCustomerFolder / project_name`; then `addTaskComment()` posts the SharePoint folder URL to the ClickUp task

**US-06 — Add tracker row and post brief comment**
- GIVEN the SharePoint folder was created successfully
- WHEN Arya calls the tracker API and posts the brief
- THEN POST `/api/tracker/add-row` is called with project data (see payload below); `addTaskComment()` posts the full `brief_body` to the ClickUp task; inbox item status is set to `"done"`

### API Call Sequence

```
1. POST /api/clickup/create-task
   body: { spaceId, taskName: project_name, status: "Open", dueDate: start_date }
   → response: { taskId, taskUrl }

2. POST /api/sharepoint/create-folder
   body: { driveId: SHAREPOINT_ASSETS_DRIVE_ID,
           parentPath: ASSETS_CUSTOMERS_BASE_PATH + "/" + sharepointCustomerFolder,
           folderName: project_name }
   → response: { folderUrl }

3. POST /api/clickup/add-comment
   body: { taskId, comment: "📁 SharePoint folder: " + folderUrl }

4. POST /api/clickup/add-comment
   body: { taskId, comment: brief_body }

5. POST /api/tracker/add-row
   body: { trackerFilename: excelTrackerFilename,
           projectName: project_name,
           client: client_name,
           contact: contact_email,
           startDate: start_date,
           clickupUrl: taskUrl,
           sharepointUrl: folderUrl,
           status: "Open" }

6. PATCH /api/inbox/[id]
   body: { status: "done" }
```

---

## 5. Technical Integration

### Files to Create

| File | Purpose |
|---|---|
| `src/lib/auto-brief-pipeline.ts` | Core orchestrator: LLM call, client resolution, inbox item creation |
| `src/app/api/auto-brief/prepare/route.ts` | POST endpoint triggered by poll-emails when type = `client_brief` |
| `src/app/api/auto-brief/execute/route.ts` | POST endpoint triggered when PM clicks "Create Project" |
| `src/components/inbox/AutoBriefCard.tsx` | Inbox card UI for `auto_brief_ready` items |

### Files to Modify

| File | Change |
|---|---|
| `src/app/admin/(authenticated)/inbox/page.tsx` | Render `AutoBriefCard` for `type === "auto_brief_ready"` |
| `src/lib/poll-emails.ts` | After creating `client_brief` inbox item, call `POST /api/auto-brief/prepare` |
| `src/types/inbox.ts` | Add `type: "auto_brief_ready"`, `AutoBriefPayload` interface |

### AutoBriefPayload Interface

```typescript
interface AutoBriefPayload {
  sourceInboxItemId: string;
  projectName: string;          // "[Client] - [Title]"
  clientName: string;
  contactEmail: string;
  startDate: string;            // ISO date, defaults to today
  briefBody: string;            // full emoji-structured brief
  projectType: "generic" | "design" | "video" | "translation";
  clientResolved: boolean;
  clickupSpaceId?: string;
  excelTrackerFilename?: string;
  sharepointCustomerFolder?: string;
}
```

---

## 6. Edge Cases

| Case | Behavior |
|---|---|
| **Client unknown** (no match in `getMappingBySpaceName`) | `clientResolved: false`; card shows warning banner "Unknown client — select manually"; PM must pick from dropdown before "Create Project" is enabled; defaults to "Other customers" space if PM confirms |
| **Brief incomplete** (LLM returns placeholder on 3+ sections) | Card shows "Low confidence brief" warning badge; all fields remain editable; PM can still proceed |
| **LLM extraction fails** (API error / timeout) | Inbox item created with `briefBody: ""` and `extractionError: true`; card shows "Auto-extraction failed — fill manually"; form is fully editable; PM can still trigger Step 3 |
| **ClickUp API down** (Step 3, call 1 fails) | Abort full sequence; show error toast "ClickUp unavailable — project not created"; inbox item stays `pending_review`; PM can retry; no partial state written |
| **SharePoint folder creation fails** (call 2 fails) | ClickUp task was created — store `taskId` on inbox item; show error "SharePoint folder failed — ClickUp task created (ID: [id])"; PM can retry; retry skips call 1 if `taskId` already stored |
| **Duplicate folder name** (SharePoint returns 409) | Append ` (2)`, ` (3)` etc. until creation succeeds; log warning in inbox item |
| **Tracker API fails** (call 5 fails) | Non-blocking: log error, show warning toast "Tracker row not added — add manually"; brief comment and SharePoint link are already posted; inbox item still moves to `"done"` |

---

## 7. Handoff @fullstack

**Files to produce:**
- `src/lib/auto-brief-pipeline.ts`
- `src/app/api/auto-brief/prepare/route.ts`
- `src/app/api/auto-brief/execute/route.ts`
- `src/components/inbox/AutoBriefCard.tsx`

**Modify:**
- `src/app/admin/(authenticated)/inbox/page.tsx`
- `src/lib/poll-emails.ts`
- `src/types/inbox.ts`

**Key constraints:**
- Step 3 is a sequential transaction — abort on call 1 failure, retry-safe from call 2 onward (store `taskId` after call 1)
- LLM call uses existing AI infrastructure (`src/lib/ai/` or equivalent); model choice delegated to @ia
- `getMappingBySpaceName()` from `src/lib/integrations/config.ts` is the single source of truth for client resolution — do not duplicate matching logic
- Brief textarea must preserve emoji section headers verbatim (UTF-8 characters, no unicode escapes per CLAUDE.md rule 13)
- "Create Project" button is disabled until `clientResolved: true` OR PM has manually selected a client from the dropdown
- All six API calls in Step 3 must run server-side (route handler), never client-side, to protect API keys
