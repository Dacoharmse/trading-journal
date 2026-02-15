-- ============================================================================
-- DATABASE IMPROVEMENTS MIGRATION
-- ============================================================================
-- Fixes: handle_new_user trigger, missing indexes, RLS policies, defaults
-- ============================================================================

-- ============================================================================
-- 1. FIX handle_new_user TRIGGER
-- ============================================================================
-- The trigger needs to include id, email, and is_active columns

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    true  -- Users are active by default
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. UPDATE is_active DEFAULT TO TRUE
-- ============================================================================
-- Users should be active by default (no approval needed)

ALTER TABLE user_profiles
  ALTER COLUMN is_active SET DEFAULT true;

-- Update existing inactive users to active
UPDATE user_profiles SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- ============================================================================
-- 3. ADD MISSING INDEXES
-- ============================================================================

-- Index on email for lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Composite index for backtests queries
CREATE INDEX IF NOT EXISTS idx_backtests_user_playbook ON backtests(user_id, playbook_id);

-- Index for trade date range queries
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_date_status ON trades(user_id, entry_date DESC, status);

-- ============================================================================
-- 4. FIX ADMIN RLS POLICIES
-- ============================================================================
-- Ensure admins can view all user profiles

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

-- Create policy that allows users to view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create policy that allows admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- Allow admins to update any profile (for activation, role changes)
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- ============================================================================
-- 5. ADD role COLUMN IF MISSING
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user'
      CHECK (role IN ('user', 'trader', 'mentor', 'admin', 'premium'));
  END IF;
END $$;

-- ============================================================================
-- 6. ENSURE email COLUMN EXISTS AND HAS INDEX
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Backfill email from auth.users for existing profiles
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '');

-- ============================================================================
-- 7. ADD USEFUL ANALYTICS INDEXES
-- ============================================================================

-- For daily P&L calculations (using entry_date directly - DATE() function isn't immutable)
CREATE INDEX IF NOT EXISTS idx_trades_user_date_pnl ON trades(user_id, entry_date, pnl);

-- For strategy performance queries
CREATE INDEX IF NOT EXISTS idx_trades_user_strategy ON trades(user_id, strategy) WHERE strategy IS NOT NULL;

-- For playbook performance queries
CREATE INDEX IF NOT EXISTS idx_trades_user_playbook ON trades(user_id, playbook_id) WHERE playbook_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
