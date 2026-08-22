const proxyRoot = '/api/modal-backend'
const landscapeRoot = '/api/landscape-backend'
const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type PipelineRenderSubmission = {
  jobId: string
  status: 'queued'
  pipeline: string
  pipelineJobId: string
  data?: unknown
}

export type PipelineJobStatus = {
  ok: boolean
  state: 'queued' | 'processing' | 'completed' | 'failed'
  status: string
  returnvalue?: {outputUrl?: string}
  failedReason?: string
}

export type LandscapeRunSubmission = {
  ok: boolean
  status: 'queued' | 'processing' | 'completed' | 'failed'
  runId?: string
  error?: string
}

export type LandscapeRunData = Record<string, unknown>

export type ChunkResponse = {
  chunks?: Array<{text: string; startMs?: number; endMs?: number}>
  [key: string]: unknown
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & {error?: string}
  if (!response.ok) {
    throw new Error(body?.error || `Backend request failed with status ${response.status}.`)
  }
  return body
}

function identifier(value: string, label: string) {
  if (!safeIdentifierPattern.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${label}.`)
  }
  return encodeURIComponent(value)
}

const DEFAULT_CLIENT_TIMEOUT_MS = 30_000
const LANDSCAPE_RUN_CLIENT_TIMEOUT_MS = 15 * 60 * 1000

export function createModalCoreClient(fetchImpl: FetchLike = fetch) {
  const jsonRequest = async <T>(
    path: string,
    init?: RequestInit,
    timeoutMs: number = DEFAULT_CLIENT_TIMEOUT_MS,
  ) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
    const response = await fetchImpl(path, {
      ...init,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.body ? {'Content-Type': 'application/json', ...init.headers} : init?.headers,
    })
    return responseJson<T>(response)
  }

  const textRequest = async (
    path: string,
    init?: RequestInit,
    timeoutMs: number = DEFAULT_CLIENT_TIMEOUT_MS,
  ) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal
    const response = await fetchImpl(path, {
      ...init,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.headers,
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {error?: string} | null
      throw new Error(body?.error || `Backend request failed with status ${response.status}.`)
    }
    return response.text()
  }

  return {
    /** Mini-run liveness check. */
    health: () => jsonRequest<{ok: boolean}>('/api/modal-backend/health'),

    /** Landscape liveness check. */
    landscapeHealth: () => jsonRequest<{ok: boolean}>('/api/landscape-backend/health'),

    /** AssemblyAI transcription via mini-run pipeline (returns words + chunks). */
    transcribe: (payload: unknown) =>
      jsonRequest<unknown>('/api/modal-backend/api/pipeline/transcribe', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** Pure 3-word-priority chunker (max 5). */
    chunk: (payload: unknown) =>
      jsonRequest<ChunkResponse>('/api/modal-backend/api/pipeline/chunk', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** FFmpeg segment cut by boundaries. */
    videoChunker: (payload: unknown) =>
      jsonRequest<unknown>('/api/modal-backend/api/pipeline/video_chunker', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** Segment + RVM matte_worker. */
    matte: (payload: unknown) =>
      jsonRequest<unknown>('/api/modal-backend/api/pipeline/matte', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /**
     * Main mini-run dispatch. Returns a queued job immediately.
     * The frontend should include `durationSec`/`width`/`height` (or an
     * explicit `pipeline`) in the payload so the backend classifier selects
     * the correct studio.
     */
    dispatchRender: (payload: {source: string; pipeline?: string; metadata?: Record<string, unknown>}) =>
      jsonRequest<PipelineRenderSubmission>('/api/modal-backend/api/pipeline/render', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /**
     * Poll mini-run pipeline job status. jobId is minted by the backend
     * (job_<hex>_<hex> or maul:<replayKey>).
     */
    getPipelineJob: (jobId: string) =>
      jsonRequest<PipelineJobStatus>(
        `/api/modal-backend/api/pipeline/job/${identifier(jobId, 'job ID')}`,
      ),

    /** Landscape: service + template health. */
    landscapeStatus: () => jsonRequest<{ok: boolean}>('/api/landscape-backend/api/status'),

    /** Landscape: list built runs. */
    listRuns: () => jsonRequest<LandscapeRunData[]>('/api/landscape-backend/api/runs'),

    /**
     * Landscape: trigger a run. This is synchronous and can take 10+ minutes
     * if `bake: true` (L4 GPU). The client timeout is set to 15 minutes so
     * the proxy's 15-minute timeout is the outer bound.
     */
    startRun: (payload: {input_path: string; render?: boolean; bake?: boolean}) =>
      jsonRequest<LandscapeRunSubmission>(
        '/api/landscape-backend/api/runs',
        {method: 'POST', body: JSON.stringify(payload)},
        LANDSCAPE_RUN_CLIENT_TIMEOUT_MS,
      ),

    /** Landscape: canonical run-data JSON. */
    getRun: (runId: string) =>
      jsonRequest<LandscapeRunData>(
        `/api/landscape-backend/api/run/${identifier(runId, 'run ID')}`,
      ),

    /** Landscape: stage-7 treatment manifest. */
    getManifest: () => jsonRequest<unknown>('/api/landscape-backend/api/manifest'),

    /** Landscape: self-contained 16:9 studio HTML (returns text/html). */
    getLandscapePage: (runId: string) =>
      textRequest(
        `/api/landscape-backend/p/${identifier(runId, 'run ID')}`,
      ),

    /** Landscape: studio template HTML. */
    getLandscapeTemplate: () => textRequest('/api/landscape-backend/landscape'),
  }
}

export const modalCore = createModalCoreClient()