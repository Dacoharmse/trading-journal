-- Playbook comments: mentors and admins can annotate student playbooks
CREATE TABLE IF NOT EXISTS public.playbook_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL,               -- mentor or admin user id
  author_name TEXT,                        -- cached display name
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_comments_playbook ON public.playbook_comments(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_comments_author  ON public.playbook_comments(author_id);

ALTER TABLE public.playbook_comments ENABLE ROW LEVEL SECURITY;

-- Service role (admin client) bypasses RLS — all API access uses admin client
CREATE POLICY "service role full access" ON public.playbook_comments
  FOR ALL USING (true);
