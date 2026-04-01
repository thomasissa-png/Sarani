# Lark Integration Specs — Arya Back-office

> Status: Draft — 2026-04-01
> Scope: Receive and process Lark (Feishu) messages from TikTok and other clients, mirroring the existing Outlook email pipeline.

---

## 1. Architecture

Lark integrates into the same inbox pipeline as Outlook. The data flow is identical — only the source adapter changes.

```
Lark Event Subscription (webhook)
        ↓
POST /api/webhooks/lark-event
        ↓
[Verify signature: LARK_VERIFICATION_TOKEN]
        ↓
Normalize → LarkMessage { sender, chat_id, content, timestamp, message_id }
        ↓
Classification (Claude Haiku — same prompt as email)
        ↓
InboxItem created (source: "lark", source_id: message_id)
        ↓
Arya PM dashboard → Thomas reviews → action triggered

Fallback path (if webhook unreachable):
Cron poll-lark-messages (every 15 min) → GET /im-v1/messages
→ same normalization + classification pipeline
```

**Shared infrastructure with Outlook:**
- `InboxItem` table (add `source: "lark" | "outlook"`, `lark_chat_id`, `lark_message_id`)
- Same Haiku classification prompt (labels: brief / followup / prospect / noise)
- Same PM approval flow before any action is triggered

---

## 2. Message Reception

### 2a. Webhook — Lark Event Subscription

**Endpoint:** `POST /api/webhooks/lark-event`

**Lark setup:** In Lark Developer Console → Event Subscription → add `im.message.receive_v1` event, point to the Arya webhook URL.

**Verification flow:**
1. On first setup, Lark sends a `url_verification` challenge → respond with `{ challenge }`.
2. On each event, verify the signature using `LARK_VERIFICATION_TOKEN` (header `X-Lark-Signature`).
3. Respond `200 OK` within 3 seconds or Lark retries.

**Payload relevant fields:**
```json
{
  "event": {
    "message": {
      "message_id": "om_xxxxxxxx",
      "chat_id": "oc_xxxxxxxx",
      "sender": { "sender_id": { "open_id": "ou_xxx" } },
      "body": { "content": "{\"text\":\"Hi, we need a brief for...\"}" },
      "create_time": "1712000000000"
    }
  }
}
```

**Chat filtering:** Only process events where `chat_id` is in `LARK_CHAT_IDS`. Silently ignore all others.

**[HYPOTHESE : Le bot Arya doit etre ajouté manuellement aux groupes Lark cibles par Thomas — l'accès n'est pas automatique. Thomas devra fournir les chat_ids après avoir ajouté le bot.]**

### 2b. Cron Fallback — `poll-lark-messages`

**Schedule:** Every 15 minutes (same cadence as `poll-emails`).

**Logic:**
```
For each chat_id in LARK_CHAT_IDS:
  GET /im/v1/messages?container_type=chat&container_id={chat_id}&page_size=20
  Filter: create_time > last_polled_at (stored per chat_id in KV or DB)
  For each new message: normalize + classify + upsert InboxItem (skip if source_id already exists)
  Update last_polled_at
```

**Auth:** Bearer token obtained via `POST /open-apis/auth/v3/tenant_access_token/internal` using `LARK_APP_ID` + `LARK_APP_SECRET`. Token TTL = 2h → cache and refresh automatically.

---

## 3. Classification

Same Claude Haiku classification as emails. The message body (extracted from `content.text`) is passed to the classifier.

| Label | Condition | Protocol triggered |
|---|---|---|
| `brief` | New project request, scope described, deliverables mentioned | `PROTO-EMAIL-INTAKE` (same as email brief) |
| `followup` | References an existing project, contains feedback/revisions | `PROTO-CLIENT-RETURN` |
| `question` | Short query, no project scope | `PROTO-CLIENT-REPLY` |
| `noise` | Auto-notifications, bot messages, reactions | Archive — no InboxItem created |

**Classifier prompt addition (append to existing email prompt):**
```
Source: Lark group chat. Messages may be shorter and more informal than emails.
A message referencing a project name or ClickUp task = followup, not brief.
Lark reactions and system messages = noise.
```

**[HYPOTHESE : Les messages Lark de TikTok sont principalement en anglais. Si des messages en mandarin arrivent, Haiku gere la langue automatiquement — pas de traitement supplementaire requis.]**

---

## 4. Actions

### Brief detected (`PROTO-EMAIL-INTAKE`)
1. `InboxItem` created: `{ source: "lark", type: "brief", chat_id, message_id, content, sender_open_id }`
2. Thomas notified in Arya dashboard (same inbox view as emails).
3. Thomas approves → Quick Brief modal pre-filled with Lark message content.
4. On submit: ClickUp task created, Lark reply sent (see below).

