-- Add hold_time column to backtests table
-- hold_time is stored in minutes (e.g., 120 = 2 hours, 1440 = 1 day)
ALTER TABLE backtests
ADD COLUMN IF NOT EXISTS hold_time INTEGER;

COMMENT ON COLUMN backtests.hold_time IS 'Trade hold time in minutes';
