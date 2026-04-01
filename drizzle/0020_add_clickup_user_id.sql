-- Add ClickUp user ID mapping to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clickup_user_id INTEGER;
