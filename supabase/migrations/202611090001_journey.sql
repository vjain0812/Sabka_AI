-- My AI Journey: saved tools, adoption status and feedback for an owner without an account.
-- Privacy design (same as Connect):
--   * Opt-in. A journey is created only after the owner consents in the app.
--   * Tables have row level security enabled and NO policies: nobody reads or writes them directly.
--   * All access goes through SECURITY DEFINER functions. The owner proves control with a private
--     key held on their device; only its SHA-256 hash is stored here.
--   * Goals store the matching inputs the owner typed (never accessibility answers).
--   * Deleting a journey cascades to everything in it.
-- A "journey" is the business workspace for accountless owners, so the tables reference
-- journey_id where an account-based design would use business_id.
begin;

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null check (char_length(token_hash) = 64),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journey_goals (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  brief jsonb not null
    check (jsonb_typeof(brief) = 'object' and octet_length(brief::text) <= 6000),
  created_at timestamptz not null default now()
);
create index journey_goals_journey_idx on public.journey_goals (journey_id, created_at);

create table public.saved_tools (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  tool_slug text not null check (tool_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(tool_slug) <= 100),
  goal_id uuid references public.journey_goals(id) on delete set null,
  saved_at timestamptz not null default now(),
  unique (journey_id, tool_slug)
);

create table public.tool_adoptions (
  id uuid primary key default gen_random_uuid(),
  saved_tool_id uuid not null unique references public.saved_tools(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  status text not null check (status in ('considering', 'trying', 'using', 'stopped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tool_feedback (
  id uuid primary key default gen_random_uuid(),
  -- Strictly increasing, so "latest feedback" is unambiguous even within one timestamp.
  seq bigint generated always as identity,
  adoption_id uuid not null references public.tool_adoptions(id) on delete cascade,
  helpful text not null check (helpful in ('yes', 'somewhat', 'no')),
  reason text check (reason in ('too_hard', 'too_expensive', 'missing_feature', 'not_a_fit', 'no_time', 'other')),
  note text not null default '' check (char_length(note) <= 300),
  -- Self-reported minutes per week spent on the task before / with the tool.
  minutes_before integer check (minutes_before between 0 and 10080),
  minutes_after integer check (minutes_after between 0 and 10080),
  created_at timestamptz not null default now()
);
create index tool_feedback_adoption_idx on public.tool_feedback (adoption_id, seq desc);

alter table public.journeys enable row level security;
alter table public.journey_goals enable row level security;
alter table public.saved_tools enable row level security;
alter table public.tool_adoptions enable row level security;
alter table public.tool_feedback enable row level security;
revoke all on table public.journeys, public.journey_goals, public.saved_tools,
  public.tool_adoptions, public.tool_feedback from public, anon, authenticated;

-- Internal ownership check; not callable by clients.
create function public.journey_owns(p_id uuid, p_token_hash text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.journeys where id = p_id and token_hash = p_token_hash)
$$;
revoke all on function public.journey_owns(uuid, text) from public, anon, authenticated;

create function public.journey_touch(p_id uuid) returns void
  language sql security definer set search_path = '' as $$
  update public.journeys set updated_at = now() where id = p_id
$$;
revoke all on function public.journey_touch(uuid) from public, anon, authenticated;

create function public.journey_ping() returns boolean
  language sql stable security definer set search_path = '' as $$ select true $$;

-- Returns {"id": journey id, "goalId": first goal id}.
create function public.journey_create(p_token_hash text, p_goal jsonb, p_consent_version text)
  returns jsonb language plpgsql security definer set search_path = '' as $$
declare j uuid; g uuid;
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'Invalid key';
  end if;
  if p_consent_version is null or char_length(p_consent_version) = 0 then
    raise exception 'Consent required';
  end if;
  insert into public.journeys (token_hash, consent_version, consented_at)
    values (p_token_hash, p_consent_version, now()) returning id into j;
  insert into public.journey_goals (journey_id, brief) values (j, p_goal) returning id into g;
  return jsonb_build_object('id', j, 'goalId', g);
end; $$;

create function public.journey_get(p_id uuid, p_token_hash text) returns jsonb
  language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'id', j.id,
      'createdAt', j.created_at,
      'goals', coalesce((
        select jsonb_agg(jsonb_build_object('id', g.id, 'brief', g.brief, 'createdAt', g.created_at)
                         order by g.created_at)
        from public.journey_goals g where g.journey_id = j.id), '[]'::jsonb),
      'tools', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', s.tool_slug,
          'goalId', s.goal_id,
          'savedAt', s.saved_at,
          'status', a.status,
          'statusAt', a.updated_at,
          'feedback', (
            select jsonb_build_object(
              'helpful', f.helpful, 'reason', f.reason, 'note', f.note,
              'minutesBefore', f.minutes_before, 'minutesAfter', f.minutes_after,
              'createdAt', f.created_at)
            from public.tool_feedback f where f.adoption_id = a.id
            order by f.seq desc limit 1)
        ) order by s.saved_at desc)
        from public.saved_tools s
        left join public.tool_adoptions a on a.saved_tool_id = s.id
        where s.journey_id = j.id), '[]'::jsonb)
    )
    from public.journeys j where j.id = p_id
  );
