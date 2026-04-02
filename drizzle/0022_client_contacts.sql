CREATE TABLE IF NOT EXISTS "client_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" varchar(255),
  "division" text,
  "role" text,
  "source" varchar(20) NOT NULL DEFAULT 'auto',
  "last_seen_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_cc_client_id" ON "client_contacts" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_cc_email" ON "client_contacts" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cc_client_email" ON "client_contacts" ("client_id", "email");

-- Backfill: populate client_contacts from existing clientKnowledge entries
-- that have contact_name and contact_email
INSERT INTO "client_contacts" ("client_id", "name", "email", "division", "source", "created_at", "updated_at")
SELECT DISTINCT ON (ck.client_id, ck.contact_email)
  ck.client_id,
  ck.contact_name,
  ck.contact_email,
  ck.division,
  'auto',
  ck.created_at,
  ck.updated_at
FROM "client_knowledge" ck
WHERE ck.contact_name IS NOT NULL
  AND ck.contact_email IS NOT NULL
  AND ck.is_active = true
ON CONFLICT ("client_id", "email") DO NOTHING;
