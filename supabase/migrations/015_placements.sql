-- 015_placements.sql
-- Public success stories / placements for the Wall of Placements page

CREATE TABLE IF NOT EXISTS placements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_name        TEXT        NOT NULL,
  restaurant_name  TEXT        NOT NULL,
  restaurant_city  TEXT        NOT NULL,
  restaurant_stars INTEGER     NOT NULL DEFAULT 0 CHECK (restaurant_stars BETWEEN 0 AND 3),
  role_title       TEXT        NOT NULL DEFAULT 'Stage',
  quote            TEXT,
  chef_slug        TEXT,
  is_public        BOOLEAN     NOT NULL DEFAULT TRUE,
  placed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read placements"
  ON placements FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Service role all placements"
  ON placements FOR ALL TO service_role
  USING (true) WITH CHECK (true);
