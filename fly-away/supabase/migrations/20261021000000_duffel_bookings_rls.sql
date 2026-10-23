-- Recreate the duffel_bookings table to match the verified live schema.
-- This migration is idempotent: safe to run on a fresh database and
-- repeatable against the live database without changing its state.

-- -----------------------------------------------------
-- TABLE: public.duffel_bookings
-- -----------------------------------------------------
create table if not exists public.duffel_bookings (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null,
  provider text not null default 'duffel'::text,
  offer_id text not null,
  order_id text,
  booking_reference text,
  status text not null default 'pending'::text,
  total_amount numeric(12,2),
  currency text,
  itinerary jsonb,
  passenger_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- FOREIGN KEY: user_id -> auth.users(id)
-- -----------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'duffel_bookings_user_id_fkey'
      and conrelid = 'public.duffel_bookings'::regclass
  ) then
    alter table public.duffel_bookings
      add constraint duffel_bookings_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- -----------------------------------------------------
-- CHECK: provider = 'duffel'
-- -----------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'duffel_bookings_provider_check'
      and conrelid = 'public.duffel_bookings'::regclass
  ) then
    alter table public.duffel_bookings
      add constraint duffel_bookings_provider_check
      check (provider = 'duffel'::text);
  end if;
end $$;

-- -----------------------------------------------------
-- CHECK: status in ('pending','held','confirmed','awaiting_payment','cancelled','failed')
-- -----------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'duffel_bookings_status_check'
      and conrelid = 'public.duffel_bookings'::regclass
  ) then
    alter table public.duffel_bookings
      add constraint duffel_bookings_status_check
      check (status = any (array[
        'pending'::text, 'held'::text, 'confirmed'::text,
        'awaiting_payment'::text, 'cancelled'::text, 'failed'::text
      ]));
  end if;
end $$;

-- -----------------------------------------------------
-- CHECK: passenger_count between 1 and 9
-- -----------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'duffel_bookings_passenger_count_check'
      and conrelid = 'public.duffel_bookings'::regclass
  ) then
    alter table public.duffel_bookings
      add constraint duffel_bookings_passenger_count_check
      check ((passenger_count >= 1) and (passenger_count <= 9));
  end if;
end $$;

-- -----------------------------------------------------
-- UNIQUE: order_id
-- -----------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'duffel_bookings_order_id_key'
      and conrelid = 'public.duffel_bookings'::regclass
  ) then
    alter table public.duffel_bookings
      add constraint duffel_bookings_order_id_key unique (order_id);
  end if;
end $$;

-- -----------------------------------------------------
-- INDEX: user_id, created_at DESC (supports my-bookings listing)
-- -----------------------------------------------------
create index if not exists duffel_bookings_user_created_idx
  on public.duffel_bookings (user_id, created_at desc);

-- -----------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------
alter table public.duffel_bookings enable row level security;

-- -----------------------------------------------------
-- POLICIES (drop + recreate so this is idempotent)
-- -----------------------------------------------------
drop policy if exists "Users can view their own Duffel bookings" on public.duffel_bookings;
drop policy if exists "Users can create their own Duffel bookings" on public.duffel_bookings;
drop policy if exists "Users can cancel their own Duffel bookings" on public.duffel_bookings;
drop policy if exists "Users can delete their own Duffel bookings" on public.duffel_bookings;

create policy "Users can view their own Duffel bookings"
  on public.duffel_bookings
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own Duffel bookings"
  on public.duffel_bookings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can cancel their own Duffel bookings"
  on public.duffel_bookings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own Duffel bookings"
  on public.duffel_bookings
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------
-- GRANTS
-- -----------------------------------------------------
revoke all on table public.duffel_bookings from anon, authenticated;
grant select on table public.duffel_bookings to authenticated;
grant insert on table public.duffel_bookings to authenticated;
grant update on table public.duffel_bookings to authenticated;
grant delete on table public.duffel_bookings to authenticated;
