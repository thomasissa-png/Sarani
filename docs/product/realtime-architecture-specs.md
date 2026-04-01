# Realtime Architecture Specs — Webhooks Everywhere

**Date:** 2026-04-01 | **Author:** @product-manager | **Status:** Ready for @fullstack

---

## 1. Outlook Email — Webhook Activation

**Goal:** Arya processes emails instantly via MS Graph subscription, not polling.

### How it works
1. At first deployment, call `/api/admin/setup-webhooks` → creates Graph subscription
2. Graph subscription calls `/api/webhooks/graph-mail` on every new email in monitored mailbox
3. Subscription expires after 4230 minutes (~3 days max) → cron `renew-subscriptions` runs every 48h to renew before expiry
4. Cron `poll-emails` (every 15min) stays as safety net for missed webhooks

### Activation user story
- GIVEN app is deployed and `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_TENANT_ID`, `GRAPH_USER_ID` are set
- WHEN `/api/admin/setup-webhooks` is called (once manually or on boot)
- THEN a Graph subscription is created for `users/{GRAPH_USER_ID}/mailFolders/inbox/messages`
- AND subscription ID is stored in DB or env for renewal tracking
- AND subsequent emails trigger `/api/webhooks/graph-mail` within seconds

### Webhook endpoint `/api/webhooks/graph-mail`
- Responds to Graph validation request (GET with `validationToken` query param → return token as plain text, 200)
- On POST: extracts message data → runs classification pipeline → creates inbox item
- Returns 202 Accepted within 3 seconds (Graph requirement) — heavy processing is async

---

## 2. ClickUp — Task Status Change Webhook

**Goal:** When a ClickUp task moves to Review / Approved / Closed, Arya triggers the review pipeline immediately.

### Registration
```
POST https://api.clickup.com/api/v2/team/{CLICKUP_TEAM_ID}/webhook
Authorization: {CLICKUP_API_TOKEN}
Body: {
  "endpoint": "https://{APP_URL}/api/webhooks/clickup",
  "events": ["taskStatusUpdated"],
  "secret": "{CLICKUP_WEBHOOK_SECRET}"
}
```

### Endpoint `/api/webhooks/clickup`
- **Validation:** ClickUp sends `X-Signature` header (HMAC-SHA256 of body using `CLICKUP_WEBHOOK_SECRET`) → verify before processing
- **Trigger conditions:**
  - `task.status.status === "review"` → trigger Flow 1 or Flow 2 based on task classification
  - `task.status.status === "approved"` → trigger approval pipeline
  - `task.status.status === "closed"` → trigger closure/archival pipeline
- Returns 200 immediately — processing is async
- Safety net: cron `project-scan` (existing) remains active

### Status mapping
| ClickUp status | Arya action |
|---|---|
| `review` | Classify task → trigger review pipeline (Flow 1 or 2) |
| `approved` | Trigger approval notification + next steps |
| `closed` | Archive project record, update client record |

---

## 3. Lark — Message Received Webhook

**Goal:** Every Lark message triggers instant classification, not polling.

### Setup (Lark Open Platform)
- In Lark Developer Console: enable event `im.message.receive_v1`
- Set webhook URL to `https://{APP_URL}/api/webhooks/lark`
- Lark sends a one-time challenge POST to verify the endpoint

### Endpoint `/api/webhooks/lark`
- **Challenge verification:** on first call, Lark sends `{ "challenge": "xxx", "type": "url_verification" }` → respond with `{ "challenge": "xxx" }` and 200
- **Ongoing validation:** every event includes `token` field → verify equals `LARK_VERIFICATION_TOKEN`
- **On `im.message.receive_v1` event:**
  - Extract `message.content`, `sender.sender_id`, `message.chat_id`
  - Run classification → create inbox item (same pipeline as email)
  - Returns 200 immediately — processing is async
- Safety net: cron `poll-lark-messages` (to be created) runs every 15min

---

## 4. Auto-Setup at Deployment

**Endpoint:** `GET /api/admin/setup-webhooks` (admin auth required)

### What it does
1. Check Graph subscription → if missing or expired → create/renew
2. Check ClickUp webhook → call `GET https://api.clickup.com/api/v2/team/{CLICKUP_TEAM_ID}/webhook` → if target URL not registered → register
3. Check Lark webhook → verify `LARK_VERIFICATION_TOKEN` is set → log instructions if Lark console setup needed (Lark webhook registration is done in the console, not via API)
4. Return JSON status report: `{ graph: "ok|created|error", clickup: "ok|created|error", lark: "ok|manual-setup-required|error" }`

### When to call
- Once manually after first deploy: `curl https://{APP_URL}/api/admin/setup-webhooks -H "Authorization: Bearer {ADMIN_TOKEN}"`
- Can be called again at any time to repair broken subscriptions (idempotent)

---

## 5. Required Environment Variables

| Variable | Source | Used by | Required |
|---|---|---|---|
| `GRAPH_CLIENT_ID` | Azure AD app registration | Graph webhook setup + renewal | Yes |
| `GRAPH_CLIENT_SECRET` | Azure AD app registration | Graph webhook setup + renewal | Yes |
| `GRAPH_TENANT_ID` | Azure AD directory | Graph auth | Yes |
| `GRAPH_USER_ID` | Azure AD (email address or object ID) | Graph subscription target | Yes |
| `GRAPH_WEBHOOK_SECRET` | Thomas generates (random string) | Graph notification validation | Yes |
| `APP_URL` | Deployment URL (no trailing slash) | Webhook endpoint registration | Yes |
| `CLICKUP_API_TOKEN` | ClickUp → Settings → Apps | ClickUp webhook registration | Yes |
| `CLICKUP_TEAM_ID` | ClickUp → workspace URL | ClickUp webhook registration | Yes |
| `CLICKUP_WEBHOOK_SECRET` | Thomas generates (random string) | ClickUp HMAC validation | Yes |
| `LARK_VERIFICATION_TOKEN` | Lark Developer Console → Event config | Lark event validation | Yes |
| `LARK_APP_ID` | Lark Developer Console | Lark API calls | Yes |
| `LARK_APP_SECRET` | Lark Developer Console | Lark API auth | Yes |
| `ADMIN_TOKEN` | Thomas generates (random string) | `/api/admin/*` route protection | Yes |

---

## 6. Handoff @fullstack

**Files to produce:**
- `src/app/api/webhooks/clickup/route.ts` — new endpoint
- `src/app/api/webhooks/lark/route.ts` — new endpoint
- `src/app/api/admin/setup-webhooks/route.ts` — new endpoint (check + create all subscriptions)
- Update `src/app/api/admin/graph-subscriptions/route.ts` if needed for idempotent re-creation

**Implementation order (strict dependencies):**
1. `setup-webhooks` route first (needed to activate everything)
2. `clickup` webhook endpoint (self-contained)
3. `lark` webhook endpoint (self-contained)
4. Wire both into existing classification pipeline (same as Graph mail handler)

**Key constraints:**
- All webhook endpoints must return 2xx within 3 seconds — async processing mandatory
- HMAC validation must happen before any processing — reject with 401 if invalid
- Lark challenge must be handled before any auth check (it has no token on first call)
- `/api/admin/setup-webhooks` must be idempotent — safe to call multiple times
- All crons (poll-emails, project-scan, poll-lark-messages) remain active as safety nets — do not remove
