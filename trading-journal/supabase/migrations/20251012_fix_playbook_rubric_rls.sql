-- Fix RLS policy for playbook_rubric to allow inserts
-- The original policy only had 'using' clause which doesn't work for inserts

drop policy if exists "Users can manage playbook rubric" on playbook_rubric;

create policy "Users can manage playbook rubric"
  on playbook_rubric for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rubric.playbook_id
      and playbooks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rubric.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );
