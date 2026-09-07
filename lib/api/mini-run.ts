const proxyRoot = '/api/mini-run'
const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type MiniRunRenderSource =
  | {url: string}
  | {path: string}
  | {sourceUrl: string}
  | string

export type MiniRunRenderRequest = {
  source: MiniRunRenderSource
  metadata?: {
    pipeline?: 'maul' | 'joseph'
    durationMs?: number
    durationSec?: number
    width?: number
    height?: number
  }
  design?: Record<string, unknown>
  audio?: Record<string, unknown>
  selectedWindow?: Record<string, unknown>
  targetChunkWords?: number
  maxChunkWords?: number
  jobId?: string
}

export type MiniRunRenderSubmission = {
  jobId: string
  pipelineJobId: string
  status: string
  statusUrl: string
}

export type MiniRunRenderStatus = {
  jobId: string
  state: string
  status: string
  pipelineJobId?: string
  outputUrl?: string
  r2Key?: string | null
  outputPath?: string
  chunkCount?: number
  error?: string
  failedReason?: string | null
}

export type MiniRunLongformRequest = {
  source: MiniRunRenderSource
  nClips?: number
  prompt?: string
  brandPreferences?: Record<string, unknown>
  design?: Record<string, unknown>
  audio?: Record<string, unknown>
  batchJobId?: string
  jobIdPrefix?: string
  sync?: boolean
}

export type MiniRunLongformSubmission = {
  batchJobId: string
  status: string
  nClips: number
  pollUrl: string
}

export type MiniRunLongformClip = {
  clipIndex: number
  rank: number
  jobId: string
  window: {
    sourceStartMs: number
    sourceEndMs: number
    durationMs: number
  }
  viralMetadata: {
    viralityScore?: number
    hook?: string
    reason?: string
  }
  success: boolean
  error?: string | null
  outputPath?: string
  outputUrl?: string
  r2Key?: string | null
  chunkCount?: number
  stageTimingsMs?: Record<string, number>
}

export type MiniRunLongformBatchResult = {
  batchId?: string
  sourcePath?: string
  clipCount?: number
  succeeded?: number
  clips?: MiniRunLongformClip[]
  stageTimingsMs?: {
    transcribe?: number
    viralSelect?: number
    render?: number
    total?: number
  }
}

export type MiniRunLongformStatus = {
  batchJobId: string
  state: string
  status: string
  failedReason?: string | null
  error?: string
  returnvalue?: MiniRunLongformBatchResult | null
  clips?: MiniRunLongformClip[]
  clipCount?: number
  succeeded?: number
}


// The gateway wraps the pipeline job result in `returnvalue`. We surface the
// fields the editor cares about (the finished MP4 URL, pipeline ids, chunk count)
// onto the top level so callers get a stable shape regardless of row layout.
type MiniRunJobEnvelope = {
  ok?: boolean
  jobId?: string
  state?: string
  status?: string
  failedReason?: string | null
  pipeline?: string
  pipelineJobId?: string
  outputUrl?: string
  r2Key?: string | null
  outputPath?: string
  chunkCount?: number
  returnvalue?: MiniRunRenderStatus | null
  response?: MiniRunRenderStatus | null
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & {error?: string}
  if (!response.ok) {
    throw new Error(body?.error || `Mini-Run request failed with status ${response.status}.`)
  }
  return body
}

