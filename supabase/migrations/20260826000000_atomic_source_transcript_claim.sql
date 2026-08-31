-- Serialize AssemblyAI dispatches for one source asset. The claim token is
-- replaced by the real provider job ID only by the caller that won the claim.
create or replace function public.maul_claim_source_asset_transcription(
  p_asset_id uuid,
  p_claim_token text,
  p_force boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_asset public.source_assets%rowtype;
begin
  if nullif(trim(p_claim_token), '') is null then
    raise exception using errcode = '22023', message = 'INVALID_TRANSCRIPT_CLAIM_TOKEN';
  end if;

  update public.source_assets
  set transcript_job_id = p_claim_token,
      transcript_provider = 'assemblyai',
      transcript_status = 'queued',
      transcript_started_at = now(),
      transcript_error = null,
      transcript_r2_key = case when p_force then null else transcript_r2_key end,
      transcript_segments = case when p_force then null else transcript_segments end,
      transcript_text = case when p_force then null else transcript_text end,
      transcript_completed_at = case when p_force then null else transcript_completed_at end,
      transcript_synced_at = case when p_force then null else transcript_synced_at end
  where id = p_asset_id
    and (
      transcript_status is null
      or transcript_status in ('idle', 'failed')
      or (p_force and transcript_status = 'completed')
    )
  returning * into v_asset;

  if found then
    return jsonb_build_object('claimed', true, 'status', 'queued', 'transcriptJobId', p_claim_token);
  end if;

  select * into v_asset from public.source_assets where id = p_asset_id;
  if not found then
    return jsonb_build_object('claimed', false, 'status', 'missing');
  end if;
  return jsonb_build_object('claimed', false, 'status', coalesce(v_asset.transcript_status, 'idle'), 'transcriptJobId', v_asset.transcript_job_id);
end;
$$;

grant execute on function public.maul_claim_source_asset_transcription(uuid, text, boolean) to authenticated, service_role;
