-- Canonical source upload, revision, and MAUL ingestion control plane.
-- This migration is intentionally unapplied by Codex; deploy it through the
-- repository's normal Supabase migration workflow after review.

create extension if not exists "pgcrypto";

alter table public.projects
  add column if not exists source_revision bigint not null default 0,
  add column if not exists current_source_revision_id uuid;

create table if not exists public.source_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  asset_id uuid not null,
  client_request_id uuid not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'uploading', 'verified', 'committed', 'aborted', 'expired')),
  bucket text not null,
  object_key text not null,
  original_filename text not null,
  mime_type text not null,
  expected_size_bytes bigint not null check (expected_size_bytes > 0),
  multipart_upload_id text,
  verified_etag text,
  verified_size_bytes bigint,
  failure_code text,
  cleanup_attempts integer not null default 0,
  cleanup_last_attempt_at timestamptz,
  cleanup_completed_at timestamptz,
  cleanup_error text,
  expires_at timestamptz not null,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, client_request_id),
  unique (asset_id),
  unique (bucket, object_key),
  check (verified_size_bytes is null or verified_size_bytes = expected_size_bytes),
  check ((status <> 'committed') or committed_at is not null)
);

create table if not exists public.source_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision bigint not null check (revision > 0),
  source_asset_id uuid not null references public.source_assets(id) on delete cascade,
  upload_session_id uuid not null references public.source_upload_sessions(id) on delete restrict,
  state text not null default 'current' check (state in ('current', 'superseded')),
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  unique (project_id, revision),
  unique (source_asset_id),
  unique (upload_session_id),
  check ((state = 'current' and superseded_at is null) or state = 'superseded')
);

create unique index if not exists source_revisions_one_current_project_idx
  on public.source_revisions(project_id)
  where state = 'current';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_current_source_revision_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_current_source_revision_id_fkey
      foreign key (current_source_revision_id)
      references public.source_revisions(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.source_ingestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_revision_id uuid not null references public.source_revisions(id) on delete cascade,
  source_asset_id uuid not null references public.source_assets(id) on delete cascade,
  durable_job_id uuid not null references public.durable_jobs(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'leased', 'processing', 'completed', 'failed', 'cancelled', 'superseded')),
  stage text not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  leased_by text,
  lease_generation integer not null default 0,
  lease_token_hash text,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  result_metadata jsonb not null default '{}'::jsonb,
  result_snapshot_id uuid,
  error_code text,
  error_message text,
  retryable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (source_revision_id),
  unique (source_asset_id),
  unique (durable_job_id)
);

