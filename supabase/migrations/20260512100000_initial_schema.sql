create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  headline text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_role text,
  target_company text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  status text not null default 'saved' check (
    status in ('saved', 'applied', 'screening', 'interviewing', 'offer', 'rejected', 'withdrawn')
  ),
  applied_on date,
  next_step text,
  next_step_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  notes text,
  event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists career_goals_user_id_idx on public.career_goals (user_id);
create index if not exists career_goals_status_idx on public.career_goals (status);
create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_next_step_at_idx on public.applications (next_step_at);
create index if not exists application_events_application_id_idx on public.application_events (application_id);
create index if not exists application_events_user_id_idx on public.application_events (user_id);
create index if not exists application_events_event_at_idx on public.application_events (event_at);

alter table public.profiles enable row level security;
alter table public.career_goals enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "career_goals_select_own" on public.career_goals;
create policy "career_goals_select_own"
on public.career_goals
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "career_goals_insert_own" on public.career_goals;
create policy "career_goals_insert_own"
on public.career_goals
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "career_goals_update_own" on public.career_goals;
create policy "career_goals_update_own"
on public.career_goals
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "career_goals_delete_own" on public.career_goals;
create policy "career_goals_delete_own"
on public.career_goals
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own"
on public.applications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own"
on public.applications
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "applications_update_own" on public.applications;
create policy "applications_update_own"
on public.applications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "applications_delete_own" on public.applications;
create policy "applications_delete_own"
on public.applications
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "application_events_select_own" on public.application_events;
create policy "application_events_select_own"
on public.application_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "application_events_insert_own" on public.application_events;
create policy "application_events_insert_own"
on public.application_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.applications
    where applications.id = application_events.application_id
      and applications.user_id = auth.uid()
  )
);

drop policy if exists "application_events_update_own" on public.application_events;
create policy "application_events_update_own"
on public.application_events
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.applications
    where applications.id = application_events.application_id
      and applications.user_id = auth.uid()
  )
);

drop policy if exists "application_events_delete_own" on public.application_events;
create policy "application_events_delete_own"
on public.application_events
for delete
to authenticated
using (user_id = auth.uid());

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_career_goals_updated_at on public.career_goals;
create trigger set_career_goals_updated_at
before update on public.career_goals
for each row
execute function public.set_updated_at();

drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

drop trigger if exists set_application_events_updated_at on public.application_events;
create trigger set_application_events_updated_at
before update on public.application_events
for each row
execute function public.set_updated_at();
