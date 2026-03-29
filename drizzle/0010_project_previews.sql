CREATE TABLE IF NOT EXISTS "project_previews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" text NOT NULL UNIQUE,
  "client_slug" text NOT NULL,
  "project_slug" text NOT NULL,
  "client_name" text NOT NULL,
  "project_name" text NOT NULL,
  "brief" text,
  "sharepoint_link" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_client_project_slug" ON "project_previews" ("client_slug", "project_slug");
CREATE INDEX IF NOT EXISTS "idx_project_previews_project_id" ON "project_previews" ("project_id");

-- Safety: add columns if table was created without them
DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "brief" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "sharepoint_link" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
