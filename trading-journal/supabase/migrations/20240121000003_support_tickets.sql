-- =====================================================================================
-- SUPPORT TICKET SYSTEM MIGRATION
-- =====================================================================================
-- This migration creates the support ticket system infrastructure
--
-- Tables created:
-- 1. support_tickets - Main ticket storage
-- 2. ticket_messages - Messages/replies within tickets
-- 3. ticket_categories - Predefined ticket categories
--
-- =====================================================================================

-- =====================================================================================
-- SECTION 1: CREATE SUPPORT TICKET TABLES
-- =====================================================================================

-- Create ticket_categories table
CREATE TABLE IF NOT EXISTS public.ticket_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    user_email TEXT NOT NULL,
    user_name TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_response_at TIMESTAMPTZ,
    last_response_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    response_time_minutes INTEGER,
    resolution_time_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- SECTION 2: CREATE INDEXES
-- =====================================================================================

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category_id ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Ticket messages indexes
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_user_id ON public.ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at DESC);

-- =====================================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Ticket Categories Policies
CREATE POLICY "Anyone can view active categories"
    ON public.ticket_categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories"
    ON public.ticket_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Support Tickets Policies
CREATE POLICY "Users can view their own tickets"
    ON public.support_tickets FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'mentor')
        )
    );

CREATE POLICY "Users can create tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own open tickets"
    ON public.support_tickets FOR UPDATE
    USING (
        user_id = auth.uid() AND status IN ('open', 'waiting')
    );

CREATE POLICY "Admins can manage all tickets"
    ON public.support_tickets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Ticket Messages Policies
CREATE POLICY "Users can view messages for their tickets"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND (
                support_tickets.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.id = auth.uid()
                    AND user_profiles.role IN ('admin', 'mentor')
                )
            )
        )
        AND (is_internal = false OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        ))
    );

CREATE POLICY "Users can create messages on their tickets"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.support_tickets
            WHERE support_tickets.id = ticket_messages.ticket_id
            AND (
                support_tickets.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.id = auth.uid()
                    AND user_profiles.role IN ('admin', 'mentor')
                )
            )
        )
    );

CREATE POLICY "Admins can manage all messages"
    ON public.ticket_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- =====================================================================================
-- SECTION 4: FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_ticket_categories_updated_at
    BEFORE UPDATE ON public.ticket_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_messages_updated_at
    BEFORE UPDATE ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get the count of existing tickets today
    SELECT COUNT(*) INTO counter
    FROM public.support_tickets
    WHERE DATE(created_at) = CURRENT_DATE;

    -- Generate ticket number: YYYYMMDD-XXXX
    new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 4, '0');

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := public.generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_support_ticket_number
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_ticket_number();

-- Function to update ticket last_response info
CREATE OR REPLACE FUNCTION public.update_ticket_last_response()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_tickets
    SET
        last_response_at = NOW(),
        last_response_by = NEW.user_id,
        updated_at = NOW()
    WHERE id = NEW.ticket_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_on_message
    AFTER INSERT ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ticket_last_response();

-- =====================================================================================
-- SECTION 5: SEED DEFAULT CATEGORIES
-- =====================================================================================

INSERT INTO public.ticket_categories (name, description, color, icon, display_order) VALUES
    ('Technical Issue', 'Problems with the platform, bugs, or technical difficulties', '#EF4444', 'AlertCircle', 1),
    ('Account', 'Account-related questions, login issues, or profile problems', '#3B82F6', 'User', 2),
    ('Billing', 'Payment, subscription, or billing inquiries', '#10B981', 'CreditCard', 3),
    ('Feature Request', 'Suggestions for new features or improvements', '#8B5CF6', 'Lightbulb', 4),
    ('Trading Question', 'Questions about trading, strategies, or journal usage', '#F59E0B', 'TrendingUp', 5),
    ('Mentorship', 'Questions about mentorship program or mentor matching', '#EC4899', 'Users', 6),
    ('Other', 'General inquiries or other topics', '#6B7280', 'HelpCircle', 7)
ON CONFLICT (name) DO NOTHING;

-- =====================================================================================
-- SECTION 6: GRANT PERMISSIONS
-- =====================================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.ticket_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
