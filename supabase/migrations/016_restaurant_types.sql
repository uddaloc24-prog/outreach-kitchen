-- Migration 016: Add restaurant_type column + UNIQUE constraint for discover upsert
-- Run manually in Supabase SQL Editor

-- 1. Deduplicate existing rows (keep earliest per name+city pair)
DELETE FROM restaurants a
USING restaurants b
WHERE a.id > b.id
  AND LOWER(a.name) = LOWER(b.name)
  AND LOWER(a.city) = LOWER(b.city);

-- 2. Add UNIQUE constraint — required for the discover endpoint's upsert
ALTER TABLE restaurants
  ADD CONSTRAINT uq_restaurants_name_city UNIQUE (name, city);

-- 3. Add restaurant_type column with CHECK constraint
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS restaurant_type TEXT
    DEFAULT 'fine_dining'
    CHECK (restaurant_type IN (
      'fine_dining', 'casual_dining', 'bistro', 'cafe_bakery',
      'hotel_restaurant', 'popup', 'local_eatery'
    ));

-- 4. Add updated_at if missing (001 migration didn't include it)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Index for type-based filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_type ON restaurants(restaurant_type);

-- 6. Ensure stars CHECK allows 0 (non-starred restaurants)
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_stars_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_stars_check CHECK (stars >= 0 AND stars <= 3);
