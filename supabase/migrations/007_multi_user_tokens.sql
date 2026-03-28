-- Migration 007: Multi-user Gmail token storage
-- Each user's Gmail OAuth tokens stored under their own row, keyed by email

ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Drop old single-row constraint if it exists
ALTER TABLE user_tokens DROP CONSTRAINT IF EXISTS user_tokens_single_row;

-- Add unique index on user_id (allows multiple NULLs from existing rows)
CREATE UNIQUE INDEX IF NOT EXISTS user_tokens_user_id_idx ON user_tokens (user_id);

-- Update RLS: service role continues to have full access
-- (Next.js API routes use service role key — this is correct)
-- Individual user-scoped RLS not needed since we always use service role server-side
