-- ============================================================================
-- SHARED PLAYBOOKS MIGRATION - CLEAN VERSION
-- ============================================================================
-- This drops and recreates the table to ensure clean state
-- ============================================================================

-- Step 1: Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.shared_playbooks CASCADE;

-- Step 2: Create the table from scratch
CREATE TABLE public.shared_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
    shared_with TEXT NOT NULL CHECK (shared_with IN ('all_students', 'specific_students')),
    student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    shared_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_mentor_playbook_share UNIQUE (mentor_id, playbook_id)
);

-- Step 3: Create indexes
CREATE INDEX idx_shared_playbooks_mentor ON public.shared_playbooks(mentor_id);
CREATE INDEX idx_shared_playbooks_playbook ON public.shared_playbooks(playbook_id);
CREATE INDEX idx_shared_playbooks_created ON public.shared_playbooks(created_at);

-- Step 4: Enable RLS
ALTER TABLE public.shared_playbooks ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies
CREATE POLICY "Mentors can manage their shared playbooks"
    ON public.shared_playbooks FOR ALL TO authenticated
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
    ON public.shared_playbooks FOR SELECT TO authenticated
    USING (
        shared_with = 'all_students'
        AND EXISTS (
            SELECT 1 FROM public.mentorship_connections
            WHERE mentorship_connections.student_id = auth.uid()
            AND mentorship_connections.mentor_id = shared_playbooks.mentor_id
            AND mentorship_connections.status = 'active'
        )
        OR (
            shared_with = 'specific_students'
            AND auth.uid() = ANY(student_ids)
        )
    );

CREATE POLICY "Admins have full access to shared playbooks"
    ON public.shared_playbooks FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- Step 6: Create trigger function
CREATE OR REPLACE FUNCTION update_shared_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
CREATE TRIGGER set_shared_playbooks_updated_at
    BEFORE UPDATE ON public.shared_playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_playbooks_updated_at();

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_playbooks TO authenticated;

-- Step 9: Add comment
COMMENT ON TABLE public.shared_playbooks IS 'Stores playbooks shared by mentors with their students';

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- The shared_playbooks table has been created successfully.
-- You can now use the playbook sharing feature at /mentor/playbooks
-- ============================================================================
