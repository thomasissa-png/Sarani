-- Presentation comments: positional annotations on images (Figma-like)
CREATE TABLE IF NOT EXISTS "presentation_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "preview_id" uuid NOT NULL REFERENCES "project_previews"("id") ON DELETE CASCADE,
  "position_x" real,
  "position_y" real,
  "asset_name" text,
  "author_name" text DEFAULT 'Anonymous',
  "content" text NOT NULL,
  "parent_id" uuid,
  "attachment_url" text,
  "attachment_name" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_comments_preview" ON "presentation_comments" ("preview_id");
CREATE INDEX IF NOT EXISTS "idx_comments_parent" ON "presentation_comments" ("parent_id");
