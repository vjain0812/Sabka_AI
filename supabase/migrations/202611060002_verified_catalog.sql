-- Additive Phase 2 migration. No guest/profile records are read or changed.
begin;
create table public.catalog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true
);
alter table public.catalog_admins enable row level security;
revoke all on public.catalog_admins from anon, authenticated;
grant select on public.catalog_admins to authenticated;
create policy own_admin_membership on public.catalog_admins for select to authenticated using (user_id = (select auth.uid()));
create function public.is_catalog_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.catalog_admins where user_id = auth.uid() and enabled);
$$;
revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to anon, authenticated, service_role;

create table public.tools (
  id uuid primary key, canonical_key text not null unique, slug text not null unique,
  vendor text not null, name text not null,
  status text not null check (status in ('published','held','rejected')),
  version integer not null check(version > 0), record jsonb not null,
  published_at timestamptz not null default now(),
  check(record->'tool'->>'id' = id::text), check(record->'tool'->>'status' = status),
  check(record->'tool'->>'canonicalKey' = canonical_key),
  check(record->'tool'->>'slug' = slug), check(record->'tool'->>'fictional' = 'false')
);
create table public.sources (
  id uuid primary key, tool_id uuid not null references public.tools(id) on delete cascade,
  url text not null check(url ~ '^https://'), source_type text not null,
  permission_basis text not null check(length(permission_basis) > 0),
  checked_at timestamptz not null, expires_at timestamptz not null,
  record jsonb not null, check(expires_at > checked_at)
);
create table public.tool_plans (
  id uuid primary key, tool_id uuid not null references public.tools(id) on delete cascade,
  tier text not null, region text not null, currency text not null,
  monthly_price numeric check(monthly_price >= 0), source_id uuid references public.sources(id), record jsonb not null
);
create table public.tool_claims (
  id uuid primary key, tool_id uuid not null references public.tools(id) on delete cascade,
  plan_id uuid references public.tool_plans(id), source_id uuid not null references public.sources(id),
  claim_key text not null, value jsonb, status text not null,
  observed_at timestamptz not null, expires_at timestamptz not null, record jsonb not null,
  check(expires_at > observed_at)
);
create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
  idempotency_key uuid not null, status text not null default 'queued' check(status in ('queued','running','completed','partial','failed')),
  input jsonb not null, queries jsonb not null, provider text not null default 'brave',
  created_at timestamptz not null default now(), finished_at timestamptz,
  candidate_count integer not null default 0, search_calls integer not null default 0 check(search_calls between 0 and 6),
  message text not null default '', unique(actor_id,idempotency_key)
);
create table public.discovery_candidates (
  id uuid primary key, run_id uuid not null references public.discovery_runs(id), canonical_key text not null unique,
  status text not null check(status in ('discovered_unreviewed','pending_review','verified','held','rejected','published')),
  version integer not null default 1, record jsonb not null, discovered_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_note text not null default ''
);
create table public.catalog_audit_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id),
  candidate_id uuid, action text not null, note text not null, created_at timestamptz not null default now(),
  version integer not null, provenance jsonb not null default '{}'
);
create index sources_tool_idx on public.sources(tool_id);
create index plans_tool_idx on public.tool_plans(tool_id);
create index claims_tool_idx on public.tool_claims(tool_id);
create index discovery_runs_created_idx on public.discovery_runs(created_at);

alter table public.tools enable row level security;
alter table public.sources enable row level security;
alter table public.tool_plans enable row level security;
alter table public.tool_claims enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_candidates enable row level security;
alter table public.catalog_audit_events enable row level security;
revoke all on public.tools,public.sources,public.tool_plans,public.tool_claims,public.discovery_runs,public.discovery_candidates,public.catalog_audit_events from anon,authenticated;
grant select on public.tools,public.sources,public.tool_plans,public.tool_claims to anon,authenticated;
grant select on public.discovery_runs,public.discovery_candidates,public.catalog_audit_events to authenticated;
create policy published_tools on public.tools for select to anon,authenticated using(status='published');
create policy published_sources on public.sources for select to anon,authenticated using(exists(select 1 from public.tools t where t.id=tool_id and t.status='published'));
create policy published_plans on public.tool_plans for select to anon,authenticated using(exists(select 1 from public.tools t where t.id=tool_id and t.status='published'));
create policy published_claims on public.tool_claims for select to anon,authenticated using(exists(select 1 from public.tools t where t.id=tool_id and t.status='published'));
create policy admin_runs on public.discovery_runs for select to authenticated using(public.is_catalog_admin());
create policy admin_candidates on public.discovery_candidates for select to authenticated using(public.is_catalog_admin());
create policy admin_audit on public.catalog_audit_events for select to authenticated using(public.is_catalog_admin());

