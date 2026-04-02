-- Add SharePoint folder reference columns to project_previews
-- Used by the Share modal to store the exact SP folder selected by the PM
DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "sp_folder_id" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "sp_drive_id" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_previews" ADD COLUMN IF NOT EXISTS "selected_assets" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