create table if not exists public.source_observation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_revision_id uuid not null references public.source_revisions(id) on delete cascade,
  ingestion_id uuid not null references public.source_ingestions(id) on delete cascade,
  schema_version text not null default 'prometheus-observation-snapshot/v1',
  payload jsonb not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (ingestion_id),
  unique (source_revision_id, payload_sha256)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'source_ingestions_result_snapshot_id_fkey'
      and conrelid = 'public.source_ingestions'::regclass
  ) then
    alter table public.source_ingestions
      add constraint source_ingestions_result_snapshot_id_fkey
      foreign key (result_snapshot_id)
      references public.source_observation_snapshots(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.source_ingestion_events (
  id bigint generated always as identity primary key,
  ingestion_id uuid not null references public.source_ingestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null,
  attempt integer not null default 0,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_upload_sessions_user_status_idx
  on public.source_upload_sessions(user_id, status, expires_at);
create index if not exists source_upload_sessions_project_idx
  on public.source_upload_sessions(project_id, created_at desc);
create index if not exists source_revisions_project_idx
  on public.source_revisions(project_id, revision desc);
create index if not exists source_ingestions_worker_queue_idx
  on public.source_ingestions(status, created_at)
  where status in ('queued', 'leased', 'processing');
create index if not exists source_ingestions_project_idx
  on public.source_ingestions(project_id, created_at desc);
create index if not exists source_ingestion_events_ingestion_idx
  on public.source_ingestion_events(ingestion_id, id);

drop trigger if exists set_source_upload_sessions_updated_at on public.source_upload_sessions;
create trigger set_source_upload_sessions_updated_at
before update on public.source_upload_sessions
for each row execute function public.handle_updated_at();

drop trigger if exists set_source_ingestions_updated_at on public.source_ingestions;
create trigger set_source_ingestions_updated_at
before update on public.source_ingestions
for each row execute function public.handle_updated_at();

create or replace function public.maul_guard_project_source_pointer()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (
    old.source_asset_id is distinct from new.source_asset_id
    or old.source_revision is distinct from new.source_revision
    or old.current_source_revision_id is distinct from new.current_source_revision_id
  ) and coalesce(current_setting('prometheus.source_control_plane', true), '') <> 'on' then
    raise exception using
      errcode = '42501',
      message = 'SOURCE_POINTER_WORKER_ONLY';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_projects_source_pointer on public.projects;
create trigger guard_projects_source_pointer
before update of source_asset_id, source_revision, current_source_revision_id
on public.projects
for each row execute function public.maul_guard_project_source_pointer();

create or replace function public.maul_guard_source_asset_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (
    old.user_id is distinct from new.user_id
    or old.project_id is distinct from new.project_id
    or old.storage_bucket is distinct from new.storage_bucket
    or old.storage_path is distinct from new.storage_path
    or old.original_filename is distinct from new.original_filename
    or old.mime_type is distinct from new.mime_type
    or old.size_bytes is distinct from new.size_bytes
    or old.duration_ms is distinct from new.duration_ms
    or old.width is distinct from new.width
    or old.height is distinct from new.height
    or old.profile is distinct from new.profile
  ) and coalesce(current_setting('prometheus.source_control_plane', true), '') <> 'on' then
    raise exception using
      errcode = '42501',
      message = 'SOURCE_ASSET_IDENTITY_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_source_asset_identity on public.source_assets;
create trigger guard_source_asset_identity
before update on public.source_assets
for each row execute function public.maul_guard_source_asset_identity();

alter table public.source_upload_sessions enable row level security;
alter table public.source_revisions enable row level security;
alter table public.source_ingestions enable row level security;
alter table public.source_observation_snapshots enable row level security;
alter table public.source_ingestion_events enable row level security;

drop policy if exists source_upload_sessions_select_own on public.source_upload_sessions;
create policy source_upload_sessions_select_own on public.source_upload_sessions
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists source_revisions_select_own on public.source_revisions;
create policy source_revisions_select_own on public.source_revisions
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists source_ingestions_select_own on public.source_ingestions;
create policy source_ingestions_select_own on public.source_ingestions
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists source_observation_snapshots_select_own on public.source_observation_snapshots;
create policy source_observation_snapshots_select_own on public.source_observation_snapshots
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists source_ingestion_events_select_own on public.source_ingestion_events;
create policy source_ingestion_events_select_own on public.source_ingestion_events
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can create their own jobs" on public.durable_jobs;
drop policy if exists "Users can update their own jobs" on public.durable_jobs;
drop policy if exists durable_jobs_insert_user_requested on public.durable_jobs;
create policy durable_jobs_insert_user_requested on public.durable_jobs
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and type <> 'video_analysis'::public.job_type
  and status = 'pending'::public.job_status
  and progress = 0
  and error_message is null
);

drop policy if exists "Users can insert their own source assets" on public.source_assets;
drop policy if exists source_assets_insert_own on public.source_assets;
drop policy if exists "Users can delete their own source assets" on public.source_assets;
drop policy if exists source_assets_delete_own on public.source_assets;

revoke insert, delete on public.source_assets from public, anon, authenticated;
revoke update on public.durable_jobs from public, anon, authenticated;
revoke insert, update, delete on public.source_upload_sessions from authenticated;
revoke insert, update, delete on public.source_revisions from authenticated;
revoke insert, update, delete on public.source_ingestions from authenticated;
revoke insert, update, delete on public.source_observation_snapshots from authenticated;
revoke insert, update, delete on public.source_ingestion_events from authenticated;
grant select on public.source_upload_sessions to authenticated;
grant select on public.source_revisions to authenticated;
grant select on public.source_ingestions to authenticated;
grant select on public.source_observation_snapshots to authenticated;
grant select on public.source_ingestion_events to authenticated;

create or replace function public.maul_storage_limit_bytes(p_user_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tier text := 'free';
begin
  select lower(tier)
    into v_tier
  from public.dodo_subscriptions
  where user_id = p_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  return case coalesce(v_tier, 'free')
    when 'creator' then 536870912000::bigint
    when 'studio' then 2199023255552::bigint
    when 'cinema' then 5497558138880::bigint
    else 524288000::bigint
  end;
end;
$$;

create or replace function public.maul_reserve_source_upload(
  p_project_id uuid,
  p_asset_id uuid,
  p_client_request_id uuid,
  p_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_bucket text,
  p_object_key text,
  p_expires_at timestamptz default now() + interval '30 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.source_upload_sessions%rowtype;
  v_session public.source_upload_sessions%rowtype;
  v_used_bytes bigint;
  v_reserved_bytes bigint;
  v_limit_bytes bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 10737418240::bigint then
    raise exception using errcode = '22023', message = 'INVALID_SOURCE_SIZE';
  end if;
  if nullif(trim(p_filename), '') is null or nullif(trim(p_mime_type), '') is null then
    raise exception using errcode = '22023', message = 'INVALID_SOURCE_METADATA';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '24 hours' then
    raise exception using errcode = '22023', message = 'INVALID_UPLOAD_EXPIRY';
  end if;
  if p_object_key not like ('users/' || v_user_id || '/projects/' || p_project_id || '/sources/%') then
    raise exception using errcode = '42501', message = 'INVALID_SOURCE_OBJECT_KEY';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  perform 1 from public.projects
    where id = p_project_id and user_id = v_user_id
    for update;
  if not found then
    raise exception using errcode = '42501', message = 'PROJECT_NOT_OWNED';
  end if;

  select * into v_existing
  from public.source_upload_sessions
  where user_id = v_user_id
    and project_id = p_project_id
    and client_request_id = p_client_request_id
  for update;

  if found then
    if v_existing.asset_id <> p_asset_id
      or v_existing.bucket <> p_bucket
      or v_existing.object_key <> p_object_key
      or v_existing.expected_size_bytes <> p_size_bytes
      or v_existing.mime_type <> lower(trim(p_mime_type)) then
      raise exception using errcode = 'P0001', message = 'UPLOAD_IDEMPOTENCY_CONFLICT';
    end if;
    return to_jsonb(v_existing);
  end if;

  select coalesce(sum(size_bytes), 0)::bigint into v_used_bytes
  from public.source_assets
  where user_id = v_user_id;

  select coalesce(sum(expected_size_bytes), 0)::bigint into v_reserved_bytes
  from public.source_upload_sessions
  where user_id = v_user_id
    and status in ('reserved', 'uploading', 'verified')
    and expires_at > now();

  v_limit_bytes := public.maul_storage_limit_bytes(v_user_id);
  if v_used_bytes + v_reserved_bytes + p_size_bytes > v_limit_bytes then
    raise exception using
      errcode = 'P0001',
      message = 'STORAGE_QUOTA_EXCEEDED',
      detail = jsonb_build_object(
        'usedBytes', v_used_bytes,
        'reservedBytes', v_reserved_bytes,
        'requestedBytes', p_size_bytes,
        'limitBytes', v_limit_bytes
      )::text;
  end if;

  insert into public.source_upload_sessions (
    user_id, project_id, asset_id, client_request_id, status,
    bucket, object_key, original_filename, mime_type,
    expected_size_bytes, expires_at
  ) values (
    v_user_id, p_project_id, p_asset_id, p_client_request_id, 'reserved',
    trim(p_bucket), trim(p_object_key), trim(p_filename), lower(trim(p_mime_type)),
    p_size_bytes, p_expires_at
  ) returning * into v_session;

  return to_jsonb(v_session);
end;
$$;

create or replace function public.maul_attach_source_multipart(
  p_session_id uuid,
  p_multipart_upload_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.source_upload_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  select * into v_session from public.source_upload_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'UPLOAD_SESSION_NOT_FOUND';
  end if;
  if v_session.expires_at <= now() and v_session.status not in ('committed', 'aborted') then
    update public.source_upload_sessions set status = 'expired' where id = v_session.id returning * into v_session;
    return to_jsonb(v_session);
  end if;
  if v_session.multipart_upload_id is not null
    and v_session.multipart_upload_id <> trim(p_multipart_upload_id) then
    raise exception using errcode = 'P0001', message = 'MULTIPART_ALREADY_ATTACHED';
  end if;
  if v_session.status not in ('reserved', 'uploading') then
    raise exception using errcode = 'P0001', message = 'UPLOAD_SESSION_NOT_ATTACHABLE';
  end if;
  update public.source_upload_sessions
  set status = 'uploading', multipart_upload_id = trim(p_multipart_upload_id)
  where id = v_session.id returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.maul_verify_source_upload(
  p_session_id uuid,
  p_etag text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.source_upload_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  select * into v_session from public.source_upload_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'UPLOAD_SESSION_NOT_FOUND';
  end if;
  if v_session.status = 'verified'
    and v_session.verified_size_bytes = p_size_bytes
    and v_session.verified_etag = trim(p_etag) then
    return to_jsonb(v_session);
  end if;
  if v_session.status <> 'uploading' or v_session.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'UPLOAD_SESSION_NOT_VERIFIABLE';
  end if;
  if p_size_bytes <> v_session.expected_size_bytes then
    raise exception using errcode = 'P0001', message = 'UPLOAD_SIZE_MISMATCH';
  end if;
  update public.source_upload_sessions
  set status = 'verified', verified_etag = trim(p_etag), verified_size_bytes = p_size_bytes
  where id = v_session.id returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.maul_abort_source_upload(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.source_upload_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  select * into v_session from public.source_upload_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'UPLOAD_SESSION_NOT_FOUND';
  end if;
  if v_session.status in ('committed', 'aborted') then
    return to_jsonb(v_session);
  end if;
  update public.source_upload_sessions
  set status = 'aborted', failure_code = 'CANCELLED_BY_USER'
  where id = v_session.id returning * into v_session;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.maul_commit_source_revision(
  p_session_id uuid,
  p_duration_ms integer default null,
  p_width integer default null,
  p_height integer default null,
  p_profile jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.source_upload_sessions%rowtype;
  v_asset public.source_assets%rowtype;
  v_revision public.source_revisions%rowtype;
  v_ingestion public.source_ingestions%rowtype;
  v_job public.durable_jobs%rowtype;
  v_next_revision bigint;
  v_used_bytes bigint;
  v_reserved_bytes bigint;
  v_limit_bytes bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  perform set_config('prometheus.source_control_plane', 'on', true);

  select * into v_session from public.source_upload_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'UPLOAD_SESSION_NOT_FOUND';
  end if;

  if v_session.status = 'committed' then
    select * into v_revision from public.source_revisions where upload_session_id = v_session.id;
    if v_revision.id is null or not exists (
      select 1 from public.projects
      where id = v_session.project_id
        and user_id = v_user_id
        and current_source_revision_id = v_revision.id
    ) then
      raise exception using errcode = 'P0001', message = 'SOURCE_SUPERSEDED_OR_NOT_FOUND';
    end if;
    select * into v_ingestion from public.source_ingestions where source_revision_id = v_revision.id;
    select * into v_job from public.durable_jobs where id = v_ingestion.durable_job_id;
    select * into v_asset from public.source_assets where id = v_revision.source_asset_id;
    return jsonb_build_object(
      'asset', to_jsonb(v_asset), 'sourceRevision', to_jsonb(v_revision),
      'ingestion', to_jsonb(v_ingestion), 'job', to_jsonb(v_job)
    );
  end if;

  if v_session.status <> 'verified'
    or v_session.verified_size_bytes <> v_session.expected_size_bytes
    or v_session.verified_etag is null then
    raise exception using errcode = 'P0001', message = 'UPLOAD_SESSION_NOT_COMMITTABLE';
  end if;

  -- Revalidate quota at the commit boundary. A verified session may outlive its
  -- reservation expiry, and concurrent reservations/commits must not overbook.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select coalesce(sum(size_bytes), 0)::bigint into v_used_bytes
  from public.source_assets where user_id = v_user_id;
  select coalesce(sum(expected_size_bytes), 0)::bigint into v_reserved_bytes
  from public.source_upload_sessions
  where user_id = v_user_id
    and id <> v_session.id
    and status in ('reserved', 'uploading', 'verified')
    and expires_at > now();
  v_limit_bytes := public.maul_storage_limit_bytes(v_user_id);
  if v_used_bytes + v_reserved_bytes + v_session.expected_size_bytes > v_limit_bytes then
    raise exception using errcode = 'P0001', message = 'STORAGE_QUOTA_EXCEEDED';
  end if;

  select source_revision + 1 into v_next_revision
  from public.projects
  where id = v_session.project_id and user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'PROJECT_NOT_OWNED';
  end if;

  select * into v_asset from public.source_assets where id = v_session.asset_id;
  if found then
    if v_asset.user_id <> v_user_id
      or v_asset.project_id <> v_session.project_id
      or v_asset.storage_bucket <> v_session.bucket
      or v_asset.storage_path <> v_session.object_key
      or v_asset.size_bytes <> v_session.expected_size_bytes then
      raise exception using errcode = 'P0001', message = 'SOURCE_ASSET_IDENTITY_CONFLICT';
    end if;
  else
    insert into public.source_assets (
      id, project_id, user_id, storage_bucket, storage_path,
      original_filename, mime_type, size_bytes, duration_ms, width, height, profile
    ) values (
      v_session.asset_id, v_session.project_id, v_user_id,
      v_session.bucket, v_session.object_key, v_session.original_filename,
      v_session.mime_type, v_session.expected_size_bytes,
      p_duration_ms, p_width, p_height, coalesce(p_profile, '{}'::jsonb)
    ) returning * into v_asset;
  end if;

  update public.source_revisions
  set state = 'superseded', superseded_at = now()
  where project_id = v_session.project_id and state = 'current';

  with superseded as (
    update public.source_ingestions
    set status = 'superseded', stage = 'superseded', progress = 100,
        error_code = 'SOURCE_SUPERSEDED',
        error_message = 'Project committed a newer source revision.',
        retryable = false, completed_at = now(),
        lease_token_hash = null, lease_expires_at = null
    where project_id = v_session.project_id
      and status in ('queued', 'leased', 'processing')
    returning durable_job_id
  )
  update public.durable_jobs
  set status = 'failed', progress = 100,
      error_message = 'SOURCE_SUPERSEDED: project committed a newer source revision.'
  where id in (select durable_job_id from superseded);

  insert into public.source_revisions (
    user_id, project_id, revision, source_asset_id, upload_session_id
  ) values (
    v_user_id, v_session.project_id, v_next_revision, v_session.asset_id, v_session.id
  ) returning * into v_revision;

  if v_session.mime_type like 'video/%' then
    insert into public.durable_jobs (
      id, user_id, project_id, type, status, progress, result_metadata
    ) values (
      v_session.asset_id, v_user_id, v_session.project_id,
      'video_analysis'::public.job_type, 'pending'::public.job_status, 0,
      jsonb_build_object(
        'pipeline_version', 2,
        'source_asset_id', v_session.asset_id,
        'source_revision_id', v_revision.id,
        'source_revision', v_next_revision,
        'source_bucket', v_session.bucket,
        'source_object_key', v_session.object_key,
        'source_etag', v_session.verified_etag,
        'source_size_bytes', v_session.expected_size_bytes,
        'source_mime_type', v_session.mime_type,
        'stage', 'queued'
      )
    ) returning * into v_job;

    insert into public.source_ingestions (
      user_id, project_id, source_revision_id, source_asset_id, durable_job_id
    ) values (
      v_user_id, v_session.project_id, v_revision.id, v_session.asset_id, v_job.id
    ) returning * into v_ingestion;
  end if;

  update public.projects
  set source_asset_id = v_session.asset_id,
      source_revision = v_next_revision,
      current_source_revision_id = v_revision.id
  where id = v_session.project_id;

  update public.source_upload_sessions
  set status = 'committed', committed_at = now()
  where id = v_session.id returning * into v_session;

  if v_ingestion.id is not null then
    insert into public.source_ingestion_events (
      ingestion_id, user_id, project_id, event_type, attempt, detail
    ) values (
      v_ingestion.id, v_user_id, v_session.project_id, 'source_revision_committed', 0,
      jsonb_build_object('sourceRevisionId', v_revision.id, 'sourceRevision', v_next_revision)
    );
  end if;

  return jsonb_build_object(
    'asset', to_jsonb(v_asset), 'sourceRevision', to_jsonb(v_revision),
    'ingestion', to_jsonb(v_ingestion), 'job', to_jsonb(v_job)
  );
end;
$$;

create or replace function public.maul_delete_source_asset_metadata(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.source_assets%rowtype;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  perform set_config('prometheus.source_control_plane', 'on', true);
  select * into v_asset from public.source_assets
  where id = p_asset_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SOURCE_ASSET_NOT_FOUND';
  end if;
  v_project_id := v_asset.project_id;
  perform 1 from public.projects where id = v_project_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = '42501', message = 'PROJECT_NOT_OWNED';
  end if;

  update public.source_ingestions
  set status = 'cancelled', stage = 'cancelled', progress = 100,
      error_code = 'SOURCE_DELETED', error_message = 'Source asset was deleted.',
      retryable = false, completed_at = now(), lease_token_hash = null, lease_expires_at = null
  where source_asset_id = p_asset_id and status in ('queued', 'leased', 'processing');
  update public.durable_jobs
  set status = 'failed', progress = 100, error_message = 'SOURCE_DELETED'
  where id in (
    select durable_job_id from public.source_ingestions where source_asset_id = p_asset_id
  ) and status in ('pending', 'processing');
  update public.source_revisions
  set state = 'superseded', superseded_at = coalesce(superseded_at, now())
  where source_asset_id = p_asset_id and state = 'current';
  update public.projects
  set source_asset_id = null,
      current_source_revision_id = null,
      source_revision = source_revision + 1
  where id = v_project_id and source_asset_id = p_asset_id;
  delete from public.source_assets where id = p_asset_id;
  return jsonb_build_object('deletedAssetId', p_asset_id, 'projectId', v_project_id);
end;
$$;

create or replace function public.maul_cancel_source_ingestion(p_durable_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingestion public.source_ingestions%rowtype;
  v_job public.durable_jobs%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  select * into v_ingestion from public.source_ingestions
  where durable_job_id = p_durable_job_id and user_id = v_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SOURCE_INGESTION_NOT_FOUND';
  end if;
  if v_ingestion.status in ('completed', 'failed', 'cancelled', 'superseded') then
    select * into v_job from public.durable_jobs where id = p_durable_job_id;
    return jsonb_build_object('ingestion', to_jsonb(v_ingestion), 'job', to_jsonb(v_job));
  end if;
  update public.source_ingestions
  set status = 'cancelled', stage = 'cancelled', progress = 100,
      error_code = 'CANCELLED_BY_USER', error_message = 'Cancelled by user.',
      retryable = true, completed_at = now(),
      lease_token_hash = null, lease_expires_at = null
  where id = v_ingestion.id returning * into v_ingestion;
  update public.durable_jobs
  set status = 'failed', progress = 100, error_message = 'CANCELLED_BY_USER'
  where id = p_durable_job_id returning * into v_job;
  insert into public.source_ingestion_events (ingestion_id, user_id, project_id, event_type, attempt)
  values (v_ingestion.id, v_user_id, v_ingestion.project_id, 'cancelled', v_ingestion.attempt);
  return jsonb_build_object('ingestion', to_jsonb(v_ingestion), 'job', to_jsonb(v_job));
end;
$$;

create or replace function public.maul_retry_source_ingestion(p_durable_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_ingestion public.source_ingestions%rowtype;
  v_job public.durable_jobs%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHORIZED';
  end if;
  select i.* into v_ingestion
  from public.source_ingestions i
  join public.projects p on p.id = i.project_id
  where i.durable_job_id = p_durable_job_id
    and i.user_id = v_user_id
    and p.current_source_revision_id = i.source_revision_id
  for update of i;
  if not found then
    raise exception using errcode = 'P0001', message = 'SOURCE_SUPERSEDED_OR_NOT_FOUND';
  end if;
  if v_ingestion.status not in ('failed', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'SOURCE_INGESTION_NOT_RETRYABLE';
  end if;
  if v_ingestion.attempt >= v_ingestion.max_attempts then
    raise exception using errcode = 'P0001', message = 'SOURCE_INGESTION_ATTEMPTS_EXHAUSTED';
  end if;
  update public.source_ingestions
  set status = 'queued', stage = 'queued', progress = 0,
      error_code = null, error_message = null, retryable = false,
      completed_at = null, leased_by = null, lease_token_hash = null,
      lease_expires_at = null, heartbeat_at = null
  where id = v_ingestion.id returning * into v_ingestion;
  update public.durable_jobs
  set status = 'pending', progress = 0, error_message = null,
      result_metadata = result_metadata || jsonb_build_object(
        'stage', 'retry_requested', 'retry_requested_at', now()
      )
  where id = p_durable_job_id returning * into v_job;
  insert into public.source_ingestion_events (ingestion_id, user_id, project_id, event_type, attempt)
  values (v_ingestion.id, v_user_id, v_ingestion.project_id, 'retry_requested', v_ingestion.attempt);
  return jsonb_build_object('ingestion', to_jsonb(v_ingestion), 'job', to_jsonb(v_job));
end;
$$;

create or replace function public.maul_reconcile_source_ingestions()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_superseded integer := 0;
  v_requeued integer := 0;
  v_failed integer := 0;
begin
  with stale as (
    update public.source_ingestions i
    set status = 'superseded', stage = 'superseded', progress = 100,
        error_code = 'SOURCE_SUPERSEDED', error_message = 'Project points to a newer source revision.',
        retryable = false, completed_at = now(), lease_token_hash = null, lease_expires_at = null
    from public.projects p
    where p.id = i.project_id
      and p.current_source_revision_id is distinct from i.source_revision_id
      and i.status in ('queued', 'leased', 'processing')
    returning i.durable_job_id
  ), jobs as (
    update public.durable_jobs j
    set status = 'failed', progress = 100, error_message = 'SOURCE_SUPERSEDED'
    where j.id in (select durable_job_id from stale)
    returning j.id
  ) select count(*) into v_superseded from jobs;

  with expired as (
    update public.source_ingestions
    set status = 'queued', stage = 'queued', progress = 0,
        leased_by = null, lease_token_hash = null, lease_expires_at = null,
        heartbeat_at = null, error_code = 'LEASE_EXPIRED',
        error_message = 'Worker lease expired; job requeued.', retryable = true
    where status in ('leased', 'processing')
      and lease_expires_at < now()
      and attempt < max_attempts
    returning durable_job_id
  ), jobs as (
    update public.durable_jobs j
    set status = 'pending', progress = 0, error_message = null
    where j.id in (select durable_job_id from expired)
    returning j.id
  ) select count(*) into v_requeued from jobs;

  with exhausted as (
    update public.source_ingestions
    set status = 'failed', stage = 'failed', progress = 100,
        lease_token_hash = null, lease_expires_at = null,
        error_code = 'LEASE_ATTEMPTS_EXHAUSTED',
        error_message = 'Worker lease expired after maximum attempts.',
        retryable = false, completed_at = now()
    where status in ('leased', 'processing')
      and lease_expires_at < now()
      and attempt >= max_attempts
    returning durable_job_id
  ), jobs as (
    update public.durable_jobs j
    set status = 'failed', progress = 100, error_message = 'LEASE_ATTEMPTS_EXHAUSTED'
    where j.id in (select durable_job_id from exhausted)
    returning j.id
  ) select count(*) into v_failed from jobs;

  return jsonb_build_object('superseded', v_superseded, 'requeued', v_requeued, 'failed', v_failed);
end;
$$;

create or replace function public.maul_claim_expired_source_upload_cleanup(p_limit integer default 25)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'INVALID_CLEANUP_LIMIT';
  end if;
  update public.source_upload_sessions
  set status = 'expired', failure_code = coalesce(failure_code, 'UPLOAD_SESSION_EXPIRED')
  where status in ('reserved', 'uploading', 'verified') and expires_at <= now();

  with candidates as (
    select id from public.source_upload_sessions
    where status in ('aborted', 'expired')
      and cleanup_completed_at is null
      and cleanup_attempts < 10
      and (cleanup_last_attempt_at is null or cleanup_last_attempt_at < now() - interval '1 minute')
    order by expires_at
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.source_upload_sessions sessions
    set cleanup_attempts = cleanup_attempts + 1,
        cleanup_last_attempt_at = now(), cleanup_error = null
    where sessions.id in (select id from candidates)
    returning sessions.*
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)), '[]'::jsonb) into v_rows from claimed;
  return v_rows;
end;
$$;

create or replace function public.maul_ack_source_upload_cleanup(p_session_id uuid, p_error text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.source_upload_sessions%rowtype;
begin
  update public.source_upload_sessions
  set cleanup_completed_at = case when nullif(trim(p_error), '') is null then now() else null end,
      cleanup_error = nullif(left(trim(p_error), 2000), '')
  where id = p_session_id and status in ('aborted', 'expired')
  returning * into v_session;
  if not found then
    raise exception using errcode = 'P0002', message = 'UPLOAD_SESSION_NOT_FOUND';
  end if;
  return to_jsonb(v_session);
end;
$$;

create or replace function public.maul_lease_source_ingestion(
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ingestion public.source_ingestions%rowtype;
  v_asset public.source_assets%rowtype;
  v_revision public.source_revisions%rowtype;
  v_token text;
begin
  if nullif(trim(p_worker_id), '') is null then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_ID';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception using errcode = '22023', message = 'INVALID_LEASE_DURATION';
  end if;
  perform public.maul_reconcile_source_ingestions();

  select i.* into v_ingestion
  from public.source_ingestions i
  join public.projects p on p.id = i.project_id
  where i.status = 'queued'
    and i.attempt < i.max_attempts
    and p.current_source_revision_id = i.source_revision_id
  order by i.created_at
  for update of i skip locked
  limit 1;
  if not found then
    return null;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  update public.source_ingestions
  set status = 'leased', stage = 'materializing_source', progress = greatest(progress, 1),
      attempt = attempt + 1, leased_by = trim(p_worker_id),
      lease_generation = lease_generation + 1,
      lease_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      heartbeat_at = now(), error_code = null, error_message = null, retryable = false
  where id = v_ingestion.id returning * into v_ingestion;

  update public.durable_jobs
  set status = 'processing', progress = v_ingestion.progress, error_message = null,
      result_metadata = result_metadata || jsonb_build_object(
        'stage', v_ingestion.stage,
        'source_ingestion_id', v_ingestion.id,
        'lease_generation', v_ingestion.lease_generation
      )
  where id = v_ingestion.durable_job_id;

  select * into v_asset from public.source_assets where id = v_ingestion.source_asset_id;
  select * into v_revision from public.source_revisions where id = v_ingestion.source_revision_id;
  insert into public.source_ingestion_events (ingestion_id, user_id, project_id, event_type, attempt, detail)
  values (v_ingestion.id, v_ingestion.user_id, v_ingestion.project_id, 'leased', v_ingestion.attempt,
    jsonb_build_object('workerId', trim(p_worker_id), 'leaseGeneration', v_ingestion.lease_generation));

  return jsonb_build_object(
    'ingestion', to_jsonb(v_ingestion),
    'sourceRevision', to_jsonb(v_revision),
    'asset', to_jsonb(v_asset),
    'leaseToken', v_token
  );
end;
$$;

create or replace function public.maul_heartbeat_source_ingestion(
  p_ingestion_id uuid,
  p_lease_token text,
  p_progress integer,
  p_stage text,
  p_lease_seconds integer default 300,
  p_result_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ingestion public.source_ingestions%rowtype;
begin
  select i.* into v_ingestion
  from public.source_ingestions i
  where i.id = p_ingestion_id for update;
  if not found
    or v_ingestion.lease_token_hash is distinct from encode(digest(p_lease_token, 'sha256'), 'hex') then
    raise exception using errcode = '42501', message = 'INVALID_INGESTION_LEASE';
  end if;
  if v_ingestion.status not in ('leased', 'processing') or v_ingestion.lease_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'INGESTION_LEASE_EXPIRED';
  end if;
  if not exists (
    select 1 from public.projects
    where id = v_ingestion.project_id and current_source_revision_id = v_ingestion.source_revision_id
  ) then
    update public.source_ingestions
    set status = 'superseded', stage = 'superseded', progress = 100,
        error_code = 'SOURCE_SUPERSEDED', error_message = 'Project points to a newer source revision.',
        completed_at = now(), lease_token_hash = null, lease_expires_at = null
    where id = v_ingestion.id returning * into v_ingestion;
    update public.durable_jobs set status = 'failed', progress = 100, error_message = 'SOURCE_SUPERSEDED'
    where id = v_ingestion.durable_job_id;
    return to_jsonb(v_ingestion);
  end if;
  update public.source_ingestions
  set status = 'processing', stage = trim(p_stage),
      progress = greatest(progress, least(99, greatest(1, p_progress))),
      heartbeat_at = now(), lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      result_metadata = result_metadata || coalesce(p_result_patch, '{}'::jsonb)
  where id = v_ingestion.id returning * into v_ingestion;
  update public.durable_jobs
  set status = 'processing', progress = v_ingestion.progress,
      result_metadata = result_metadata || coalesce(p_result_patch, '{}'::jsonb) || jsonb_build_object('stage', v_ingestion.stage)
  where id = v_ingestion.durable_job_id;
  return to_jsonb(v_ingestion);
end;
$$;

create or replace function public.maul_complete_source_ingestion(
  p_ingestion_id uuid,
  p_lease_token text,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ingestion public.source_ingestions%rowtype;
  v_snapshot public.source_observation_snapshots%rowtype;
  v_observation jsonb;
begin
  select * into v_ingestion from public.source_ingestions where id = p_ingestion_id for update;
  if not found
    or v_ingestion.lease_token_hash is distinct from encode(digest(p_lease_token, 'sha256'), 'hex') then
    raise exception using errcode = '42501', message = 'INVALID_INGESTION_LEASE';
  end if;
  if v_ingestion.status = 'completed' then
    return to_jsonb(v_ingestion);
  end if;
  if v_ingestion.status not in ('leased', 'processing') or v_ingestion.lease_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'INGESTION_LEASE_EXPIRED';
  end if;
  if not exists (
    select 1 from public.projects
    where id = v_ingestion.project_id and current_source_revision_id = v_ingestion.source_revision_id
  ) then
    update public.source_ingestions
    set status = 'superseded', stage = 'superseded', progress = 100,
        error_code = 'SOURCE_SUPERSEDED', completed_at = now(),
        lease_token_hash = null, lease_expires_at = null
    where id = v_ingestion.id returning * into v_ingestion;
    update public.durable_jobs set status = 'failed', progress = 100, error_message = 'SOURCE_SUPERSEDED'
    where id = v_ingestion.durable_job_id;
    return to_jsonb(v_ingestion);
  end if;

  v_observation := coalesce(p_result -> 'observation_snapshot', p_result, '{}'::jsonb);
  insert into public.source_observation_snapshots as snapshots (
    user_id, project_id, source_revision_id, ingestion_id, payload, payload_sha256
  ) values (
    v_ingestion.user_id, v_ingestion.project_id, v_ingestion.source_revision_id,
    v_ingestion.id, v_observation,
    encode(digest(v_observation::text, 'sha256'), 'hex')
  ) on conflict (ingestion_id) do update
    set payload = snapshots.payload
  returning * into v_snapshot;

  update public.source_ingestions
  set status = 'completed', stage = 'handoff_ready', progress = 100,
      result_metadata = coalesce(p_result, '{}'::jsonb), result_snapshot_id = v_snapshot.id,
      error_code = null, error_message = null, retryable = false,
      lease_expires_at = null, completed_at = now()
  where id = v_ingestion.id returning * into v_ingestion;
  update public.durable_jobs
  set status = 'completed', progress = 100, error_message = null,
      result_metadata = result_metadata || coalesce(p_result, '{}'::jsonb) || jsonb_build_object(
        'stage', 'handoff_ready', 'observation_snapshot_id', v_snapshot.id
      )
  where id = v_ingestion.durable_job_id;
  insert into public.source_ingestion_events (ingestion_id, user_id, project_id, event_type, attempt)
  values (v_ingestion.id, v_ingestion.user_id, v_ingestion.project_id, 'completed', v_ingestion.attempt);
  return jsonb_build_object('ingestion', to_jsonb(v_ingestion), 'observationSnapshot', to_jsonb(v_snapshot));
end;
$$;

create or replace function public.maul_fail_source_ingestion(
  p_ingestion_id uuid,
  p_lease_token text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ingestion public.source_ingestions%rowtype;
  v_requeue boolean;
begin
  select * into v_ingestion from public.source_ingestions where id = p_ingestion_id for update;
  if not found
    or v_ingestion.lease_token_hash is distinct from encode(digest(p_lease_token, 'sha256'), 'hex') then
    raise exception using errcode = '42501', message = 'INVALID_INGESTION_LEASE';
  end if;
  if v_ingestion.status in ('completed', 'cancelled', 'superseded') then
    return to_jsonb(v_ingestion);
  end if;
  v_requeue := p_retryable and v_ingestion.attempt < v_ingestion.max_attempts;
  update public.source_ingestions
  set status = case when v_requeue then 'queued' else 'failed' end,
      stage = case when v_requeue then 'queued' else 'failed' end,
      progress = case when v_requeue then 0 else 100 end,
      error_code = trim(p_error_code), error_message = left(p_error_message, 2000),
      retryable = v_requeue, leased_by = null, lease_token_hash = null,
      lease_expires_at = null, heartbeat_at = null,
      completed_at = case when v_requeue then null else now() end
  where id = v_ingestion.id returning * into v_ingestion;
  update public.durable_jobs
  set status = case when v_requeue then 'pending'::public.job_status else 'failed'::public.job_status end,
      progress = case when v_requeue then 0 else 100 end,
      error_message = case when v_requeue then null else left(p_error_code || ': ' || p_error_message, 2000) end,
      result_metadata = result_metadata || jsonb_build_object('stage', v_ingestion.stage, 'error_code', p_error_code)
  where id = v_ingestion.durable_job_id;
  insert into public.source_ingestion_events (ingestion_id, user_id, project_id, event_type, attempt, detail)
  values (v_ingestion.id, v_ingestion.user_id, v_ingestion.project_id,
    case when v_requeue then 'requeued' else 'failed' end, v_ingestion.attempt,
    jsonb_build_object('errorCode', p_error_code, 'retryable', v_requeue));
  return to_jsonb(v_ingestion);
end;
$$;

revoke all on function public.maul_storage_limit_bytes(uuid) from public, anon, authenticated;
revoke all on function public.maul_reserve_source_upload(uuid, uuid, uuid, text, text, bigint, text, text, timestamptz) from public, anon;
revoke all on function public.maul_attach_source_multipart(uuid, text) from public, anon;
revoke all on function public.maul_verify_source_upload(uuid, text, bigint) from public, anon;
revoke all on function public.maul_abort_source_upload(uuid) from public, anon;
revoke all on function public.maul_commit_source_revision(uuid, integer, integer, integer, jsonb) from public, anon;
revoke all on function public.maul_cancel_source_ingestion(uuid) from public, anon;
revoke all on function public.maul_retry_source_ingestion(uuid) from public, anon;
revoke all on function public.maul_delete_source_asset_metadata(uuid) from public, anon;
revoke all on function public.maul_reconcile_source_ingestions() from public, anon, authenticated;
revoke all on function public.maul_claim_expired_source_upload_cleanup(integer) from public, anon, authenticated;
revoke all on function public.maul_ack_source_upload_cleanup(uuid, text) from public, anon, authenticated;
revoke all on function public.maul_lease_source_ingestion(text, integer) from public, anon, authenticated;
revoke all on function public.maul_heartbeat_source_ingestion(uuid, text, integer, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.maul_complete_source_ingestion(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.maul_fail_source_ingestion(uuid, text, text, text, boolean) from public, anon, authenticated;

grant execute on function public.maul_reserve_source_upload(uuid, uuid, uuid, text, text, bigint, text, text, timestamptz) to authenticated;
grant execute on function public.maul_attach_source_multipart(uuid, text) to authenticated;
grant execute on function public.maul_verify_source_upload(uuid, text, bigint) to authenticated;
grant execute on function public.maul_abort_source_upload(uuid) to authenticated;
grant execute on function public.maul_commit_source_revision(uuid, integer, integer, integer, jsonb) to authenticated;
grant execute on function public.maul_cancel_source_ingestion(uuid) to authenticated;
grant execute on function public.maul_retry_source_ingestion(uuid) to authenticated;
grant execute on function public.maul_delete_source_asset_metadata(uuid) to authenticated;
grant execute on function public.maul_reconcile_source_ingestions() to service_role;
grant execute on function public.maul_claim_expired_source_upload_cleanup(integer) to service_role;
grant execute on function public.maul_ack_source_upload_cleanup(uuid, text) to service_role;
grant execute on function public.maul_lease_source_ingestion(text, integer) to service_role;
grant execute on function public.maul_heartbeat_source_ingestion(uuid, text, integer, text, integer, jsonb) to service_role;
grant execute on function public.maul_complete_source_ingestion(uuid, text, jsonb) to service_role;
grant execute on function public.maul_fail_source_ingestion(uuid, text, text, text, boolean) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'source_ingestions'
  ) then
    alter publication supabase_realtime add table public.source_ingestions;
  end if;
end;
$$;

-- Chat reads only a bounded, playhead-aware slice of the immutable source snapshot.
-- The full transcript remains durable in source_observation_snapshots; it is never sent
-- wholesale to the model or browser on each chat turn.
create or replace function public.maul_get_chat_video_context(
  p_project_id uuid,
  p_playhead_ms bigint default null,
  p_window_ms integer default 45000
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
  v_status text;
  v_filename text;
  v_mime_type text;
  v_start bigint;
  v_end bigint;
  v_duration bigint;
  v_window integer := greatest(15000, least(coalesce(p_window_ms, 45000), 90000));
  v_words jsonb := '[]'::jsonb;
  v_motion jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.projects where id = p_project_id and user_id = auth.uid()
  ) then
    raise exception 'Project not found' using errcode = 'P0001';
  end if;

  select snapshots.payload, ingestions.status, assets.original_filename, assets.mime_type
    into v_payload, v_status, v_filename, v_mime_type
  from public.source_observation_snapshots snapshots
  join public.source_ingestions ingestions on ingestions.id = snapshots.ingestion_id
  join public.source_revisions revisions on revisions.id = snapshots.source_revision_id
  join public.source_assets assets on assets.id = revisions.source_asset_id
  where snapshots.project_id = p_project_id
  order by snapshots.created_at desc
  limit 1;

  if v_payload is null then
    select status into v_status from public.source_ingestions
    where project_id = p_project_id
    order by created_at desc
    limit 1;
    return jsonb_build_object('status', coalesce(v_status, 'not_started'), 'ready', false);
  end if;

  v_duration := coalesce((v_payload #>> '{metadata,durationMs}')::bigint, 0);
  v_start := greatest(0, least(coalesce(p_playhead_ms, 0) - v_window / 2, greatest(0, v_duration - v_window)));
  v_end := case when v_duration > 0 then least(v_duration, v_start + v_window) else v_start + v_window end;

  select coalesce(jsonb_agg(word order by coalesce((word ->> 'start_ms')::bigint, 0)), '[]'::jsonb)
    into v_words
  from jsonb_array_elements(coalesce(v_payload #> '{transcript,mergedWords}', '[]'::jsonb)) word
  where coalesce((word ->> 'start_ms')::bigint, 0) <= v_end
    and coalesce((word ->> 'end_ms')::bigint, 0) >= v_start;

  select coalesce(jsonb_agg(segment order by coalesce((segment ->> 'startMs')::bigint, 0)), '[]'::jsonb)
    into v_motion
  from jsonb_array_elements(coalesce(v_payload #> '{motion,segments}', '[]'::jsonb)) segment
  where coalesce((segment ->> 'startMs')::bigint, 0) <= v_end
    and coalesce((segment ->> 'endMs')::bigint, 0) >= v_start;

  return jsonb_build_object(
    'status', coalesce(v_status, 'completed'),
    'ready', true,
    'range_ms', jsonb_build_array(v_start, v_end),
    'filename', v_filename,
    'mime_type', v_mime_type,
    'metadata', coalesce(v_payload -> 'metadata', '{}'::jsonb),
    'transcript', jsonb_build_object('mergedWords', v_words),
    'motion', jsonb_build_object('segments', v_motion),
    'editorial_analysis', coalesce(v_payload -> 'editorialAnalysis', '{}'::jsonb)
  );
end;
$$;

revoke all on function public.maul_get_chat_video_context(uuid, bigint, integer) from public, anon;
grant execute on function public.maul_get_chat_video_context(uuid, bigint, integer) to authenticated, service_role;