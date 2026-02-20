-- Migration: Add MAE and MFE columns to trades table
-- Run this in the Supabase SQL editor

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS mae_pips NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS mfe_pips NUMERIC(10, 2);

-- mae_pips: Maximum Adverse Excursion in pips (how far price moved against the trade)
-- mfe_pips: Maximum Favorable Excursion in pips (furthest price moved in favor of the trade)
-- Both are positive numbers entered manually by the trader after the trade closes.
