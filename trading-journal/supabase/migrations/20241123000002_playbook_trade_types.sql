-- =====================================================
-- Add Trade Type and Direction to Playbooks
-- =====================================================
-- This migration adds trade_type (continuation/reversal) and
-- direction (buy/sell/both) fields to enable performance tracking
-- by trade type and direction
-- =====================================================

-- Add trade_type column (continuation or reversal)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'playbooks'
        AND column_name = 'trade_type'
    ) THEN
        ALTER TABLE public.playbooks
        ADD COLUMN trade_type TEXT CHECK (trade_type IN ('continuation', 'reversal'));
    END IF;
END $$;

-- Add direction column (buy, sell, or both)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'playbooks'
        AND column_name = 'direction'
    ) THEN
        ALTER TABLE public.playbooks
        ADD COLUMN direction TEXT DEFAULT 'both' CHECK (direction IN ('buy', 'sell', 'both'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.playbooks.trade_type IS 'Type of trade: continuation (trend following) or reversal (counter-trend)';
COMMENT ON COLUMN public.playbooks.direction IS 'Trade direction: buy only, sell only, or both directions';

-- Create index for performance queries
CREATE INDEX IF NOT EXISTS idx_playbooks_trade_type ON playbooks(trade_type);
CREATE INDEX IF NOT EXISTS idx_playbooks_direction ON playbooks(direction);

-- =====================================================
-- Migration Complete!
-- =====================================================
