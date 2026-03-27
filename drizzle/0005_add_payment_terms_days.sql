-- Add payment_terms_days column to clients table
-- Default 45 days, configurable per client

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "payment_terms_days" INTEGER DEFAULT 45;
