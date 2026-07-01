-- Payments table for storing external checkout records and webhook reconciliation
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  checkout_id text,
  user_id uuid references auth.users(id) on delete set null,
  reference text,
  kind text,
  plan_id text,
  application_id text,
  amount integer,
  currency text,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  card_mask text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_checkout_id_idx on public.payments (checkout_id);
create index if not exists payments_user_id_idx on public.payments (user_id);

alter table public.payments enable row level security;

drop policy if exists "payments_select_public" on public.payments;
create policy "payments_select_public"
on public.payments
for select
to authenticated
using (user_id = auth.uid());

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();
