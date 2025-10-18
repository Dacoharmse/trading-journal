-- Migration: Playbook Extensions - Trade Details, Invalidations, Checklist, Examples
-- Description: Extends playbooks with analyst/exec timeframes, sessions, hours, and structured trade details

-- 1) Add new columns to playbooks
alter table playbooks
  add column if not exists analyst_tf text,
  add column if not exists exec_tf text,
  add column if not exists best_sessions text[] default '{}',
  add column if not exists trading_hours jsonb,
  add column if not exists notes_md text;

-- 2) Create playbook_trade_details table
create table if not exists playbook_trade_details (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  label text not null,
  type text not null check (type in ('detail','invalidation','consideration','checklist')),
  weight numeric default 1.0,
  primary_item boolean default false,
  sort integer default 0,
  created_at timestamptz default now()
);

-- RLS for playbook_trade_details
alter table playbook_trade_details enable row level security;

drop policy if exists "Users can view playbook trade details" on playbook_trade_details;
create policy "Users can view playbook trade details"
  on playbook_trade_details for select
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_trade_details.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage playbook trade details" on playbook_trade_details;
create policy "Users can manage playbook trade details"
  on playbook_trade_details for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_trade_details.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

-- 3) Create playbook_examples table
create table if not exists playbook_examples (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references playbooks(id) on delete cascade,
  media_urls text[] not null default '{}',
  caption text,
  sort integer default 0,
  created_at timestamptz default now()
);

-- RLS for playbook_examples
alter table playbook_examples enable row level security;

drop policy if exists "Users can view playbook examples" on playbook_examples;
create policy "Users can view playbook examples"
  on playbook_examples for select
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_examples.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage playbook examples" on playbook_examples;
create policy "Users can manage playbook examples"
  on playbook_examples for all
  using (
    exists (
      select 1 from playbooks
      where playbooks.id = playbook_examples.playbook_id
      and playbooks.user_id = auth.uid()
    )
  );

-- 4) Add new columns to trades for checklist and invalidations
alter table trades
  add column if not exists checklist_checked jsonb default '{}'::jsonb,
  add column if not exists invalidations jsonb default '[]'::jsonb;

-- 5) Update playbook_rubric to include checklist weight
alter table playbook_rubric
  add column if not exists weight_checklist numeric default 0.0;

-- Update existing rubrics to rebalance weights if needed
-- Default: rules 0.5, confluences 0.2, checklist 0.3
update playbook_rubric
set
  weight_rules = 0.5,
  weight_confluences = 0.2,
  weight_checklist = 0.3
where weight_checklist is null or weight_checklist = 0;

-- 6) Indexes for performance
create index if not exists idx_playbook_trade_details_playbook_id on playbook_trade_details(playbook_id);
create index if not exists idx_playbook_trade_details_type on playbook_trade_details(type);
create index if not exists idx_playbook_examples_playbook_id on playbook_examples(playbook_id);

-- 7) Update seed example playbook with extended structure
do $$
declare
  v_user_id uuid;
  v_playbook_id uuid;
begin
  -- Get first user
  select id into v_user_id from auth.users limit 1;

  if v_user_id is not null then
    -- Get existing Asia Breakout playbook
    select id into v_playbook_id from playbooks
    where user_id = v_user_id and name = 'Asia Breakout'
    limit 1;

    if v_playbook_id is not null then
      -- Update with extended fields
      update playbooks
      set
        analyst_tf = '15m',
        exec_tf = '5m',
        best_sessions = array['Asia', 'London'],
        trading_hours = '{"tz":"UTC","windows":[["00:00","08:00"]]}'::jsonb,
        notes_md = E'# Asia Breakout Setup\n\nICT-style breakout of Asia range during London session.\n\n## Entry Criteria\n- Asia range defined before 08:00 UTC\n- Displacement + FVG on 5m chart\n- Bias aligns with D1/HTF direction\n\n## Exit\n- Target: Opposite side of Asia range\n- Stop: Swing high/low from entry structure'
      where id = v_playbook_id;

      -- Add trade details
      insert into playbook_trade_details (playbook_id, label, type, weight, primary_item, sort)
      values
        (v_playbook_id, 'Define Asia high/low before 08:00 UTC', 'detail', 1.0, false, 0),
        (v_playbook_id, '5m market structure shift for entry', 'detail', 1.0, false, 1),
        (v_playbook_id, 'SL at swing high/low; TP opposite side of Asia range', 'detail', 1.0, false, 2),
        (v_playbook_id, '>50% deviation outside Asia range during London premarket', 'invalidation', 1.0, true, 0),
        (v_playbook_id, 'Longs above midpoint / Shorts below midpoint only', 'invalidation', 1.0, true, 1),
        (v_playbook_id, 'No trendline liquidity present', 'invalidation', 1.0, false, 2),
        (v_playbook_id, 'Consider BE after 1.5R', 'consideration', 1.0, false, 0),
        (v_playbook_id, 'Close next day if opposing trigger appears', 'consideration', 1.0, false, 1),
        (v_playbook_id, 'Sweep of Asia H/L during London', 'checklist', 1.0, true, 0),
        (v_playbook_id, '<50% deviation outside of Asia range', 'checklist', 1.0, true, 1),
        (v_playbook_id, 'Trendline liquidity present', 'checklist', 1.0, false, 2),
        (v_playbook_id, '5m market structure shift confirmed', 'checklist', 1.0, true, 3),
        (v_playbook_id, 'Longs ≤ midpoint / Shorts ≥ midpoint', 'checklist', 1.0, true, 4),
        (v_playbook_id, 'TP targets other side of Asia range', 'checklist', 1.0, false, 5)
      on conflict do nothing;
    end if;
  end if;
end $$;
