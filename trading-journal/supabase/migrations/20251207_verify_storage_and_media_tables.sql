-- Comprehensive migration to ensure storage buckets and media tables exist

-- 1. Create storage bucket for trade media if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('trade-media', 'trade-media')
ON CONFLICT (id) DO NOTHING;

-- Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'trade-media';

-- 2. Set up storage policies for trade-media bucket
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own media" ON storage.objects;
CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trade-media' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR public = true)
);

DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'trade-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Ensure playbook_examples table exists (from previous migration, but verify)
CREATE TABLE IF NOT EXISTS playbook_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  media_urls TEXT[] DEFAULT '{}',
  caption TEXT,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure RLS is enabled on playbook_examples
ALTER TABLE playbook_examples ENABLE ROW LEVEL SECURITY;

-- 5. Create/update RLS policy for playbook_examples
DROP POLICY IF EXISTS "Users can manage examples for their playbooks" ON playbook_examples;
CREATE POLICY "Users can manage examples for their playbooks"
ON playbook_examples FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM playbooks
    WHERE playbooks.id = playbook_examples.playbook_id
    AND playbooks.user_id = auth.uid()
  )
);

-- 6. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_playbook_examples_playbook_id ON playbook_examples(playbook_id);

-- 7. Ensure trade_media table exists for tracking uploads (optional, for cleanup)
CREATE TABLE IF NOT EXISTS trade_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  related_id UUID, -- Can be trade_id, playbook_id, etc.
  related_type TEXT, -- 'trade', 'playbook', 'backtest', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable RLS on trade_media
ALTER TABLE trade_media ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for trade_media
DROP POLICY IF EXISTS "Users can view their own media records" ON trade_media;
CREATE POLICY "Users can view their own media records"
ON trade_media FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own media records" ON trade_media;
CREATE POLICY "Users can insert their own media records"
ON trade_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media records" ON trade_media;
CREATE POLICY "Users can delete their own media records"
ON trade_media FOR DELETE
USING (auth.uid() = user_id);

-- 10. Create indexes for trade_media
CREATE INDEX IF NOT EXISTS idx_trade_media_user_id ON trade_media(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_media_related_id ON trade_media(related_id);

-- 11. Verify backtests table has hold_time column (from earlier migration)
ALTER TABLE backtests
  ADD COLUMN IF NOT EXISTS hold_time INTEGER;

COMMENT ON COLUMN backtests.hold_time IS 'Trade hold time in minutes';
