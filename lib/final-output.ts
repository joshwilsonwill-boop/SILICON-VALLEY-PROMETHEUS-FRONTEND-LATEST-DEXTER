export type FinalOutputLifecycle = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
export type FinalOutputView = 'original' | 'final'

export interface PreviewMediaDescriptor {
  url: string
  kind: 'video' | 'image'
}

export interface ProjectFinalOutput {
  id: string
  projectId: string
  sourceAssetId: string
  jobId: string
  pipelineJobId: string | null
  status: Exclude<FinalOutputLifecycle, 'idle'>
  outputUrl: string | null
  r2Key: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

type RawRecord = Record<string, unknown>

function record(value: unknown): RawRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizedStatus(value: unknown): ProjectFinalOutput['status'] | null {
  const status = text(value)?.toLowerCase()
  if (status === 'queued' || status === 'pending' || status === 'submitted') return 'queued'
  if (status === 'processing' || status === 'running' || status === 'polling' || status === 'in_progress') return 'processing'
  if (status === 'completed' || status === 'success' || status === 'finished') return 'completed'
  if (status === 'failed' || status === 'error') return 'failed'
  return null
}

export function browserFinalOutputUrl(rawUrl: string | null | undefined): string | null {
  const value = rawUrl?.trim()
  if (!value) return null
  if (value.startsWith('/api/mini-run/media/')) return value
  if (value.startsWith('/media/')) return `/api/mini-run${value}`

  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'https:') return parsed.toString()
    if (parsed.protocol === 'http:' && process.env.NODE_ENV !== 'production') return parsed.toString()
  } catch {
    return null
  }

  return null
}

export function normalizeFinalOutputSnapshot(
  raw: unknown,
  receipt: ProjectFinalOutput,
): ProjectFinalOutput {
  const payload = record(raw)
  const nested = record(payload.returnvalue ?? payload.response ?? payload.result)
  const status = normalizedStatus(payload.state) ?? normalizedStatus(payload.status) ?? normalizedStatus(nested.state) ?? normalizedStatus(nested.status) ?? receipt.status
  const rawOutputUrl = text(payload.outputUrl) ?? text(payload.output_url) ?? text(nested.outputUrl) ?? text(nested.output_url)
  const outputUrl = browserFinalOutputUrl(rawOutputUrl) ?? (status === 'completed' ? null : receipt.outputUrl)
  const errorMessage = text(payload.error) ?? text(payload.errorMessage) ?? text(payload.failedReason) ?? text(nested.error) ?? text(nested.errorMessage) ?? text(nested.failedReason) ?? receipt.errorMessage

  if (status === 'completed' && !outputUrl) {
    return {
      ...receipt,
      status: 'failed',
      outputUrl: null,
      errorMessage: 'Completed render did not provide a playable output.',
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    ...receipt,
    status,
    outputUrl,
    r2Key: text(payload.r2Key) ?? text(payload.r2_key) ?? text(nested.r2Key) ?? text(nested.r2_key) ?? receipt.r2Key,
    errorMessage,
    updatedAt: new Date().toISOString(),
  }
}

export function isFinalOutputEligible(output: ProjectFinalOutput | null, sourceAssetId: string | null | undefined): output is ProjectFinalOutput {
  return Boolean(
    output
      && sourceAssetId
      && output.sourceAssetId === sourceAssetId
      && output.status === 'completed'
      && output.outputUrl,
  )
}

export function resolveActivePreview(input: {
  view: FinalOutputView
  original: PreviewMediaDescriptor | null
  final: PreviewMediaDescriptor | null
  finalPlayable: boolean
}): PreviewMediaDescriptor | null {
  if (input.view === 'final' && input.final && input.finalPlayable) return input.final
  return input.original
}

export async function reconcileProjectFinalOutput(
  receipt: ProjectFinalOutput,
  loadStatus: (jobId: string) => Promise<unknown>,
): Promise<ProjectFinalOutput> {
  if (receipt.status === 'completed' || receipt.status === 'failed') return receipt
  return normalizeFinalOutputSnapshot(await loadStatus(receipt.jobId), receipt)
}
