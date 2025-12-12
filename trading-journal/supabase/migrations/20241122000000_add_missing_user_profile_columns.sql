-- =====================================================
-- Add Missing User Profile Columns Migration
-- =====================================================
-- This migration ensures all required columns exist in
-- the user_profiles table for preferences and profile data
-- =====================================================

-- Add missing preference columns
DO $$
BEGIN
    -- Timezone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;

    -- Default Broker
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'default_broker'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN default_broker TEXT;
    END IF;

    -- Default Chart Type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'default_chart_type'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN default_chart_type TEXT DEFAULT 'candlestick' CHECK (default_chart_type IN ('candlestick', 'line', 'bar'));
    END IF;

    -- Items Per Page
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'items_per_page'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN items_per_page INTEGER DEFAULT 50 CHECK (items_per_page > 0 AND items_per_page <= 100);
    END IF;

    -- Default Date Range
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'default_date_range'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN default_date_range TEXT DEFAULT '30d' CHECK (default_date_range IN ('7d', '30d', '90d', '1y', 'all'));
    END IF;

    -- Show PnL Percentage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'show_pnl_percentage'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN show_pnl_percentage BOOLEAN DEFAULT false;
    END IF;

    -- Max Risk Per Trade
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'max_risk_per_trade'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN max_risk_per_trade NUMERIC(10, 2) CHECK (max_risk_per_trade >= 0);
    END IF;

    -- Max Daily Loss
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'max_daily_loss'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN max_daily_loss NUMERIC(12, 2) CHECK (max_daily_loss >= 0);
    END IF;

    -- Max Position Size
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'max_position_size'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN max_position_size NUMERIC(12, 2) CHECK (max_position_size >= 0);
    END IF;

    -- Confluences (array of text)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'confluences'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN confluences TEXT[] DEFAULT '{}';
    END IF;

    -- Theme
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system'));
    END IF;

    -- Currency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'ZAR'));
    END IF;

    -- Full Name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Experience Level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'experience_level'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional'));
    END IF;

    -- Years of Experience
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'years_of_experience'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN years_of_experience INTEGER CHECK (years_of_experience >= 0);
    END IF;

    -- Trading Style
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'trading_style'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN trading_style TEXT CHECK (trading_style IN ('day_trading', 'swing_trading', 'scalping', 'position_trading', 'mixed'));
    END IF;

    -- Bio
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN bio TEXT;
    END IF;

    -- Phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN phone TEXT;
    END IF;

    -- Country
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN country TEXT;
    END IF;

    -- Twitter Handle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'twitter_handle'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN twitter_handle TEXT;
    END IF;

    -- LinkedIn URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'linkedin_url'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN linkedin_url TEXT;
    END IF;

    -- Subscription Tier
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'professional', 'enterprise'));
    END IF;

END $$;

-- Add comments to document the columns
COMMENT ON COLUMN public.user_profiles.timezone IS 'User timezone preference (e.g., UTC, America/New_York)';
COMMENT ON COLUMN public.user_profiles.default_broker IS 'Default broker for new trades';
COMMENT ON COLUMN public.user_profiles.default_chart_type IS 'Preferred chart type: candlestick, line, or bar';
COMMENT ON COLUMN public.user_profiles.items_per_page IS 'Number of items to display per page (20-100)';
COMMENT ON COLUMN public.user_profiles.default_date_range IS 'Default date range for charts: 7d, 30d, 90d, 1y, or all';
COMMENT ON COLUMN public.user_profiles.show_pnl_percentage IS 'Whether to show P&L as percentage';
COMMENT ON COLUMN public.user_profiles.max_risk_per_trade IS 'Maximum risk per trade (risk management)';
COMMENT ON COLUMN public.user_profiles.max_daily_loss IS 'Maximum daily loss limit (risk management)';
COMMENT ON COLUMN public.user_profiles.max_position_size IS 'Maximum position size (risk management)';
COMMENT ON COLUMN public.user_profiles.confluences IS 'Array of confluence factors used in trading';
COMMENT ON COLUMN public.user_profiles.full_name IS 'User full name';
COMMENT ON COLUMN public.user_profiles.experience_level IS 'Trading experience level: beginner, intermediate, advanced, or professional';
COMMENT ON COLUMN public.user_profiles.years_of_experience IS 'Years of trading experience';
COMMENT ON COLUMN public.user_profiles.trading_style IS 'Primary trading style';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- All required columns now exist in user_profiles table.
-- Run this migration in Supabase SQL Editor to apply changes.
-- =====================================================
