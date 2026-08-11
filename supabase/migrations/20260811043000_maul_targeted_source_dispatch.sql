-- Push-driven source analysis: a Modal call leases only the durable job that
-- caused it to wake. Duplicate dispatches safely return null after the first
-- worker owns or completes the job.
create or replace function public.maul_lease_source_ingestion_by_job(
  p_durable_job_id uuid,
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
  where i.durable_job_id = p_durable_job_id
    and i.status = 'queued'
    and i.attempt < i.max_attempts
    and p.current_source_revision_id = i.source_revision_id
  for update of i skip locked;

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
  where id = v_ingestion.id
  returning * into v_ingestion;

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
  values (
    v_ingestion.id, v_ingestion.user_id, v_ingestion.project_id, 'leased', v_ingestion.attempt,
    jsonb_build_object('workerId', trim(p_worker_id), 'leaseGeneration', v_ingestion.lease_generation, 'dispatch', 'push')
  );

  return jsonb_build_object(
    'ingestion', to_jsonb(v_ingestion),
    'sourceRevision', to_jsonb(v_revision),
    'asset', to_jsonb(v_asset),
    'leaseToken', v_token
  );
end;
$$;

revoke all on function public.maul_lease_source_ingestion_by_job(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.maul_lease_source_ingestion_by_job(uuid, text, integer)
  to service_role;
