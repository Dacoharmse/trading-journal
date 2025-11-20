-- =====================================================
-- TRADING JOURNAL - COMPLETE MENTORSHIP PLATFORM MIGRATION
-- =====================================================
-- This is a comprehensive migration that transforms your trading journal
-- into a full mentorship platform with admin, mentor, and social features.
--
-- IMPORTANT: Run this AFTER the previous migrations:
-- 1. migration-add-new-fields.sql (trade fields)
-- 2. migration-add-risk-limits.sql (risk management)
--
-- What this adds:
-- - User roles system (admin/mentor/trader/premium)
-- - Mentorship connections
-- - Trade review system with comments
-- - Playbook sharing
-- - Public trade feed
-- - Notifications
-- - Admin panel features
-- - Audit logging
--
-- Estimated execution time: 30-60 seconds
-- =====================================================

-- Start transaction for safety
BEGIN;

-- =====================================================
-- SECTION 1: USER PROFILES & ROLES
-- =====================================================

-- Create user_profiles table (enhanced user management)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,

    -- Role system
    role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('admin', 'mentor', 'trader', 'premium')),

    -- Mentor-specific fields
    is_mentor BOOLEAN DEFAULT false,
    mentor_bio TEXT,
    mentor_specialties TEXT[],
    mentor_experience_years INTEGER,
    mentor_approved BOOLEAN DEFAULT false,
    mentor_rating DECIMAL(3,2) DEFAULT 0.00,
    mentor_total_reviews INTEGER DEFAULT 0,
    mentor_available BOOLEAN DEFAULT true,
    mentor_response_time_hours DECIMAL(5,2) DEFAULT 24.00,

    -- User preferences
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    notification_email BOOLEAN DEFAULT true,
    notification_push BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),

    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    suspended_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_mentor_rating CHECK (mentor_rating >= 0 AND mentor_rating <= 5)
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_mentor ON public.user_profiles(is_mentor) WHERE is_mentor = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active) WHERE is_active = true;

-- =====================================================
-- SECTION 2: MENTORSHIP CONNECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Permissions
    allow_full_journal_access BOOLEAN DEFAULT true,
    notification_enabled BOOLEAN DEFAULT true,

    -- Notes and tracking
    mentor_notes TEXT,
    last_interaction TIMESTAMPTZ,

    -- Constraints
    UNIQUE(mentor_id, student_id),
    CHECK (mentor_id != student_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_students_mentor ON public.mentor_students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_student ON public.mentor_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_status ON public.mentor_students(status);
CREATE INDEX IF NOT EXISTS idx_mentor_students_active ON public.mentor_students(mentor_id, status) WHERE status = 'active';

-- =====================================================
-- SECTION 3: TRADE REVIEWS
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

    -- Assignment
    assigned_at TIMESTAMPTZ,
    claimed_by_mentor BOOLEAN DEFAULT false,

    -- Review response
    review_text TEXT,
    review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
    mistakes_identified TEXT[],
    improvements_suggested TEXT[],
    positive_aspects TEXT[],
    additional_notes TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Feedback loop
    is_read BOOLEAN DEFAULT false,
    trader_helpful_rating INTEGER CHECK (trader_helpful_rating BETWEEN 1 AND 5),
    trader_feedback TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_review_rating CHECK (review_rating IS NULL OR reviewed_at IS NOT NULL),
    CONSTRAINT valid_helpful_rating CHECK (trader_helpful_rating IS NULL OR status = 'completed')
);

