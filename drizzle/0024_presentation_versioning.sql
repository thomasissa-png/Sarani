-- Add version column to project_previews for presentation versioning
DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Drop old unique constraint on project_id (was 1 preview per project)
-- Replace with unique on (project_id, version) to allow multiple versions
DO $$ BEGIN
  ALTER TABLE "project_previews" DROP CONSTRAINT IF EXISTS "project_previews_project_id_unique";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create new unique constraint on (project_id, version)
CREATE UNIQUE INDEX IF NOT EXISTS "uq_project_version" ON "project_previews" ("project_id", "version");
