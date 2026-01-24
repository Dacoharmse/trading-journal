-- Add Micro Futures Symbols
-- Description: Adds MNQ, MES, and MGC futures contracts to the symbols table

-- Insert futures symbols
INSERT INTO symbols (code, asset_class, pip_size, point_value, display_name) VALUES
  ('MNQ', 'Index', 0.25, 0.50, 'Micro E-mini Nasdaq-100'),
  ('MES', 'Index', 0.25, 1.25, 'Micro E-mini S&P 500'),
  ('MGC', 'Metal', 0.10, 1.00, 'Micro Gold')
ON CONFLICT (code) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE symbols IS 'Global catalog of tradeable symbols/instruments with their specifications';
