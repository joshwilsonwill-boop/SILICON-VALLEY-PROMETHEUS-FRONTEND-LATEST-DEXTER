'use client'

import { useEffect, useRef, useState } from 'react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'
import type { GhostCursorState } from '@/lib/autonomous-ui/types'
import { getActionTargetBox } from './action-feedback'

export function AgentBoundingReticle() {
  const [state, setState] = useState<GhostCursorState | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [targetStale, setTargetStale] = useState(false)
  const previousTarget = useRef<DOMRect | null>(null)
  const activeAction = useAutonomousStore((store) => store.actions.find((action) => action.id === store.activeActionId))
  useEffect(() => autonomousCoordinator.subscribe((next) => {
    setState({ ...next })
    const nextTarget = next.activeTargetRect ?? next.anticipatedTargetRect
    if (previousTarget.current !== nextTarget) setTargetStale(false)
    previousTarget.current = nextTarget
  }), [])
  useEffect(() => { setTargetStale(false) }, [activeAction?.targetRect])
  useEffect(() => {
    const resize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      setTargetStale(true)
    }
    const onScroll = (event: Event) => {
      // Scrolling the conversation or receipts does not move editor targets.
      if (event.target instanceof Element && event.target.closest('[data-jarvis-conversation], [aria-label="Jarvis edit activity"]')) return
      setTargetStale(true)
    }
    resize()
    setTargetStale(false)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])
  const box = getActionTargetBox(state, activeAction, viewport)
  if (!box || targetStale) return null
  return <div
    data-jarvis-target="active"
    aria-hidden="true"
    className="pointer-events-none fixed z-[9995] rounded-[5px] border-2 border-cyan-200 bg-cyan-200/[0.04] outline outline-1 outline-black motion-safe:transition-opacity motion-safe:duration-150 forced-colors:border-[Highlight] forced-colors:outline-[CanvasText]"
    style={{ ...box, pointerEvents: 'none' }}
  />
}
