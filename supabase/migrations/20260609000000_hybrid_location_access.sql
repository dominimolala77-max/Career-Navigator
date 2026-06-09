-- CareerPath SA - Location-based access control and university selections

alter table public.profiles
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists province_detected text,
  add column if not exists access_tier text check (access_tier in ('free', 'paid')) default 'paid',
  add column if not exists location_requested_at timestamptz,
  add column if not exists selected_universities jsonb default '[]'::jsonb,
  add column if not exists selected_tvet_colleges jsonb default '[]'::jsonb;

-- Create table for university/TVET fee tracking
create table if not exists public.institution_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  institution_type text not null check (institution_type in ('university', 'tvet')), -- 'university' or 'tvet'
  institution_name text not null,
  programme text,
  application_fee numeric default 0,
  fee_payment_status text default 'unpaid' check (fee_payment_status in ('paid', 'unpaid', 'not_required')),
  fee_paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for institution_applications
alter table public.institution_applications enable row level security;

create policy "Users can manage own institution applications"
  on public.institution_applications for all
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists institution_applications_user_id_idx on public.institution_applications (user_id);
create index if not exists institution_applications_fee_status_idx on public.institution_applications (fee_payment_status);
create index if not exists profiles_access_tier_idx on public.profiles (access_tier);
create index if not exists profiles_province_detected_idx on public.profiles (province_detected);
