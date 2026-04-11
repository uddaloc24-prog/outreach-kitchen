-- 011_job_listings.sql
-- Active job listings scraped from the web

CREATE TABLE IF NOT EXISTS job_listings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name  TEXT        NOT NULL,
  restaurant_stars INTEGER     NOT NULL DEFAULT 0 CHECK (restaurant_stars BETWEEN 0 AND 3),
  city             TEXT        NOT NULL,
  country          TEXT        NOT NULL,
  job_title        TEXT        NOT NULL,
  job_type         TEXT,
  description      TEXT,
  apply_url        TEXT,
  source_url       TEXT,
  head_chef        TEXT,
  cuisine_style    TEXT,
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  world_50_rank    INTEGER,
  UNIQUE (restaurant_name, city, job_title)
);

CREATE INDEX IF NOT EXISTS idx_job_listings_stars   ON job_listings(restaurant_stars DESC);
CREATE INDEX IF NOT EXISTS idx_job_listings_country ON job_listings(country);
CREATE INDEX IF NOT EXISTS idx_job_listings_active  ON job_listings(is_active);

-- Singleton row tracks when the last full scrape ran (rate-limit sentinel)
CREATE TABLE IF NOT EXISTS scrape_log (
  id              TEXT        PRIMARY KEY DEFAULT 'jobs',
  last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read job_listings"
  ON job_listings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role all job_listings"
  ON job_listings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read scrape_log"
  ON scrape_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role all scrape_log"
  ON scrape_log FOR ALL TO service_role USING (true) WITH CHECK (true);
