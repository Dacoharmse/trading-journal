-- Trading Journal Database Schema
-- This schema includes tables for trading accounts, trades, and user preferences

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic account info
  name TEXT NOT NULL,
  broker TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('live', 'demo', 'prop-firm', 'paper')),
  currency TEXT NOT NULL DEFAULT 'USD',
  starting_balance NUMERIC(15, 2) NOT NULL,
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  trading_pairs TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,

  -- Prop firm settings (only for prop-firm accounts)
  phase TEXT CHECK (phase IN ('phase-1', 'phase-2', 'funded')),
  profit_target NUMERIC(15, 2),
  max_drawdown NUMERIC(15, 2),
  daily_drawdown NUMERIC(15, 2),
  account_status TEXT CHECK (account_status IN ('new', 'profits', 'drawdown')),
  current_profits NUMERIC(15, 2),
  current_drawdown NUMERIC(15, 2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- UPDATE USER_PROFILES TABLE
-- =============================================
-- Add confluences column to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS confluences TEXT[] DEFAULT '{}';

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_type ON public.accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON public.accounts(is_active);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS on accounts table
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own accounts
CREATE POLICY "Users can view own accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert own accounts"
  ON public.accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update own accounts"
  ON public.accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete own accounts"
  ON public.accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS
-- =============================================
-- Function to calculate account metrics based on trades
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  account_start_balance NUMERIC;
  total_pnl NUMERIC;
BEGIN
  -- Get starting balance
  SELECT starting_balance INTO account_start_balance
  FROM public.accounts
  WHERE id = account_id;

  -- Calculate total PnL from closed trades
  SELECT COALESCE(SUM(pnl), 0) INTO total_pnl
  FROM public.trades
  WHERE account_id = calculate_account_balance.account_id
  AND status = 'closed';

  RETURN account_start_balance + total_pnl;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (for development/testing)
-- =============================================
-- Uncomment below to insert sample data
/*
-- Insert sample account (replace 'your-user-id' with actual user UUID)
INSERT INTO public.accounts (
  user_id,
  name,
  broker,
  account_type,
  currency,
  starting_balance,
  current_balance,
  phase,
  profit_target,
  max_drawdown,
  daily_drawdown,
  account_status,
  is_active
) VALUES (
  'your-user-id',
  'FTMO Challenge Account',
  'FTMO',
  'prop-firm',
  'USD',
  100000.00,
  100000.00,
  'phase-1',
  10000.00,
  10000.00,
  5000.00,
  'new',
  true
);
*/