-- Defense in depth: direct RPC clients cannot bypass source/provenance checks.
create function public.validate_catalog_evidence(p_record jsonb) returns void language plpgsql set search_path='' as $$
declare c jsonb; s jsonb; p jsonb; has_capability boolean := false;
begin
  if jsonb_typeof(p_record->'claims') <> 'array' or jsonb_array_length(p_record->'claims') = 0
     or p_record->'tool'->>'fictional' is distinct from 'false' then raise exception 'Invalid catalog record'; end if;
  for c in select value from jsonb_array_elements(p_record->'claims') loop
    select value into s from jsonb_array_elements(p_record->'sources') where value->>'id'=c->>'sourceId';
    if s is null or s->>'reviewStatus' is distinct from 'verified'
       or s->>'allowedDisplay' is distinct from 'true' or s->>'allowedStorage' is distinct from 'true'
       or length(coalesce(s->>'permissionBasis',''))=0 or s->>'url' !~ '^https://' then raise exception 'Unreviewed claim source'; end if;
    if c->>'toolId' is distinct from p_record->'tool'->>'id' then raise exception 'Wrong claim tool'; end if;
    if c->>'status'='conflicting' and length(coalesce(c->>'conflictResolution',''))=0 then raise exception 'Unresolved conflict'; end if;
    if c->>'status'<>'unknown' and ((c->>'expiresAt')::timestamptz <= now() or (s->>'expiresAt')::timestamptz <= now()
       or (c->>'observedAt')::timestamptz > now()+interval '1 minute' or (s->>'checkedAt')::timestamptz > now()+interval '1 minute') then raise exception 'Stale or future evidence'; end if;
    if c->>'key'='capability' and c->>'status'='documented' and s->>'type'='official' then has_capability:=true; end if;
  end loop;
  if not has_capability then raise exception 'Official capability evidence required'; end if;
  for p in select value from jsonb_array_elements(p_record->'plans') loop
    if p->>'toolId' is distinct from p_record->'tool'->>'id' then raise exception 'Wrong plan tool'; end if;
    if p->>'monthlyPrice' is not null and (p->>'sourceId' is null or p->>'checkedAt' is null or p->>'expiresAt' is null
       or (p->>'expiresAt')::timestamptz <= now() or not exists(select 1 from jsonb_array_elements(p_record->'claims') q where q->>'key'='monthly_price' and q->>'planId'=p->>'id' and q->>'value'=p->>'monthlyPrice' and q->>'status'='documented')) then raise exception 'Price is not evidenced'; end if;
  end loop;
end; $$;

create function public.write_published_catalog_record(p_record jsonb) returns void language plpgsql security definer set search_path='' as $$
declare t jsonb := p_record->'tool'; v jsonb; tid uuid := (t->>'id')::uuid;
begin
  perform public.validate_catalog_evidence(p_record);
  if t->>'status' is distinct from 'published' then raise exception 'Publication required'; end if;
  insert into public.tools(id,canonical_key,slug,vendor,name,status,version,record)
    values(tid,t->>'canonicalKey',t->>'slug',t->>'vendor',t->>'name','published',(t->>'version')::integer,p_record)
    on conflict(id) do update set canonical_key=excluded.canonical_key,slug=excluded.slug,vendor=excluded.vendor,name=excluded.name,status='published',version=excluded.version,record=excluded.record,published_at=now();
  delete from public.tool_claims where tool_id=tid;
  delete from public.tool_plans where tool_id=tid;
  delete from public.sources where tool_id=tid;
  for v in select value from jsonb_array_elements(p_record->'sources') loop
    insert into public.sources values((v->>'id')::uuid,tid,v->>'url',v->>'type',v->>'permissionBasis',(v->>'checkedAt')::timestamptz,(v->>'expiresAt')::timestamptz,v);
  end loop;
  for v in select value from jsonb_array_elements(p_record->'plans') loop
    insert into public.tool_plans values((v->>'id')::uuid,tid,v->>'tier',v->>'region',v->>'currency',(v->>'monthlyPrice')::numeric,(v->>'sourceId')::uuid,v);
  end loop;
  for v in select value from jsonb_array_elements(p_record->'claims') loop
    insert into public.tool_claims values((v->>'id')::uuid,tid,(v->>'planId')::uuid,(v->>'sourceId')::uuid,v->>'key',v->'value',v->>'status',(v->>'observedAt')::timestamptz,(v->>'expiresAt')::timestamptz,v);
  end loop;
end; $$;
revoke all on function public.validate_catalog_evidence(jsonb), public.write_published_catalog_record(jsonb) from public, anon, authenticated;

