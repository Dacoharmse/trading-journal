-- Complete fix for all missing columns and tables
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to backtests table (if they don't exist)
ALTER TABLE backtests
  ADD COLUMN IF NOT EXISTS planned_sl_pips numeric,
  ADD COLUMN IF NOT EXISTS planned_tp_pips numeric,
  ADD COLUMN IF NOT EXISTS planned_rr numeric,
  ADD COLUMN IF NOT EXISTS actual_sl_pips numeric,
  ADD COLUMN IF NOT EXISTS actual_tp_pips numeric,
  ADD COLUMN IF NOT EXISTS actual_rr numeric;

-- 2. Verify the table exists and show structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'backtests'
ORDER BY ordinal_position;
