-- =====================================================
-- Add user_id Foreign Key Column to user_profiles
-- =====================================================
-- This migration adds the missing user_id column that
-- links user_profiles to auth.users
-- =====================================================

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'user_id'
    ) THEN
        -- Add the column
        ALTER TABLE public.user_profiles
        ADD COLUMN user_id UUID;

        -- For existing rows, try to match by email if possible
        -- This assumes email column exists and matches auth.users.email
        UPDATE public.user_profiles up
        SET user_id = au.id
        FROM auth.users au
        WHERE up.email = au.email;

        -- Make it NOT NULL after populating
        ALTER TABLE public.user_profiles
        ALTER COLUMN user_id SET NOT NULL;

        -- Add foreign key constraint
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Add index for better query performance
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
        ON public.user_profiles(user_id);

        -- Add unique constraint to ensure one profile per user
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

COMMENT ON COLUMN public.user_profiles.user_id IS 'Foreign key to auth.users table';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The user_id column now exists and links to auth.users
-- =====================================================
