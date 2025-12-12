-- ============================================================================
-- TRADE REVIEW REQUESTS MIGRATION
-- ============================================================================
-- Copy this entire file and paste it into your Supabase SQL Editor
-- Dashboard URL: https://dcodkkmamshucctkywbf.supabase.co/project/_/sql
-- ============================================================================

-- Step 1: Create trade_review_requests table
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

-- Step 2: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_student ON public.trade_review_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_mentor ON public.trade_review_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_trade ON public.trade_review_requests(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_status ON public.trade_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_trade_review_requests_created ON public.trade_review_requests(created_at DESC);

-- Step 3: Enable Row Level Security
-- ============================================================================
ALTER TABLE public.trade_review_requests ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
-- ============================================================================
DROP POLICY IF EXISTS "Students can view own review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can create review requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Students can update own pending requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Mentors can update assigned requests" ON public.trade_review_requests;
DROP POLICY IF EXISTS "Admins have full access to review requests" ON public.trade_review_requests;

-- Step 5: Create RLS Policies
-- ============================================================================

-- Students and mentors can view their own review requests
CREATE POLICY "Students can view own review requests"
    ON public.trade_review_requests
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR mentor_id = auth.uid()
    );

-- Students can create review requests for their own trades
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

-- Students can update their own pending requests (to add notes or cancel)
CREATE POLICY "Students can update own pending requests"
    ON public.trade_review_requests
    FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid() AND status = 'pending')
    WITH CHECK (student_id = auth.uid());

-- Mentors can update requests assigned to them (change status, add feedback)
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

-- Admins have full access
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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Step 6: Create function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_trade_review_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS set_trade_review_requests_updated_at ON public.trade_review_requests;
CREATE TRIGGER set_trade_review_requests_updated_at
    BEFORE UPDATE ON public.trade_review_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_review_requests_updated_at();

-- Step 8: Create mentor_notifications table
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

-- Step 9: Create indexes for mentor notifications
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_mentor ON public.mentor_notifications(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_read ON public.mentor_notifications(read);
CREATE INDEX IF NOT EXISTS idx_mentor_notifications_created ON public.mentor_notifications(created_at DESC);

-- Step 10: Enable RLS on notifications
-- ============================================================================
ALTER TABLE public.mentor_notifications ENABLE ROW LEVEL SECURITY;

-- Step 11: Drop existing notification policies if they exist
-- ============================================================================
DROP POLICY IF EXISTS "Mentors can view own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Mentors can update own notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.mentor_notifications;
DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.mentor_notifications;

-- Step 12: Create notification RLS policies
-- ============================================================================

-- Mentors can view their own notifications
CREATE POLICY "Mentors can view own notifications"
    ON public.mentor_notifications
    FOR SELECT
    TO authenticated
    USING (mentor_id = auth.uid());

-- Mentors can update their own notifications (mark as read)
CREATE POLICY "Mentors can update own notifications"
    ON public.mentor_notifications
    FOR UPDATE
    TO authenticated
    USING (mentor_id = auth.uid())
    WITH CHECK (mentor_id = auth.uid());

-- Anyone authenticated can create notifications
CREATE POLICY "Anyone can create notifications"
    ON public.mentor_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admins have full access
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

-- Step 13: Create function to automatically create notification when review is requested
-- ============================================================================
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

-- Step 14: Create trigger for automatic notification creation
-- ============================================================================
DROP TRIGGER IF EXISTS on_trade_review_request_created ON public.trade_review_requests;
CREATE TRIGGER on_trade_review_request_created
    AFTER INSERT ON public.trade_review_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_review_request_notification();

-- Step 15: Grant necessary permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.trade_review_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mentor_notifications TO authenticated;

-- Step 16: Add comments for documentation
-- ============================================================================
COMMENT ON TABLE public.trade_review_requests IS 'Stores trade review requests from students to mentors';
COMMENT ON TABLE public.mentor_notifications IS 'Stores notifications for mentors about new review requests and other events';

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- After running this migration, your mentor reviews page will work correctly.
-- Students will be able to request trade reviews from mentors.
-- Mentors will receive automatic notifications.
-- ============================================================================
