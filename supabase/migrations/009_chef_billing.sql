-- 009_chef_billing.sql
-- Adds D2C billing columns to user_profiles for self-serve chef subscriptions.
-- institute users (existing allowed_users) are unaffected — user_type defaults to 'institute'.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'institute'
    CHECK (user_type IN ('institute', 'chef')),
  ADD COLUMN IF NOT EXISTS plan TEXT
    CHECK (plan IN ('starter', 'pro', 'unlimited')),
  ADD COLUMN IF NOT EXISTS applications_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
