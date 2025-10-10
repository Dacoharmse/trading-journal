-- Migration: Add Strategies, Confluences, Symbols, and enhanced Trade fields
-- Description: Implements pips/R-first workflow with metadata management

-- 1) Strategies (playbook)
create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('Breakout','Reversion','Trend','News','ICT','Other')) default 'Other',
  rules text,          -- long-form rules/checklist (markdown)
  sessions text[],     -- e.g. {'Asia','London','NY'}
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for strategies
alter table strategies enable row level security;

create policy "Users can view their own strategies"
  on strategies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own strategies"
  on strategies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own strategies"
  on strategies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own strategies"
  on strategies for delete
  using (auth.uid() = user_id);

-- 2) Confluences catalog
create table if not exists confluences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,     -- e.g. 'PDH/PDL', 'VWAP', '50EMA', 'Higher TF EQ'
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- RLS for confluences
alter table confluences enable row level security;

create policy "Users can view their own confluences"
  on confluences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own confluences"
  on confluences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own confluences"
  on confluences for update
  using (auth.uid() = user_id);

create policy "Users can delete their own confluences"
  on confluences for delete
  using (auth.uid() = user_id);

-- 3) Symbols (global metadata)
create table if not exists symbols (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,        -- e.g. 'XAUUSD','NAS100'
  asset_class text default 'FX',    -- 'FX','Index','Metal','Crypto'
  pip_size numeric default 0.0001,  -- 0.01, 0.1, 0.001, etc.
  point_value numeric default 1.0,  -- value per point per 1 lot/contract
  display_name text not null,
  created_at timestamptz default now()
);

-- Populate some common symbols
insert into symbols (code, asset_class, pip_size, point_value, display_name) values
  ('EURUSD', 'FX', 0.0001, 10, 'EUR/USD'),
  ('GBPUSD', 'FX', 0.0001, 10, 'GBP/USD'),
  ('USDJPY', 'FX', 0.01, 10, 'USD/JPY'),
  ('XAUUSD', 'Metal', 0.01, 1, 'Gold'),
  ('NAS100', 'Index', 1, 1, 'Nasdaq 100'),
  ('US30', 'Index', 1, 1, 'Dow Jones'),
  ('GER40', 'Index', 1, 1, 'DAX'),
  ('BTCUSD', 'Crypto', 1, 1, 'Bitcoin')
on conflict (code) do nothing;

-- 4) Account ↔ Symbols (which symbols this account trades)
create table if not exists account_symbols (
  account_id uuid references accounts(id) on delete cascade,
  symbol_id uuid references symbols(id) on delete cascade,
  primary key (account_id, symbol_id),
  created_at timestamptz default now()
);

-- RLS for account_symbols
alter table account_symbols enable row level security;

create policy "Users can view their account symbols"
  on account_symbols for select
  using (
    exists (
      select 1 from accounts
      where accounts.id = account_symbols.account_id
      and accounts.user_id = auth.uid()
    )
  );

create policy "Users can manage their account symbols"
  on account_symbols for all
  using (
    exists (
      select 1 from accounts
      where accounts.id = account_symbols.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- 5) Trades (add pips/R fields & media; keep old columns for back-compat)
alter table trades
  add column if not exists pips numeric,                 -- realized pips/points (+/-)
  add column if not exists rr_planned numeric,           -- planned R:R (e.g. 1:2 → 2)
  add column if not exists r_multiple numeric,           -- realized R (+/-)
  add column if not exists risk_r numeric default 1.0,   -- risk per trade in R (usually 1)
  add column if not exists stop_pips numeric,            -- planned stop in pips/points
  add column if not exists target_pips numeric,          -- planned TP distance
  add column if not exists media_urls text[] default '{}', -- uploaded/pasted chart(s)
  add column if not exists strategy_id uuid references strategies(id) on delete set null,
  add column if not exists session text check (session in ('Asia','London','NY'));

-- Add symbol_id if not already present (keep symbol text for back-compat)
alter table trades
  add column if not exists symbol_id uuid references symbols(id) on delete set null;

-- Add open_time and close_time if not already present
alter table trades
  add column if not exists open_time time,
  add column if not exists close_time time;

-- 6) Trade ↔ Confluences join
create table if not exists trade_confluences (
  trade_id uuid references trades(id) on delete cascade,
  confluence_id uuid references confluences(id) on delete restrict,
  primary key (trade_id, confluence_id)
);

-- RLS for trade_confluences
alter table trade_confluences enable row level security;

create policy "Users can view their trade confluences"
  on trade_confluences for select
  using (
    exists (
      select 1 from trades
      where trades.id = trade_confluences.trade_id
      and trades.user_id = auth.uid()
    )
  );

create policy "Users can manage their trade confluences"
  on trade_confluences for all
  using (
    exists (
      select 1 from trades
      where trades.id = trade_confluences.trade_id
      and trades.user_id = auth.uid()
    )
  );

-- Create storage bucket for trade media
insert into storage.buckets (id, name, public)
values ('trade-media', 'trade-media', false)
on conflict (id) do nothing;

-- RLS for storage
create policy "Users can upload their trade media"
  on storage.objects for insert
  with check (
    bucket_id = 'trade-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their trade media"
  on storage.objects for select
  using (
    bucket_id = 'trade-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their trade media"
  on storage.objects for delete
  using (
    bucket_id = 'trade-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Indexes for performance
create index if not exists idx_strategies_user_id on strategies(user_id);
create index if not exists idx_strategies_active on strategies(active) where active = true;
create index if not exists idx_confluences_user_id on confluences(user_id);
create index if not exists idx_confluences_active on confluences(active) where active = true;
create index if not exists idx_trades_strategy_id on trades(strategy_id);
create index if not exists idx_trades_symbol_id on trades(symbol_id);
create index if not exists idx_account_symbols_account_id on account_symbols(account_id);
create index if not exists idx_trade_confluences_trade_id on trade_confluences(trade_id);
