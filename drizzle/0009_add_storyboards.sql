-- Storyboard Preview tables
-- See docs/product/storyboard-specs.md for full data model

CREATE TABLE storyboards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  script_text     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft | generating | ready | shared | approved | rejected
  share_token     UUID UNIQUE,
  share_expires_at TIMESTAMP,
  created_by      TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storyboards_client_id ON storyboards(client_id);
CREATE INDEX idx_storyboards_share_token ON storyboards(share_token);
CREATE INDEX idx_storyboards_status ON storyboards(status);

CREATE TABLE storyboard_scenes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id   UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  scene_order     INTEGER NOT NULL,
  description     TEXT,
  camera_direction TEXT,
  mood            TEXT,
  image_url       TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | generating | ready | failed
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(storyboard_id, scene_order)
);

CREATE INDEX idx_storyboard_scenes_storyboard ON storyboard_scenes(storyboard_id);

CREATE TABLE storyboard_scene_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id        UUID NOT NULL REFERENCES storyboard_scenes(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  image_url       TEXT NOT NULL,
  prompt_used     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(scene_id, version)
);

CREATE INDEX idx_scene_versions_scene ON storyboard_scene_versions(scene_id);

CREATE TABLE storyboard_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id   UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL,
  -- pending | approved | rejected
  feedback        TEXT,
  client_name     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storyboard_approvals_storyboard ON storyboard_approvals(storyboard_id);
