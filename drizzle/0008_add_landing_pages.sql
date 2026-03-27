-- Migration: Add Landing Page Generator tables
-- Date: 2026-03-27

-- ─── Landing Pages ─────────────────────────────────────────────────────────
-- Each record represents a generated landing page for a client

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Identity
  title TEXT NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft | generating | ready | published | archived

  -- Brief & generation inputs
  brief TEXT NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'EN',

  -- Generated content (structured JSON)
  sections JSONB,

  -- Manual overrides (sectionKey -> overridden text)
  manual_overrides JSONB,

  -- Visual assets
  logo_url TEXT,
  visual_assets JSONB,

  -- Palette overrides
  palette_override JSONB,

  -- Layout
  sections_enabled JSONB DEFAULT '{"features": true, "socialProof": false}'::jsonb,

  -- SEO
  no_index BOOLEAN NOT NULL DEFAULT false,

  -- Cost tracking
  total_token_cost INTEGER DEFAULT 0,
  raw_llm_output TEXT,

  -- ClickUp integration
  clickup_task_id TEXT,

  -- Share token (for preview links)
  share_token VARCHAR(64) UNIQUE,

  -- Timestamps
  published_at TIMESTAMP,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_client ON landing_pages(client_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);

-- ─── Landing Page Versions ────────────────────────────────────────────────
-- Snapshot of sections on every generation/save for version history

CREATE TABLE IF NOT EXISTS landing_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sections JSONB NOT NULL,
  palette_override JSONB,
  visual_assets JSONB,
  manual_overrides JSONB,
  token_cost INTEGER,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_versions_page ON landing_page_versions(landing_page_id);
