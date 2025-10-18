-- Migration: Playbooks with Auto-Grading System
-- Description: Consolidates strategies/confluences into playbooks with scoring rubric

-- 1) Playbooks (top-level)
create table if not exists playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text default 'Other',
  sessions text[] default '{}',
  symbols text[] default '{}',
  rr_min numeric,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for playbooks
alter table playbooks enable row level security;

drop policy if exists "Users can view their own playbooks" on playbooks;
create policy "Users can view their own playbooks"
  on playbooks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own playbooks" on playbooks;
create policy "Users can insert their own playbooks"
  on playbooks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own playbooks" on playbooks;
create policy "Users can update their own playbooks"
  on playbooks for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own playbooks" on playbooks;
create policy "Users can delete their own playbooks"
  on playbooks for delete
  using (auth.uid() = user_id);

-- 2) Rules within a playbook
create table if not exists playbook_rules (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  label text not null,
  type text not null check (type in ('must','should','optional')),
  weight numeric default 1.0,
  sort integer default 0,
  created_at timestamptz default now()
);

-- RLS for playbook_rules
alter table playbook_rules enable row level security;

drop policy if exists "Users can view playbook rules" on playbook_rules;
create policy "Users can view playbook rules"
  on playbook_rules for select
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rules.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage playbook rules" on playbook_rules;
create policy "Users can manage playbook rules"
  on playbook_rules for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rules.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

-- 3) Confluences within a playbook
create table if not exists playbook_confluences (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  label text not null,
  weight numeric default 1.0,
  primary_confluence boolean default false,
  sort integer default 0,
  created_at timestamptz default now()
);

-- RLS for playbook_confluences
alter table playbook_confluences enable row level security;

drop policy if exists "Users can view playbook confluences" on playbook_confluences;
create policy "Users can view playbook confluences"
  on playbook_confluences for select
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_confluences.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage playbook confluences" on playbook_confluences;
create policy "Users can manage playbook confluences"
  on playbook_confluences for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_confluences.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

-- 4) Scoring rubric (per playbook, editable)
create table if not exists playbook_rubric (
  playbook_id uuid primary key references playbooks(id) on delete cascade,
  weight_rules numeric default 0.6,
  weight_confluences numeric default 0.4,
  must_rule_penalty numeric default 0.4,
  min_checks integer default 0,
  grade_cutoffs jsonb default '{"A+":0.95,"A":0.90,"B":0.80,"C":0.70,"D":0.60}'::jsonb
);

-- RLS for playbook_rubric
alter table playbook_rubric enable row level security;

drop policy if exists "Users can view playbook rubric" on playbook_rubric;
create policy "Users can view playbook rubric"
  on playbook_rubric for select
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rubric.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage playbook rubric" on playbook_rubric;
create policy "Users can manage playbook rubric"
  on playbook_rubric for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_rubric.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

-- 5) Per-trade compliance snapshot
alter table trades
  add column if not exists playbook_id uuid references playbooks(id) on delete set null,
  add column if not exists rules_checked jsonb default '{}'::jsonb,
  add column if not exists confluences_checked jsonb default '{}'::jsonb,
  add column if not exists setup_score numeric,
  add column if not exists setup_grade text;

-- 6) Triggers for updated_at
create or replace function update_playbook_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists playbook_updated_at on playbooks;
create trigger playbook_updated_at
  before update on playbooks
  for each row
  execute function update_playbook_updated_at();

-- 7) Indexes for performance
create index if not exists idx_playbooks_user_id on playbooks(user_id);
create index if not exists idx_playbooks_active on playbooks(active) where active = true;
create index if not exists idx_playbook_rules_playbook_id on playbook_rules(playbook_id);
create index if not exists idx_playbook_confluences_playbook_id on playbook_confluences(playbook_id);
create index if not exists idx_trades_playbook_id on trades(playbook_id);
create index if not exists idx_trades_setup_grade on trades(setup_grade);

-- 8) Seed example playbook
do $$
declare
  v_user_id uuid;
  v_playbook_id uuid;
  v_rule1_id uuid;
  v_rule2_id uuid;
  v_rule3_id uuid;
  v_rule4_id uuid;
  v_conf1_id uuid;
  v_conf2_id uuid;
  v_conf3_id uuid;
  v_conf4_id uuid;
begin
  -- Get first user (for demo purposes; in production, seed per user)
  select id into v_user_id from auth.users limit 1;

  if v_user_id is not null then
    -- Create Asia Breakout playbook
    insert into playbooks (user_id, name, description, category, sessions, rr_min)
    values (
      v_user_id,
      'Asia Breakout',
      'ICT-style breakout of Asia range during London session',
      'ICT',
      array['Asia', 'London'],
      2.0
    )
    returning id into v_playbook_id;

    -- Add rules
    insert into playbook_rules (playbook_id, label, type, weight, sort)
    values
      (v_playbook_id, 'Define Asia high/low before 08:00', 'must', 1.0, 0),
      (v_playbook_id, 'Bias aligns with D1/HTF', 'should', 1.0, 1),
      (v_playbook_id, 'Enter on displacement + FVG', 'must', 1.0, 2),
      (v_playbook_id, 'No high-impact news in 30m', 'should', 1.0, 3);

    -- Add confluences
    insert into playbook_confluences (playbook_id, label, weight, primary_confluence, sort)
    values
      (v_playbook_id, 'PDH/PDL', 1.0, true, 0),
      (v_playbook_id, 'VWAP', 1.0, false, 1),
      (v_playbook_id, '50 EMA', 1.0, false, 2),
      (v_playbook_id, 'HTF EQ', 1.0, true, 3);

    -- Add default rubric
    insert into playbook_rubric (playbook_id)
    values (v_playbook_id)
    on conflict (playbook_id) do nothing;
  end if;
end $$;
