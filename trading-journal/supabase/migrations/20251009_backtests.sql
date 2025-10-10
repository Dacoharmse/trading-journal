-- Backtesting Lab: Table for backtested trades
create table if not exists backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  playbook_id uuid not null references playbooks(id) on delete cascade,
  session text,
  symbol text not null,
  direction text check (direction in ('long', 'short')),
  entry_date date not null,
  -- Planned metrics (what you intended before the trade)
  planned_sl_pips numeric,
  planned_tp_pips numeric,
  planned_rr numeric,
  -- Actual metrics (what actually happened)
  actual_sl_pips numeric,
  actual_tp_pips numeric,
  actual_rr numeric,
  -- Legacy fields (kept for backward compatibility)
  stop_pips numeric,
  target_pips numeric,
  result_r numeric not null,
  setup_score numeric,
  setup_grade text,
  outcome text check (outcome in ('win', 'loss', 'breakeven', 'closed')),
  chart_image text,
  notes text,
  confluences_checked jsonb default '{}'::jsonb,
  rules_checked jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table backtests enable row level security;

create policy "Users can view own backtests"
  on backtests for select
  using (auth.uid() = user_id);

create policy "Users can insert own backtests"
  on backtests for insert
  with check (auth.uid() = user_id);

create policy "Users can update own backtests"
  on backtests for update
  using (auth.uid() = user_id);

create policy "Users can delete own backtests"
  on backtests for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_backtests_user_id on backtests(user_id);
create index idx_backtests_playbook_id on backtests(playbook_id);
create index idx_backtests_entry_date on backtests(entry_date);
create index idx_backtests_session on backtests(session);
create index idx_backtests_symbol on backtests(symbol);
