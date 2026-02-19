-- Add size column (lot size) to trades table
-- Note: app falls back to 'quantity' column when size is NULL for backwards compatibility
ALTER TABLE trades ADD COLUMN IF NOT EXISTS size NUMERIC(12, 4);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
