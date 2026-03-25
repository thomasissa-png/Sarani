-- Add quote_number column to quotes table
-- Format: SAR-YYYY-XXXX (e.g. SAR-2026-0001)

ALTER TABLE "quotes" ADD COLUMN "quote_number" VARCHAR(20);

-- Backfill existing quotes with sequential numbers based on created_at
UPDATE "quotes"
SET "quote_number" = 'SAR-' || EXTRACT(YEAR FROM "created_at")::TEXT || '-' || LPAD(
  ROW_NUMBER() OVER (ORDER BY "created_at")::TEXT, 4, '0'
)
WHERE "quote_number" IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "quotes" ALTER COLUMN "quote_number" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quotes_quote_number" ON "quotes" ("quote_number");
