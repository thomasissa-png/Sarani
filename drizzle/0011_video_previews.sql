CREATE TABLE IF NOT EXISTS video_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID REFERENCES storyboards(id) ON DELETE SET NULL,
  project_name VARCHAR(500) NOT NULL,
  client_name VARCHAR(255),
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  scenes JSONB NOT NULL DEFAULT '[]',
  assembled_url TEXT,
  share_token UUID UNIQUE,
  share_expires_at TIMESTAMP,
  cost_estimate_cents INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_previews_storyboard ON video_previews(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_video_previews_share ON video_previews(share_token);
