-- Add last_active_at and is_premium columns to track growth metrics
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Create an index on last_active_at to optimize DAU/MAU queries
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at);
