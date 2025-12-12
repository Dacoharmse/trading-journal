-- Add additional index symbols
INSERT INTO symbols (code, asset_class, pip_size, point_value, display_name) VALUES
  ('SPX500', 'Index', 0.25, 50, 'S&P 500 (ES)'),
  ('NQ', 'Index', 0.25, 20, 'Nasdaq 100 Futures (NQ)'),
  ('DJI', 'Index', 1, 5, 'Dow Jones Futures (YM)'),
  ('ES', 'Index', 0.25, 50, 'E-mini S&P 500 (ES)')
ON CONFLICT (code) DO NOTHING;
