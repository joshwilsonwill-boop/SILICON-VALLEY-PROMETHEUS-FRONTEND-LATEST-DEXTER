'use client'

import * as React from 'react'

export type ProjectExportReadiness = {
  canSubmit: boolean
  sourceReady: boolean
  sourceDurationMs: number | null
  sourceWidth: number | null
  sourceHeight: number | null
  backendConfigured: boolean
  timelineRevision: number
  timelineApplied: false
  output: {format: 'mp4'; width: 1080; height: 1920; sourceWindowDefaultMs: 30000; musicPolicy: 'auto'}
  blockers: string[]
  liveWorkerHealthChecked: false
}

type ReadinessStatus = 'idle' | 'checking' | 'ready' | 'blocked' | 'error'

export function useProjectExportReadiness(projectId?: string | null, enabled = true) {
  const [readiness, setReadiness] = React.useState<ProjectExportReadiness | null>(null)
  const [status, setStatus] = React.useState<ReadinessStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) {
      setReadiness(null)
      setStatus('idle')
      setError(null)
      return
    }
    if (!projectId) {
      setReadiness(null)
      setStatus('error')
      setError('Open a project to check export readiness.')
      return
    }

    const controller = new AbortController()
    setStatus('checking')
    setError(null)
    setReadiness(null)

    void fetch(`/api/projects/${encodeURIComponent(projectId)}/exports`, {
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json() as {readiness?: ProjectExportReadiness; error?: string}
      if (!response.ok || !payload.readiness) throw new Error(payload.error || 'Export readiness is unavailable.')
      setReadiness(payload.readiness)
      setStatus(payload.readiness.canSubmit ? 'ready' : 'blocked')
    }).catch((cause) => {
      if (controller.signal.aborted) return
      setReadiness(null)
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Export readiness is unavailable.')
    })

    return () => controller.abort()
  }, [attempt, enabled, projectId])

  return {
    readiness,
    status,
    error,
    retry: () => setAttempt((value) => value + 1),
  }
}
