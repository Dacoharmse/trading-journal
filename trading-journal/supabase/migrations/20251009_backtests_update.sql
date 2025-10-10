-- Add new columns to backtests table if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='backtests' and column_name='outcome') then
    alter table backtests add column outcome text check (outcome in ('win', 'loss', 'breakeven', 'closed'));
  end if;

  if not exists (select 1 from information_schema.columns where table_name='backtests' and column_name='chart_image') then
    alter table backtests add column chart_image text;
  end if;
end $$;
