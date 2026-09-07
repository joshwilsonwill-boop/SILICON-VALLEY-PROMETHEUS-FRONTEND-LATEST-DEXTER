'use client'

import * as React from 'react'

import { miniRun, type MiniRunLongformStatus, type MiniRunLongformClip } from '@/lib/api/mini-run'

const DEFAULT_POLL_INTERVAL_MS = 2500
const DEFAULT_MAX_ATTEMPTS = 360
const STORAGE_KEY = 'prometheus:mini-run:active-longform-batch'

const COMPLETED_STATES = ['completed', 'success', 'finished']
const FAILED_STATES = ['failed', 'error']

export type MiniRunLongformLifecycle = 'idle' | 'polling' | 'completed' | 'failed'

function terminalState(state: string): 'completed' | 'failed' | null {
  const normalized = (state || '').toLowerCase()
  if (COMPLETED_STATES.includes(normalized)) return 'completed'
  if (FAILED_STATES.includes(normalized)) return 'failed'
  return null
}

export interface UseMiniRunLongformJobOptions {
  enabled?: boolean
  pollIntervalMs?: number
  maxAttempts?: number
  persistKey?: string
  onComplete?: (status: MiniRunLongformStatus) => void
  onError?: (error: string) => void
}

export interface UseMiniRunLongformJobResult {
  lifecycle: MiniRunLongformLifecycle
  status: MiniRunLongformStatus | null
  clips: MiniRunLongformClip[]
  error: string | null
  isPolling: boolean
  batchJobId: string | null
  setBatchJobId: (id: string | null) => void
  resetBatch: () => void
}

export function useMiniRunLongformJob(
  initialBatchJobId: string | null = null,
  options: UseMiniRunLongformJobOptions = {},
): UseMiniRunLongformJobResult {
  const persistKey = options.persistKey || STORAGE_KEY

  const [activeBatchJobId, setActiveBatchJobId] = React.useState<string | null>(() => {
    if (initialBatchJobId) return initialBatchJobId
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed?.batchJobId === 'string' && parsed.batchJobId) {
            return parsed.batchJobId
          }
        }
      } catch {}
    }
    return null
  })

  const [lifecycle, setLifecycle] = React.useState<MiniRunLongformLifecycle>('idle')
  const [status, setStatus] = React.useState<MiniRunLongformStatus | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed?.status) return parsed.status
        }
      } catch {}
    }
    return null
  })
  const [error, setError] = React.useState<string | null>(null)

  // Sync when initial prop changes
  React.useEffect(() => {
    if (initialBatchJobId && initialBatchJobId !== activeBatchJobId) {
      setActiveBatchJobId(initialBatchJobId)
    }
  }, [initialBatchJobId])

  const onCompleteRef = React.useRef(options.onComplete)
  const onErrorRef = React.useRef(options.onError)
  React.useEffect(() => {
    onCompleteRef.current = options.onComplete
    onErrorRef.current = options.onError
  }, [options.onComplete, options.onError])

  const enabled = options.enabled !== false
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  const resetBatch = React.useCallback(() => {
    setActiveBatchJobId(null)
    setLifecycle('idle')
    setStatus(null)
    setError(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(persistKey)
      } catch {}
    }
  }, [persistKey])

  const setBatchJobId = React.useCallback((id: string | null) => {
    setActiveBatchJobId(id)
    if (!id) {
      resetBatch()
    } else {
      setLifecycle('polling')
      setError(null)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(persistKey, JSON.stringify({ batchJobId: id, savedAt: Date.now() }))
        } catch {}
      }
    }
  }, [persistKey, resetBatch])

  React.useEffect(() => {
    if (!activeBatchJobId || !enabled) {
      if (!activeBatchJobId) {
        setLifecycle('idle')
        setStatus(null)
        setError(null)
      }
      return
    }

    // If already terminal from loaded cache, keep status
    if (status) {
      const term = terminalState(status.state || status.status)
      if (term === 'completed') {
        setLifecycle('completed')
        return
      }
      if (term === 'failed') {
        setLifecycle('failed')
        return
      }
    }

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    setLifecycle('polling')

    const poll = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const next = await miniRun.getLongformStatus(activeBatchJobId)
        if (cancelled) return
        setStatus(next)
        setError(null)

        // Save progress to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              persistKey,
              JSON.stringify({ batchJobId: activeBatchJobId, status: next, updatedAt: Date.now() }),
            )
          } catch {}
        }

        const terminal = terminalState(next.state || next.status)
        if (terminal === 'completed') {
          setLifecycle('completed')
          onCompleteRef.current?.(next)
          return
        }
        if (terminal === 'failed') {
          const message = next.failedReason || next.error || 'Viral batch processing failed.'
          setLifecycle('failed')
          setError(message)
          onErrorRef.current?.(message)
          return
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unable to poll viral batch status.'
        setError(message)
      }

      if (attempts >= maxAttempts) {
        setLifecycle('failed')
        setError(`Timed out waiting for viral batch after ${attempts} attempts.`)
        return
      }

      if (!cancelled) {
        timer = setTimeout(() => void poll(), pollIntervalMs)
      }
    }

    void poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [activeBatchJobId, enabled, pollIntervalMs, maxAttempts, persistKey])

  const clips = status?.clips ?? status?.returnvalue?.clips ?? []

  return {
    lifecycle,
    status,
    clips,
    error,
    isPolling: lifecycle === 'polling',
    batchJobId: activeBatchJobId,
    setBatchJobId,
    resetBatch,
  }
}
