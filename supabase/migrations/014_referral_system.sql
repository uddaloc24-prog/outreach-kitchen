-- 014_referral_system.sql
-- Referral tracking: unique codes, conversion tracking, reward credits

CREATE TABLE IF NOT EXISTS referral_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  code          TEXT        NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     TEXT        NOT NULL,
  referee_email   TEXT        NOT NULL,
  referee_user_id TEXT,
  referral_code   TEXT        NOT NULL REFERENCES referral_codes(code),
  status          TEXT        NOT NULL DEFAULT 'signed_up'
                  CHECK (status IN ('signed_up', 'first_application', 'rewarded')),
  rewarded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referee_email)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user    ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_conv_referrer ON referral_conversions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_conv_code     ON referral_conversions(referral_code);

-- RLS
ALTER TABLE referral_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral code"
  ON referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role all referral_codes"
  ON referral_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users read own referral conversions"
  ON referral_conversions FOR SELECT TO authenticated
  USING (referrer_id = auth.uid()::text);

CREATE POLICY "Service role all referral_conversions"
  ON referral_conversions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
