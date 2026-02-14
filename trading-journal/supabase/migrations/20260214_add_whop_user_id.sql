-- Add whop_user_id for fast WHOP membership re-checks
-- Stored after first verification so subsequent logins need fewer API calls

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_whop_user_id
  ON user_profiles(whop_user_id)
  WHERE whop_user_id IS NOT NULL;
