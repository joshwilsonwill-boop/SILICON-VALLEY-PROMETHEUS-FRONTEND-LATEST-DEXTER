'use client'

import * as React from 'react'
import type { LayaCatalogAppraisal, LayaPostInput } from '@/lib/analytics/laya-types'

export type UseVideoAppraisalOptions = {
  autoFetch?: boolean
  refreshIntervalMs?: number
}

export type UseVideoAppraisalReturn = {
  appraisal: LayaCatalogAppraisal | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  appraiseCustomPosts: (posts: LayaPostInput[]) => Promise<LayaCatalogAppraisal | null>
}

/**
 * Headless, non-UI-dependent hook providing base function logic for LAYA post catalog appraisals.
 */
export function useVideoAppraisal(options: UseVideoAppraisalOptions = {}): UseVideoAppraisalReturn {
  const { autoFetch = true, refreshIntervalMs } = options

  const [appraisal, setAppraisal] = React.useState<LayaCatalogAppraisal | null>(null)
  const [loading, setLoading] = React.useState<boolean>(autoFetch)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAppraisal = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics/appraisal', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Appraisal request returned status ${response.status}`)
      }
      const data = (await response.json()) as LayaCatalogAppraisal
      setAppraisal(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load video appraisal'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const appraiseCustomPosts = React.useCallback(
    async (posts: LayaPostInput[]): Promise<LayaCatalogAppraisal | null> => {
      try {
        const response = await fetch('/api/analytics/appraisal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts }),
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`Custom appraisal failed with status ${response.status}`)
        }
        return (await response.json()) as LayaCatalogAppraisal
      } catch (err) {
        console.error('[useVideoAppraisal] custom appraisal error:', err)
        return null
      }
    },
    [],
  )

  React.useEffect(() => {
    if (autoFetch) {
      void fetchAppraisal()
    }
  }, [autoFetch, fetchAppraisal])

  React.useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) return
    const interval = window.setInterval(() => {
      void fetchAppraisal()
    }, refreshIntervalMs)
    return () => window.clearInterval(interval)
  }, [fetchAppraisal, refreshIntervalMs])

  return {
    appraisal,
    loading,
    error,
    refresh: fetchAppraisal,
    appraiseCustomPosts,
  }
}
