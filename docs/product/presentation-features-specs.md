# Presentation Pages — Versioning + Client Comments

*@product-manager — 2026-04-02*

---

## Feature 1: Versioning

### User Story
**As a** PM Sarani, **I want** each presentation link generation to create a new version, **so that** I can track delivery history and share the right version with the client.

### Flow
1. PM clicks "Create Link" in the Share modal (tracker or project page)
2. System checks if a presentation already exists for this projectId
3. If YES → create a NEW row with `version = previous + 1`, slug = `project-slug-v2`
4. If NO → create V1 with slug = `project-slug`
5. Each version has its own URL: `/project/client/project-slug-v2`
6. Old versions remain accessible via their original URLs

### DB Schema Change
```sql
-- Add version column to project_previews
ALTER TABLE project_previews ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
-- Drop the unique constraint on projectId (multiple versions per project)
-- Replace with unique on (projectId, version)
```

Current: `projectId` is UNIQUE → only 1 preview per project.
New: `(projectId, version)` is UNIQUE → multiple versions per project.

### API Changes
- `POST /api/admin/project-previews`: instead of upserting, always INSERT a new row with incremented version. Slug = `project-slug-v{N}` for N > 1.
- `GET /api/admin/project-previews`: returns all versions for hydration.

### Back-office UI
- Section "Presentation Links" in `/admin/projects/[id]` shows all versions with:
  - Version number (V1, V2, V3)
  - Date created
  - URL
  - Copy + Open buttons

### Acceptance Criteria
- **Given** a project with an existing V1 presentation
  **When** PM generates a new presentation
  **Then** a V2 is created with its own URL, V1 remains accessible

- **Given** no existing presentation for a project
  **When** PM generates a presentation
  **Then** V1 is created with slug without version suffix

- **Given** V1 and V2 exist
  **When** client opens V1 URL
  **Then** V1 content is displayed (not V2)

### Edge Cases
- EC-1: If PM selects a different SP folder for V2, V1 still shows the old folder's assets
- EC-2: Maximum 20 versions per project (safety limit)
- EC-3: Version number is auto-incremented, never manually set

---

## Feature 2: Client Comments (Positional Annotations)

### User Story
**As a** client viewing a presentation page, **I want** to click on a specific point on an image and leave a comment, **so that** I can give precise feedback to the Sarani team on each deliverable.

### Flow (Client)
1. Client opens presentation page `/project/client/slug`
2. Client clicks on an image → lightbox opens (zoomed view)
3. Client clicks on a specific point on the image → a pin appears at (x%, y%)
4. A comment field opens next to the pin
5. Client types their comment + optionally enters their first name
6. Client clicks "Post" → comment is saved
7. Existing pins with numbers are visible on the image
8. Client clicks a pin → thread of comments opens

### Flow (Team Sarani)
1. New comment creates an inbox item (type `client_comment`) in Arya
2. PM sees: client name, comment text, link to the specific image
3. PM can reply to the comment (thread) from the presentation page
4. Comments are visible in quasi-real-time (polling every 5s)

### DB Schema

```sql
CREATE TABLE IF NOT EXISTS presentation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id uuid NOT NULL REFERENCES project_previews(id) ON DELETE CASCADE,
  -- Position on the image (0.0 to 1.0, percentage)
  position_x real,  -- null = comment on the page, not an image
  position_y real,
  -- Which image the comment is on (file name)
  asset_name text,
  -- Author
  author_name text DEFAULT 'Anonymous',
  -- Content
  content text NOT NULL,
  -- Thread: reply to another comment
  parent_id uuid REFERENCES presentation_comments(id) ON DELETE CASCADE,
  -- Attachment (uploaded file URL on SharePoint)
  attachment_url text,
  attachment_name text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_preview ON presentation_comments(preview_id);
CREATE INDEX idx_comments_parent ON presentation_comments(parent_id);
```

### API Endpoints

**Public (no auth — accessible from presentation page):**
- `GET /api/project-comments/[previewId]` — list all comments for a presentation
- `POST /api/project-comments/[previewId]` — create a comment
  Body: `{ assetName, positionX, positionY, authorName?, content, parentId? }`
- `PATCH /api/project-comments/[commentId]` — edit a comment (author only, matched by authorName + createdAt proximity)

**Admin (auth required):**
- `POST /api/admin/project-comments/[commentId]/reply` — team reply to a comment
  Body: `{ content, authorName }` (authorName = PM's name)

### Frontend (Presentation Page)

**Lightbox with annotations:**
- When lightbox opens, existing comment pins are displayed on the image
- Each pin shows a number (1, 2, 3...) in a small circle
- Click on a pin → side panel opens with the comment thread
- Click on the image (not on a pin) → new pin appears → comment input opens
- Comment input: textarea + optional first name field + "Post" button

**Polling:**
- `GET /api/project-comments/[previewId]` every 5 seconds
- New comments appear without page refresh
- Visual indicator when new comments arrive

### File Upload
- Button "Attach file" in the comment form
- `POST /api/project-upload/[previewId]` — uploads to SharePoint
  - Target: project's SP folder → "Supporting Files" subfolder (created auto if not exists)
  - Returns the file's anonymous sharing URL
- The attachment appears in the comment as a clickable link

### Acceptance Criteria

- **Given** a client viewing a presentation
  **When** they click on an image point and type a comment
  **Then** the comment is saved with (x%, y%) position and visible as a pin

- **Given** a comment exists on an image
  **When** a PM opens the same presentation
  **Then** they see the pin and can reply to the thread

- **Given** a client posts a comment
  **When** the polling interval triggers
  **Then** the PM sees the new comment within 5-10 seconds

- **Given** a client wants to upload a reference file
  **When** they attach a file to their comment
  **Then** the file is uploaded to SP "Supporting Files" and linked in the comment

- **Given** a client posted a comment
  **When** they edit their comment
  **Then** the update is visible to everyone (updatedAt changes)

### Edge Cases
- EC-1: Comment without position (x=null, y=null) = general comment on the presentation, not on a specific point
- EC-2: Author name is optional — defaults to "Anonymous"
- EC-3: Comments cannot be deleted by anyone
- EC-4: Max comment length: 2000 characters
- EC-5: Max file upload: 25MB
- EC-6: Multiple comments on the same point → pins stack with offset
- EC-7: Thread depth: max 1 level (reply to a comment, not reply to a reply)

---

## Implementation Priority

1. **Versioning** — simpler, prerequisite for comments (comments reference a specific version)
2. **Comments** — more complex, requires new DB table + public API + lightbox UI changes
3. **File upload** — can be added after comments MVP

## Handoff → @fullstack
- Files to create: migration SQL, comment API routes, lightbox annotation UI
- Files to modify: project-previews POST (versioning), project page (comments UI), ImageLightbox
- Dependencies: versioning must land first (comments reference preview_id which is version-specific)
