'use client'

import * as React from 'react'

import type { FinalOutputLifecycle, ProjectFinalOutput } from '@/lib/final-output'

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 300

export interface UseProjectFinalOutputOptions {
  projectId: string
  sourceAssetId: string | null
}

export interface UseProjectFinalOutputResult {
  finalOutput: ProjectFinalOutput | null
  lifecycle: FinalOutputLifecycle
  error: string | null
  isPolling: boolean
  refresh: () => void
}

export function useProjectFinalOutput({ projectId, sourceAssetId }: UseProjectFinalOutputOptions): UseProjectFinalOutputResult {
  const [finalOutput, setFinalOutput] = React.useState<ProjectFinalOutput | null>(null)
  const [lifecycle, setLifecycle] = React.useState<FinalOutputLifecycle>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)

  const refresh = React.useCallback(() => setRefreshToken((current) => current + 1), [])

  React.useEffect(() => {
    if (!projectId || !sourceAssetId) {
      setFinalOutput(null)
      setLifecycle('idle')
      setError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    let timer: number | null = null
    let attempts = 0
    let delay = POLL_INTERVAL_MS

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    const poll = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const response = await fetch(`/api/projects/${projectId}/final-output`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => ({})) as {
          finalOutput?: ProjectFinalOutput | null
          error?: string
        }
        if (cancelled) return
        if (!response.ok) throw new Error(payload.error || `Final output status returned HTTP ${response.status}.`)

        const nextOutput = payload.finalOutput ?? null
        setFinalOutput(nextOutput)
        setError(null)
        setLifecycle(nextOutput?.status ?? 'idle')
        delay = POLL_INTERVAL_MS

        const isActive = nextOutput?.status === 'queued' || nextOutput?.status === 'processing'
        if (!isActive) {
          clearTimer()
          return
        }
      } catch (pollError) {
        if (cancelled || controller.signal.aborted) return
        setError(pollError instanceof Error ? pollError.message : 'Unable to recover final output status.')
        delay = Math.min(15_000, Math.round(delay * 1.7))
      }

      if (attempts >= MAX_POLL_ATTEMPTS || cancelled) {
        setLifecycle('failed')
        setError((current) => current || 'Final output polling timed out.')
        return
      }
      timer = window.setTimeout(() => void poll(), delay)
    }

    setError(null)
    void poll()

    return () => {
      cancelled = true
      controller.abort()
      clearTimer()
    }
  }, [projectId, refreshToken, sourceAssetId])

  return {
    finalOutput,
    lifecycle,
    error,
    isPolling: lifecycle === 'queued' || lifecycle === 'processing',
    refresh,
  }
}
