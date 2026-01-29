-- Add WHOP username and active status for mentorship verification
-- Users register with their WHOP username, admin verifies and activates

-- Add whop_username column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS whop_username TEXT;

-- Add is_active column (defaults to false - admin must approve)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add activated_at timestamp
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Add deactivated_at timestamp
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_whop_username ON user_profiles(whop_username) WHERE whop_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
