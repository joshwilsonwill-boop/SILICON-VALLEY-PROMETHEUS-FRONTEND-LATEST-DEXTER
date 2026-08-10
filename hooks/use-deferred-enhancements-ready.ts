'use client'

import { useEffect, useState } from 'react'

export function useDeferredEnhancementsReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let settled = false

    const markReady = () => {
      if (settled) return
      settled = true
      setReady(true)
    }

    window.addEventListener('pointerdown', markReady, { once: true, passive: true })
    window.addEventListener('keydown', markReady, { once: true })

    const idleCallbackId = window.requestIdleCallback?.(markReady, { timeout: 1_200 })
    const timeoutId = idleCallbackId === undefined
      ? window.setTimeout(markReady, 600)
      : undefined

    return () => {
      settled = true
      window.removeEventListener('pointerdown', markReady)
      window.removeEventListener('keydown', markReady)
      if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [])

  return ready
}
