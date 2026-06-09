-- CareerPath SA - paid plans, profile submission, document metadata, fees, and status updates

alter table public.profiles
  add column if not exists email text,
  add column if not exists certified_documents jsonb default '[]'::jsonb,
  add column if not exists selected_plan text check (selected_plan in ('priority_unlimited', 'standard', 'basic')),
  add column if not exists plan_payment_status text default 'unpaid' check (plan_payment_status in ('unpaid', 'paid')),
  add column if not exists plan_paid_at timestamptz,
  add column if not exists profile_submission_status text default 'draft' check (profile_submission_status in ('draft', 'submitted', 'processing', 'completed')),
  add column if not exists profile_submitted_at timestamptz;

alter table public.applications
  add column if not exists application_fee numeric default 0,
  add column if not exists fee_payment_status text default 'unpaid' check (fee_payment_status in ('paid', 'unpaid', 'not_required')),
  add column if not exists fee_paid_at timestamptz,
  add column if not exists status_updates jsonb default '[]'::jsonb;

create index if not exists applications_type_idx on public.applications (type);
create index if not exists applications_fee_payment_status_idx on public.applications (fee_payment_status);
create index if not exists profiles_selected_plan_idx on public.profiles (selected_plan);
