-- Phase 3: Integration tables for ClickUp, SharePoint, Evoliz sync
-- sync_cache, sync_logs, quotes

-- ─── Sync Cache ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sync_cache" (
  "key" TEXT PRIMARY KEY,
  "source" VARCHAR(20) NOT NULL,
  "data" JSONB NOT NULL,
  "fetched_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ttl_seconds" INTEGER NOT NULL DEFAULT 300
);

CREATE INDEX IF NOT EXISTS "idx_sync_cache_source" ON "sync_cache" ("source");

-- ─── Sync Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "sync_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" VARCHAR(20) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "entity_id" TEXT,
  "payload" JSONB,
  "status" VARCHAR(20) NOT NULL DEFAULT 'success',
  "error" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sync_logs_source" ON "sync_logs" ("source");
CREATE INDEX IF NOT EXISTS "idx_sync_logs_created_at" ON "sync_logs" ("created_at");

-- ─── Quotes ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_name" TEXT NOT NULL,
  "project_name" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "total" NUMERIC(12, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
  "pdf_url" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quotes_client_name" ON "quotes" ("client_name");
CREATE INDEX IF NOT EXISTS "idx_quotes_created_by" ON "quotes" ("created_by");
