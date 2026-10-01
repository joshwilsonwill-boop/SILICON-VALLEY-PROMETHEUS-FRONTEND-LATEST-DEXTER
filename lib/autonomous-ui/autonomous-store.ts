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
import type { ActionOutcome, ActionReceipt, ActionStart, AutonomousWorkspaceTab } from './types'
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
  actions: ActionReceipt[]
  activeActionId: string | null
  beginAction: (action: ActionStart) => string
  finishAction: (id: string, outcome: ActionOutcome) => void
  setActionTarget: (id: string, rect: DOMRect | null) => void
  clearActionHistory: () => void
}

let actionSequence = 0
// Keep every pending operation while bounding completed receipts for a long session.
function retainActions(actions: ActionReceipt[]) {
  const completed = actions.filter((action) => action.status !== 'running').slice(-50)
  const keep = new Set(completed.map((action) => action.id))
  return actions.filter((action) => action.status === 'running' || keep.has(action.id))
}

export const useAutonomousStore = create<AutonomousStore>((set) => ({
  actions: [],
  activeActionId: null,
  beginAction: (action) => {
    const id = action.id ?? `action-${Date.now()}-${++actionSequence}`
    set((state) => {
      // An operation id is immutable; duplicate starts cannot erase its result.
      if (state.actions.some((receipt) => receipt.id === id)) return state
      return {
        actions: retainActions([...state.actions, {
          ...action, id, status: 'running', summary: '', targetRect: null, startedAt: Date.now(),
        }]),
        activeActionId: id,
      }
    })
    return id
  },
  finishAction: (id, outcome) => set((state) => {
    const current = state.actions.find((action) => action.id === id)
    if (!current || current.status !== 'running') return state
    const actions = retainActions(state.actions.map((action) => action.id === id ? {
      ...action, ...outcome,
      affectedCount: Number.isFinite(outcome.affectedCount) && outcome.affectedCount! >= 0
        ? outcome.affectedCount : undefined,
      durationRemovedSec: Number.isFinite(outcome.durationRemovedSec) && outcome.durationRemovedSec! >= 0
        ? outcome.durationRemovedSec : undefined,
      finishedAt: Date.now(),
    } : action))
    return {
      actions,
      activeActionId: [...actions].reverse().find((action) => action.status === 'running')?.id ?? null,
    }
  }),
  setActionTarget: (id, targetRect) => set((state) => ({
    actions: state.actions.map((action) => action.id === id && action.status === 'running'
      ? { ...action, targetRect } : action),
  })),
  clearActionHistory: () => set((state) => ({ actions: state.actions.filter((action) => action.status === 'running') })),
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
