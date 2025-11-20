-- =====================================================
-- Trading Journal Database Schema
-- =====================================================
-- This SQL script creates all necessary tables, indexes,
-- and Row Level Security (RLS) policies for the Trading Journal application.
--
-- SETUP INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- =====================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER PROFILES TABLE
-- =====================================================
-- Extends Supabase auth.users with additional profile information
-- One-to-one relationship with auth.users

CREATE TABLE IF NOT EXISTS public.user_profiles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to Supabase auth.users
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile Information
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,

    -- Trading Profile
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    trading_style TEXT CHECK (trading_style IN ('day_trading', 'swing_trading', 'scalping', 'position_trading', 'mixed')),
    preferred_markets TEXT[] DEFAULT '{}',

    -- Contact Information
    country TEXT,
    phone TEXT,
    linkedin_url TEXT,
    twitter_handle TEXT,

    -- Trading Preferences
    default_broker TEXT,
    currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY')),

    -- UI Preferences
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    email_notifications BOOLEAN DEFAULT true,
    daily_summary_email BOOLEAN DEFAULT false,
    weekly_report_email BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    default_chart_type TEXT DEFAULT 'candlestick' CHECK (default_chart_type IN ('candlestick', 'line', 'bar')),
    items_per_page INTEGER DEFAULT 20 CHECK (items_per_page > 0 AND items_per_page <= 100),
    default_date_range TEXT DEFAULT '30d' CHECK (default_date_range IN ('7d', '30d', '90d', '1y', 'all')),
    show_pnl_percentage BOOLEAN DEFAULT true,

    -- Risk Management
    max_risk_per_trade NUMERIC(10, 2) CHECK (max_risk_per_trade >= 0),
    max_daily_loss NUMERIC(12, 2) CHECK (max_daily_loss >= 0),
    max_position_size NUMERIC(12, 2) CHECK (max_position_size >= 0),

    -- Account Information
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'professional', 'enterprise')),
    account_balance NUMERIC(15, 2),
    starting_balance NUMERIC(15, 2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id)
);

-- Indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);

-- =====================================================
-- TRADES TABLE
-- =====================================================
-- Stores all trading data for users

CREATE TABLE IF NOT EXISTS public.trades (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to auth.users
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Trade Basics
    symbol TEXT NOT NULL,
    account_id UUID,
    account_name TEXT,
    entry_price NUMERIC(12, 4) NOT NULL CHECK (entry_price > 0),
    exit_price NUMERIC(12, 4) CHECK (exit_price IS NULL OR exit_price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    trade_type TEXT NOT NULL CHECK (trade_type IN ('long', 'short')),

    -- Dates
    entry_date TIMESTAMPTZ NOT NULL,
    exit_date TIMESTAMPTZ CHECK (exit_date IS NULL OR exit_date >= entry_date),

    -- Financial Metrics
    pnl NUMERIC(15, 2) NOT NULL DEFAULT 0,
    fees NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fees >= 0),

    -- Additional Information
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    strategy TEXT,
    image_url TEXT,
    broker TEXT,

    -- Trade Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),

    -- Risk Management
    risk_reward_ratio NUMERIC(10, 2) CHECK (risk_reward_ratio > 0),
    stop_loss NUMERIC(12, 4) CHECK (stop_loss > 0),
    take_profit NUMERIC(12, 4) CHECK (take_profit > 0),

    -- Asset Classification
    asset_class TEXT CHECK (asset_class IN ('stocks', 'options', 'futures', 'crypto', 'forex')),

    -- P/L Amount and Currency
    pnl_amount NUMERIC(15, 2),
    pnl_currency TEXT,

    -- Actual Risk/Reward Ratio
    actual_rr NUMERIC(10, 2),

    -- Trade Outcome
    outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),

    -- Timeframes
    entry_timeframe TEXT,
    analysis_timeframe TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_exit_for_closed_trades CHECK (
        (status = 'closed' AND exit_price IS NOT NULL AND exit_date IS NOT NULL) OR
        (status = 'open' AND (exit_price IS NULL OR exit_date IS NULL))
    )
);

