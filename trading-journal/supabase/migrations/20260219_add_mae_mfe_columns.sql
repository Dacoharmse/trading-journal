-- Add MAE/MFE columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mae_r NUMERIC(10, 4);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS mfe_r NUMERIC(10, 4);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
