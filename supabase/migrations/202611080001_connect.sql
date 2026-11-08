-- Connect: opt-in directory of businesses and private introductions between them.
-- Privacy design:
--   * Tables have row level security enabled and NO policies: nobody reads or writes them directly.
--   * All access goes through SECURITY DEFINER functions. Owners prove control with a private key
--     held on their device; only its SHA-256 hash is stored here.
--   * The public listing contains only fields the owner typed. No email or phone is collected.
--   * Deleting a profile cascades to its messages and reports.
begin;

create table public.connect_profiles (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null check (char_length(token_hash) = 64),
  display_name text not null check (char_length(display_name) between 2 and 60),
  category text not null check (char_length(category) between 1 and 60),
  region text not null default '' check (char_length(region) <= 60),
  about text not null default '' check (char_length(about) <= 280),
  topics text[] not null default '{}' check (cardinality(topics) <= 6),
  wins jsonb not null default '[]'::jsonb
    check (jsonb_typeof(wins) = 'array' and jsonb_array_length(wins) <= 3),
  visible boolean not null default true,
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connect_profiles_visible_idx on public.connect_profiles (visible, created_at desc);

create table public.connect_messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.connect_profiles(id) on delete cascade,
  to_id uuid not null references public.connect_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 600),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (from_id <> to_id)
);
create index connect_messages_to_idx on public.connect_messages (to_id, created_at desc);
create index connect_messages_from_idx on public.connect_messages (from_id, created_at desc);

create table public.connect_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.connect_profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  created_at timestamptz not null default now()
);

alter table public.connect_profiles enable row level security;
alter table public.connect_messages enable row level security;
alter table public.connect_reports enable row level security;
revoke all on table public.connect_profiles, public.connect_messages, public.connect_reports
  from public, anon, authenticated;

create function public.connect_ping() returns boolean
  language sql stable security definer set search_path = '' as $$ select true $$;

create function public.connect_create_profile(p jsonb, p_token_hash text) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'Invalid key';
  end if;
  if (p->>'consent') is distinct from 'true' then
    raise exception 'Consent required';
  end if;
  insert into public.connect_profiles
    (token_hash, display_name, category, region, about, topics, wins, visible, consent_version, consented_at)
  values (
    p_token_hash,
    p->>'displayName',
    p->>'category',
    coalesce(p->>'region', ''),
    coalesce(p->>'about', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p->'topics', '[]'::jsonb))), '{}'),
    coalesce(p->'wins', '[]'::jsonb),
    coalesce((p->>'visible')::boolean, true),
    coalesce(p->>'consentVersion', 'connect-1'),
    now()
  ) returning id into new_id;
  return new_id;
end; $$;

create function public.connect_list() returns jsonb
  language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."createdAt" desc), '[]'::jsonb)
  from (
    select id, display_name as "displayName", category, region, about,
           to_jsonb(topics) as topics, wins, created_at as "createdAt"
    from public.connect_profiles
    where visible
    order by created_at desc
    limit 200
  ) r
$$;

create function public.connect_get_own(p_id uuid, p_token_hash text) returns jsonb
  language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', id, 'displayName', display_name, 'category', category, 'region', region,
    'about', about, 'topics', to_jsonb(topics), 'wins', wins, 'createdAt', created_at,
    'visible', visible, 'consentedAt', consented_at, 'consentVersion', consent_version)
  from public.connect_profiles
  where id = p_id and token_hash = p_token_hash
$$;

create function public.connect_update_profile(p_id uuid, p_token_hash text, p jsonb) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.connect_profiles set
    display_name = coalesce(p->>'displayName', display_name),
    category = coalesce(p->>'category', category),
    region = coalesce(p->>'region', region),
    about = coalesce(p->>'about', about),
    topics = case when p ? 'topics'
      then coalesce(array(select jsonb_array_elements_text(p->'topics')), '{}') else topics end,
    wins = case when p ? 'wins' then p->'wins' else wins end,
    visible = coalesce((p->>'visible')::boolean, visible),
    updated_at = now()
  where id = p_id and token_hash = p_token_hash;
  get diagnostics n = row_count;
  return n = 1;
