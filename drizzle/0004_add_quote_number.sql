-- Add quote_number column to quotes table
-- Format: SAR-YYYY-XXXX (e.g. SAR-2026-0001)

DO $$ BEGIN
  ALTER TABLE "quotes" ADD COLUMN "quote_number" VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Backfill existing quotes with sequential numbers based on created_at
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at) AS rn,
         EXTRACT(YEAR FROM created_at)::TEXT AS yr
  FROM quotes
  WHERE quote_number IS NULL
)
UPDATE quotes
SET quote_number = 'SAR-' || numbered.yr || '-' || LPAD(numbered.rn::TEXT, 4, '0')
FROM numbered
WHERE quotes.id = numbered.id;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE "quotes" ALTER COLUMN "quote_number" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quotes_quote_number" ON "quotes" ("quote_number");
