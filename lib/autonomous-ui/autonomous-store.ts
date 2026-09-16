/**
 * Prometheus Autonomous UI — Callback Bridge Store
 *
 * Zustand store that bridges the global AutonomousUICoordinator singleton
 * with React component callbacks (onSeekSeconds, onTogglePlayback, etc.).
 *
 * Usage in React components:
 *   const { registerCallbacks, clearCallbacks } = useAutonomousStore()
 *   useEffect(() => {
 *     registerCallbacks({ onSeekSeconds, onTogglePlayback, onSwitchTab })
 *     return () => clearCallbacks()
 *   }, [onSeekSeconds, onTogglePlayback, onSwitchTab])
 *
 * Usage in the coordinator (outside React, via Zustand's getState):
 *   import { useAutonomousStore } from './autonomous-store'
 *   useAutonomousStore.getState().onSeekSeconds?.(timeSec)
 */

import { create } from 'zustand'
import type { AutonomousWorkspaceTab } from './types'
export type { AutonomousWorkspaceTab } from './types'

interface AutonomousCallbacks {
  onSeekSeconds?: (t: number) => void
  onTogglePlayback?: () => void
  onToggleMute?: () => void
  onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
}

interface AutonomousStore extends AutonomousCallbacks {
  registerCallbacks: (callbacks: AutonomousCallbacks) => void
  clearCallbacks: () => void
}

export const useAutonomousStore = create<AutonomousStore>((set) => ({
  onSeekSeconds: undefined,
  onTogglePlayback: undefined,
  onToggleMute: undefined,
  onSwitchTab: undefined,

  registerCallbacks: (callbacks: AutonomousCallbacks) => set(callbacks),

  clearCallbacks: () =>
    set({
      onSeekSeconds: undefined,
      onTogglePlayback: undefined,
      onToggleMute: undefined,
      onSwitchTab: undefined,
    }),
}))
