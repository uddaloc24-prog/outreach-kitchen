-- Migration 006: Allow non-Michelin restaurants (stars = 0)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_stars_check;
ALTER TABLE restaurants ALTER COLUMN stars SET DEFAULT 0;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_stars_check
  CHECK (stars >= 0 AND stars <= 3);
