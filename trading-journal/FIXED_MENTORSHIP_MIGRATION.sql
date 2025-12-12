-- ============================================================================
-- FIXED MENTORSHIP SYSTEM MIGRATION
-- ============================================================================
-- Copy this entire file and paste it into your Supabase SQL Editor
-- Dashboard URL: https://dcodkkmamshucctkywbf.supabase.co/project/_/sql
-- ============================================================================
-- This creates the core mentorship tables WITHOUT dependencies on playbooks
-- ============================================================================

-- ============================================================================
-- TABLE 1: MENTORSHIP CONNECTIONS
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_mentorship_connections_student ON public.mentorship_connections(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_mentor ON public.mentorship_connections(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_status ON public.mentorship_connections(status);
CREATE INDEX IF NOT EXISTS idx_mentorship_connections_created ON public.mentorship_connections(created_at DESC);

ALTER TABLE public.mentorship_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Mentors can view their connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Students can create connection requests" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Students can update their own pending requests" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Mentors can update their connections" ON public.mentorship_connections;
DROP POLICY IF EXISTS "Admins have full access to connections" ON public.mentorship_connections;

CREATE POLICY "Students can view their own connections"
    ON public.mentorship_connections FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Mentors can view their connections"
    ON public.mentorship_connections FOR SELECT TO authenticated
    USING (mentor_id = auth.uid());

CREATE POLICY "Students can create connection requests"
    ON public.mentorship_connections FOR INSERT TO authenticated
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
    ON public.mentorship_connections FOR UPDATE TO authenticated
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can update their connections"
    ON public.mentorship_connections FOR UPDATE TO authenticated
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
    ON public.mentorship_connections FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

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

-- ============================================================================
-- TABLE 2: TRADE REVIEW REQUESTS
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_trade_review_requests_student ON public.trade_review_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_mentor ON public.trade_review_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_trade ON public.trade_review_requests(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_status ON public.trade_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_created ON public.trade_review_requests(created_at DESC);

ALTER TABLE public.trade_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can create review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can update own pending requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Mentors can update assigned requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Admins have full access to review requests" ON public.trade_review_requests;

CREATE POLICY "Students can view own review requests"
    ON public.trade_review_requests FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "Students can create review requests"
    ON public.trade_review_requests FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.trades
            WHERE trades.id = trade_id
            AND trades.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can update own pending requests"
    ON public.trade_review_requests FOR UPDATE TO authenticated
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Mentors can update assigned requests"
    ON public.trade_review_requests FOR UPDATE TO authenticated
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
    ON public.trade_review_requests FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

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

-- ============================================================================
-- TABLE 3: MENTOR NOTIFICATIONS
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_mentor_notifications_mentor ON public.mentor_notifications(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_read ON public.mentor_notifications(read);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_created ON public.mentor_notifications(created_at DESC);

ALTER TABLE public.mentor_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentors can view own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Mentors can update own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.mentor_notifications;

CREATE POLICY "Mentors can view own notifications"
    ON public.mentor_notifications FOR SELECT TO authenticated
    USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can update own notifications"
    ON public.mentor_notifications FOR UPDATE TO authenticated
    USING (mentor_id = auth.uid())
    WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Anyone can create notifications"
    ON public.mentor_notifications FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admins have full access to notifications"
    ON public.mentor_notifications FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

GRANT SELECT, INSERT, UPDATE ON public.mentor_notifications TO authenticated;

-- ============================================================================
-- TABLE 4: PUBLISHED TRADES
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_published_trades_mentor ON public.published_trades(mentor_id);
CREATE INDEX IF NOT EXISTS idx_published_trades_trade ON public.published_trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_published_trades_created ON public.published_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_trades_tags ON public.published_trades USING GIN(tags);

ALTER TABLE public.published_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentors can manage their published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Students can view published trades" ON public.published_trades;
DROP POLICY IF EXISTS "Public can view public trades" ON public.published_trades;
DROP POLICY IF EXISTS "Admins have full access to published trades" ON public.published_trades;

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

CREATE POLICY "Students can view published trades"
    ON public.published_trades FOR SELECT TO authenticated
    USING (
        visibility = 'students'
        OR visibility = 'public'
        OR auth.uid() = ANY(student_ids)
    );

CREATE POLICY "Public can view public trades"
    ON public.published_trades FOR SELECT TO anon
    USING (visibility = 'public');

CREATE POLICY "Admins have full access to published trades"
    ON public.published_trades FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

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

-- ============================================================================
-- AUTOMATIC NOTIFICATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION create_review_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    student_name TEXT;
    trade_symbol TEXT;
BEGIN
    SELECT COALESCE(full_name, email) INTO student_name
    FROM public.user_profiles
    WHERE id = NEW.student_id;

    SELECT symbol INTO trade_symbol
    FROM public.trades
    WHERE id = NEW.trade_id;

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
-- Core mentorship tables created:
-- ✓ mentorship_connections - Student-mentor relationships
-- ✓ trade_review_requests - Trade review requests from students
-- ✓ mentor_notifications - Notifications for mentors
-- ✓ published_trades - Educational trades published by mentors
--
-- Note: shared_playbooks table removed (depends on playbooks table that may not exist)
-- ============================================================================
