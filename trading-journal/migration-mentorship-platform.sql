-- =====================================================
-- Trading Journal - Mentorship Platform Migration
-- =====================================================
-- This migration adds mentorship, admin, and social features
-- =====================================================

-- =====================================================
-- 1. USER PROFILES & ROLES
-- =====================================================

-- Enhanced user profiles with role system
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,

    -- Role system
    role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('admin', 'mentor', 'trader', 'premium')),

    -- Mentor-specific fields
    is_mentor BOOLEAN DEFAULT false,
    mentor_bio TEXT,
    mentor_specialties TEXT[], -- e.g., ['Scalping', 'Swing Trading', 'Forex']
    mentor_experience_years INTEGER,
    mentor_approved BOOLEAN DEFAULT false,
    mentor_rating DECIMAL(3,2) DEFAULT 0.00,
    mentor_total_reviews INTEGER DEFAULT 0,
    mentor_available BOOLEAN DEFAULT true,

    -- Settings
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    notification_email BOOLEAN DEFAULT true,
    notification_push BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- =====================================================
-- 2. MENTORSHIP CONNECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Settings
    allow_full_journal_access BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,

    -- Notes
    mentor_notes TEXT,

    UNIQUE(mentor_id, student_id)
);

CREATE INDEX idx_mentor_students_mentor ON public.mentor_students(mentor_id);
CREATE INDEX idx_mentor_students_student ON public.mentor_students(student_id);
CREATE INDEX idx_mentor_students_status ON public.mentor_students(status);

-- =====================================================
-- 3. TRADE REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    trader_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

    -- Review request
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    request_message TEXT,
    specific_questions TEXT[],
    requested_at TIMESTAMPTZ DEFAULT NOW(),

    -- Review response
    review_text TEXT,
    review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
    mistakes_identified TEXT[],
    improvements_suggested TEXT[],
    positive_aspects TEXT[],
    reviewed_at TIMESTAMPTZ,

    -- Meta
    is_read BOOLEAN DEFAULT false,
    trader_helpful_rating INTEGER CHECK (trader_helpful_rating BETWEEN 1 AND 5),

    CONSTRAINT valid_rating CHECK (review_rating IS NULL OR reviewed_at IS NOT NULL)
);

CREATE INDEX idx_trade_reviews_trade ON public.trade_reviews(trade_id);
CREATE INDEX idx_trade_reviews_trader ON public.trade_reviews(trader_id);
CREATE INDEX idx_trade_reviews_mentor ON public.trade_reviews(mentor_id);
CREATE INDEX idx_trade_reviews_status ON public.trade_reviews(status);
CREATE INDEX idx_trade_reviews_requested_at ON public.trade_reviews(requested_at DESC);

-- =====================================================
-- 4. REVIEW COMMENTS (Threaded Discussion)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES public.trade_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT false
);

CREATE INDEX idx_review_comments_review ON public.review_comments(review_id);
CREATE INDEX idx_review_comments_user ON public.review_comments(user_id);
CREATE INDEX idx_review_comments_parent ON public.review_comments(parent_comment_id);

-- =====================================================
-- 5. SHARED PLAYBOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shared_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Sharing settings
    is_public BOOLEAN DEFAULT false,
    shared_with_students_only BOOLEAN DEFAULT true,

    -- Content
    sharing_message TEXT,
    key_insights TEXT[],

    -- Analytics
    view_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    shared_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_playbooks_playbook ON public.shared_playbooks(playbook_id);
CREATE INDEX idx_shared_playbooks_mentor ON public.shared_playbooks(mentor_id);
CREATE INDEX idx_shared_playbooks_public ON public.shared_playbooks(is_public) WHERE is_public = true;

-- =====================================================
-- 6. PUBLIC TRADES (Mentor Educational Content)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.public_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Content
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    key_lessons TEXT[] NOT NULL,
    tags TEXT[],

    -- Visibility
    is_published BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,

    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_public_trades_trade ON public.public_trades(trade_id);
CREATE INDEX idx_public_trades_mentor ON public.public_trades(mentor_id);
CREATE INDEX idx_public_trades_published ON public.public_trades(is_published) WHERE is_published = true;
CREATE INDEX idx_public_trades_featured ON public.public_trades(featured) WHERE featured = true;

-- =====================================================
-- 7. TRADE LIKES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_trade_id UUID NOT NULL REFERENCES public.public_trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(public_trade_id, user_id)
);

CREATE INDEX idx_trade_likes_trade ON public.trade_likes(public_trade_id);
CREATE INDEX idx_trade_likes_user ON public.trade_likes(user_id);

-- =====================================================
-- 8. TRADE BOOKMARKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trade_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_trade_id UUID NOT NULL REFERENCES public.public_trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(public_trade_id, user_id)
);

CREATE INDEX idx_trade_bookmarks_trade ON public.trade_bookmarks(public_trade_id);
CREATE INDEX idx_trade_bookmarks_user ON public.trade_bookmarks(user_id);

