-- =====================================================
-- Add Notification Preference Columns
-- =====================================================
-- This migration adds notification preference columns to
-- the user_profiles table
-- =====================================================

DO $$
BEGIN
    -- Email notification preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'email_notifications'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'daily_summary_email'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN daily_summary_email BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'weekly_report_email'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN weekly_report_email BOOLEAN DEFAULT true;
    END IF;

    -- Trading alert preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'profit_target_alerts'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN profit_target_alerts BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'drawdown_warnings'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN drawdown_warnings BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'daily_loss_alerts'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN daily_loss_alerts BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'trade_reminders'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN trade_reminders BOOLEAN DEFAULT false;
    END IF;

    -- Performance notification preferences
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'winning_streak_notifications'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN winning_streak_notifications BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'personal_best_notifications'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN personal_best_notifications BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'milestone_notifications'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN milestone_notifications BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.user_profiles.email_notifications IS 'Enable/disable email notifications';
COMMENT ON COLUMN public.user_profiles.daily_summary_email IS 'Receive daily trading summary emails';
COMMENT ON COLUMN public.user_profiles.weekly_report_email IS 'Receive weekly trading report emails';
COMMENT ON COLUMN public.user_profiles.profit_target_alerts IS 'Alerts when profit targets are reached';
COMMENT ON COLUMN public.user_profiles.drawdown_warnings IS 'Warnings when approaching drawdown limits';
COMMENT ON COLUMN public.user_profiles.daily_loss_alerts IS 'Alerts when daily loss limit is reached';
COMMENT ON COLUMN public.user_profiles.trade_reminders IS 'Reminders for unclosed trades';
COMMENT ON COLUMN public.user_profiles.winning_streak_notifications IS 'Notifications for winning streaks';
COMMENT ON COLUMN public.user_profiles.personal_best_notifications IS 'Notifications for new personal bests';
COMMENT ON COLUMN public.user_profiles.milestone_notifications IS 'Notifications for milestone achievements';

-- =====================================================
-- Migration Complete!
-- =====================================================
