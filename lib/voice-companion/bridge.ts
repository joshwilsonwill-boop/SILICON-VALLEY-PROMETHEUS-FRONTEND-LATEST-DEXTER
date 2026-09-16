'use client'

import type { EditorActionDraft } from '@/lib/editor-actions'
import type { ChatEditorContext } from '@/lib/prometheus-assistant/editor-context'

/**
 * Shared registry that lets the editor page expose live state + action handlers
 * to any VoiceCompanion instance (including the global filament, which mounts
 * outside the editor tree and therefore receives no props).
 */
export interface VoiceCompanionBridgeHandlers {
  contextProvider?: () => ChatEditorContext | null
  onApplyActions?: (drafts: EditorActionDraft[]) => Promise<void> | void
  onSeek?: (timeSec: number) => Promise<void> | void
  onPlay?: () => Promise<void> | void
  onPause?: () => Promise<void> | void
  onMute?: () => Promise<void> | void
  onUnmute?: () => Promise<void> | void
  onTabChange?: (tab: 'Editor' | 'Music' | 'Motion') => Promise<void> | void
  onFitModeChange?: (mode: 'fill' | 'fit') => Promise<void> | void
  /** True when the editor has enabled autonomous agent takeover. */
  isTakeoverEnabled?: boolean
  /** Toggles the editor's agent takeover mode (mutating action gate). */
  onToggleTakeover?: () => void
}

let currentHandlers: VoiceCompanionBridgeHandlers = {}
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function registerVoiceCompanionBridge(handlers: VoiceCompanionBridgeHandlers): void {
  currentHandlers = { ...currentHandlers, ...handlers }
  notify()
}

export function unregisterVoiceCompanionBridge(): void {
  currentHandlers = {}
  notify()
}

export function getVoiceCompanionBridge(): VoiceCompanionBridgeHandlers {
  return currentHandlers
}

export function subscribeVoiceCompanionBridge(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
