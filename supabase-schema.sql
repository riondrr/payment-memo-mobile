-- Initial Supabase schema for authenticated cloud sync.
-- Run this in the Supabase SQL editor before wiring the native client.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_limit integer not null default 3 check (account_limit >= 3),
  unlimited_accounts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  kind text not null default 'bank' check (kind in ('bank', 'card', 'other')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.monthly_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null,
  payment_month date not null check (
    date_trunc('month', payment_month)::date = payment_month
  ),
  content text not null default '',
  amount numeric(12, 0),
  note text not null default '',
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, account_id)
    references public.accounts(user_id, id)
    on delete cascade
);

create table public.purchase_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  original_transaction_id text not null unique,
  environment text not null check (environment in ('Sandbox', 'Production')),
  purchased_at timestamptz not null,
  transaction_payload jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_states_set_updated_at
before update on public.user_states
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger monthly_payments_set_updated_at
before update on public.monthly_payments
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.enforce_account_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_count integer;
  current_count integer;
  has_unlimited_accounts boolean;
begin
  select account_limit, unlimited_accounts
    into allowed_count, has_unlimited_accounts
    from public.profiles
    where id = new.user_id
    for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if has_unlimited_accounts then
    return new;
  end if;

  select count(*)
    into current_count
    from public.accounts
    where user_id = new.user_id;

  if current_count >= allowed_count then
    raise exception 'account_limit_reached';
  end if;

  return new;
end;
$$;

create trigger accounts_enforce_limit
before insert on public.accounts
for each row execute function public.enforce_account_limit();

alter table public.profiles enable row level security;
alter table public.user_states enable row level security;
alter table public.accounts enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.purchase_events enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_states from anon, authenticated;
revoke all on public.accounts from anon, authenticated;
revoke all on public.monthly_payments from anon, authenticated;
revoke all on public.purchase_events from anon, authenticated;
revoke all on sequence public.purchase_events_id_seq from anon, authenticated;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_account_limit() from public, anon, authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can read their own app state"
on public.user_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own app state"
on public.user_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own app state"
on public.user_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own app state"
on public.user_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own accounts"
on public.accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own accounts"
on public.accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own accounts"
on public.accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own accounts"
on public.accounts
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own monthly payments"
on public.monthly_payments
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own monthly payments"
on public.monthly_payments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own monthly payments"
on public.monthly_payments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own monthly payments"
on public.monthly_payments
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.user_states to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.monthly_payments to authenticated;

-- purchase_events has no client policy or grant. A trusted StoreKit
-- verification Edge Function must record purchases and update profiles.
