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
  onApplyActions?: (drafts: EditorActionDraft[]) => void
  onSeek?: (timeSec: number) => void
  onPlay?: () => void
  onPause?: () => void
  onMute?: () => void
  onUnmute?: () => void
  onTabChange?: (tab: 'Editor' | 'Music' | 'Motion') => void
  onFitModeChange?: (mode: 'fill' | 'fit') => void
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
