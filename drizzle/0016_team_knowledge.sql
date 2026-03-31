CREATE TABLE IF NOT EXISTS team_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_email VARCHAR(255) NOT NULL,
  team_member_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  knowledge_text TEXT NOT NULL,
  source VARCHAR(500),
  confidence VARCHAR(20) DEFAULT 'observed',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tk_email ON team_knowledge(team_member_email);
CREATE INDEX IF NOT EXISTS idx_tk_role ON team_knowledge(role);
CREATE INDEX IF NOT EXISTS idx_tk_category ON team_knowledge(category);