### Feedback on existing project (`PROTO-CLIENT-RETURN`)
1. Arya attempts to match `chat_id` or message keywords to an open ClickUp task.
2. `InboxItem` created with `matched_task_id` if found, `unmatched` if not.
3. Thomas reviews in dashboard → confirms match → feedback logged on ClickUp task.

### Question / reply needed (`PROTO-CLIENT-REPLY`)
1. `InboxItem` created with type `question`.
2. Arya drafts a reply (Claude Haiku) based on message context.
3. Draft shown to Thomas in dashboard — **no automatic send**.
4. Thomas edits + approves → Arya sends via `POST /im/v1/messages` with `receive_id = chat_id`.

**[HYPOTHESE : Arya ne repond jamais automatiquement sur Lark sans approbation Thomas — meme logique que pour les emails. Zero envoi autonome.]**

### Noise
Silently archived. No InboxItem. Logged to `lark_events_log` table for debugging only.

---

## 5. Environment Variables

Thomas must provide these before the integration can be activated:

| Variable | Description | Example / Format |
|---|---|---|
| `LARK_APP_ID` | App ID from Lark Developer Console | `cli_xxxxxxxxxxxxxxxx` |
| `LARK_APP_SECRET` | App Secret from Lark Developer Console | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `LARK_CHAT_IDS` | Comma-separated list of group chat IDs to monitor | `oc_abc123,oc_def456` |
| `LARK_VERIFICATION_TOKEN` | Webhook verification token (from Event Subscription settings) | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

**How to get `chat_id`:** In Lark desktop app → open the group → group settings → copy the group ID. Alternatively, the Arya webhook logs the `chat_id` of every received event — Thomas can check the logs after the bot is added to the group.

**Bot permissions required (Lark Developer Console → Permissions):**
- `im:message:readonly` — read messages
- `im:message` — send messages
- `im:chat:readonly` — read chat info

---

## 6. User Stories

**US-L01 — Brief received via Lark**
GIVEN a message arrives in a monitored Lark chat with project scope content
WHEN the webhook fires (or cron picks it up within 15 min)
THEN an InboxItem of type `brief` is created and visible in the Arya dashboard within 60 seconds of the webhook, 15 min max via cron.

**US-L02 — Noise filtered**
GIVEN a Lark system notification or bot reaction arrives in a monitored chat
WHEN the classifier labels it `noise`
THEN no InboxItem is created and the event is logged to `lark_events_log` only.

**US-L03 — Unmonitored chat ignored**
GIVEN a Lark event arrives from a `chat_id` NOT in `LARK_CHAT_IDS`
WHEN the webhook handler checks the chat filter
THEN the event is discarded with a `200 OK` response and no processing occurs.

**US-L04 — Reply drafted, not auto-sent**
GIVEN Thomas selects a `question` InboxItem from Lark
WHEN he opens the reply view
THEN Arya shows a draft reply generated by Haiku — the Send button is disabled until Thomas explicitly approves.

**US-L05 — Cron fallback when webhook missed**
GIVEN the Lark webhook was unreachable for 30 minutes
WHEN the `poll-lark-messages` cron runs
THEN messages from that window are fetched, classified, and InboxItems created — no duplicates (deduplication by `lark_message_id`).

---

## 7. DB Schema additions

```sql
-- Add to InboxItems table
ALTER TABLE inbox_items
  ADD COLUMN source VARCHAR(20) DEFAULT 'outlook', -- 'outlook' | 'lark'
  ADD COLUMN lark_chat_id VARCHAR(100),
  ADD COLUMN lark_message_id VARCHAR(100),
  ADD COLUMN lark_sender_open_id VARCHAR(100);

-- New table for cron state
CREATE TABLE lark_poll_state (
  chat_id VARCHAR(100) PRIMARY KEY,
  last_polled_at BIGINT NOT NULL -- Unix ms timestamp
);

-- New table for raw event log (debugging)
CREATE TABLE lark_events_log (
  id SERIAL PRIMARY KEY,
  chat_id VARCHAR(100),
  message_id VARCHAR(100),
  raw_payload JSONB,
  classification VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

**Handoff → @fullstack**
- File produced: `docs/product/lark-integration-specs.md`
- Decisions: webhook-first + cron fallback (mirrors Outlook pattern), no auto-send on Lark, same Haiku classifier, Thomas must provide LARK_CHAT_IDS manually after adding bot to groups
- Implementation order: (1) auth token refresh util, (2) webhook endpoint + signature verification, (3) message normalizer, (4) DB migrations, (5) cron job, (6) dashboard InboxItem rendering (source badge "Lark")
- Blockers before dev: Thomas must create Lark app in Developer Console and provide the 4 env vars above
