-- Migration to add TradingView indicators table for playbooks

-- 1. Create playbook_indicators table
CREATE TABLE IF NOT EXISTS playbook_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on playbook_indicators
ALTER TABLE playbook_indicators ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for playbook_indicators
DROP POLICY IF EXISTS "Users can manage indicators for their playbooks" ON playbook_indicators;
CREATE POLICY "Users can manage indicators for their playbooks"
ON playbook_indicators FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM playbooks
    WHERE playbooks.id = playbook_indicators.playbook_id
    AND playbooks.user_id = auth.uid()
  )
);

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_playbook_indicators_playbook_id ON playbook_indicators(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_indicators_sort ON playbook_indicators(playbook_id, sort);

-- 5. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_playbook_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS playbook_indicators_updated_at ON playbook_indicators;
CREATE TRIGGER playbook_indicators_updated_at
  BEFORE UPDATE ON playbook_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_playbook_indicators_updated_at();