end; $$;

create function public.connect_delete_profile(p_id uuid, p_token_hash text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.connect_profiles where id = p_id and token_hash = p_token_hash;
  get diagnostics n = row_count;
  return n = 1;
end; $$;

-- Returns 'ok', 'forbidden', 'not_found', 'self' or 'rate_limited'.
create function public.connect_send(p_from uuid, p_token_hash text, p_to uuid, p_body text) returns text
  language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.connect_profiles where id = p_from and token_hash = p_token_hash) then
    return 'forbidden';
  end if;
  if p_from = p_to then
    return 'self';
  end if;
  if not exists (select 1 from public.connect_profiles where id = p_to and visible) then
    return 'not_found';
  end if;
  if (select count(*) from public.connect_messages
        where from_id = p_from and created_at > now() - interval '24 hours') >= 20
     or (select count(*) from public.connect_messages
        where from_id = p_from and to_id = p_to and created_at > now() - interval '24 hours') >= 5 then
    return 'rate_limited';
  end if;
  insert into public.connect_messages (from_id, to_id, body) values (p_from, p_to, p_body);
  return 'ok';
end; $$;

create function public.connect_inbox(p_id uuid, p_token_hash text) returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.connect_profiles where id = p_id and token_hash = p_token_hash) then
    return null;
  end if;
  return (
    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."createdAt" desc), '[]'::jsonb)
    from (
      select m.id, m.from_id as "fromId", m.to_id as "toId",
             case when m.from_id = p_id then m.to_id else m.from_id end as "otherId",
             o.display_name as "otherName", (m.from_id = p_id) as mine,
             m.body, m.created_at as "createdAt", m.read_at as "readAt"
      from public.connect_messages m
      join public.connect_profiles o
        on o.id = case when m.from_id = p_id then m.to_id else m.from_id end
      where m.from_id = p_id or m.to_id = p_id
      order by m.created_at desc
      limit 300
    ) r
  );
end; $$;

create function public.connect_mark_read(p_id uuid, p_token_hash text, p_other uuid) returns boolean
  language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.connect_profiles where id = p_id and token_hash = p_token_hash) then
    return false;
  end if;
  update public.connect_messages set read_at = now()
    where to_id = p_id and from_id = p_other and read_at is null;
  return true;
end; $$;

create function public.connect_report(p_profile uuid, p_reason text) returns boolean
  language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.connect_profiles where id = p_profile) then
    return false;
  end if;
  if (select count(*) from public.connect_reports
        where profile_id = p_profile and created_at > now() - interval '24 hours') >= 10 then
    return true;
  end if;
  insert into public.connect_reports (profile_id, reason) values (p_profile, p_reason);
  return true;
end; $$;

revoke all on function
  public.connect_ping(), public.connect_create_profile(jsonb, text), public.connect_list(),
  public.connect_get_own(uuid, text), public.connect_update_profile(uuid, text, jsonb),
  public.connect_delete_profile(uuid, text), public.connect_send(uuid, text, uuid, text),
  public.connect_inbox(uuid, text), public.connect_mark_read(uuid, text, uuid),
  public.connect_report(uuid, text)
  from public;
grant execute on function
  public.connect_ping(), public.connect_create_profile(jsonb, text), public.connect_list(),
  public.connect_get_own(uuid, text), public.connect_update_profile(uuid, text, jsonb),
  public.connect_delete_profile(uuid, text), public.connect_send(uuid, text, uuid, text),
  public.connect_inbox(uuid, text), public.connect_mark_read(uuid, text, uuid),
  public.connect_report(uuid, text)
  to anon, authenticated, service_role;

commit;
