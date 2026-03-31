-- Migration: email_project_links
-- Links Microsoft Graph conversationId to internal projects/ClickUp tasks.
-- Used by PROTO-CLIENT-RETURN to match incoming emails to existing projects.

CREATE TABLE IF NOT EXISTS email_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(500) NOT NULL,
  clickup_task_id VARCHAR(100) NOT NULL,
  project_name VARCHAR(500),
  client_name VARCHAR(255),
  client_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_project_conversation ON email_project_links(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_project_client_domain ON email_project_links(client_domain);
