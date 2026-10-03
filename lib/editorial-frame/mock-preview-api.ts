import type { EditorialRevisionRequest, QueuedPreviewRevisionState } from './types'

export interface QueuePreviewRevisionOptions {
  projectId?: string
  sourceUrl?: string
  startFrame?: number
  endFrame?: number
}

export async function queuePreviewRevisionRequest(
  request: EditorialRevisionRequest,
  options?: QueuePreviewRevisionOptions,
): Promise<QueuedPreviewRevisionState> {
  const startFrame = options?.startFrame ?? request.frameTarget?.startFrame ?? 0
  const endFrame = options?.endFrame ?? request.frameTarget?.endFrame ?? (startFrame + 30)
  const requestId = `rev-preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  if (process.env.NODE_ENV === 'development') {
    console.info('[editorial-revision] dispatching-real-preview-slice', {
      requestId,
      startFrame,
      endFrame,
      instruction: request.instructionText,
    })
  }

  try {
    const payload = {
      jobId: requestId,
      source: options?.sourceUrl || undefined,
      startFrame,
      endFrame,
      revisionRequest: request,
      props: {
        rawText: request.rawText,
        instructionText: request.instructionText,
        frameTarget: request.frameTarget,
        metadata: request.metadata,
      },
    }

    const response = await fetch('/api/mini-run/api/pipeline/preview-slice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.warn('[editorial-revision] preview-slice dispatch upstream status:', response.status, err)
      return {
        requestId,
        request,
        queuedAt: new Date().toISOString(),
        etaMs: 2500,
        status: 'queued',
      }
    }

    const data = await response.json()
    return {
      requestId: data.jobId || requestId,
      request,
      queuedAt: new Date().toISOString(),
      etaMs: 2500,
      status: data.status === 'completed' ? 'completed' : 'queued',
      previewUrl: data.previewUrl,
    }
  } catch (error) {
    console.warn('[editorial-revision] preview-slice dispatch network error, falling back to queued state:', error)
    return {
      requestId,
      request,
      queuedAt: new Date().toISOString(),
      etaMs: 2500,
      status: 'queued',
    }
  }
}
