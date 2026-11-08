-- Owner accounts for My AI Journey (apply after 202611090001_journey.sql).
-- One Supabase Auth account can hold several businesses; each business is one journey.
-- Journeys started without an account keep working with their private device key, and can be
-- claimed into an account on sign-in. Tables stay closed: access is still only through functions,
-- which now accept either the private key or the signed-in owner (auth.uid()).
begin;

alter table public.journeys add column user_id uuid references auth.users(id) on delete cascade;
create index journeys_user_idx on public.journeys (user_id, updated_at desc);

create or replace function public.journey_owns(p_id uuid, p_token_hash text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.journeys
    where id = p_id
      and (token_hash = p_token_hash
           or (user_id is not null and user_id = (select auth.uid())))
  )
$$;
revoke all on function public.journey_owns(uuid, text) from public, anon, authenticated;

-- Signed-in owners get the journey attached to their account (max 20 businesses each).
create or replace function public.journey_create(p_token_hash text, p_goal jsonb, p_consent_version text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare j uuid; g uuid; uid uuid := (select auth.uid());
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'Invalid key';
  end if;
  if p_consent_version is null or char_length(p_consent_version) = 0 then
    raise exception 'Consent required';
  end if;
  if uid is not null and (select count(*) from public.journeys where user_id = uid) >= 20 then
    raise exception 'Business limit';
  end if;
  insert into public.journeys (token_hash, consent_version, consented_at, user_id)
    values (p_token_hash, p_consent_version, now(), uid) returning id into j;
  insert into public.journey_goals (journey_id, brief) values (j, p_goal) returning id into g;
  return jsonb_build_object('id', j, 'goalId', g);
end; $$;

create or replace function public.journey_delete(p_id uuid, p_token_hash text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return false;
  end if;
  delete from public.journeys where id = p_id;
  get diagnostics n = row_count;
  return n = 1;
end; $$;

-- The signed-in owner's businesses, newest activity first. Empty when signed out.
create function public.account_journeys() returns jsonb
  language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."updatedAt" desc), '[]'::jsonb)
  from (
    select j.id, j.created_at as "createdAt", j.updated_at as "updatedAt",
      (select g.brief->'profile' from public.journey_goals g
        where g.journey_id = j.id order by g.created_at desc limit 1) as profile,
      (select count(*) from public.saved_tools s where s.journey_id = j.id)::int as "toolCount"
    from public.journeys j
    where j.user_id is not null and j.user_id = (select auth.uid())
  ) r
$$;

-- Move a device-key journey into the signed-in account. Returns false if not allowed.
create function public.journey_claim(p_id uuid, p_token_hash text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer; uid uuid := (select auth.uid());
begin
  if uid is null then
    return false;
  end if;
  if (select count(*) from public.journeys where user_id = uid) >= 20 then
    return false;
  end if;
  update public.journeys set user_id = uid, updated_at = now()
    where id = p_id and token_hash = p_token_hash and user_id is null;
  get diagnostics n = row_count;
  return n = 1;
end; $$;

revoke all on function public.account_journeys(), public.journey_claim(uuid, text) from public;
grant execute on function public.account_journeys(), public.journey_claim(uuid, text)
  to anon, authenticated, service_role;

commit;
