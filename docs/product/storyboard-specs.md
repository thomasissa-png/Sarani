# Storyboard Preview — Feature Specs

*Produced by @product-manager — 2026-03-27*
*Livrable : `docs/product/storyboard-specs.md`*
*Context : intermediate step inserted between brief and video AI generation in the Sarani back-office*

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Stories](#2-user-stories)
3. [Architecture — Image Generation Model](#3-architecture--image-generation-model)
4. [Data Model](#4-data-model)
5. [API Routes](#5-api-routes)
6. [UI Wireframes (ASCII)](#6-ui-wireframes-ascii)
7. [Integration with Video AI](#7-integration-with-video-ai)
8. [Hypotheses to Validate](#8-hypotheses-to-validate)

---

## 1. Product Vision

### Problem

Sophie (Head of Marketing) validates video campaigns on a text script. The script is abstract — it describes action, dialogue, camera directions — but gives no visual reference. This forces a mental leap that generates misalignments: Sophie imagines a scene one way, Sarani's team produces it another way. By the time the mismatch surfaces (in video generation), corrections are costly.

### Decision (Thomas, 2026-03-27)

"Let's add the storyboard option before video, so it acts as an intermediate step."

### What it changes

The Storyboard Preview feature inserts a lightweight visual validation step **before** the compute-heavy (and cost-heavy) video generation phase:

```
Brief → Script → [NEW] Storyboard → Client approval → Video AI → Final preview
```

The storyboard gives Sophie a concrete, visual interpretation of each scene — static images + camera directions + narration — at a fraction of the cost and latency of generating full video.

### Value proposition

- **For Sophie:** validate the visual direction before budget is committed to video generation. No more surprises at the video stage.
- **For Sarani:** reduce costly video regeneration cycles. Each video regeneration costs $0.20–$0.33/scene. Catching misalignments at the image stage costs ~$0.04/scene.
- **For the North Star (10M€ CA at 20% EBITDA):** shorter validation loops = faster project turnaround = higher throughput per client manager = scalability without headcount growth.

### Storyboard is optional

The PM can bypass storyboard and go directly to video generation (existing flow in `docs/product/video-ai-specs.md`). Storyboard is a choice, not a mandatory gate.

---

## 2. User Stories

### US-SB-01 — Generate a storyboard from a video script

**Given** a video script has been generated with at least 1 scene containing `action`, `visualDirection`, and `duration`,
**When** the client manager clicks "Generate Storyboard" from the script result page,
**Then** the system generates one static image per scene via the image generation API (Flux.1 Pro), displays each image alongside the scene text (action + visualDirection + camera direction), and shows generation status per scene (pending / generating / ready / failed) updated every 3 seconds.

**Acceptance criteria:**
- "Generate Storyboard" button is visible alongside "Generate AI Preview" (video) — the user chooses either path
- Each scene produces exactly 1 image (aspect ratio 16:9, 1920×1080)
- Image prompt is auto-built from `visualDirection` + `action` fields (see Section 5 for prompt construction)
- Generation is parallelized across all scenes (not sequential)
- If a scene fails, others continue; failed scene shows a placeholder with the scene description
- User can navigate away and return — results persisted in `storyboard_scenes` table

**Edge cases:**
- Script with 0 scenes: button disabled, tooltip "Add at least one scene before generating a storyboard"
- `visualDirection` empty: warning before generation — "Scene [n] has no visual direction. The AI will interpret the action only. Proceed?"
- API timeout (>30s per image): status "Failed — timeout", button "Retry this scene"
- Storyboard already exists: modal "A storyboard already exists for this script. Regenerate all scenes?" with option to regenerate individually

---

### US-SB-02 — Review and annotate individual storyboard frames

**Given** at least one storyboard scene has status "ready",
**When** the client manager clicks on a storyboard frame,
**Then** a side panel opens showing the full-size image (1920×1080), the scene script (action, visualDirection, cameraDirection, duration), and an internal notes field.

**Acceptance criteria:**
- Full-size image displayed (not cropped thumbnail)
- Scene script visible in full in the side panel
- Internal notes field (free text, max 500 chars) — back-office only, not visible on the client share page
- "Regenerate this frame" button available with optional prompt override
- "Approve this frame" button marks the frame `approved` (internal pre-approval, distinct from client approval)
- Navigation to previous/next scene without closing the panel

**Edge cases:**
- Image fails to load (CDN error): placeholder with scene number + "Image unavailable — click to retry"
- Notes auto-save on blur (no explicit save button required)

---

### US-SB-03 — Regenerate a specific storyboard frame

**Given** a storyboard frame has been generated but the visual output does not match the intended direction,
**When** the client manager clicks "Regenerate this frame" (with or without modifying the prompt),
**Then** a new image is generated for this scene only, the previous version is preserved until the user explicitly chooses to replace it, and both versions are visible for comparison.

**Acceptance criteria:**
- Previous image remains visible during regeneration (no immediate overwrite)
- User chooses "Keep new" or "Keep previous" — explicit confirmation required
- Prompt override field pre-filled with the original auto-built prompt (editable)
- Estimated cost shown before confirmation: "This will cost approximately $0.04 — Confirm?"
- Up to 3 versions stored per scene (version 4 overwrites the oldest)
- Version history accessible via dropdown per frame

**Edge cases:**
- Regeneration fails: previous version kept, error message displayed
- User closes modal before choosing: previous version kept by default

---

### US-SB-04 — Share the storyboard with the client for approval

**Given** a storyboard has at least 2 frames with status "ready",
**When** the client manager clicks "Share Storyboard with Client",
**Then** a secure share link (UUID token, valid 7 days) is generated, accessible without authentication, displaying the storyboard frames in sequence with scene descriptions and camera notes. The client can Approve or Request Changes.

**Acceptance criteria:**
- Link accessible without a Sarani account (public token-gated page)
- Page displays: project name, client name, sequence of frames with scene number + action description + camera direction
- Watermark "Sarani Storyboard Preview — Confidential" on each image
- Client can: approve full storyboard ("Approve All"), request changes on a specific scene (free-text, max 500 chars), or request full revision
- Approval and change requests recorded with timestamp, IP, and scene reference in `storyboard_approvals`
- Expiry: 7 days (configurable per link)
- Revocable manually from back-office

**Edge cases:**
- Expired link: "This storyboard link has expired — please contact your Sarani account manager"
- Revoked link: same message
- Client approves full storyboard → back-office status updates to "Approved" → "Generate Video" becomes primary CTA

---

### US-SB-05 — Trigger video generation from an approved storyboard

**Given** a storyboard has been approved by the client,
**When** the client manager clicks "Generate Video from Storyboard",
**Then** the system pre-fills the video generation form with script data, attaches storyboard images as `image_prompt` for Kling (image-to-video mode), and launches the video generation flow from `docs/product/video-ai-specs.md` US-VA-01.

**Acceptance criteria:**
- "Generate Video from Storyboard" button is the primary CTA on the storyboard page once status is "Approved"
- Storyboard image for each scene is passed as `image_prompt` in the Kling API payload (image-to-video mode)
- Fallback to text-to-video if image-to-video mode is unavailable for a scene (warning displayed)
- Cost estimate shown before confirmation: storyboard cost + video cost displayed separately
- `storyboard_id` stored on the `video_previews` record for traceability

**Edge cases:**
- Storyboard partially approved: warning "3 scenes are not yet approved. Generate video anyway?" — user can override
- Scene has no approved image version: uses text prompt only (fallback, flagged in UI)

---

### US-SB-06 — Track client approval status in back-office

**Given** a storyboard share link has been sent to the client,
**When** the client interacts with the storyboard (view, approve, request changes),
**Then** the client manager sees real-time status per scene and for the full storyboard.

**Acceptance criteria:**
- Statuses: "Not sent" / "Sent" / "Viewed" / "Approved" / "Changes requested"
- Timestamp of each status change stored and displayed
- Email notification to Sarani team on: full approval, partial approval, change request
- Change request comments visible in back-office with scene reference and timestamp
- Status badge color: grey (not sent), blue (sent/viewed), green (approved), orange (changes requested)

**Edge cases:**
- Client approves then requests changes: latest action wins, full history preserved
- V1: no automatic follow-up reminder (manual action by client manager)

---

## 3. Architecture — Image Generation Model

### Model recommendation: Flux.1 Pro via fal.ai

After benchmarking three candidates (DALL-E 3 / GPT Image 1.5, Flux.1 Pro, Midjourney v7/v8):

| Criterion | Flux.1 Pro | DALL-E 3 / GPT Image 1.5 | Midjourney v7 |
|---|---|---|---|
| API access | fal.ai or Replicate — REST, standard auth | OpenAI API — REST | Discord only (no official API) |
| Generation speed | 4.5 seconds/image | ~10 seconds/image | Variable, Discord-dependent |
| Prompt accuracy | High | Best-in-class | Moderate (artistic interpretation) |
| Photorealism | Best-in-class | High | High (artistic) |
| Cost per image | $0.03–$0.05 | $0.04–$0.12 | N/A (subscription only) |
| Style consistency across scenes | High | High | Variable |
| Commercial licensing | Yes (Flux.1 Pro) | Yes | Subscription terms |
| Storyboard fit | Production speed + photorealism | Prompt accuracy | Artistic only |

**Decision: Flux.1 Pro via fal.ai**

Rationale:
- Storyboard use case requires photorealism (Sophie needs to visualize a real scene, not concept art)
- Speed matters: 4.5s/image means a 10-scene storyboard is ready in ~45 seconds (parallel generation)
- API access is straightforward (REST, pay-per-image), same pattern as PiAPI for Kling
- Cost: $0.03–$0.05/image — 6–10x cheaper than video generation per scene
- Midjourney is excluded: no stable REST API, Discord dependency is incompatible with back-office automation

### Provider: fal.ai

- **Endpoint:** `https://fal.run/fal-ai/flux-pro/v1.1` (POST)
- **Auth:** `Authorization: Key $FAL_KEY` header
- **Payload:**
```json
{
  "prompt": "[auto-built from visualDirection + action]",
  "image_size": "landscape_16_9",
  "num_inference_steps": 28,
  "guidance_scale": 3.5,
  "num_images": 1,
  "output_format": "jpeg",
  "output_quality": 90
}
```
- **Response:** `{ "images": [{ "url": "...", "width": 1920, "height": 1080 }] }`
- **Latency target:** <10s per image (timeout at 30s)
- **Prompt construction rule:** `[visualDirection]. [action]. Cinematic 16:9 frame, photorealistic. No text overlay, no watermark.`

### Fallback

If fal.ai is unavailable: fallback to DALL-E 3 via OpenAI API. Display banner: "Using fallback image model — quality may differ."

---

## 4. Data Model

### New tables

#### `storyboards`

```sql
CREATE TABLE storyboards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     UUID NOT NULL REFERENCES agent_outputs(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft | generating | ready | approved | changes_requested
  share_token   UUID UNIQUE,              -- null until "Share with client" is clicked
  share_expires_at TIMESTAMP,            -- null until shared
  share_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    TEXT,                    -- user email
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storyboards_script_id ON storyboards(script_id);
CREATE INDEX idx_storyboards_share_token ON storyboards(share_token);
```

#### `storyboard_scenes`

```sql
CREATE TABLE storyboard_scenes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id   UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  scene_number    INTEGER NOT NULL,
  action          TEXT,
  visual_direction TEXT,
  camera_direction TEXT,
  duration_seconds INTEGER,              -- 5 or 10
  prompt_used     TEXT,                  -- exact prompt sent to Flux.1
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | generating | ready | failed
  internal_notes  TEXT,                  -- back-office only
  approved_version INTEGER DEFAULT NULL, -- which version is the "approved" one
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(storyboard_id, scene_number)
);
```

#### `storyboard_scene_versions`

```sql
CREATE TABLE storyboard_scene_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id        UUID NOT NULL REFERENCES storyboard_scenes(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,      -- 1, 2, 3 (max 3)
  image_url       TEXT NOT NULL,         -- CDN URL (fal.ai or re-uploaded)
  prompt_used     TEXT NOT NULL,
  model_used      VARCHAR(50) NOT NULL DEFAULT 'flux-pro-1.1',
  cost_usd        NUMERIC(6,4),          -- actual cost recorded
  generation_ms   INTEGER,               -- generation latency
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(scene_id, version_number)
);
```

#### `storyboard_approvals`

```sql
CREATE TABLE storyboard_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id   UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  scene_id        UUID REFERENCES storyboard_scenes(id) ON DELETE SET NULL,
  -- null = full storyboard approval
  action          VARCHAR(20) NOT NULL,  -- approved | changes_requested | revision_requested
  client_comment  TEXT,                  -- max 500 chars
  client_ip       TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Modified tables

#### `video_previews` (from video-ai-specs.md)

Add column: `storyboard_id UUID REFERENCES storyboards(id) ON DELETE SET NULL` — enables traceability from video back to storyboard.

---

## 5. API Routes

All routes under `/api/storyboard/` — back-office auth required (HMAC session, role `user` or `admin`). Client share page uses token-based public routes.

### Internal (back-office)

| Method | Route | Description |
|---|---|---|
| POST | `/api/storyboard/generate` | Create storyboard + trigger parallel image generation for all scenes |
| GET | `/api/storyboard/:id` | Get storyboard with all scenes and latest image versions |
| POST | `/api/storyboard/:id/scenes/:sceneId/regenerate` | Regenerate a specific scene (with optional prompt override) |
| PATCH | `/api/storyboard/:id/scenes/:sceneId/notes` | Save internal notes on a scene |
| PATCH | `/api/storyboard/:id/scenes/:sceneId/approve` | Mark a scene as internally approved |
| POST | `/api/storyboard/:id/share` | Generate share token + set expiry |
| DELETE | `/api/storyboard/:id/share` | Revoke share token |
| POST | `/api/storyboard/:id/generate-video` | Trigger video generation from approved storyboard → delegates to Video AI flow |

### Public (client share page)

| Method | Route | Description |
|---|---|---|
| GET | `/api/storyboard/share/:token` | Fetch storyboard data for client view (validates token + expiry) |
| POST | `/api/storyboard/share/:token/approve` | Record full approval |
| POST | `/api/storyboard/share/:token/scenes/:sceneId/approve` | Record scene-level approval |
| POST | `/api/storyboard/share/:token/scenes/:sceneId/changes` | Record change request with comment |
| POST | `/api/storyboard/share/:token/revision` | Record full revision request |

### Key implementation notes

- **Image generation:** `POST /api/storyboard/generate` fans out N parallel `fetch` calls to fal.ai (one per scene). Uses `Promise.allSettled` — individual scene failures do not block the storyboard.
- **Status polling:** client-side polling every 3s on `GET /api/storyboard/:id` until all scenes are `ready` or `failed`. No WebSocket in V1.
- **Image storage:** fal.ai returns a temporary URL. Images must be re-uploaded to Sarani's CDN (or SharePoint) immediately after generation to ensure persistence. The stored URL is the CDN URL, not the fal.ai URL.
- **Cost tracking:** `cost_usd` recorded on `storyboard_scene_versions` after each generation. Aggregate per storyboard computed at query time.

---

## 6. UI Wireframes (ASCII)

### 6.1 — Script result page (entry point)

```
┌─────────────────────────────────────────────────────────────────┐
│  Video Script — TikTok Campaign Q2 2026                         │
│  Client: TikTok  │  Scenes: 8  │  Duration: ~60s               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Scene list — existing UI]                                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  NEXT STEP                                                       │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │  🎨 Generate Storyboard  │  │  🎬 Generate AI Preview  │    │
│  │  Static images per scene │  │  Video generation (Kling)│    │
│  │  ~$0.40 / 8 scenes       │  │  ~$1.60 / 8 scenes       │    │
│  │  Ready in ~45s           │  │  Ready in ~8 min         │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                  │
│  Recommended: start with Storyboard to validate visual          │
│  direction before committing to video generation.               │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 — Storyboard generation in progress

```
┌─────────────────────────────────────────────────────────────────┐
│  Storyboard — TikTok Campaign Q2 2026                           │
│  Generating: 6 / 8 scenes ready                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Scene 1  │ │ Scene 2  │ │ Scene 3  │ │ Scene 4  │          │
│  │ [IMAGE]  │ │ [IMAGE]  │ │ [IMAGE]  │ │ [IMAGE]  │          │
│  │          │ │          │ │          │ │          │          │
│  │ ✅ Ready │ │ ✅ Ready │ │ ✅ Ready │ │ ✅ Ready │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Scene 5  │ │ Scene 6  │ │ Scene 7  │ │ Scene 8  │          │
│  │ [IMAGE]  │ │ [IMAGE]  │ │ ⏳ ...   │ │ ⏳ ...   │          │
│  │          │ │          │ │          │ │          │          │
│  │ ✅ Ready │ │ ✅ Ready │ │ Generating│ │ Pending  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  [Share with Client — disabled]  [Generate Video — disabled]   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 — Frame detail side panel

```
┌─────────────────────────────────────┬───────────────────────────┐
│                                     │  Scene 3 of 8             │
│                                     │  ─────────────────────    │
│      [FULL-SIZE IMAGE 16:9]         │  Action:                  │
│                                     │  Product shot — close-up  │
│                                     │  of the sneaker sole      │
│                                     │                           │
│                                     │  Visual Direction:        │
│                                     │  Macro lens, shallow DOF, │
│                                     │  warm studio light        │
│                                     │                           │
│                                     │  Camera: Static, 5s       │
│                                     │                           │
│                                     │  Internal notes:          │
│                                     │  ┌─────────────────────┐  │
│                                     │  │ (auto-save on blur) │  │
│                                     │  └─────────────────────┘  │
│                                     │                           │
│                                     │  [Regenerate this frame]  │
│                                     │  [✅ Approve this frame]  │
│                                     │                           │
│                                     │  ← Scene 2  Scene 4 →    │
└─────────────────────────────────────┴───────────────────────────┘
```

### 6.4 — Client share page (public, no auth)

```
┌─────────────────────────────────────────────────────────────────┐
│  ≡  SARANI                    Storyboard Preview — Confidential │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TikTok Campaign Q2 2026                                        │
│  Storyboard for review — 8 scenes                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Scene 1 — Product reveal (5s)                           │  │
│  │  ┌──────────────────────┐  Product emerges from fog...   │  │
│  │  │ [IMAGE + WATERMARK]  │  Camera: Slow push-in          │  │
│  │  └──────────────────────┘                                │  │
│  │  [✅ Approve scene]  [💬 Request changes]                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [... scenes 2–7 ...]                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✅ APPROVE FULL STORYBOARD                              │  │
│  │  ⚠️  Request Full Revision                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Integration with Video AI

Reference: `docs/product/video-ai-specs.md`

### The storyboard is optional

The workflow branching logic from the script result page:

```
Script result page
      │
      ├── [Generate Storyboard]  ──→  Storyboard flow (this spec)
      │                                     │
      │                                     ▼
      │                              Client approves storyboard
      │                                     │
      │                                     ▼
      └── [Generate AI Preview] ←── [Generate Video from Storyboard]
              (US-VA-01)                (US-SB-05)
```

If the PM skips storyboard and clicks "Generate AI Preview" directly, the existing Video AI flow from `video-ai-specs.md` executes unchanged. No storyboard record is created.

### How storyboard images feed into video generation (US-SB-05)

The Kling API supports image-to-video mode via `image_url` in the task payload. When generating video from an approved storyboard:

**Modified Kling payload (image-to-video):**
```json
{
  "model": "kling",
  "task_type": "video_generation",
  "input": {
    "prompt": "[action] + [visualDirection] from script",
    "image_url": "[storyboard image CDN URL for this scene]",
    "negative_prompt": "blurry, watermark, text overlay",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

This gives the video model a visual anchor — the generated video will follow the composition and color palette of the approved storyboard frame.

### Storyboard cost vs video cost — displayed together

Before launching video generation from a storyboard, the cost modal shows:

```
Storyboard (already generated):  $0.40   [8 scenes × $0.05]
Video generation (to launch):    $1.60   [8 scenes × $0.20 @ Standard]
─────────────────────────────────────────
Total project AI cost:           $2.00

[Generate 8 video scenes — $1.60]
```

### Traceability

- `video_previews.storyboard_id` links each video preview back to the storyboard that informed it
- This enables: cost reporting per project (storyboard + video), audit trail for client billing, and future A/B analysis of "storyboard first" vs "video direct" quality outcomes

---

## 8. Hypotheses to Validate

| # | Hypothesis | Risk if false | How to validate |
|---|---|---|---|
| H1 | Flux.1 Pro via fal.ai produces images of sufficient quality for storyboard validation with Sophie | [HYPOTHESE: high] — clients may find the images too abstract or stylistically inconsistent | Test with 2-3 real project briefs, share with 1 client, gather feedback before full rollout |
| H2 | fal.ai API is stable enough for production use at Sarani's volume | Medium — outages would block storyboard generation | Monitor uptime over 2 weeks; implement fallback to DALL-E 3 |
| H3 | Sophie (and similar clients) will approve storyboards without requesting >1 revision cycle | Medium — if every storyboard triggers a revision, time savings are reduced | Track: average revisions per storyboard over first 20 storyboards generated |
| H4 | Kling image-to-video mode (passing storyboard image as `image_url`) produces measurably better video output than text-to-video alone | [HYPOTHESE: medium] — Kling image-to-video mode availability and quality vs text-to-video needs testing | A/B: same scene generated with and without image_url, compare with client |
| H5 | The $0.03–$0.05/image pricing from fal.ai is stable and not subject to significant increases | Low — pricing could change; monitor monthly | Review fal.ai pricing changelog monthly; set a budget alert at $500/month |

---

**Handoff → @fullstack**

- Files produced: `docs/product/storyboard-specs.md`
- Decisions taken:
  - Image model: **Flux.1 Pro via fal.ai** (REST API, $0.03–$0.05/image, 4.5s generation)
  - Fallback: DALL-E 3 via OpenAI API
  - 4 new DB tables: `storyboards`, `storyboard_scenes`, `storyboard_scene_versions`, `storyboard_approvals`
  - 1 column added to `video_previews`: `storyboard_id`
  - Storyboard is **optional** — the direct-to-video path from `video-ai-specs.md` is unchanged
  - Image storage: fal.ai URLs must be re-uploaded to CDN immediately (temporary URLs expire)
  - Status polling: client-side, every 3 seconds, no WebSocket in V1
- Points of attention:
  - fal.ai requires a new env var: `FAL_KEY` — add to Replit secrets alongside `PIAPI_KEY`
  - Image-to-video mode for Kling (US-SB-05) must be verified against current PiAPI/Kling API documentation before implementation — if unsupported, fallback is text-to-video (documented in US-SB-05 edge cases)
  - fal.ai returns temporary image URLs — images MUST be re-uploaded to persistent storage before saving the URL to the DB
  - The client share page (`/storyboard/share/[token]`) is a **public route** — no HMAC session required, token-only auth
  - Cost display (H3 in cost modal) requires aggregating `storyboard_scene_versions.cost_usd` at query time — design the query to avoid N+1