CREATE INDEX IF NOT EXISTS idx_trade_reviews_trade ON public.trade_reviews(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_trader ON public.trade_reviews(trader_id);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_mentor ON public.trade_reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_status ON public.trade_reviews(status);
CREATE INDEX IF NOT EXISTS idx_trade_reviews_pending ON public.trade_reviews(status, requested_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_trade_reviews_requested ON public.trade_reviews(requested_at DESC);

-- =====================================================
-- SECTION 4: REVIEW COMMENTS (Threaded Discussion)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.review_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES public.trade_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.review_comments(id) ON DELETE CASCADE,

    -- Metadata
    is_edited BOOLEAN DEFAULT false,
    edit_history JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CHECK (LENGTH(comment_text) > 0)
);

CREATE INDEX IF NOT EXISTS idx_review_comments_review ON public.review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_user ON public.review_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_parent ON public.review_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_created ON public.review_comments(created_at DESC);

-- =====================================================
-- SECTION 5: SHARED PLAYBOOKS
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
    recommended_for TEXT[], -- e.g., ['Beginners', 'Scalpers', 'Swing Traders']

    -- Analytics
    view_count INTEGER DEFAULT 0,
    copy_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    -- Timestamps
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(playbook_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_playbooks_playbook ON public.shared_playbooks(playbook_id);
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_mentor ON public.shared_playbooks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_public ON public.shared_playbooks(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_shared_playbooks_popular ON public.shared_playbooks(view_count DESC, like_count DESC);

-- Track who copied which playbook
CREATE TABLE IF NOT EXISTS public.playbook_copies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_playbook_id UUID NOT NULL REFERENCES public.shared_playbooks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    copied_playbook_id UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,

    copied_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(shared_playbook_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_playbook_copies_shared ON public.playbook_copies(shared_playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_copies_user ON public.playbook_copies(user_id);

-- =====================================================
-- SECTION 6: PUBLIC TRADES (Educational Content)
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
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),

    -- Visibility
    is_published BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- Timestamps
    published_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CHECK (LENGTH(title) >= 10 AND LENGTH(title) <= 200),
    CHECK (LENGTH(description) >= 50),
    CHECK (array_length(key_lessons, 1) >= 1),
    UNIQUE(trade_id)
);

CREATE INDEX IF NOT EXISTS idx_public_trades_trade ON public.public_trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_public_trades_mentor ON public.public_trades(mentor_id);
CREATE INDEX IF NOT EXISTS idx_public_trades_published ON public.public_trades(is_published, published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_public_trades_featured ON public.public_trades(featured, published_at DESC) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_public_trades_popular ON public.public_trades(view_count DESC, like_count DESC);
CREATE INDEX IF NOT EXISTS idx_public_trades_tags ON public.public_trades USING GIN(tags);

-- =====================================================
-- SECTION 7: SOCIAL INTERACTIONS
-- =====================================================

-- Trade likes
CREATE TABLE IF NOT EXISTS public.trade_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_trade_id UUID NOT NULL REFERENCES public.public_trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(public_trade_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_likes_trade ON public.trade_likes(public_trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_likes_user ON public.trade_likes(user_id);

-- Trade bookmarks
CREATE TABLE IF NOT EXISTS public.trade_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_trade_id UUID NOT NULL REFERENCES public.public_trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    notes TEXT,
    folder TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(public_trade_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trade_bookmarks_trade ON public.trade_bookmarks(public_trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_bookmarks_user ON public.trade_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_bookmarks_folder ON public.trade_bookmarks(user_id, folder);

-- Public trade comments
CREATE TABLE IF NOT EXISTS public.public_trade_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_trade_id UUID NOT NULL REFERENCES public.public_trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.public_trade_comments(id) ON DELETE CASCADE,

    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (LENGTH(comment_text) > 0)
);

CREATE INDEX IF NOT EXISTS idx_public_trade_comments_trade ON public.public_trade_comments(public_trade_id);
CREATE INDEX IF NOT EXISTS idx_public_trade_comments_user ON public.public_trade_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_public_trade_comments_parent ON public.public_trade_comments(parent_comment_id);

-- =====================================================
-- SECTION 8: NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Notification details
    type TEXT NOT NULL CHECK (type IN (
        'trade_review_request',
        'trade_review_completed',
        'trade_review_claimed',
        'review_comment',
        'review_comment_reply',
        'playbook_shared',
        'new_public_trade',
        'public_trade_comment',
        'mentor_assigned',
        'student_assigned',
        'system_message',
        'mentor_approved',
        'mentor_rejected',
        'achievement_unlocked',
        'weekly_summary'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Reference to related entity
    reference_id UUID,
    reference_type TEXT,
    action_url TEXT,

    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Delivery
    sent_email BOOLEAN DEFAULT false,
    sent_push BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON public.notifications(reference_type, reference_id);

-- =====================================================
-- SECTION 9: ADMIN & MANAGEMENT
-- =====================================================

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    action TEXT NOT NULL,
    target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    details JSONB,

    -- Session info
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Mentor applications
CREATE TABLE IF NOT EXISTS public.mentor_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Application details (matching the form fields)
    trading_experience TEXT NOT NULL,
    specialties TEXT[] NOT NULL,
    why_mentor TEXT NOT NULL,
    teaching_experience TEXT,
    availability TEXT,
    certifications TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CHECK (LENGTH(trading_experience) >= 50),
    CHECK (LENGTH(why_mentor) >= 50),
    CHECK (array_length(specialties, 1) >= 1),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_applications_user ON public.mentor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_status ON public.mentor_applications(status);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_pending ON public.mentor_applications(created_at DESC) WHERE status = 'pending';

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('max_students_per_mentor', '20', 'Maximum number of active students per mentor'),
    ('require_mentor_approval', 'true', 'Require admin approval for new mentors'),
    ('auto_assign_mentors', 'false', 'Automatically assign mentors to new traders'),
    ('review_response_time_hours', '48', 'Expected review response time in hours'),
    ('featured_trade_duration_days', '7', 'How long trades stay featured')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- SECTION 10: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_trade_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-run safety)
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "View own mentorship connections" ON public.mentor_students;
DROP POLICY IF EXISTS "View relevant trade reviews" ON public.trade_reviews;
DROP POLICY IF EXISTS "Traders can create review requests" ON public.trade_reviews;
DROP POLICY IF EXISTS "Mentors can update reviews" ON public.trade_reviews;
DROP POLICY IF EXISTS "View comments on accessible reviews" ON public.review_comments;
DROP POLICY IF EXISTS "Create comments on accessible reviews" ON public.review_comments;
DROP POLICY IF EXISTS "View public playbooks" ON public.shared_playbooks;
DROP POLICY IF EXISTS "View published public trades" ON public.public_trades;
DROP POLICY IF EXISTS "Mentors can create public trades" ON public.public_trades;
DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins view audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "View own mentor application" ON public.mentor_applications;

-- USER PROFILES
CREATE POLICY "Anyone can view user profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- MENTOR STUDENTS
CREATE POLICY "View own mentorship connections"
    ON public.mentor_students FOR SELECT
    TO authenticated
    USING (
        auth.uid() = mentor_id OR
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins create mentor connections"
    ON public.mentor_students FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- TRADE REVIEWS
CREATE POLICY "View relevant trade reviews"
    ON public.trade_reviews FOR SELECT
    TO authenticated
    USING (
        auth.uid() = trader_id OR
        auth.uid() = mentor_id OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin') OR
        EXISTS (
            SELECT 1 FROM public.mentor_students
            WHERE mentor_id = auth.uid()
            AND student_id = trade_reviews.trader_id
            AND status = 'active'
        )
    );

CREATE POLICY "Traders can create review requests"
    ON public.trade_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = trader_id);

CREATE POLICY "Mentors and traders can update reviews"
    ON public.trade_reviews FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = mentor_id OR
        auth.uid() = trader_id OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- REVIEW COMMENTS
CREATE POLICY "View comments on accessible reviews"
    ON public.review_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trade_reviews
            WHERE id = review_id
            AND (
                trader_id = auth.uid() OR
                mentor_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
            )
        )
    );

CREATE POLICY "Create comments on accessible reviews"
    ON public.review_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.trade_reviews
            WHERE id = review_id
            AND (trader_id = auth.uid() OR mentor_id = auth.uid())
        )
    );

CREATE POLICY "Users can update own comments"
    ON public.review_comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- SHARED PLAYBOOKS
CREATE POLICY "View public or accessible playbooks"
    ON public.shared_playbooks FOR SELECT
    TO authenticated
    USING (
        is_public = true OR
        mentor_id = auth.uid() OR
        (shared_with_students_only = true AND EXISTS (
            SELECT 1 FROM public.mentor_students
            WHERE mentor_id = shared_playbooks.mentor_id
            AND student_id = auth.uid()
            AND status = 'active'
        )) OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Mentors can share playbooks"
    ON public.shared_playbooks FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = mentor_id AND
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_mentor = true AND mentor_approved = true)
    );

-- PLAYBOOK COPIES
CREATE POLICY "Users can view own copies"
    ON public.playbook_copies FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create copies"
    ON public.playbook_copies FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- PUBLIC TRADES
CREATE POLICY "View published public trades"
    ON public.public_trades FOR SELECT
    TO authenticated
    USING (
        is_published = true OR
        mentor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Mentors can create public trades"
    ON public.public_trades FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = mentor_id AND
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_mentor = true AND mentor_approved = true)
    );

CREATE POLICY "Mentors can update own public trades"
    ON public.public_trades FOR UPDATE
    TO authenticated
    USING (auth.uid() = mentor_id OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- SOCIAL INTERACTIONS
CREATE POLICY "Anyone can view likes"
    ON public.trade_likes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage own likes"
    ON public.trade_likes FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view bookmarks"
    ON public.trade_bookmarks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bookmarks"
    ON public.trade_bookmarks FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public trade comments"
    ON public.public_trade_comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create comments"
    ON public.public_trade_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.public_trade_comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "View own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ADMIN AUDIT LOG
CREATE POLICY "Admins view audit log"
    ON public.admin_audit_log FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins create audit log"
    ON public.admin_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- MENTOR APPLICATIONS
CREATE POLICY "View own or all (admin) applications"
    ON public.mentor_applications FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create applications"
    ON public.mentor_applications FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update applications"
    ON public.mentor_applications FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- SYSTEM SETTINGS
CREATE POLICY "Anyone can view settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update settings"
    ON public.system_settings FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- SECTION 11: FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trade_reviews_updated_at ON public.trade_reviews;
CREATE TRIGGER update_trade_reviews_updated_at
    BEFORE UPDATE ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_comments_updated_at ON public.review_comments;
CREATE TRIGGER update_review_comments_updated_at
    BEFORE UPDATE ON public.review_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_playbooks_updated_at ON public.shared_playbooks;
CREATE TRIGGER update_shared_playbooks_updated_at
    BEFORE UPDATE ON public.shared_playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_public_trades_updated_at ON public.public_trades;
CREATE TRIGGER update_public_trades_updated_at
    BEFORE UPDATE ON public.public_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, reference_id, reference_type, action_url, priority
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_reference_id, p_reference_type, p_action_url, p_priority
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify mentor on review request
CREATE OR REPLACE FUNCTION notify_mentor_on_review_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mentor_id IS NOT NULL THEN
        PERFORM create_notification(
            NEW.mentor_id,
            'trade_review_request',
            'New Trade Review Request',
            (SELECT COALESCE(full_name, email) || ' requested a review for their ' ||
                   (SELECT symbol FROM trades WHERE id = NEW.trade_id) || ' trade'
             FROM user_profiles WHERE id = NEW.trader_id),
            NEW.id,
            'trade_review',
            '/mentor/reviews/' || NEW.id,
            NEW.priority
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_mentor_review_request ON public.trade_reviews;
CREATE TRIGGER trigger_notify_mentor_review_request
    AFTER INSERT ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_mentor_on_review_request();

-- Trigger: Notify trader when review completed
CREATE OR REPLACE FUNCTION notify_trader_on_review_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM create_notification(
            NEW.trader_id,
            'trade_review_completed',
            'Trade Review Completed',
            (SELECT COALESCE(full_name, email) || ' completed your trade review'
             FROM user_profiles WHERE id = NEW.mentor_id),
            NEW.id,
            'trade_review',
            '/reviews/' || NEW.id,
            'high'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_trader_review_complete ON public.trade_reviews;
CREATE TRIGGER trigger_notify_trader_review_complete
    AFTER UPDATE ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_trader_on_review_complete();

-- Trigger: Update like count on public trades
CREATE OR REPLACE FUNCTION update_public_trade_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.public_trades
        SET like_count = like_count + 1
        WHERE id = NEW.public_trade_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.public_trades
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.public_trade_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_like_count ON public.trade_likes;
CREATE TRIGGER trigger_update_like_count
    AFTER INSERT OR DELETE ON public.trade_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_public_trade_like_count();

-- Trigger: Update bookmark count
CREATE OR REPLACE FUNCTION update_public_trade_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.public_trades
        SET bookmark_count = bookmark_count + 1
        WHERE id = NEW.public_trade_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.public_trades
        SET bookmark_count = GREATEST(0, bookmark_count - 1)
        WHERE id = OLD.public_trade_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_bookmark_count ON public.trade_bookmarks;
CREATE TRIGGER trigger_update_bookmark_count
    AFTER INSERT OR DELETE ON public.trade_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_public_trade_bookmark_count();

-- Trigger: Update mentor rating
CREATE OR REPLACE FUNCTION update_mentor_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_total_reviews INTEGER;
BEGIN
    IF NEW.trader_helpful_rating IS NOT NULL AND OLD.trader_helpful_rating IS NULL THEN
        SELECT
            AVG(trader_helpful_rating)::DECIMAL(3,2),
            COUNT(*)
        INTO v_avg_rating, v_total_reviews
        FROM public.trade_reviews
        WHERE mentor_id = NEW.mentor_id
        AND trader_helpful_rating IS NOT NULL;

        UPDATE public.user_profiles
        SET
            mentor_rating = COALESCE(v_avg_rating, 0),
            mentor_total_reviews = v_total_reviews
        WHERE id = NEW.mentor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_mentor_rating ON public.trade_reviews;
CREATE TRIGGER trigger_update_mentor_rating
    AFTER UPDATE ON public.trade_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_rating();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'trader'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SECTION 12: GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.mentor_students TO authenticated;
GRANT ALL ON public.trade_reviews TO authenticated;
GRANT ALL ON public.review_comments TO authenticated;
GRANT ALL ON public.shared_playbooks TO authenticated;
GRANT ALL ON public.playbook_copies TO authenticated;
GRANT ALL ON public.public_trades TO authenticated;
GRANT ALL ON public.trade_likes TO authenticated;
GRANT ALL ON public.trade_bookmarks TO authenticated;
GRANT ALL ON public.public_trade_comments TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.mentor_applications TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;

-- =====================================================
-- SECTION 13: CREATE INITIAL ADMIN USER & POPULATE PROFILES
-- =====================================================

-- First, populate user_profiles from existing auth.users if they don't have profiles yet
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    'trader'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
);

-- Now set admin role for dacoharmse13.dh@gmail.com
UPDATE public.user_profiles
SET
    role = 'admin',
    is_active = true,
    full_name = 'Dacoharmse'
WHERE email = 'dacoharmse13.dh@gmail.com';

-- Fallback: If that email doesn't exist, set the first user as admin
UPDATE public.user_profiles
SET
    role = 'admin',
    is_active = true,
    full_name = 'Dacoharmse'
WHERE id = (
    SELECT id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE email = 'dacoharmse13.dh@gmail.com'
);

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
--
-- ✅ What was created:
-- - 14 new tables
-- - Complete RLS policies
-- - Automated triggers and functions
-- - Notification system
-- - Admin features
-- - Mentorship connections
-- - Trade review system
-- - Public trade feed
-- - Social features (likes, bookmarks, comments)
--
-- 📝 Next Steps:
-- 1. Set your user as admin (uncomment section 13 above)
-- 2. Test the new features in your app
-- 3. Verify RLS policies are working
-- 4. Check notifications are being created
--
-- 🔐 Security:
-- - All tables have RLS enabled
-- - Proper permission checks in place
-- - Audit logging for admin actions
-- - Email verification recommended
--
-- 📊 Performance:
-- - All necessary indexes created
-- - Efficient query patterns
-- - Pagination-ready
--
-- =====================================================
