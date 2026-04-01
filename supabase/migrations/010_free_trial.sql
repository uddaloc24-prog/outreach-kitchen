-- 010_free_trial.sql
-- Adds 'free_trial' as a valid user_type and changes the default so new signups
-- start with a free trial (3 emails) rather than the old 'institute' default.

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_type_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_type_check
  CHECK (user_type IN ('institute', 'chef', 'free_trial'));

ALTER TABLE user_profiles
  ALTER COLUMN user_type SET DEFAULT 'free_trial';
