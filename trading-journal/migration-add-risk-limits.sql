-- =====================================================
-- Trading Journal - Add Risk Limits Migration
-- =====================================================
-- This migration adds risk management fields to accounts
-- and creates a risk_violations table for audit trail
-- =====================================================

-- Add risk limit fields to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS risk_limit_type TEXT CHECK (risk_limit_type IN ('percentage', 'monetary')) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS risk_limit_value NUMERIC(10, 2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS session_risk_enabled BOOLEAN DEFAULT false;

-- Create risk_violations table
CREATE TABLE IF NOT EXISTS public.risk_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,

    -- Violation Details
    violation_type TEXT NOT NULL CHECK (violation_type IN ('session_limit', 'daily_limit', 'position_size')),
    risk_limit NUMERIC(10, 2) NOT NULL,
    actual_risk NUMERIC(10, 2) NOT NULL,
    limit_type TEXT NOT NULL CHECK (limit_type IN ('percentage', 'monetary')),

    -- Reason and Resolution
    reason TEXT NOT NULL,
    override_approved BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_risk_values CHECK (risk_limit > 0 AND actual_risk > 0)
);

-- Create indexes for risk_violations
CREATE INDEX IF NOT EXISTS idx_risk_violations_user_id ON public.risk_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_violations_account_id ON public.risk_violations(account_id);
CREATE INDEX IF NOT EXISTS idx_risk_violations_trade_id ON public.risk_violations(trade_id);
CREATE INDEX IF NOT EXISTS idx_risk_violations_created_at ON public.risk_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_violations_violation_type ON public.risk_violations(violation_type);

-- Enable RLS on risk_violations
ALTER TABLE public.risk_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for risk_violations
CREATE POLICY "Users can view own risk violations"
    ON public.risk_violations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk violations"
    ON public.risk_violations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk violations"
    ON public.risk_violations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk violations"
    ON public.risk_violations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Add comments to document the columns
COMMENT ON COLUMN public.accounts.risk_limit_type IS 'Type of risk limit: percentage of account balance or fixed monetary amount';
COMMENT ON COLUMN public.accounts.risk_limit_value IS 'Risk limit value (percentage or monetary amount)';
COMMENT ON COLUMN public.accounts.session_risk_enabled IS 'Whether to enforce session-based risk limits';

COMMENT ON TABLE public.risk_violations IS 'Audit trail of risk limit violations and reasons for overrides';
COMMENT ON COLUMN public.risk_violations.violation_type IS 'Type of risk violation: session_limit, daily_limit, or position_size';
COMMENT ON COLUMN public.risk_violations.risk_limit IS 'The configured risk limit that was exceeded';
COMMENT ON COLUMN public.risk_violations.actual_risk IS 'The actual risk amount that exceeded the limit';
COMMENT ON COLUMN public.risk_violations.reason IS 'User-provided reason for exceeding the risk limit';
COMMENT ON COLUMN public.risk_violations.override_approved IS 'Whether the override was approved (always true for user-provided reasons)';

-- Grant permissions
GRANT ALL ON public.risk_violations TO authenticated;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Your accounts table now has risk limit fields.
-- Risk violations will be tracked in the risk_violations table.
-- =====================================================
