-- ============================================================================
-- FIX: Recursive RLS policies on user_profiles causing 500 errors
-- ============================================================================
-- The "Admins can view/update all profiles" policies from 20260208 migration
-- query user_profiles in their USING clause, creating infinite recursion.
-- PostgreSQL evaluates ALL policies on every query, so the recursive subquery
-- triggers itself endlessly -> 500 Internal Server Error on ALL queries.
--
-- Fix: Create a SECURITY DEFINER function to check admin status.
-- SECURITY DEFINER runs with the owner's privileges (postgres superuser),
-- which has BYPASSRLS, so the inner query skips RLS evaluation.
-- ============================================================================

-- Step 1: Create a SECURITY DEFINER function to safely check admin status
-- This function bypasses RLS internally, breaking the recursion cycle
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE (user_id = auth.uid() OR id = auth.uid())
      AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Step 3: Recreate admin policies using the non-recursive function
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Step 4: Update "Users can view own profile" to handle dual-schema (id vs user_id)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id);

-- Step 5: Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = id);
