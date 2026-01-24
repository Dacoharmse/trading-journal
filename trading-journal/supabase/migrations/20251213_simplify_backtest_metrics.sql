-- Migration: Simplify backtest metrics
-- Description: Remove planned/actual metrics split and add simplified trade metrics + time_of_day field
-- Date: 2025-12-13

-- Step 1: Add new simplified columns
ALTER TABLE backtests
  ADD COLUMN IF NOT EXISTS time_of_day TIME,
  ADD COLUMN IF NOT EXISTS sl_pips NUMERIC,
  ADD COLUMN IF NOT EXISTS tp_pips NUMERIC,
  ADD COLUMN IF NOT EXISTS rr NUMERIC;

-- Step 2: Migrate existing data from planned metrics to simplified metrics
-- Prioritize planned metrics over actual metrics where available
UPDATE backtests
SET
  sl_pips = COALESCE(planned_sl_pips, actual_sl_pips, stop_pips),
  tp_pips = COALESCE(planned_tp_pips, actual_tp_pips, target_pips),
  rr = COALESCE(planned_rr, actual_rr)
WHERE sl_pips IS NULL OR tp_pips IS NULL OR rr IS NULL;

-- Step 3: Drop old columns (planned, actual, and legacy)
ALTER TABLE backtests
  DROP COLUMN IF EXISTS planned_sl_pips,
  DROP COLUMN IF EXISTS planned_tp_pips,
  DROP COLUMN IF EXISTS planned_rr,
  DROP COLUMN IF EXISTS actual_sl_pips,
  DROP COLUMN IF EXISTS actual_tp_pips,
  DROP COLUMN IF EXISTS actual_rr,
  DROP COLUMN IF EXISTS stop_pips,
  DROP COLUMN IF EXISTS target_pips;

-- Step 4: Add helpful comments
COMMENT ON COLUMN backtests.time_of_day IS 'Time of day when the trade was entered (HH:MM format)';
COMMENT ON COLUMN backtests.sl_pips IS 'Stop loss in pips';
COMMENT ON COLUMN backtests.tp_pips IS 'Take profit in pips';
COMMENT ON COLUMN backtests.rr IS 'Risk:reward ratio';
COMMENT ON COLUMN backtests.hold_time IS 'Hold time in minutes';

-- Step 5: Verify data integrity
DO $$
DECLARE
  total_records INTEGER;
  records_with_metrics INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM backtests;
  SELECT COUNT(*) INTO records_with_metrics FROM backtests WHERE sl_pips IS NOT NULL OR tp_pips IS NOT NULL OR rr IS NOT NULL;

  RAISE NOTICE 'Migration complete. Total backtests: %, Records with metrics: %', total_records, records_with_metrics;
END $$;
