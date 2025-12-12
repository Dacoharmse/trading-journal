-- Comprehensive migration to ensure all playbook tables and columns exist

-- 1. Ensure playbooks table has all required columns
ALTER TABLE playbooks
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled',
  ADD COLUMN IF NOT EXISTS trade_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS sessions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS symbols TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rr_min NUMERIC,
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS analyst_tf TEXT,
  ADD COLUMN IF NOT EXISTS exec_tf TEXT,
  ADD COLUMN IF NOT EXISTS best_sessions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes_md TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure playbook_rules table exists and has all columns
CREATE TABLE IF NOT EXISTS playbook_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('must', 'should')),
  weight NUMERIC DEFAULT 1,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE playbook_rules
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'should',
  ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort INTEGER DEFAULT 0;

-- 3. Ensure playbook_confluences table exists and has all columns
CREATE TABLE IF NOT EXISTS playbook_confluences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight NUMERIC DEFAULT 1,
  primary_confluence BOOLEAN DEFAULT false,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playbook_confluences
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS primary_confluence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort INTEGER DEFAULT 0;

-- 4. Ensure playbook_trade_details table exists
CREATE TABLE IF NOT EXISTS playbook_trade_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entry', 'invalidation', 'consideration', 'checklist')),
  weight NUMERIC DEFAULT 1,
  primary_item BOOLEAN DEFAULT false,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playbook_trade_details
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'entry',
  ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS primary_item BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort INTEGER DEFAULT 0;

-- 5. Ensure playbook_examples table exists
CREATE TABLE IF NOT EXISTS playbook_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  media_urls TEXT[] DEFAULT '{}',
  caption TEXT,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playbook_examples
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS sort INTEGER DEFAULT 0;

-- 6. Ensure playbook_rubric table exists
CREATE TABLE IF NOT EXISTS playbook_rubric (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL UNIQUE REFERENCES playbooks(id) ON DELETE CASCADE,
  weight_rules NUMERIC DEFAULT 0.5,
  weight_confluences NUMERIC DEFAULT 0.2,
  weight_checklist NUMERIC DEFAULT 0.3,
  must_rule_penalty NUMERIC DEFAULT 0.4,
  min_checks INTEGER DEFAULT 0,
  grade_cutoffs JSONB DEFAULT '{"A+": 0.95, "A": 0.90, "B": 0.80, "C": 0.70, "D": 0.60}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE playbook_rubric
  ADD COLUMN IF NOT EXISTS weight_rules NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS weight_confluences NUMERIC DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS weight_checklist NUMERIC DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS must_rule_penalty NUMERIC DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS min_checks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grade_cutoffs JSONB DEFAULT '{"A+": 0.95, "A": 0.90, "B": 0.80, "C": 0.70, "D": 0.60}';

-- 7. Enable RLS on all tables
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_confluences ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_trade_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_rubric ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for playbooks
DROP POLICY IF EXISTS "Users can view their own playbooks" ON playbooks;
CREATE POLICY "Users can view their own playbooks" ON playbooks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own playbooks" ON playbooks;
CREATE POLICY "Users can insert their own playbooks" ON playbooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own playbooks" ON playbooks;
CREATE POLICY "Users can update their own playbooks" ON playbooks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own playbooks" ON playbooks;
CREATE POLICY "Users can delete their own playbooks" ON playbooks
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS policies for playbook_rules
DROP POLICY IF EXISTS "Users can manage rules for their playbooks" ON playbook_rules;
CREATE POLICY "Users can manage rules for their playbooks" ON playbook_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_rules.playbook_id
      AND playbooks.user_id = auth.uid()
    )
  );

-- 10. Create RLS policies for playbook_confluences
DROP POLICY IF EXISTS "Users can manage confluences for their playbooks" ON playbook_confluences;
CREATE POLICY "Users can manage confluences for their playbooks" ON playbook_confluences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_confluences.playbook_id
      AND playbooks.user_id = auth.uid()
    )
  );

-- 11. Create RLS policies for playbook_trade_details
DROP POLICY IF EXISTS "Users can manage trade details for their playbooks" ON playbook_trade_details;
CREATE POLICY "Users can manage trade details for their playbooks" ON playbook_trade_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_trade_details.playbook_id
      AND playbooks.user_id = auth.uid()
    )
  );

-- 12. Create RLS policies for playbook_examples
DROP POLICY IF EXISTS "Users can manage examples for their playbooks" ON playbook_examples;
CREATE POLICY "Users can manage examples for their playbooks" ON playbook_examples
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_examples.playbook_id
      AND playbooks.user_id = auth.uid()
    )
  );

-- 13. Create RLS policies for playbook_rubric
DROP POLICY IF EXISTS "Users can manage rubric for their playbooks" ON playbook_rubric;
CREATE POLICY "Users can manage rubric for their playbooks" ON playbook_rubric
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playbooks
      WHERE playbooks.id = playbook_rubric.playbook_id
      AND playbooks.user_id = auth.uid()
    )
  );

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playbook_rules_playbook_id ON playbook_rules(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_confluences_playbook_id ON playbook_confluences(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_trade_details_playbook_id ON playbook_trade_details(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_examples_playbook_id ON playbook_examples(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_rubric_playbook_id ON playbook_rubric(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_user_id ON playbooks(user_id);
