'use client'

import * as React from 'react'

import {miniRun, type MiniRunRenderStatus} from '@/lib/api/mini-run'

const DEFAULT_POLL_INTERVAL_MS = 2000
const DEFAULT_MAX_ATTEMPTS = 300

const COMPLETED_STATES = ['completed', 'success', 'finished']
const FAILED_STATES = ['failed', 'error']

export type MiniRunJobLifecycle = 'idle' | 'polling' | 'completed' | 'failed'

function terminalState(state: string): 'completed' | 'failed' | null {
  const normalized = state.toLowerCase()
  if (COMPLETED_STATES.includes(normalized)) return 'completed'
  if (FAILED_STATES.includes(normalized)) return 'failed'
  return null
}

export interface UseMiniRunJobOptions {
  enabled?: boolean
  pollIntervalMs?: number
  maxAttempts?: number
  onComplete?: (status: MiniRunRenderStatus) => void
  onError?: (error: string) => void
}

export interface UseMiniRunJobResult {
  lifecycle: MiniRunJobLifecycle
  status: MiniRunRenderStatus | null
  error: string | null
  isPolling: boolean
}

/**
 * Poll a Prometheus Mini-Runs render job (long-form → short-form) until it
 * reaches a terminal `completed`/`failed` state. The finished short MP4 is on
 * `status.outputUrl` (mirrored to Cloudflare R2).
 */
export function useMiniRunJob(
  jobId: string | null,
  options: UseMiniRunJobOptions = {},
): UseMiniRunJobResult {
  const [lifecycle, setLifecycle] = React.useState<MiniRunJobLifecycle>('idle')
  const [status, setStatus] = React.useState<MiniRunRenderStatus | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const onCompleteRef = React.useRef(options.onComplete)
  const onErrorRef = React.useRef(options.onError)
  React.useEffect(() => {
    onCompleteRef.current = options.onComplete
    onErrorRef.current = options.onError
  }, [options.onComplete, options.onError])

  const enabled = options.enabled !== false
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  React.useEffect(() => {
    if (!jobId || !enabled) {
      setLifecycle('idle')
      setStatus(null)
      setError(null)
      return
    }

    let cancelled = false
    let attempts = 0
    let timer = 0

    const poll = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const next = await miniRun.getRenderStatus(jobId)
        if (cancelled) return
        setStatus(next)
        setError(null)

        const terminal = terminalState(next.state)
        if (terminal === 'completed') {
          setLifecycle('completed')
          onCompleteRef.current?.(next)
          return
        }
        if (terminal === 'failed') {
          const message = next.failedReason || next.error || 'Mini-Run render failed.'
          setLifecycle('failed')
          setError(message)
          onErrorRef.current?.(message)
          return
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unable to poll Mini-Run render status.'
        setError(message)
      }

      if (attempts >= maxAttempts) {
        setLifecycle('failed')
        setError((current) => current || 'Mini-Run render polling timed out.')
        return
      }
      timer = window.setTimeout(() => void poll(), pollIntervalMs)
    }

    setLifecycle('polling')
    void poll()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [jobId, enabled, pollIntervalMs, maxAttempts])

  return {lifecycle, status, error, isPolling: lifecycle === 'polling'}
}
