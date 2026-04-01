CREATE TABLE IF NOT EXISTS project_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clickup_task_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_closure',
  closure_reason VARCHAR(30) NOT NULL,
  star_score INTEGER,
  star_details JSONB,
  star_status VARCHAR(30),
  closed_at TIMESTAMP,
  closed_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closures_status ON project_closures(status);
CREATE INDEX IF NOT EXISTS idx_closures_clickup ON project_closures(clickup_task_id);
CREATE INDEX IF NOT EXISTS idx_closures_client ON project_closures(client_id);
CREATE INDEX IF NOT EXISTS idx_closures_star_status ON project_closures(star_status);

CREATE TABLE IF NOT EXISTS star_pipeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES project_closures(id) ON DELETE CASCADE,
  output_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipeline_closure ON star_pipeline_items(closure_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_output_type ON star_pipeline_items(output_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON star_pipeline_items(status);
