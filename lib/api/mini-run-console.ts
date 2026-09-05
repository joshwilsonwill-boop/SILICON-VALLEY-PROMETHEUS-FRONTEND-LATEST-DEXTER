/**
 * Mini-Run Studio console client.
 *
 * Thin browser-side helper responsible for the *user-triggered* dispatch path:
 * it asks the Next.js server (via `/api/mini-run/dispatch`) to start a
 * long-form → short-form render for a specific source asset the user owns,
 * with a user-authored shot specification (source window, chunk words,
 * canvas, pipeline, audio). Polling is left to `useMiniRunJob`, which reuses
 * the existing allow-listed `GET /api/mini-run/api/pipeline/job/<id>` route.
 */

const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/

export type MiniRunShotSpec = {
  /** `auto` lets the backend classify; `maul`/`joseph` force a pipeline. */
  pipeline?: 'auto' | 'maul' | 'joseph'
  /** Clip window within the source, in milliseconds. */
  sourceStartMs?: number
  sourceEndMs?: number
  /** User-requested deliverable length in seconds. */
  preferredDurationSec?: number
  /** Words per typographic chunk (defaults 3) / upper bound (defaults 5). */
  targetChunkWords: number
  maxChunkWords: number
  /** Portrait output canvas. */
  canvasWidth: number
  canvasHeight: number
  /** `disabled` skips the soundtrack/SFX pass, otherwise auto-selected music. */
  songPolicy?: 'auto' | 'disabled'
}

export type MiniRunDispatchFromProjectInput = {
  projectId: string
  sourceAssetId: string
  shot?: Partial<MiniRunShotSpec>
}

export type MiniRunDispatchFromProjectResult = {
  jobId: string
  pipelineJobId: string
  status: string
  statusUrl: string
}

function identifier(value: string, label: string) {
  if (!safeIdentifierPattern.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${label}.`)
  }
  return encodeURIComponent(value)
}

export async function dispatchMiniRunFromProject(
  input: MiniRunDispatchFromProjectInput,
  fetchImpl: typeof fetch = fetch,
): Promise<MiniRunDispatchFromProjectResult> {
  const response = await fetchImpl('/api/mini-run/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify(input),
  })

  const body = (await response.json().catch(() => ({}))) as {
    jobId?: unknown
    pipelineJobId?: unknown
    status?: unknown
    error?: unknown
  }

  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `Could not start the short (HTTP ${response.status}).`,
    )
  }

  if (typeof body.jobId !== 'string' || !body.jobId) {
    throw new Error('Mini-Run dispatch response omitted the job id.')
  }

  return {
    jobId: body.jobId,
    pipelineJobId: typeof body.pipelineJobId === 'string' ? body.pipelineJobId : '',
    status: typeof body.status === 'string' ? body.status : 'queued',
    statusUrl: `/api/mini-run/api/pipeline/job/${identifier(body.jobId, 'job ID')}`,
  }
}
