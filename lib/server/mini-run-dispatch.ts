import {getPresignedGetUrl} from '@/lib/r2/presigned-url'
import {
  resolveMiniRunConfig,
  type MiniRunEnvironment,
} from '@/lib/server/mini-run-proxy'
import {buildMiniRunRenderPayload} from '@/lib/server/mini-run-render-payload'

/**
 * Server-side dispatch to the Prometheus Mini-Runs long-form→short-form render
 * pipeline. This mirrors `dispatchModalSourceAnalysis`: it runs in the Next.js
 * server process (never in the browser), injects the workspace Modal proxy
 * credentials, and hands the pipeline a long-lived presigned URL for the source
 * object so the asynchronously-executing worker can download it even after the
 * upload completes.
 */

// The pipeline worker may pick the job up well after the upload response has
// returned, so use a day-long presigned URL rather than the short default.
const SOURCE_URL_EXPIRES_SECONDS = 24 * 60 * 60

export type MiniRunRenderDispatchRequest = {
  projectId: string
  sourceAssetId: string
  bucket: string
  storagePath: string
  mimeType: string
  durationMs?: number
  width?: number
  height?: number
  jobId?: string
  editorialRevision?: number
  songPolicy?: 'auto' | 'disabled'
}

export type MiniRunRenderDispatchEnvironment = MiniRunEnvironment

export async function buildMiniRunSourceUrl(bucket: string, storagePath: string): Promise<string> {
  return getPresignedGetUrl(bucket, storagePath, undefined, SOURCE_URL_EXPIRES_SECONDS)
}

export async function dispatchMiniRunRender({
  request,
  env,
  fetchImpl = fetch,
}: {
  request: MiniRunRenderDispatchRequest
  env: MiniRunRenderDispatchEnvironment
  fetchImpl?: typeof fetch
}): Promise<{jobId: string; pipelineJobId: string; status: string}> {
  const config = resolveMiniRunConfig(env)
  const sourceUrl = await buildMiniRunSourceUrl(request.bucket, request.storagePath)

  const body = buildMiniRunRenderPayload({
    sourceUrl,
    source: {durationMs: request.durationMs, width: request.width, height: request.height},
    shot: {songPolicy: request.songPolicy},
    jobId: request.jobId ?? request.projectId,
  })
  const metadata = body.metadata as Record<string, unknown>
  metadata.pipeline = 'maul'

  const response = await fetchImpl(`${config.baseUrl}/api/pipeline/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Modal-Key': config.proxyKey,
      'Modal-Secret': config.proxySecret,
    },
    body: JSON.stringify({
      ...body,
      metadata: {...metadata, editorialRevision: request.editorialRevision},
    }),
    cache: 'no-store',
  })

  const responseBody = (await response.json().catch(() => ({}))) as {
    jobId?: unknown
    pipelineJobId?: unknown
    status?: unknown
    error?: unknown
  }

  if (!response.ok) {
    throw new Error(
      typeof responseBody.error === 'string' ? responseBody.error : `Mini-Run render returned HTTP ${response.status}.`,
    )
  }
  if (typeof responseBody.jobId !== 'string' || !responseBody.jobId) {
    throw new Error('Mini-Run render response omitted jobId.')
  }

  return {
    jobId: responseBody.jobId,
    pipelineJobId: typeof responseBody.pipelineJobId === 'string' ? responseBody.pipelineJobId : '',
    status: typeof responseBody.status === 'string' ? responseBody.status : 'queued',
  }
}
