-- ── Migration 005: add user_id to outreach_log ──────────────────────────────
-- Converts outreach_log from single-user to multi-user

-- Add user_id column (nullable first so existing rows don't break)
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Drop old single-user unique constraint
ALTER TABLE outreach_log DROP CONSTRAINT IF EXISTS outreach_log_restaurant_id_key;

-- Add multi-user unique constraint
ALTER TABLE outreach_log
  DROP CONSTRAINT IF EXISTS outreach_log_restaurant_user_unique;

ALTER TABLE outreach_log
  ADD CONSTRAINT outreach_log_restaurant_user_unique
  UNIQUE (restaurant_id, user_id);

-- Index on user_id for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_outreach_log_user_id ON outreach_log (user_id);

-- Update RLS policies to scope by user_id
DROP POLICY IF EXISTS "outreach_log_read" ON outreach_log;
DROP POLICY IF EXISTS "outreach_log_write" ON outreach_log;

CREATE POLICY "outreach_log_read"
  ON outreach_log FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'email');

CREATE POLICY "outreach_log_write"
  ON outreach_log FOR ALL
  TO authenticated
  USING (user_id = auth.jwt() ->> 'email')
  WITH CHECK (user_id = auth.jwt() ->> 'email');
