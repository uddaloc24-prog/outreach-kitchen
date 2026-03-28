-- ── Migration 004: user_profiles ────────────────────────────────────────────
-- Stores each user's parsed CV profile for dynamic email generation

CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT        NOT NULL UNIQUE,   -- Google email (session.user.email)
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  raw_cv_text TEXT,
  parsed_profile JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write their own row
CREATE POLICY "users_own_profile_read"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.jwt() ->> 'email');

CREATE POLICY "users_own_profile_write"
  ON user_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.jwt() ->> 'email')
  WITH CHECK (user_id = auth.jwt() ->> 'email');

-- Service role bypasses RLS (API routes use service role)
