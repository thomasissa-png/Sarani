-- Migration: Add AI Project Teams tables
-- Date: 2026-03-26

-- ─── Project Teams ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_type VARCHAR(50),
  brief TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_teams_client ON project_teams(client_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_status ON project_teams(status);

-- ─── Team Steps ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  agent_type VARCHAR(50) NOT NULL,
  label TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  input JSONB,
  output TEXT,
  token_cost INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_steps_team ON team_steps(team_id);

-- ─── Team Deliverables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES team_steps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'markdown',
  version INTEGER NOT NULL DEFAULT 1,
  rerun_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_deliverables_step ON team_deliverables(step_id);
