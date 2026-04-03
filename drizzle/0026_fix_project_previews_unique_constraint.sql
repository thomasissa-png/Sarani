-- Fix: drop the legacy unique constraint on project_id alone.
-- Migration 0024 tried to drop "project_previews_project_id_unique" but Postgres
-- may have named it "project_previews_project_id_key" (default naming convention).
-- Drop both possible names to be safe.
DO $$ BEGIN
  ALTER TABLE "project_previews" DROP CONSTRAINT IF EXISTS "project_previews_project_id_key";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_previews" DROP CONSTRAINT IF EXISTS "project_previews_project_id_unique";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
