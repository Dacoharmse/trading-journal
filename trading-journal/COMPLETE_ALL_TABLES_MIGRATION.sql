-- ============================================================================
-- COMPLETE MENTORSHIP SYSTEM MIGRATION
-- ============================================================================
-- Copy this entire file and paste it into your Supabase SQL Editor
-- Dashboard URL: https://dcodkkmamshucctkywbf.supabase.co/project/_/sql
-- ============================================================================
-- This file creates ALL missing tables for the mentorship system:
-- 1. mentorship_connections
-- 2. trade_review_requests
-- 3. mentor_notifications
-- 4. shared_playbooks
-- 5. published_trades
-- ============================================================================

-- ============================================================================
-- TABLE 1: MENTORSHIP CONNECTIONS
-- ============================================================================
-- Connects students with mentors

CREATE TABLE IF NOT EXISTS public.mentorship_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
    request_message TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    CONSTRAINT unique_student_mentor UNIQUE (student_id, mentor_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_student ON public.mentorship_connections(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_mentor ON public.mentorship_connections(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_status ON public.mentorship_connections(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_created ON public.mentorship_connections(created_at DESC);

-- Enable RLS
ALTER TABLE public.mentorship_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Mentors can view their connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Students can create connection requests" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Students can update their own pending requests" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Mentors can update their connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Admins have full access to connections" ON public.mentorship_connections;

-- RLS Policies
CREATE POLICY "Students can view their own connections"
    ON public.mentorship_connections
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Mentors can view their connections"
    ON public.mentorship_connections
    FOR SELECT
    TO authenticated
    USING (mentor_id = auth.uid());

CREATE POLICY "Students can create connection requests"
    ON public.mentorship_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = mentor_id
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

CREATE POLICY "Students can update their own pending requests"
    ON public.mentorship_connections
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can update their connections"
    ON public.mentorship_connections
    FOR UPDATE
    TO authenticated
    USING (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    )
    WITH CHECK (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

CREATE POLICY "Admins have full access to connections"
    ON public.mentorship_connections
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_mentorship_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mentorship_connections_updated_at ON public.mentorship_connections;
CREATE TRIGGER set_mentorship_connections_updated_at
    BEFORE UPDATE ON public.mentorship_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_mentorship_connections_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.mentorship_connections TO authenticated;

COMMENT ON TABLE public.mentorship_connections IS 'Stores connections between students and mentors';

-- ============================================================================
-- TABLE 2: TRADE REVIEW REQUESTS
-- ============================================================================
-- Allows students to request trade reviews from their mentors

CREATE TABLE IF NOT EXISTS public.trade_review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    request_note TEXT,
    review_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_trade_review UNIQUE (trade_id, student_id, mentor_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_student ON public.trade_review_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_mentor ON public.trade_review_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_trade ON public.trade_review_requests(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_status ON public.trade_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_created ON public.trade_review_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.trade_review_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view own review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can create review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can update own pending requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Mentors can update assigned requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Admins have full access to review requests" ON public.trade_review_requests;

-- RLS Policies
CREATE POLICY "Students can view own review requests"
    ON public.trade_review_requests
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR mentor_id = auth.uid()
    );

CREATE POLICY "Students can create review requests"
    ON public.trade_review_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.trades
            WHERE trades.id = trade_id
            AND trades.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can update own pending requests"
    ON public.trade_review_requests
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can update assigned requests"
    ON public.trade_review_requests
    FOR UPDATE
    TO authenticated
    USING (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    )
    WITH CHECK (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

CREATE POLICY "Admins have full access to review requests"
    ON public.trade_review_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_trade_review_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_trade_review_requests_updated_at ON public.trade_review_requests;
CREATE TRIGGER set_trade_review_requests_updated_at
    BEFORE UPDATE ON public.trade_review_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_review_requests_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.trade_review_requests TO authenticated;

COMMENT ON TABLE public.trade_review_requests IS 'Stores trade review requests from students to mentors';

-- ============================================================================
-- TABLE 3: MENTOR NOTIFICATIONS
-- ============================================================================
-- Stores notifications for mentors about new review requests and events

CREATE TABLE IF NOT EXISTS public.mentor_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('trade_review_request', 'new_student', 'message', 'other')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT false,
    related_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_mentor ON public.mentor_notifications(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_read ON public.mentor_notifications(read);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_created ON public.mentor_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.mentor_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mentors can view own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Mentors can update own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.mentor_notifications;

-- RLS Policies
CREATE POLICY "Mentors can view own notifications"
    ON public.mentor_notifications
    FOR SELECT
    TO authenticated
    USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can update own notifications"
    ON public.mentor_notifications
    FOR UPDATE
    TO authenticated
    USING (mentor_id = auth.uid())
    WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Anyone can create notifications"
    ON public.mentor_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins have full access to notifications"
    ON public.mentor_notifications
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.mentor_notifications TO authenticated;

COMMENT ON TABLE public.mentor_notifications IS 'Stores notifications for mentors about new review requests and other events';

-- ============================================================================
-- TABLE 4: SHARED PLAYBOOKS
-- ============================================================================
-- Allows mentors to share playbooks with students

CREATE TABLE IF NOT EXISTS public.shared_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
    shared_with TEXT NOT NULL CHECK (shared_with IN ('all_students', 'specific_students', 'public')),
    student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_mentor_playbook_share UNIQUE (mentor_id, playbook_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_mentor ON public.shared_playbooks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_playbook ON public.shared_playbooks(playbook_id);
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_created ON public.shared_playbooks(created_at DESC);

-- Enable RLS
ALTER TABLE public.shared_playbooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mentors can manage their shared playbooks" ON public.shared_playbooks;
DROP POLICY IF EXISTS "Students can view shared playbooks" ON public.shared_playbooks;
DROP POLICY IF EXISTS "Public can view public playbooks" ON public.shared_playbooks;
DROP POLICY IF EXISTS "Admins have full access to shared playbooks" ON public.shared_playbooks;

-- RLS Policies
CREATE POLICY "Mentors can manage their shared playbooks"
    ON public.shared_playbooks
    FOR ALL
    TO authenticated
    USING (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

CREATE POLICY "Students can view shared playbooks"
    ON public.shared_playbooks
    FOR SELECT
    TO authenticated
    USING (
        shared_with = 'all_students'
        OR shared_with = 'public'
        OR auth.uid() = ANY(student_ids)
    );

CREATE POLICY "Public can view public playbooks"
    ON public.shared_playbooks
    FOR SELECT
    TO anon
    USING (shared_with = 'public');

CREATE POLICY "Admins have full access to shared playbooks"
    ON public.shared_playbooks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_shared_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_shared_playbooks_updated_at ON public.shared_playbooks;
CREATE TRIGGER set_shared_playbooks_updated_at
    BEFORE UPDATE ON public.shared_playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_playbooks_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_playbooks TO authenticated;
GRANT SELECT ON public.shared_playbooks TO anon;

COMMENT ON TABLE public.shared_playbooks IS 'Stores playbooks shared by mentors with students';

-- ============================================================================
-- TABLE 5: PUBLISHED TRADES
-- ============================================================================
-- Allows mentors to publish trades as educational content

CREATE TABLE IF NOT EXISTS public.published_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    lessons_learned TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    visibility TEXT NOT NULL DEFAULT 'students' CHECK (visibility IN ('students', 'public', 'specific_students')),
    student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_mentor_published_trade UNIQUE (mentor_id, trade_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_published_trades_mentor ON public.published_trades(mentor_id);
CREATE INDEX IF NOT EXISTS idx_published_trades_trade ON public.published_trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_published_trades_created ON public.published_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_trades_tags ON public.published_trades USING GIN(tags);

-- Enable RLS
ALTER TABLE public.published_trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mentors can manage their published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Students can view published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Public can view public trades" ON public.published_trades;
DROP POLICY IF EXISTS "Admins have full access to published trades" ON public.published_trades;

-- RLS Policies
CREATE POLICY "Mentors can manage their published trades"
    ON public.published_trades
    FOR ALL
    TO authenticated
    USING (
        mentor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.is_mentor = true
            AND user_profiles.mentor_approved = true
        )
    );

CREATE POLICY "Students can view published trades"
    ON public.published_trades
    FOR SELECT
    TO authenticated
    USING (
        visibility = 'students'
        OR visibility = 'public'
        OR auth.uid() = ANY(student_ids)
    );

CREATE POLICY "Public can view public trades"
    ON public.published_trades
    FOR SELECT
    TO anon
    USING (visibility = 'public');

CREATE POLICY "Admins have full access to published trades"
    ON public.published_trades
    FOR ALL
    TO authenticated
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_trades TO authenticated;
GRANT SELECT ON public.published_trades TO anon;

COMMENT ON TABLE public.published_trades IS 'Stores trades published by mentors as educational content';

-- ============================================================================
-- AUTOMATIC NOTIFICATION TRIGGER
-- ============================================================================
-- Create notification when review is requested

CREATE OR REPLACE FUNCTION create_review_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    trade_symbol TEXT;
BEGIN
    -- Get student name
    SELECT COALESCE(full_name, email) INTO student_name
    FROM public.user_profiles
    WHERE id = NEW.student_id;

    -- Get trade symbol
    SELECT symbol INTO trade_symbol
    FROM public.trades
    WHERE id = NEW.trade_id;

    -- Create notification for mentor
    INSERT INTO public.mentor_notifications (
        mentor_id,
        type,
        title,
        message,
        link,
        related_id
    ) VALUES (
        NEW.mentor_id,
        'trade_review_request',
        'New Trade Review Request',
        student_name || ' has requested a review for their ' || trade_symbol || ' trade',
        '/mentor/reviews',
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trade_review_request_created ON public.trade_review_requests;
CREATE TRIGGER on_trade_review_request_created
    AFTER INSERT ON public.trade_review_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_review_request_notification();

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- All mentorship tables have been created:
-- ✓ mentorship_connections - Student-mentor relationships
-- ✓ trade_review_requests - Trade review requests from students
-- ✓ mentor_notifications - Notifications for mentors
-- ✓ shared_playbooks - Playbooks shared by mentors
-- ✓ published_trades - Educational trades published by mentors
--
-- Your mentor dashboard should now work correctly!
-- ============================================================================
