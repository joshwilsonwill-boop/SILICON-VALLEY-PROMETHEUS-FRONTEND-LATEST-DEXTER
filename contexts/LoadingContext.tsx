'use client'

import * as React from 'react'

import { LoadingAnimation } from '@/components/loading-animation'

interface LoadingState {
  activeCount: number
  cancellable: boolean
  message?: string
}

interface LoadingContextValue {
  hideLoading: () => void
  showLoading: (message?: string, cancellable?: boolean) => void
}

const LoadingContext = React.createContext<LoadingContextValue | null>(null)
const EMPTY_LOADING_STATE: LoadingState = { activeCount: 0, cancellable: false }

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LoadingState>(EMPTY_LOADING_STATE)

  const showLoading = React.useCallback((message?: string, cancellable = false) => {
    setState((current) => ({
      activeCount: current.activeCount + 1,
      cancellable: current.cancellable || cancellable,
      message: message ?? current.message,
    }))
  }, [])

  const hideLoading = React.useCallback(() => {
    setState((current) => current.activeCount <= 1
      ? EMPTY_LOADING_STATE
      : { ...current, activeCount: current.activeCount - 1 })
  }, [])

  const cancelLoading = React.useCallback(() => {
    setState(EMPTY_LOADING_STATE)
  }, [])

  const value = React.useMemo(
    () => ({ hideLoading, showLoading }),
    [hideLoading, showLoading],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {state.activeCount > 0 ? (
        <LoadingAnimation
          message={state.message}
          onCancel={state.cancellable ? cancelLoading : undefined}
        />
      ) : null}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = React.useContext(LoadingContext)
  if (!context) throw new Error('useLoading must be used within LoadingProvider')
  return context
}
