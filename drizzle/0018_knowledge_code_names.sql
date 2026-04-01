-- Add code_name columns for GitHub privacy (real names stay in DB only)
ALTER TABLE "client_knowledge" ADD COLUMN IF NOT EXISTS "code_name" varchar(20);
ALTER TABLE "team_knowledge" ADD COLUMN IF NOT EXISTS "code_name" varchar(20);
