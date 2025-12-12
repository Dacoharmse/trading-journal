-- ============================================================================
-- QUICK FIX: Confirm User Email
-- ============================================================================
-- Use this to manually confirm a user's email in Supabase
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Option 1: Confirm specific user by email
-- Replace 'user@example.com' with the actual email

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'tester@2gs.com'
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'tester@2gs.com';

-- ============================================================================
-- Alternative: Confirm ALL unconfirmed users (USE WITH CAUTION!)
-- ============================================================================

/*
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
*/

-- ============================================================================
-- For Demo Accounts
-- ============================================================================

-- Confirm demo student email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'student@demo.com'
AND email_confirmed_at IS NULL;

-- Confirm demo mentor email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'mentor@demo.com'
AND email_confirmed_at IS NULL;

-- Verify demo accounts
SELECT
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email IN ('student@demo.com', 'mentor@demo.com');

-- ============================================================================
-- DONE!
-- ============================================================================
-- Users can now sign in without the "Email not confirmed" error
-- ============================================================================
