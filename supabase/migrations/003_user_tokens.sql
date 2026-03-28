-- Migration 003: user_tokens table (Gmail OAuth storage)
CREATE TABLE IF NOT EXISTS user_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    BIGINT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Only one token row ever (single-user app)
-- Service role only — never expose to client
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to user_tokens"
  ON user_tokens FOR ALL
  TO authenticated
  USING (false);

CREATE POLICY "Service role full access to user_tokens"
  ON user_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
