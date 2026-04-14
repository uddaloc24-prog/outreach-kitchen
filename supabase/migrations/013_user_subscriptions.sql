-- 013_user_subscriptions.sql
-- D2C subscription tracking for Dodo Payments geo-pricing.
-- Separate from user_profiles so the B2B institute flow is unaffected.

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          TEXT        UNIQUE NOT NULL,
  subscription_id     TEXT        UNIQUE,
  tier                TEXT        NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')),
  status              TEXT        NOT NULL DEFAULT 'inactive'
                                  CHECK (status IN ('active', 'cancelled', 'past_due', 'on_hold', 'expired', 'inactive')),
  region              TEXT        NOT NULL CHECK (region IN ('us', 'europe', 'india', 'row')),
  applications_limit  INTEGER     NOT NULL DEFAULT 25,
  applications_used   INTEGER     NOT NULL DEFAULT 0,
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email  ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- RLS: service role can do everything; authenticated users can read their own row.
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_subscriptions"
  ON user_subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json ->> 'email');

-- Atomic increment function used by the subscription guard
CREATE OR REPLACE FUNCTION increment_applications_used(p_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_subscriptions
  SET applications_used = applications_used + 1,
      updated_at = now()
  WHERE user_email = p_email
    AND status = 'active'
    AND applications_used < applications_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
