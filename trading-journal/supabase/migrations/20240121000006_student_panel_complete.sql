-- ============================================================================
-- STUDENT PANEL COMPLETE MIGRATION
-- ============================================================================
-- Creates all tables needed for the student panel functionality:
-- - published_trades: Educational trades shared by mentors
-- - Ensures all necessary columns exist on related tables
-- ============================================================================

-- ============================================================================
-- PUBLISHED TRADES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.published_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lessons_learned TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility TEXT NOT NULL CHECK (visibility IN ('all_students', 'specific_students', 'public')),
    student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_published_trade UNIQUE (mentor_id, trade_id)
);

-- Indexes for published_trades
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_published_trades_mentor') THEN
        CREATE INDEX idx_published_trades_mentor ON public.published_trades(mentor_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_published_trades_trade') THEN
        CREATE INDEX idx_published_trades_trade ON public.published_trades(trade_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_published_trades_visibility') THEN
        CREATE INDEX idx_published_trades_visibility ON public.published_trades(visibility);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_published_trades_created') THEN
        CREATE INDEX idx_published_trades_created ON public.published_trades(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_published_trades_tags') THEN
        CREATE INDEX idx_published_trades_tags ON public.published_trades USING GIN(tags);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.published_trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Mentors can manage their published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Students can view published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Public can view public trades" ON public.published_trades;
DROP POLICY IF EXISTS "Admins have full access to published trades" ON public.published_trades;

-- Mentors can manage their published trades
CREATE POLICY "Mentors can manage their published trades"
    ON public.published_trades FOR ALL TO authenticated
    USING (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

-- Students can view published trades based on visibility
CREATE POLICY "Students can view published trades"
    ON public.published_trades FOR SELECT TO authenticated
    USING (
        -- Public trades are visible to all authenticated users
        visibility = 'public'
        OR (
            -- All students trades visible to students of that mentor
            visibility = 'all_students'
            AND EXISTS (
                SELECT 1 FROM public.mentorship_connections
                WHERE mentorship_connections.student_id = auth.uid()
                AND mentorship_connections.mentor_id = published_trades.mentor_id
                AND mentorship_connections.status = 'active'
            )
        )
        OR (
            -- Specific students trades visible to specified students
            visibility = 'specific_students'
            AND auth.uid() = ANY(student_ids)
        )
    );

-- Public users can view public trades
CREATE POLICY "Public can view public trades"
    ON public.published_trades FOR SELECT TO anon
    USING (visibility = 'public');

-- Admins have full access
CREATE POLICY "Admins have full access to published trades"
    ON public.published_trades FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_published_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_published_trades_updated_at ON public.published_trades;
CREATE TRIGGER set_published_trades_updated_at
    BEFORE UPDATE ON public.published_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_published_trades_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_trades TO authenticated;
GRANT SELECT ON public.published_trades TO anon;

-- Add comment
COMMENT ON TABLE public.published_trades IS 'Educational trades published by mentors for students to learn from';

-- ============================================================================
-- ENSURE USER_PROFILES HAS MENTOR FIELDS
-- ============================================================================

DO $$
BEGIN
    -- Add specialties if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'specialties'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN specialties TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add experience_years if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'experience_years'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN experience_years INTEGER;
    END IF;
END $$;

-- ============================================================================
-- DEMO DATA: CREATE DEMO STUDENT ACCOUNT
-- ============================================================================

-- Note: This creates the profile structure, but you need to create the auth user in Supabase Dashboard
-- Or use the Supabase client to sign up the user first

-- Instructions to create demo student:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Email: student@demo.com
-- 4. Password: Demo123!Student
-- 5. Auto Confirm User: YES
-- 6. Then run this to update their profile:

/*
-- Run this AFTER creating the auth user in Supabase Dashboard
UPDATE public.user_profiles
SET
    full_name = 'Demo Student',
    bio = 'Demo student account for testing the student panel features',
    is_mentor = false,
    role = 'user'
WHERE email = 'student@demo.com';
*/

-- ============================================================================
-- DEMO DATA: CREATE DEMO MENTOR ACCOUNT
-- ============================================================================

-- Instructions to create demo mentor:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Email: mentor@demo.com
-- 4. Password: Demo123!Mentor
-- 5. Auto Confirm User: YES
-- 6. Then run this to update their profile:

/*
-- Run this AFTER creating the auth user in Supabase Dashboard
UPDATE public.user_profiles
SET
    full_name = 'Demo Mentor',
    bio = 'Experienced trader with 10+ years in forex and stocks. Specializing in day trading and swing trading strategies.',
    is_mentor = true,
    mentor_approved = true,
    specialties = ARRAY['Day Trading', 'Swing Trading', 'Risk Management', 'Technical Analysis'],
    experience_years = 10,
    role = 'mentor'
WHERE email = 'mentor@demo.com';

-- Create a mentorship connection between demo mentor and demo student
INSERT INTO public.mentorship_connections (
    mentor_id,
    student_id,
    status
)
SELECT
    (SELECT id FROM public.user_profiles WHERE email = 'mentor@demo.com'),
    (SELECT id FROM public.user_profiles WHERE email = 'student@demo.com'),
    'active'
WHERE
    EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'mentor@demo.com')
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'student@demo.com')
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
--
-- Next Steps:
-- 1. Create demo accounts in Supabase Dashboard Authentication
-- 2. Run the UPDATE statements above (uncommented) to set up profiles
-- 3. Use the mentor account to create playbooks and trades
-- 4. Share content with the student account
-- 5. Test the student panel features
--
-- Demo Credentials:
-- Student: student@demo.com / Demo123!Student
-- Mentor: mentor@demo.com / Demo123!Mentor
-- ============================================================================