end; $$;

-- Returns the new goal id, or null when the key doesn't match. Raises at the goal limit.
create function public.journey_add_goal(p_id uuid, p_token_hash text, p_goal jsonb) returns uuid
  language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return null;
  end if;
  if (select count(*) from public.journey_goals where journey_id = p_id) >= 10 then
    raise exception 'Goal limit';
  end if;
  insert into public.journey_goals (journey_id, brief) values (p_id, p_goal) returning id into g;
  perform public.journey_touch(p_id);
  return g;
end; $$;

-- Returns 'ok', 'forbidden', 'bad_goal' or 'limit'. Saving again only updates the goal.
create function public.journey_save_tool(p_id uuid, p_token_hash text, p_slug text, p_goal uuid)
  returns text language plpgsql security definer set search_path = '' as $$
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return 'forbidden';
  end if;
  if p_goal is not null and not exists (
      select 1 from public.journey_goals where id = p_goal and journey_id = p_id) then
    return 'bad_goal';
  end if;
  if not exists (select 1 from public.saved_tools where journey_id = p_id and tool_slug = p_slug)
     and (select count(*) from public.saved_tools where journey_id = p_id) >= 30 then
    return 'limit';
  end if;
  insert into public.saved_tools (journey_id, tool_slug, goal_id) values (p_id, p_slug, p_goal)
    on conflict (journey_id, tool_slug) do update set goal_id = coalesce(excluded.goal_id, public.saved_tools.goal_id);
  perform public.journey_touch(p_id);
  return 'ok';
end; $$;

create function public.journey_remove_tool(p_id uuid, p_token_hash text, p_slug text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return false;
  end if;
  delete from public.saved_tools where journey_id = p_id and tool_slug = p_slug;
  get diagnostics n = row_count;
  perform public.journey_touch(p_id);
  return n = 1;
end; $$;

-- Returns 'ok', 'forbidden' or 'not_saved'.
create function public.journey_set_status(p_id uuid, p_token_hash text, p_slug text, p_status text)
  returns text language plpgsql security definer set search_path = '' as $$
declare s uuid;
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return 'forbidden';
  end if;
  select id into s from public.saved_tools where journey_id = p_id and tool_slug = p_slug;
  if s is null then
    return 'not_saved';
  end if;
  insert into public.tool_adoptions (saved_tool_id, journey_id, status) values (s, p_id, p_status)
    on conflict (saved_tool_id) do update set status = excluded.status, updated_at = now();
  perform public.journey_touch(p_id);
  return 'ok';
end; $$;

-- Returns 'ok', 'forbidden', 'not_adopted' or 'rate_limited'.
create function public.journey_add_feedback(p_id uuid, p_token_hash text, p_slug text, p jsonb)
  returns text language plpgsql security definer set search_path = '' as $$
declare a uuid;
begin
  if not public.journey_owns(p_id, p_token_hash) then
    return 'forbidden';
  end if;
  select ad.id into a from public.tool_adoptions ad
    join public.saved_tools s on s.id = ad.saved_tool_id
    where s.journey_id = p_id and s.tool_slug = p_slug;
  if a is null then
    return 'not_adopted';
  end if;
  if (select count(*) from public.tool_feedback where adoption_id = a) >= 50 then
    return 'rate_limited';
  end if;
  insert into public.tool_feedback (adoption_id, helpful, reason, note, minutes_before, minutes_after)
  values (a, p->>'helpful', nullif(p->>'reason', ''), coalesce(p->>'note', ''),
          (p->>'minutesBefore')::integer, (p->>'minutesAfter')::integer);
  perform public.journey_touch(p_id);
  return 'ok';
end; $$;

create function public.journey_delete(p_id uuid, p_token_hash text) returns boolean
  language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.journeys where id = p_id and token_hash = p_token_hash;
  get diagnostics n = row_count;
  return n = 1;
end; $$;

revoke all on function
  public.journey_ping(), public.journey_create(text, jsonb, text), public.journey_get(uuid, text),
  public.journey_add_goal(uuid, text, jsonb), public.journey_save_tool(uuid, text, text, uuid),
  public.journey_remove_tool(uuid, text, text), public.journey_set_status(uuid, text, text, text),
  public.journey_add_feedback(uuid, text, text, jsonb), public.journey_delete(uuid, text)
  from public;
grant execute on function
  public.journey_ping(), public.journey_create(text, jsonb, text), public.journey_get(uuid, text),
  public.journey_add_goal(uuid, text, jsonb), public.journey_save_tool(uuid, text, text, uuid),
  public.journey_remove_tool(uuid, text, text), public.journey_set_status(uuid, text, text, text),
  public.journey_add_feedback(uuid, text, text, jsonb), public.journey_delete(uuid, text)
  to anon, authenticated, service_role;

commit;
