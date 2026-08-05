create table if not exists public.etfs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (length(symbol) between 1 and 24),
  exchange text not null default 'NSE' check (length(exchange) between 2 and 12),
  name text not null check (length(name) between 2 and 180),
  short_name text not null check (length(short_name) between 2 and 80),
  category text not null check (length(category) between 2 and 40),
  quantity numeric(18,6) not null check (quantity > 0),
  avg_price numeric(14,4) not null check (avg_price > 0),
  invested_amount numeric(14,2) not null check (invested_amount > 0),
  last_price numeric(14,4) check (last_price is null or last_price > 0),
  last_price_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exchange, symbol)
);

create index if not exists etfs_user_id_idx on public.etfs using btree (user_id);
alter table public.etfs enable row level security;

revoke all on table public.etfs from anon;
grant select, insert, update, delete on table public.etfs to authenticated;

create policy "Users can read their own ETFs"
on public.etfs for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own ETFs"
on public.etfs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own ETFs"
on public.etfs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own ETFs"
on public.etfs for delete to authenticated
using ((select auth.uid()) = user_id);