-- Indexes for trades table
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_exit_date ON public.trades(exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_trade_type ON public.trades(trade_type);
CREATE INDEX IF NOT EXISTS idx_trades_broker ON public.trades(broker);
CREATE INDEX IF NOT EXISTS idx_trades_asset_class ON public.trades(asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON public.trades(strategy);
CREATE INDEX IF NOT EXISTS idx_trades_pnl ON public.trades(pnl DESC);
CREATE INDEX IF NOT EXISTS idx_trades_tags ON public.trades USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_date ON public.trades(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON public.trades(user_id, symbol);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_trades_user_status_entry ON public.trades(user_id, status, entry_date DESC);

-- Full-text search index for notes
CREATE INDEX IF NOT EXISTS idx_trades_notes_search ON public.trades USING gin(to_tsvector('english', COALESCE(notes, '')));

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for trades updated_at
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate PnL for a trade
CREATE OR REPLACE FUNCTION calculate_trade_pnl(
    p_trade_type TEXT,
    p_entry_price NUMERIC,
    p_exit_price NUMERIC,
    p_quantity INTEGER,
    p_fees NUMERIC DEFAULT 0
)
RETURNS NUMERIC AS $$
DECLARE
    gross_pnl NUMERIC;
BEGIN
    IF p_exit_price IS NULL THEN
        RETURN 0;
    END IF;

    IF p_trade_type = 'long' THEN
        gross_pnl := (p_exit_price - p_entry_price) * p_quantity;
    ELSE -- short
        gross_pnl := (p_entry_price - p_exit_price) * p_quantity;
    END IF;

    RETURN gross_pnl - COALESCE(p_fees, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER_PROFILES RLS Policies
-- =====================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
    ON public.user_profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- TRADES RLS Policies
-- =====================================================

-- Policy: Users can view their own trades
CREATE POLICY "Users can view own trades"
    ON public.trades
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own trades
CREATE POLICY "Users can insert own trades"
    ON public.trades
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trades
CREATE POLICY "Users can update own trades"
    ON public.trades
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own trades
CREATE POLICY "Users can delete own trades"
    ON public.trades
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- ANALYTICS VIEWS
-- =====================================================

-- View: User Trading Statistics
CREATE OR REPLACE VIEW user_trade_stats AS
SELECT
    user_id,
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE status = 'closed') AS closed_trades,
    COUNT(*) FILTER (WHERE status = 'open') AS open_trades,
    COUNT(*) FILTER (WHERE status = 'closed' AND pnl > 0) AS winning_trades,
    COUNT(*) FILTER (WHERE status = 'closed' AND pnl < 0) AS losing_trades,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'closed' AND pnl > 0)::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0) * 100)::NUMERIC,
        2
    ) AS win_rate,
    COALESCE(SUM(pnl), 0) AS total_pnl,
    COALESCE(AVG(pnl) FILTER (WHERE status = 'closed' AND pnl > 0), 0) AS avg_win,
    COALESCE(AVG(pnl) FILTER (WHERE status = 'closed' AND pnl < 0), 0) AS avg_loss,
    COALESCE(MAX(pnl), 0) AS largest_win,
    COALESCE(MIN(pnl), 0) AS largest_loss,
    COALESCE(SUM(fees), 0) AS total_fees,
    COALESCE(
        SUM(pnl) FILTER (WHERE status = 'closed' AND pnl > 0) /
        NULLIF(ABS(SUM(pnl) FILTER (WHERE status = 'closed' AND pnl < 0)), 0),
        0
    ) AS profit_factor
FROM public.trades
GROUP BY user_id;

-- View: Daily Trading Performance
CREATE OR REPLACE VIEW daily_trade_performance AS
SELECT
    user_id,
    DATE(entry_date) AS trade_date,
    COUNT(*) AS trades_count,
    COUNT(*) FILTER (WHERE pnl > 0) AS wins,
    COUNT(*) FILTER (WHERE pnl < 0) AS losses,
    COALESCE(SUM(pnl), 0) AS daily_pnl,
    ROUND(
        (COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC,
        2
    ) AS win_rate
FROM public.trades
WHERE status = 'closed'
GROUP BY user_id, DATE(entry_date)
ORDER BY trade_date DESC;

-- View: Performance by Symbol
CREATE OR REPLACE VIEW symbol_performance AS
SELECT
    user_id,
    symbol,
    COUNT(*) AS trades_count,
    COUNT(*) FILTER (WHERE pnl > 0) AS wins,
    COUNT(*) FILTER (WHERE pnl < 0) AS losses,
    COALESCE(SUM(pnl), 0) AS total_pnl,
    COALESCE(AVG(pnl), 0) AS avg_pnl,
    ROUND(
        (COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC,
        2
    ) AS win_rate
FROM public.trades
WHERE status = 'closed'
GROUP BY user_id, symbol
ORDER BY total_pnl DESC;

-- View: Performance by Strategy
CREATE OR REPLACE VIEW strategy_performance AS
SELECT
    user_id,
    strategy,
    COUNT(*) AS trades_count,
    COUNT(*) FILTER (WHERE pnl > 0) AS wins,
    COUNT(*) FILTER (WHERE pnl < 0) AS losses,
    COALESCE(SUM(pnl), 0) AS total_pnl,
    COALESCE(AVG(pnl), 0) AS avg_pnl,
    ROUND(
        (COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC,
        2
    ) AS win_rate
FROM public.trades
WHERE status = 'closed' AND strategy IS NOT NULL
GROUP BY user_id, strategy
ORDER BY total_pnl DESC;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.trades TO authenticated;
GRANT SELECT ON user_trade_stats TO authenticated;
GRANT SELECT ON daily_trade_performance TO authenticated;
GRANT SELECT ON symbol_performance TO authenticated;
GRANT SELECT ON strategy_performance TO authenticated;

-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================

-- Uncomment the following to insert sample data for testing
-- Note: Replace 'YOUR-USER-ID' with an actual user ID from auth.users

/*
-- Sample user profile
INSERT INTO public.user_profiles (user_id, full_name, experience_level, trading_style)
VALUES ('YOUR-USER-ID', 'John Trader', 'intermediate', 'day_trading');

-- Sample trades
INSERT INTO public.trades (
    user_id, symbol, entry_price, exit_price, quantity, trade_type,
    entry_date, exit_date, pnl, fees, status, broker, strategy
) VALUES
('YOUR-USER-ID', 'AAPL', 150.00, 155.00, 100, 'long', '2024-01-15 09:30:00', '2024-01-15 15:00:00', 500.00, 5.00, 'closed', 'TD Ameritrade', 'Momentum'),
('YOUR-USER-ID', 'TSLA', 200.00, 195.00, 50, 'long', '2024-01-16 10:00:00', '2024-01-16 14:30:00', -250.00, 5.00, 'closed', 'TD Ameritrade', 'Breakout'),
('YOUR-USER-ID', 'MSFT', 380.00, NULL, 25, 'long', '2024-01-17 11:00:00', NULL, 0, 2.50, 'open', 'TD Ameritrade', 'Swing Trade');
*/

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================
-- Your database schema is now ready!
--
-- Next steps:
-- 1. Update your .env.local file with Supabase credentials
-- 2. Test the authentication flow
-- 3. Start building your application
-- =====================================================
