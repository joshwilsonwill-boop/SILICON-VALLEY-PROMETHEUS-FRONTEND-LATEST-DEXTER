'use client'

import * as React from 'react'

import { fetchR2Tracks, type R2Track } from '@/lib/music/r2-sync'

export function useR2Music() {
  const [tracks, setTracks] = React.useState<R2Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchTracks = React.useCallback(async () => {
    setIsLoading(true)

    try {
      const nextTracks = await fetchR2Tracks()
      setTracks(nextTracks)
      setError(null)
    } catch {
      setTracks([])
      setError("Couldn't load music.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchTracks()
  }, [fetchTracks])

  return { error, fetchTracks, isLoading, tracks }
}
