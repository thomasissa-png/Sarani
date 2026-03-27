-- Migration: Add Case Study Generator tables
-- Date: 2026-03-27

-- ─── Case Study Candidates ─────────────────────────────────────────────────
-- Every ClickUp project evaluated by the scanner

CREATE TABLE IF NOT EXISTS case_study_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_task_id TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  project_name TEXT,
  project_type VARCHAR(50),
  project_amount NUMERIC,
  completed_at TIMESTAMP,
  sharepoint_asset_count INTEGER DEFAULT 0,
  sharepoint_folder_url TEXT,
  score_total INTEGER NOT NULL,
  score_breakdown JSONB,
  score_override BOOLEAN DEFAULT false,
  score_override_reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ignored',
  excluded_reason VARCHAR(50),
  excluded_by TEXT,
  last_scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON case_study_candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON case_study_candidates(score_total);
CREATE INDEX IF NOT EXISTS idx_candidates_client ON case_study_candidates(client_name);

-- ─── Case Study Outputs ────────────────────────────────────────────────────
-- Generated content: one record per output type per candidate

CREATE TABLE IF NOT EXISTS case_study_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES case_study_candidates(id) ON DELETE CASCADE,
  output_type VARCHAR(20) NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  versions JSONB,
  published_at TIMESTAMP,
  published_by TEXT,
  case_study_slug TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outputs_candidate ON case_study_outputs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_outputs_type ON case_study_outputs(output_type);

-- ─── Scoring Config ────────────────────────────────────────────────────────
-- Admin-configurable scoring weights, tier lists, and thresholds (single-row upsert)

CREATE TABLE IF NOT EXISTS scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_client_name INTEGER NOT NULL DEFAULT 25,
  weight_amount INTEGER NOT NULL DEFAULT 20,
  weight_assets INTEGER NOT NULL DEFAULT 20,
  weight_project_type INTEGER NOT NULL DEFAULT 15,
  weight_recency INTEGER NOT NULL DEFAULT 10,
  weight_diversity INTEGER NOT NULL DEFAULT 10,
  tier1_clients JSONB,
  tier2_clients JSONB,
  project_type_scores JSONB,
  auto_generate_threshold INTEGER NOT NULL DEFAULT 70,
  auto_generate_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Seed default scoring config
INSERT INTO scoring_config (
  weight_client_name, weight_amount, weight_assets, weight_project_type,
  weight_recency, weight_diversity,
  tier1_clients, tier2_clients, project_type_scores,
  auto_generate_threshold, auto_generate_enabled
) VALUES (
  25, 20, 20, 15, 10, 10,
  '["TikTok", "Sony", "Adidas", "L''Oréal", "Pernod Ricard"]'::jsonb,
  '["GEODIS", "PICO", "Air Corsica", "France Chimie"]'::jsonb,
  '{"Campaign": 15, "Rebranding": 15, "Video Production": 15, "Graphic Design": 10, "Event": 10, "Translation": 4, "Presentation": 4}'::jsonb,
  70, true
)
ON CONFLICT DO NOTHING;
