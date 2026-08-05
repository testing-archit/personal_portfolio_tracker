create extension if not exists pgcrypto;

create table if not exists public.funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheme_code bigint not null check (scheme_code > 0),
  name text not null check (length(name) between 2 and 180),
  short_name text not null check (length(short_name) between 2 and 80),
  category text not null check (length(category) between 2 and 40),
  invested_amount numeric(14,2) not null check (invested_amount > 0),
  purchase_date date not null,
  units numeric(18,6) check (units is null or units > 0),
  purchase_nav numeric(14,4) check (purchase_nav is null or purchase_nav > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scheme_code, purchase_date)
);

create index if not exists funds_user_id_idx on public.funds using btree (user_id);
alter table public.funds enable row level security;

revoke all on table public.funds from anon;
grant select, insert, update, delete on table public.funds to authenticated;

create policy "Users can read their own funds"
on public.funds for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own funds"
on public.funds for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own funds"
on public.funds for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own funds"
on public.funds for delete to authenticated
using ((select auth.uid()) = user_id);
