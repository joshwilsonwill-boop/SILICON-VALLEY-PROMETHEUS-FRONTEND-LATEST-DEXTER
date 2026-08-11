import {
  resolveModalBackendConfig,
  type ModalBackendEnvironment,
} from '@/lib/server/modal-backend-proxy'

export async function dispatchModalSourceAnalysis({
  request,
  env,
  fetchImpl = fetch,
}: {
  request: {jobId: string; sourceAssetId: string}
  env: ModalBackendEnvironment
  fetchImpl?: typeof fetch
}): Promise<{callId: string; status: string}> {
  const config = resolveModalBackendConfig(env)
  const response = await fetchImpl(`${config.baseUrl}/api/source-analysis/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Modal-Key': config.proxyKey,
      'Modal-Secret': config.proxySecret,
    },
    body: JSON.stringify(request),
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({})) as {callId?: unknown; status?: unknown; error?: unknown}
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Modal source analysis returned HTTP ${response.status}.`)
  }
  if (typeof body.callId !== 'string' || !body.callId) {
    throw new Error('Modal source analysis response omitted callId.')
  }
  return {callId: body.callId, status: typeof body.status === 'string' ? body.status : 'queued'}
}
