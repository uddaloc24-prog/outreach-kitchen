-- Migration 002: outreach_log table
CREATE TABLE IF NOT EXISTS outreach_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'not_contacted'
                  CHECK (status IN (
                    'not_contacted', 'researching', 'draft_ready',
                    'sent', 'replied', 'followup_due', 'skipped'
                  )),
  research_brief  JSONB,
  email_subject   TEXT,
  email_body      TEXT,
  sent_at         TIMESTAMPTZ,
  gmail_thread_id TEXT,
  followup_due_at TIMESTAMPTZ,
  followup_sent   BOOLEAN DEFAULT FALSE,
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint: one outreach record per restaurant
  UNIQUE (restaurant_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_log(status);
CREATE INDEX IF NOT EXISTS idx_outreach_restaurant ON outreach_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach_log(sent_at DESC NULLS LAST);

-- Row Level Security
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read outreach_log"
  ON outreach_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to outreach_log"
  ON outreach_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outreach_log_updated_at
  BEFORE UPDATE ON outreach_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
