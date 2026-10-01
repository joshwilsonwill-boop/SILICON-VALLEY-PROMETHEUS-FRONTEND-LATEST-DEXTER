'use client'

import { useEffect } from 'react'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { AgentBoundingReticle } from './agent-bounding-reticle'
import { AgentSessionHud } from './agent-session-hud'

/** Action feedback follows editor destinations and confirmed results. */
export function AgenticCursorLayer() {
  useEffect(() => {
    ;(window as unknown as { autonomousCoordinator?: typeof autonomousCoordinator }).autonomousCoordinator = autonomousCoordinator
    const listeners: Record<string, (event: Event) => void> = {
      'prometheus:autonomous-transcript-cut': (event) => {
        const { phrase } = (event as CustomEvent<{ phrase?: string }>).detail ?? {}
        if (phrase) void autonomousCoordinator.executeTranscriptCut(phrase)
      },
      'prometheus:autonomous-music-select': (event) => {
        void autonomousCoordinator.executeMusicSelection((event as CustomEvent).detail)
      },
      'prometheus:autonomous-seek-timeline': (event) => {
        const { timeSec } = (event as CustomEvent<{ timeSec?: number }>).detail ?? {}
        if (typeof timeSec === 'number') void autonomousCoordinator.executeSeekTimeline(timeSec)
      },
      'prometheus:autonomous-preview-control': (event) => {
        const { command } = (event as CustomEvent<{ command?: 'play' | 'pause' | 'mute' | 'unmute' }>).detail ?? {}
        if (command) void autonomousCoordinator.executePreviewControl(command)
      },
      'prometheus:autonomous-tab-switch': (event) => {
        const { tab } = (event as CustomEvent<{ tab?: 'Editor' | 'Music' | 'Motion' }>).detail ?? {}
        if (tab) void autonomousCoordinator.executeTabSwitch(tab)
      },
      'prometheus:autonomous-begin-takeover': (event) => {
        autonomousCoordinator.beginTakeover((event as CustomEvent<{ label?: string }>).detail?.label)
      },
      'prometheus:autonomous-end-takeover': () => autonomousCoordinator.endTakeover(),
      'prometheus:autonomous-takeover': (event) => {
        const { tab } = (event as CustomEvent<{ tab?: 'Editor' | 'Music' | 'Motion' }>).detail ?? {}
        void autonomousCoordinator.executeAutonomousTakeover(tab ?? 'Motion')
      },
    }
    for (const [name, listener] of Object.entries(listeners)) window.addEventListener(name, listener)
    return () => {
      for (const [name, listener] of Object.entries(listeners)) window.removeEventListener(name, listener)
    }
  }, [])

  return <><AgentBoundingReticle /><AgentSessionHud /></>
}
