-- 012_marketplace_foundation.sql
-- Phase 1: Chef profiles + employer accounts + inbox

-- Chef profile additions
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS has_chosen_role BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS employer_restaurant_id UUID REFERENCES restaurants(id),
  ADD COLUMN IF NOT EXISTS employer_role TEXT
    CHECK (employer_role IN ('head_chef', 'hr', 'owner', 'manager')),
  ADD COLUMN IF NOT EXISTS employer_verified BOOLEAN DEFAULT FALSE;

-- Update user_type constraint to include 'employer'
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_type_check
  CHECK (user_type IN ('institute', 'chef', 'free_trial', 'employer'));

-- Employer status on applications
ALTER TABLE outreach_log
  ADD COLUMN IF NOT EXISTS employer_status TEXT
    CHECK (employer_status IN ('new', 'interested', 'not_a_fit', 'interviewing'));

-- Restaurant claim tracking
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS claimed_by UUID,
  ADD COLUMN IF NOT EXISTS employer_verified BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_slug ON user_profiles(slug);
-- idx_outreach_restaurant already exists from migration 002

-- Mark existing users as having chosen their role (they're all chefs)
UPDATE user_profiles SET has_chosen_role = TRUE WHERE user_type IS NOT NULL;
