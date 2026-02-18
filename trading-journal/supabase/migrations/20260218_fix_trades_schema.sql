-- ============================================================================
-- FIX TRADES TABLE SCHEMA
-- ============================================================================
-- Makes old required columns nullable (for the new pips-based workflow)
-- Adds all new columns that the app expects but may not exist in the live DB
-- Fixes session_hour constraint to include 'Out of Session'
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MAKE OLD REQUIRED COLUMNS NULLABLE
--    (new workflow doesn't use price/quantity directly)
-- ----------------------------------------------------------------------------

ALTER TABLE trades ALTER COLUMN entry_price DROP NOT NULL;
ALTER TABLE trades ALTER COLUMN quantity DROP NOT NULL;

-- Make symbol nullable (app now uses symbol_id + resolves text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'symbol'
  ) THEN
    ALTER TABLE trades ALTER COLUMN symbol DROP NOT NULL;
  END IF;
END $$;

-- Make trade_type nullable (replaced by direction column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'trade_type'
  ) THEN
    -- Drop old check constraint first
    ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_trade_type_check;
    ALTER TABLE trades ALTER COLUMN trade_type DROP NOT NULL;
    -- Re-add constraint as nullable-friendly
    ALTER TABLE trades ADD CONSTRAINT trades_trade_type_check
      CHECK (trade_type IS NULL OR trade_type IN ('long', 'short'));
  END IF;
END $$;

-- Drop old exit constraint that prevents open trades from having exit data
ALTER TABLE trades DROP CONSTRAINT IF EXISTS valid_exit_for_closed_trades;

-- ----------------------------------------------------------------------------
-- 2. ADD MISSING COLUMNS (all use IF NOT EXISTS for idempotency)
-- ----------------------------------------------------------------------------

-- Account reference (may be missing if DB was created before this was added)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS account_id UUID;

-- Direction (replaces trade_type in new workflow)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_direction_check;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trades_direction_check'
  ) THEN
    ALTER TABLE trades ADD CONSTRAINT trades_direction_check
      CHECK (direction IS NULL OR direction IN ('long', 'short'));
  END IF;
END $$;

-- Symbol reference (FK to symbols table)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS symbol_id UUID;

-- Currency for the account
ALTER TABLE trades ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- ----------------------------------------------------------------------------
-- PIPS / R-BASED WORKFLOW COLUMNS
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS pips NUMERIC(10, 2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS stop_pips NUMERIC(10, 2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS target_pips NUMERIC(10, 2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS rr_planned NUMERIC(10, 2);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS risk_r NUMERIC(10, 2) DEFAULT 1.0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS r_multiple NUMERIC(10, 2);

-- ----------------------------------------------------------------------------
-- TIME TRACKING
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS open_time TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_time TEXT;

-- ----------------------------------------------------------------------------
-- SESSION
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_session_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_session_check') THEN
    ALTER TABLE trades ADD CONSTRAINT trades_session_check
      CHECK (session IS NULL OR session IN ('Asia', 'London', 'NY'));
  END IF;
END $$;

-- Session hour (add column if missing, then fix constraint)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS session_hour TEXT;

-- Drop old constraint (only allowed A1-A4, L1-L3, NY1-NY3)
ALTER TABLE trades DROP CONSTRAINT IF EXISTS valid_session_hour;

-- Add new constraint including 'Out of Session'
ALTER TABLE trades ADD CONSTRAINT valid_session_hour
  CHECK (
    session_hour IS NULL OR
    session_hour IN (
      'A1', 'A2', 'A3', 'A4',
      'L1', 'L2', 'L3',
      'NY1', 'NY2', 'NY3',
      'Out of Session'
    )
  );

-- ----------------------------------------------------------------------------
-- ORDER TYPE
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS order_type TEXT;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS valid_order_type;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_order_type') THEN
    ALTER TABLE trades ADD CONSTRAINT valid_order_type
      CHECK (order_type IS NULL OR order_type IN ('Market', 'Limit', 'Stop', 'Stop Limit'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- MEDIA
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS htf_media_urls TEXT[] DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- PLAYBOOK COMPLIANCE
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS playbook_id UUID;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS rules_checked JSONB;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS confluences_checked JSONB;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS setup_score NUMERIC(5, 4);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS setup_grade TEXT;

-- ----------------------------------------------------------------------------
-- TRADING PSYCHOLOGY / REVIEW
-- ----------------------------------------------------------------------------
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_reason TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS emotional_state TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS rule_breaks TEXT;

-- Legacy comma-separated confluences
ALTER TABLE trades ADD COLUMN IF NOT EXISTS confluences TEXT;

-- ----------------------------------------------------------------------------
-- 3. UPDATE RLS POLICIES FOR TRADES
--    Ensure users can insert/update their own trades
-- ----------------------------------------------------------------------------

-- Enable RLS if not already enabled
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trades" ON trades;
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. REFRESH SCHEMA CACHE
-- ----------------------------------------------------------------------------
-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
