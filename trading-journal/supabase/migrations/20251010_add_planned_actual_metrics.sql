-- Migration: Add planned vs actual metrics to backtests table
-- Description: Adds fields to track planned metrics (before trade) and actual results (what happened)

-- Add new columns to existing backtests table
ALTER TABLE backtests
  ADD COLUMN IF NOT EXISTS planned_sl_pips numeric,
  ADD COLUMN IF NOT EXISTS planned_tp_pips numeric,
  ADD COLUMN IF NOT EXISTS planned_rr numeric,
  ADD COLUMN IF NOT EXISTS actual_sl_pips numeric,
  ADD COLUMN IF NOT EXISTS actual_tp_pips numeric,
  ADD COLUMN IF NOT EXISTS actual_rr numeric;

-- Add helpful comments
COMMENT ON COLUMN backtests.planned_sl_pips IS 'Planned stop loss in pips (before trade execution)';
COMMENT ON COLUMN backtests.planned_tp_pips IS 'Planned take profit in pips (before trade execution)';
COMMENT ON COLUMN backtests.planned_rr IS 'Planned risk:reward ratio (before trade execution)';
COMMENT ON COLUMN backtests.actual_sl_pips IS 'Actual stop loss in pips (what happened)';
COMMENT ON COLUMN backtests.actual_tp_pips IS 'Actual take profit in pips (what happened)';
COMMENT ON COLUMN backtests.actual_rr IS 'Actual risk:reward ratio achieved';
