-- =====================================================
-- Trading Journal - Add New Fields Migration
-- =====================================================
-- This migration adds the following new fields to the trades table:
-- 1. pnl_amount - Profit/Loss amount in account currency
-- 2. pnl_currency - Currency for the P/L amount (USD, ZAR, etc.)
-- 3. actual_rr - Actual risk/reward ratio achieved
-- 4. outcome - Trade outcome classification (win/loss/breakeven)
-- 5. entry_timeframe - Timeframe used for entry
-- 6. analysis_timeframe - Higher timeframe used for analysis
-- =====================================================

-- Add new columns to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS pnl_amount NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS pnl_currency TEXT,
ADD COLUMN IF NOT EXISTS actual_rr NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),
ADD COLUMN IF NOT EXISTS entry_timeframe TEXT,
ADD COLUMN IF NOT EXISTS analysis_timeframe TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON public.trades(outcome);
CREATE INDEX IF NOT EXISTS idx_trades_entry_timeframe ON public.trades(entry_timeframe);
CREATE INDEX IF NOT EXISTS idx_trades_pnl_currency ON public.trades(pnl_currency);

-- Add comments to document the columns
COMMENT ON COLUMN public.trades.pnl_amount IS 'Profit/Loss amount in account currency';
COMMENT ON COLUMN public.trades.pnl_currency IS 'Currency for the P/L amount (USD, ZAR, EUR, etc.)';
COMMENT ON COLUMN public.trades.actual_rr IS 'Actual risk/reward ratio achieved on the trade';
COMMENT ON COLUMN public.trades.outcome IS 'Trade outcome classification: win, loss, or breakeven';
COMMENT ON COLUMN public.trades.entry_timeframe IS 'Timeframe used for trade entry (e.g., 1h, 15m, 1d)';
COMMENT ON COLUMN public.trades.analysis_timeframe IS 'Higher timeframe used for analysis and confirmation';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Your trades table now has all the new fields.
-- You can now use these fields in your trading journal application.
-- =====================================================
