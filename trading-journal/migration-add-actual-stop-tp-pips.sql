-- Migration: Add actual_stop_pips and actual_target_pips columns to trades table
-- Run this in the Supabase SQL editor

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS actual_stop_pips numeric,
  ADD COLUMN IF NOT EXISTS actual_target_pips numeric;

COMMENT ON COLUMN trades.actual_stop_pips IS 'Actual stop loss distance in pips (as executed)';
COMMENT ON COLUMN trades.actual_target_pips IS 'Actual take profit distance in pips (as executed)';
