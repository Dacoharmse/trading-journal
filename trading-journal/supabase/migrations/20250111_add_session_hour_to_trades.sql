-- Migration: Add session_hour column to trades table
-- Description: Allows tracking specific hours within trading sessions (A1-A4, L1-L3, NY1-NY3)

-- Add session_hour column to trades table
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS session_hour TEXT;

-- Add check constraint to ensure valid session hour values
ALTER TABLE trades
  ADD CONSTRAINT valid_session_hour
  CHECK (
    session_hour IS NULL OR
    session_hour IN (
      'A1', 'A2', 'A3', 'A4',           -- Asia hours
      'L1', 'L2', 'L3',                 -- London hours
      'NY1', 'NY2', 'NY3'               -- New York hours
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN trades.session_hour IS 'Specific hour within the trading session: A1-A4 (Asia), L1-L3 (London), NY1-NY3 (New York)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_session_hour ON trades(session_hour) WHERE session_hour IS NOT NULL;
