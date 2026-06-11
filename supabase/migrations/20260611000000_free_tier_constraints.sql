-- Allow rural free-tier values on profiles

alter table public.profiles drop constraint if exists profiles_selected_plan_check;
alter table public.profiles add constraint profiles_selected_plan_check
  check (selected_plan in ('priority_unlimited', 'standard', 'basic', 'free'));

alter table public.profiles drop constraint if exists profiles_plan_payment_status_check;
alter table public.profiles add constraint profiles_plan_payment_status_check
  check (plan_payment_status in ('unpaid', 'paid', 'free'));

-- Track unpaid institution fees on profile submission for admin team
alter table public.profiles
  add column if not exists unpaid_fees_summary jsonb default '[]'::jsonb;