-- =====================================================
-- 9. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Notification details
    type TEXT NOT NULL CHECK (type IN (
        'trade_review_request',
        'trade_review_completed',
        'review_comment',
        'playbook_shared',
        'new_public_trade',
        'mentor_assigned',
        'student_assigned',
        'system_message',
        'mentor_approved',
        'mentor_rejected'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Reference to related entity
    reference_id UUID,
    reference_type TEXT,
    action_url TEXT,

    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- =====================================================
-- 10. ADMIN AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    details JSONB,

    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- =====================================================
-- 11. MENTOR APPLICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Application details
    bio TEXT NOT NULL,
    specialties TEXT[] NOT NULL,
    experience_years INTEGER NOT NULL,
    trading_style TEXT NOT NULL,
    reason_for_mentoring TEXT NOT NULL,

    -- Verification
    verified_trading_account TEXT,
    proof_of_experience_urls TEXT[],

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_mentor_applications_user ON public.mentor_applications(user_id);
CREATE INDEX idx_mentor_applications_status ON public.mentor_applications(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can view all profiles, update own
CREATE POLICY "Anyone can view user profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Mentor Students: Mentors and students can view own connections
CREATE POLICY "View own mentorship connections"
    ON public.mentor_students FOR SELECT
    TO authenticated
    USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- Trade Reviews: Traders, mentors, and admins can view
CREATE POLICY "View relevant trade reviews"
    ON public.trade_reviews FOR SELECT
    TO authenticated
    USING (
        auth.uid() = trader_id OR
        auth.uid() = mentor_id OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Traders can create review requests"
    ON public.trade_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = trader_id);

CREATE POLICY "Mentors can update reviews"
    ON public.trade_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = mentor_id OR auth.uid() = trader_id);

-- Review Comments: Participants can view and create
CREATE POLICY "View comments on accessible reviews"
    ON public.review_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM trade_reviews
            WHERE id = review_id
            AND (trader_id = auth.uid() OR mentor_id = auth.uid())
        )
    );

CREATE POLICY "Create comments on accessible reviews"
    ON public.review_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM trade_reviews
            WHERE id = review_id
            AND (trader_id = auth.uid() OR mentor_id = auth.uid())
        )
    );

-- Shared Playbooks: View based on sharing settings
CREATE POLICY "View public playbooks"
    ON public.shared_playbooks FOR SELECT
    TO authenticated
    USING (
        is_public = true OR
        mentor_id = auth.uid() OR
        (shared_with_students_only = true AND EXISTS (
            SELECT 1 FROM mentor_students
            WHERE mentor_id = shared_playbooks.mentor_id
            AND student_id = auth.uid()
            AND status = 'active'
        ))
    );

-- Public Trades: Everyone can view published trades
CREATE POLICY "View published public trades"
    ON public.public_trades FOR SELECT
    TO authenticated
    USING (is_published = true OR mentor_id = auth.uid());

CREATE POLICY "Mentors can create public trades"
    ON public.public_trades FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_mentor = true)
    );

-- Notifications: Users can view own notifications
CREATE POLICY "View own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin Audit Log: Only admins can view
CREATE POLICY "Admins view audit log"
    ON public.admin_audit_log FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Mentor Applications: User can view own, admins view all
CREATE POLICY "View own mentor application"
    ON public.mentor_applications FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_playbooks_updated_at BEFORE UPDATE ON public.shared_playbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_trades_updated_at BEFORE UPDATE ON public.public_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_comments_updated_at BEFORE UPDATE ON public.review_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, reference_id, reference_type, action_url
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_reference_id, p_reference_type, p_action_url
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create notification on review request
CREATE OR REPLACE FUNCTION notify_mentor_on_review_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mentor_id IS NOT NULL THEN
        PERFORM create_notification(
            NEW.mentor_id,
            'trade_review_request',
            'New Trade Review Request',
            (SELECT full_name || ' requested a review for their ' ||
                   (SELECT symbol FROM trades WHERE id = NEW.trade_id) || ' trade'
             FROM user_profiles WHERE id = NEW.trader_id),
            NEW.id,
            'trade_review',
            '/mentor/reviews/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_mentor_review_request
    AFTER INSERT ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_mentor_on_review_request();

-- Function to notify trader when review completed
CREATE OR REPLACE FUNCTION notify_trader_on_review_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM create_notification(
            NEW.trader_id,
            'trade_review_completed',
            'Trade Review Completed',
            (SELECT full_name || ' completed your trade review'
             FROM user_profiles WHERE id = NEW.mentor_id),
            NEW.id,
            'trade_review',
            '/reviews/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_trader_review_complete
    AFTER UPDATE ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_trader_on_review_complete();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.mentor_students TO authenticated;
GRANT ALL ON public.trade_reviews TO authenticated;
GRANT ALL ON public.review_comments TO authenticated;
GRANT ALL ON public.shared_playbooks TO authenticated;
GRANT ALL ON public.public_trades TO authenticated;
GRANT ALL ON public.trade_likes TO authenticated;
GRANT ALL ON public.trade_bookmarks TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.mentor_applications TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.user_profiles IS 'Enhanced user profiles with role-based system';
COMMENT ON TABLE public.mentor_students IS 'Mentorship connections between mentors and students';
COMMENT ON TABLE public.trade_reviews IS 'Trade review requests and mentor feedback';
COMMENT ON TABLE public.review_comments IS 'Threaded comments on trade reviews';
COMMENT ON TABLE public.shared_playbooks IS 'Playbooks shared by mentors';
COMMENT ON TABLE public.public_trades IS 'Educational trades published by mentors';
COMMENT ON TABLE public.notifications IS 'In-app notification system';
COMMENT ON TABLE public.admin_audit_log IS 'Audit trail for admin actions';
COMMENT ON TABLE public.mentor_applications IS 'Applications to become a mentor';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Next Steps:
-- 1. Create initial admin user in user_profiles
-- 2. Test role-based access
-- 3. Verify RLS policies
-- 4. Set up notification system
-- =====================================================
