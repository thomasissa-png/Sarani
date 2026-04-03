-- Migration: Add missing pipeline columns to case_study_candidates
-- These columns exist in schema.ts but were never migrated to the DB
-- Date: 2026-04-03

ALTER TABLE case_study_candidates
  ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(20) DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS pipeline_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_suggestions JSONB DEFAULT '[]'::jsonb;
