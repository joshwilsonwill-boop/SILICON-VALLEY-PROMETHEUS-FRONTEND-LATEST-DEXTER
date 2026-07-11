'use client'

import * as React from 'react'

import { useLoading } from '@/contexts/LoadingContext'

export function useLoadingFetch() {
  const { hideLoading, showLoading } = useLoading()

  return React.useCallback(
    async function loadingFetch<T>(
      fetchFunction: () => Promise<T>,
      message?: string,
    ): Promise<T> {
      showLoading(message)

      try {
        return await fetchFunction()
      } finally {
        hideLoading()
      }
    },
    [hideLoading, showLoading],
  )
}