create function public.enqueue_discovery(p_input jsonb,p_queries jsonb,p_provider text) returns public.discovery_runs language plpgsql security definer set search_path='' as $$
declare r public.discovery_runs;
begin
  if not public.is_catalog_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(744003);
  select * into r from public.discovery_runs where actor_id=auth.uid() and idempotency_key=(p_input->>'idempotencyKey')::uuid;
  if found then return r; end if;
  update public.discovery_runs set status='failed',finished_at=now(),message='Worker interrupted. Submit a new run to retry within the daily limit.' where status in ('queued','running') and created_at < now()-interval '5 minutes';
  if (select count(*) from public.discovery_runs where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 4 then raise exception 'Daily discovery limit reached'; end if;
  if exists(select 1 from public.discovery_runs where status in ('queued','running')) then raise exception 'A discovery run is already active'; end if;
  if jsonb_array_length(p_queries) > 3 or length(p_input->>'problem') > 300 or p_input->>'permissionsConfirmed' is distinct from 'true' then raise exception 'Invalid discovery input'; end if;
  if p_provider not in ('tavily','brave') then raise exception 'Unsupported provider'; end if;
  insert into public.discovery_runs(actor_id,idempotency_key,input,queries,provider) values(auth.uid(),(p_input->>'idempotencyKey')::uuid,p_input,p_queries,p_provider) returning * into r;
  return r;
end; $$;
create function public.claim_discovery(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.is_catalog_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  update public.discovery_runs set status='running' where id=p_id and actor_id=auth.uid() and status='queued';
  return found;
end; $$;
create function public.finish_discovery(p_id uuid,p_status text,p_candidates jsonb,p_calls integer,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare c jsonb; r public.discovery_runs; added integer:=0;
begin
  if not public.is_catalog_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into r from public.discovery_runs where id=p_id and actor_id=auth.uid() and status='running' for update;
  if not found then raise exception 'Run not active'; end if;
  if p_status not in ('completed','partial','failed') or p_calls not between 0 and 6 or jsonb_array_length(p_candidates)>4 then raise exception 'Invalid run result'; end if;
  for c in select value from jsonb_array_elements(p_candidates) loop
    if not exists(select 1 from public.tools where canonical_key=c->>'canonicalKey') then
      insert into public.discovery_candidates(id,run_id,canonical_key,status,record)
        values((c->>'id')::uuid,p_id,c->>'canonicalKey','pending_review',c->'record') on conflict(canonical_key) do nothing;
      if found then added:=added+1; end if;
    end if;
  end loop;
  update public.discovery_runs set status=p_status,search_calls=p_calls,message=left(p_message,1000),candidate_count=added,finished_at=now() where id=p_id;
end; $$;
create function public.review_candidate(p_id uuid,p_version integer,p_action text,p_note text,p_inspected boolean,p_record jsonb default null) returns public.discovery_candidates language plpgsql security definer set search_path='' as $$
declare c public.discovery_candidates; r jsonb; new_status text;
begin
  if not public.is_catalog_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into c from public.discovery_candidates where id=p_id for update;
  if not found or c.version <> p_version then raise exception 'Candidate changed. Refresh and review again.'; end if;
  if length(trim(p_note))<10 or length(p_note)>1000 then raise exception 'Review note required'; end if;
  r:=coalesce(p_record,c.record);
  if r->'tool'->>'canonicalKey' is distinct from c.canonical_key or r->'tool'->>'id' is distinct from c.record->'tool'->>'id' then raise exception 'Identity changes require a new candidate'; end if;
  if p_action='verify' then
    if c.status not in ('pending_review','held','verified') or not p_inspected then raise exception 'Inspect sources before verifying'; end if;
    perform public.validate_catalog_evidence(r); new_status:='verified';
    r:=jsonb_set(r,'{review}',jsonb_build_object('checkedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'reviewedBy',auth.uid()::text,'scope','source_check_only','notes',p_note));
  elsif p_action='publish' then
    if c.status<>'verified' or p_record is not null or not p_inspected then raise exception 'Only the unchanged verified record can be published'; end if;
    r:=jsonb_set(r,'{tool,status}','"published"');
    r:=jsonb_set(r,'{tool,version}',to_jsonb(c.version+1));
    perform public.write_published_catalog_record(r); new_status:='published';
  elsif p_action in ('hold','reject') then
    new_status:=case when p_action='hold' then 'held' else 'rejected' end;
    update public.tools set status=new_status,record=jsonb_set(record,'{tool,status}',to_jsonb(new_status)) where canonical_key=c.canonical_key;
  else raise exception 'Unsupported review action'; end if;
  update public.discovery_candidates set record=r,status=new_status,version=version+1,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where id=p_id returning * into c;
  insert into public.catalog_audit_events(actor_id,candidate_id,action,note,version,provenance)
    values(auth.uid(),p_id,p_action,p_note,c.version,jsonb_build_object('runId',c.run_id,'sourceIds',(select jsonb_agg(value->>'id') from jsonb_array_elements(r->'sources'))));
  return c;
end; $$;
create function public.import_reviewed_catalog(p_record jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.write_published_catalog_record(p_record);
  insert into public.catalog_audit_events(action,note,version,provenance) values('seed_import','Repository source-check snapshot imported by service-role operator',1,jsonb_build_object('toolId',p_record->'tool'->>'id'));
end; $$;
revoke all on function public.enqueue_discovery(jsonb,jsonb,text),public.claim_discovery(uuid),public.finish_discovery(uuid,text,jsonb,integer,text),public.review_candidate(uuid,integer,text,text,boolean,jsonb),public.import_reviewed_catalog(jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_discovery(jsonb,jsonb,text),public.claim_discovery(uuid),public.finish_discovery(uuid,text,jsonb,integer,text),public.review_candidate(uuid,integer,text,text,boolean,jsonb) to authenticated;
grant execute on function public.import_reviewed_catalog(jsonb) to service_role;
commit;
