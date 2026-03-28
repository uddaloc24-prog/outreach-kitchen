-- Migration 008: Invite-only access control
-- Admin (Uddaloc) adds user emails here via Supabase dashboard before they can sign in

CREATE TABLE IF NOT EXISTS allowed_users (
  email       TEXT PRIMARY KEY,
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT  -- optional: "beta tester", "friend of Uddaloc", etc.
);

-- RLS: service role only (checked server-side in NextAuth signIn callback)
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON allowed_users
  USING (auth.role() = 'service_role');

-- !! IMPORTANT: Replace with your real Gmail address before running !!
-- INSERT INTO allowed_users (email, notes) VALUES
--   ('your.email@gmail.com', 'Owner');
