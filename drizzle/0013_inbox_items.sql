-- Action 4: Inbox items + processed emails + graph subscriptions
-- Source: docs/pm/arya-specs-v2.md (Action 4 data model)

CREATE TABLE IF NOT EXISTS inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  -- 'email_classified', 'ai_team_complete', 'qa_gates_pass', 'followup_alert'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending', 'in_progress', 'done', 'dismissed'
  title VARCHAR(500),
  summary TEXT,
  source_id VARCHAR(255),
  -- ID of the source (messageId email, teamExecutionId, etc.)
  source_type VARCHAR(50),
  -- 'email', 'ai_team', 'qa', 'cron'
  protocol VARCHAR(50),
  -- which Arya protocol was triggered
  project_id VARCHAR(255),
  -- linked project (nullable)
  priority VARCHAR(10) DEFAULT 'medium',
  -- 'high', 'medium', 'low'
  pm_id VARCHAR(255),
  -- assigned PM (nullable, for future multi-PM)
  processed_at TIMESTAMP,
  -- when the PM acted on this item
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_inbox_items_created ON inbox_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_items_priority ON inbox_items(priority);

-- Deduplication table for cron fallback
CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  result_category VARCHAR(50),
  inbox_item_id UUID REFERENCES inbox_items(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_processed_emails_message_id ON processed_emails(message_id);

-- Graph webhook subscription tracking
CREATE TABLE IF NOT EXISTS graph_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id VARCHAR(255) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  expiration_date_time TIMESTAMP NOT NULL,
  client_state VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  renewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_graph_subscriptions_expiration ON graph_subscriptions(expiration_date_time);
