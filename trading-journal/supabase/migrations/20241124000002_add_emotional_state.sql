-- Add emotional_state column to trades table
-- This tracks the trader's emotional state when entering/during a trade

-- Create enum type for emotional states
DO $$ BEGIN
    CREATE TYPE emotional_state_type AS ENUM (
        'confident',
        'calm',
        'neutral',
        'anxious',
        'fearful',
        'greedy',
        'frustrated',
        'revenge',
        'fomo',
        'euphoric'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add emotional_state column to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS emotional_state TEXT CHECK (
    emotional_state IS NULL OR
    emotional_state IN ('confident', 'calm', 'neutral', 'anxious', 'fearful', 'greedy', 'frustrated', 'revenge', 'fomo', 'euphoric')
);

-- Create index for faster queries on emotional state
CREATE INDEX IF NOT EXISTS idx_trades_emotional_state ON trades(emotional_state) WHERE emotional_state IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN trades.emotional_state IS 'Emotional state of the trader when taking this trade. Used for performance analysis by emotional state.';
