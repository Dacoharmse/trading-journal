-- Weekly Reviews table for tracking trader's weekly performance analysis
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Week period
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),

    -- Week statistics snapshot
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(15, 2) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    best_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    worst_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,

    -- Winning trades analysis (JSONB array)
    winning_trades_analysis JSONB DEFAULT '[]'::jsonb,

    -- Losing trades analysis (JSONB array)
    losing_trades_analysis JSONB DEFAULT '[]'::jsonb,

    -- Missed opportunities
    missed_trade_description TEXT,
    missed_trade_reason TEXT,
    missed_trade_prevention TEXT,

    -- Overall performance questions
    week_vs_last_week TEXT,
    process_execution_rating INTEGER CHECK (process_execution_rating >= 1 AND process_execution_rating <= 10),
    process_execution_notes TEXT,
    previous_week_mindset_impact TEXT,
    improvement_actions TEXT,

    -- Repeating strengths (Identify/Purpose/Action)
    strength_identified TEXT,
    strength_cause TEXT,
    strength_importance TEXT,
    strength_action_steps TEXT,

    -- Repeating mistakes (Identify/Purpose/Action)
    mistake_identified TEXT,
    mistake_cause TEXT,
    mistake_importance TEXT,
    mistake_action_steps TEXT,

    -- Goals and insights
    goals_for_next_week TEXT,
    key_takeaways TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Ensure one review per week per user
    UNIQUE(user_id, week_start)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_id ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week_start ON weekly_reviews(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_status ON weekly_reviews(status);

-- Enable RLS
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly reviews"
    ON weekly_reviews FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly reviews"
    ON weekly_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly reviews"
    ON weekly_reviews FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly reviews"
    ON weekly_reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_weekly_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_weekly_reviews_updated_at
    BEFORE UPDATE ON weekly_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_reviews_updated_at();
