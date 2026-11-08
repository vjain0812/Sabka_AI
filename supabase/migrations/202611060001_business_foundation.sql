-- Phase 1 persistence contract. The guest UI does not write to this database.
-- Apply to Supabase (auth.users and auth.uid() must exist). No anonymous access.
begin;

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  name text not null default '' check (char_length(name) <= 120),
  business_type text not null,
  other_category text not null default '',
  role text not null check (role in ('owner','manager','staff','advisor')),
  size_band text not null check (size_band in ('solo','2–5','6–20','21+')),
  region text not null default '',
  technical_comfort text not null check (technical_comfort in ('beginner','comfortable','experienced')),
  save_consent_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_needs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.business_profiles(id) on delete cascade,
  job text not null check (job in ('customer_reply_drafting','marketing_content','appointment_organization','other')),
  problem text not null check (char_length(problem) between 10 and 1000),
  priority text not null check (priority in ('high','medium','low')),
  frequency text not null check (frequency in ('daily','weekly','occasionally')),
  success_measure text not null check (char_length(success_measure) between 1 and 1000),
  monthly_budget_usd numeric(10,2) not null check (monthly_budget_usd between 0 and 100000),
  setup_minutes integer not null check (setup_minutes between 0 and 10080),
  channels text[] not null check (cardinality(channels) between 1 and 20),
  current_systems text[] not null check (cardinality(current_systems) between 1 and 20),
  existing_subscriptions text not null default '',
  required_integrations text not null default '',
  manual_handoff_allowed boolean not null default false
);

create table public.human_boundaries (
  profile_id uuid primary key references public.business_profiles(id) on delete cascade,
  human_approval_required boolean not null default true check (human_approval_required),
  preferred_tone text not null default '',
  customer_values text not null default '',
  must_stay_human text[] not null default '{}',
  time_saved_for text not null default '',
  business_facts text not null default ''
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  format text not null check (format in ('paper','digital','unknown')),
  owner text not null check (owner in ('business','third_party','unknown')),
  availability text not null check (availability in ('available','missing','unknown')),
  completeness text not null check (completeness in ('complete','partial','unknown')),
  permission text not null check (permission in ('confirmed','not_confirmed','unknown')),
  sensitivity text not null check (sensitivity in ('standard','sensitive','unknown'))
);
create index business_profiles_user_id_idx on public.business_profiles(user_id);
create index data_sources_profile_id_idx on public.data_sources(profile_id);

alter table public.business_profiles enable row level security;
alter table public.business_needs enable row level security;
alter table public.human_boundaries enable row level security;
alter table public.data_sources enable row level security;

revoke all on public.business_profiles, public.business_needs, public.human_boundaries, public.data_sources from anon;
grant select, insert, update, delete on public.business_profiles, public.business_needs, public.human_boundaries, public.data_sources to authenticated;

create policy profiles_owner on public.business_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy needs_owner on public.business_needs for all to authenticated
  using (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())));
create policy boundaries_owner on public.human_boundaries for all to authenticated
  using (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())));
create policy data_sources_owner on public.data_sources for all to authenticated
  using (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())))
  with check (exists(select 1 from public.business_profiles p where p.id = profile_id and p.user_id = (select auth.uid())));

create function public.set_business_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger business_profile_updated before update on public.business_profiles
  for each row execute function public.set_business_updated_at();

commit;
