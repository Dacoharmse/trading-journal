-- Add order_type column to trades table
-- Description: Adds execution method tracking (Market, Limit, Stop, Stop Limit)

-- Add order_type column if it doesn't exist
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS order_type TEXT;

-- Add check constraint to ensure valid order type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_order_type'
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT valid_order_type
      CHECK (
        order_type IS NULL OR
        order_type IN ('Market', 'Limit', 'Stop', 'Stop Limit')
      );
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN trades.order_type IS 'Execution method used to enter the trade: Market, Limit, Stop, or Stop Limit';

-- Create index for better query performance on order type filtering
CREATE INDEX IF NOT EXISTS idx_trades_order_type ON trades(order_type) WHERE order_type IS NOT NULL;
