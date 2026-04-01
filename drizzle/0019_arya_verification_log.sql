-- Add review pipeline columns to inbox_items
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS verification_attempt INTEGER;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS arya_report JSONB;

-- Arya Verification Log — tracks LLM pre-verification attempts for AI project reviews
CREATE TABLE IF NOT EXISTS arya_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_item_id UUID REFERENCES inbox_items(id) ON DELETE SET NULL,
  clickup_task_id TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  criteria JSONB,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reasons JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_log_task ON arya_verification_log(clickup_task_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_inbox ON arya_verification_log(inbox_item_id);