function identifier(value: string, label: string) {
  if (!safeIdentifierPattern.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${label}.`)
  }
  return encodeURIComponent(value)
}

function normalizeEnvelope(payload: MiniRunJobEnvelope): MiniRunRenderStatus {
  const inner: Partial<MiniRunRenderStatus> = payload.returnvalue ?? payload.response ?? {}
  return {
    jobId: payload.jobId ?? '',
    state: payload.state ?? payload.status ?? inner.state ?? inner.status ?? 'unknown',
    status: payload.status ?? payload.state ?? inner.status ?? inner.state ?? 'unknown',
    pipelineJobId: payload.pipelineJobId ?? inner.pipelineJobId,
    outputUrl: payload.outputUrl ?? inner.outputUrl,
    r2Key: payload.r2Key ?? inner.r2Key,
    outputPath: payload.outputPath ?? inner.outputPath,
    chunkCount: payload.chunkCount ?? inner.chunkCount,
    failedReason: payload.failedReason ?? inner.failedReason ?? null,
    error: payload.failedReason ?? inner.error ?? (payload.ok === false ? 'Mini-Run job failed.' : undefined),
  }
}

export function createMiniRunClient(fetchImpl: FetchLike = fetch) {
  const jsonRequest = async <T>(path: string, init?: RequestInit) => {
    const response = await fetchImpl(`${proxyRoot}${path}`, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.body ? {'Content-Type': 'application/json', ...init.headers} : init?.headers,
    })
    return responseJson<T>(response)
  }

  return {
    health: () => jsonRequest<{ok: boolean; state?: string; status?: string}>('/health'),

    transcribe: async <TResponse = unknown>(payload: unknown) =>
      jsonRequest<TResponse>('/api/pipeline/transcribe', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    chunkTranscript: async <TResponse = unknown>(payload: unknown) =>
      jsonRequest<TResponse>('/api/pipeline/chunk', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    chunkVideo: async <TResponse = unknown>(payload: unknown) =>
      jsonRequest<TResponse>('/api/pipeline/video_chunker', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    dispatchRender: async (request: MiniRunRenderRequest) => {
      const envelope = await jsonRequest<{
        jobId: string
        pipelineJobId?: string
        status?: string
        pipeline?: string
      }>('/api/pipeline/render', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      const jobId = envelope.jobId
      if (!jobId) throw new Error('Mini-Run render response omitted jobId.')
      return {
        jobId,
        pipelineJobId: envelope.pipelineJobId ?? '',
        status: envelope.status ?? 'queued',
        statusUrl: `${proxyRoot}/api/pipeline/job/${identifier(jobId, 'job ID')}`,
      } satisfies MiniRunRenderSubmission
    },

    getRenderStatus: async (jobId: string) => {
      const envelope = await jsonRequest<MiniRunJobEnvelope>(
        `/api/pipeline/job/${identifier(jobId, 'job ID')}`,
      )
      return normalizeEnvelope(envelope)
    },

    dispatchLongform: async (request: MiniRunLongformRequest) => {
      const envelope = await jsonRequest<{
        batchJobId: string
        status?: string
        nClips?: number
        pollUrl?: string
      }>('/api/pipeline/longform', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      const batchJobId = envelope.batchJobId
      if (!batchJobId) throw new Error('Mini-Run longform dispatch response omitted batchJobId.')
      return {
        batchJobId,
        status: envelope.status ?? 'queued',
        nClips: envelope.nClips ?? request.nClips ?? 4,
        pollUrl: `${proxyRoot}/api/pipeline/longform/${identifier(batchJobId, 'batch job ID')}`,
      } satisfies MiniRunLongformSubmission
    },

    getLongformStatus: async (batchJobId: string): Promise<MiniRunLongformStatus> => {
      const envelope = await jsonRequest<{
        ok?: boolean
        batchJobId?: string
        state?: string
        status?: string
        returnvalue?: MiniRunLongformBatchResult | null
        failedReason?: string | null
        error?: string
      }>(`/api/pipeline/longform/${identifier(batchJobId, 'batch job ID')}`)

      const state = envelope.state ?? envelope.status ?? 'unknown'
      const status = envelope.status ?? envelope.state ?? 'unknown'
      const ret = envelope.returnvalue ?? null
      const clips = ret?.clips ?? []

      return {
        batchJobId: envelope.batchJobId ?? batchJobId,
        state,
        status,
        failedReason: envelope.failedReason ?? null,
        error:
          envelope.failedReason ??
          envelope.error ??
          (envelope.ok === false ? 'Longform viral batch failed.' : undefined),
        returnvalue: ret,
        clips,
        clipCount: ret?.clipCount ?? clips.length,
        succeeded: ret?.succeeded ?? clips.filter((c) => c.success).length,
      }
    },

  }
}

export const miniRun = createMiniRunClient()
