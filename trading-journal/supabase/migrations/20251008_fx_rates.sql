-- Create FX Rates table for multi-currency support
-- Stores daily exchange rates for currency conversion

CREATE TABLE IF NOT EXISTS fx_rates (
  date DATE NOT NULL,
  from_ccy TEXT NOT NULL,
  to_ccy TEXT NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (date, from_ccy, to_ccy),

  CONSTRAINT fx_rates_from_ccy_check CHECK (from_ccy IN ('USD', 'ZAR', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD')),
  CONSTRAINT fx_rates_to_ccy_check CHECK (to_ccy IN ('USD', 'ZAR', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD')),
  CONSTRAINT fx_rates_rate_positive CHECK (rate > 0),
  CONSTRAINT fx_rates_different_currencies CHECK (from_ccy != to_ccy)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS fx_rates_date_idx ON fx_rates(date DESC);
CREATE INDEX IF NOT EXISTS fx_rates_from_to_idx ON fx_rates(from_ccy, to_ccy);

-- Add RLS policies
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read FX rates
CREATE POLICY "Users can read all FX rates" ON fx_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update FX rates (you can adjust this based on your needs)
CREATE POLICY "Only admins can manage FX rates" ON fx_rates
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Insert some seed data (current rates as of 2025-10-08)
INSERT INTO fx_rates (date, from_ccy, to_ccy, rate) VALUES
  -- USD base rates
  ('2025-10-08', 'USD', 'ZAR', 18.50),
  ('2025-10-08', 'USD', 'EUR', 0.92),
  ('2025-10-08', 'USD', 'GBP', 0.79),

  -- ZAR base rates
  ('2025-10-08', 'ZAR', 'USD', 0.054),
  ('2025-10-08', 'ZAR', 'EUR', 0.050),
  ('2025-10-08', 'ZAR', 'GBP', 0.043),

  -- EUR base rates
  ('2025-10-08', 'EUR', 'USD', 1.09),
  ('2025-10-08', 'EUR', 'ZAR', 20.15),
  ('2025-10-08', 'EUR', 'GBP', 0.86),

  -- GBP base rates
  ('2025-10-08', 'GBP', 'USD', 1.27),
  ('2025-10-08', 'GBP', 'ZAR', 23.48),
  ('2025-10-08', 'GBP', 'EUR', 1.16)
ON CONFLICT (date, from_ccy, to_ccy) DO NOTHING;

-- Create function to get FX rate for a specific date (with fallback to most recent)
CREATE OR REPLACE FUNCTION get_fx_rate(
  p_date DATE,
  p_from_ccy TEXT,
  p_to_ccy TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Same currency, return 1.0
  IF p_from_ccy = p_to_ccy THEN
    RETURN 1.0;
  END IF;

  -- Try to get exact date rate
  SELECT rate INTO v_rate
  FROM fx_rates
  WHERE date = p_date
    AND from_ccy = p_from_ccy
    AND to_ccy = p_to_ccy;

  -- If found, return it
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  -- Otherwise, get most recent rate before the date
  SELECT rate INTO v_rate
  FROM fx_rates
  WHERE date <= p_date
    AND from_ccy = p_from_ccy
    AND to_ccy = p_to_ccy
  ORDER BY date DESC
  LIMIT 1;

  -- Return rate or NULL if not found
  RETURN COALESCE(v_rate, NULL);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to convert P&L
CREATE OR REPLACE FUNCTION convert_pnl(
  p_pnl NUMERIC,
  p_from_ccy TEXT,
  p_to_ccy TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Same currency, return original
  IF p_from_ccy = p_to_ccy THEN
    RETURN p_pnl;
  END IF;

  -- Get FX rate
  v_rate := get_fx_rate(p_date, p_from_ccy, p_to_ccy);

  -- If no rate found, return NULL
  IF v_rate IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return converted amount
  RETURN p_pnl * v_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment to table
COMMENT ON TABLE fx_rates IS 'Daily exchange rates for multi-currency P&L conversion';
COMMENT ON FUNCTION get_fx_rate IS 'Get FX rate for a date (falls back to most recent if exact date not found)';
COMMENT ON FUNCTION convert_pnl IS 'Convert P&L from one currency to another using stored FX rates';
