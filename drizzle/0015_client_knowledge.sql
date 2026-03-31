-- Client Knowledge Base
-- Stores structured, atomic knowledge about clients, divisions, and individual contacts.
-- Used by Arya to personalise all outputs (briefs, emails, reviews, quotes).

CREATE TABLE IF NOT EXISTS client_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  division VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  category VARCHAR(50) NOT NULL, -- 'tone', 'preference', 'positive_feedback', 'improvement', 'guideline', 'workflow'
  knowledge_text TEXT NOT NULL,
  source TEXT NOT NULL, -- origin: "email:msg-id-xxx", "pm_correction:learning-id-xxx", "manual:pm-name", etc.
  confidence VARCHAR(20) NOT NULL DEFAULT 'observed', -- 'confirmed', 'observed', 'hypothesized'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ck_client_id ON client_knowledge(client_id);
CREATE INDEX IF NOT EXISTS idx_ck_contact_email ON client_knowledge(contact_email);
CREATE INDEX IF NOT EXISTS idx_ck_category ON client_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_ck_client_division ON client_knowledge(client_id, division);
