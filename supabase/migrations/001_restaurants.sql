-- Migration 001: restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  country         TEXT NOT NULL,
  stars           INTEGER NOT NULL CHECK (stars IN (1, 2, 3)),
  world_50_rank   INTEGER,
  head_chef       TEXT,
  cuisine_style   TEXT,
  website_url     TEXT,
  careers_email   TEXT,
  instagram       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads
CREATE POLICY "Authenticated users can read restaurants"
  ON restaurants FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access (used by API routes + MCP server)
CREATE POLICY "Service role full access to restaurants"
  ON restaurants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_restaurants_stars ON restaurants(stars DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
