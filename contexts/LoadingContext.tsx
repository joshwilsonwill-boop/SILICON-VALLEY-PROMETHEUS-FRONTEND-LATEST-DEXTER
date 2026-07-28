'use client'

import * as React from 'react'

interface LoadingContextValue {
  hideLoading: () => void
  showLoading: (message?: string, cancellable?: boolean) => void
  showVideoLoader: (message?: string) => void
}

const LoadingContext = React.createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const hideLoading = React.useCallback(() => undefined, [])
  const showLoading = React.useCallback((_message?: string, _cancellable = false) => undefined, [])
  const showVideoLoader = React.useCallback((_message?: string) => undefined, [])

  const value = React.useMemo(
    () => ({ hideLoading, showLoading, showVideoLoader }),
    [hideLoading, showLoading, showVideoLoader],
  )

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}

export function useLoading() {
  const context = React.useContext(LoadingContext)
  if (!context) throw new Error('useLoading must be used within LoadingProvider')
  return context
}