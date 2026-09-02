/**
 * Prometheus Autonomous UI Coordination System - Type Definitions
 *
 * Core contracts for the Browser/GUI agent layer:
 * - Ghost Cursor tracking and spring kinetics
 * - Ambient Signaling (gradient glows and bounding box targets)
 * - Autonomous Action payloads (transcript cuts, music curation, timeline navigation)
 * - Target resolution schemas for DOM components
 */

export type AutonomousWorkspaceTab = 'Editor' | 'Music' | 'Motion'

export type AutonomousActionKind =
  | 'transcript_cut'
  | 'select_music_track'
  | 'preview_music_track'
  | 'switch_tab'
  | 'seek_timeline'
  | 'preview_control'
  | 'custom_pointer_gesture'

export interface TargetSelector {
  type: 'transcript_word' | 'transcript_segment' | 'music_track' | 'tab' | 'dom_selector'
  segmentId?: string
  wordIndex?: number
  trackId?: string
  tabName?: AutonomousWorkspaceTab
  selector?: string
}

export interface AutonomousActionPayload {
  id: string
  kind: AutonomousActionKind
  target?: TargetSelector
  phrase?: string
  trackId?: string
  tab?: AutonomousWorkspaceTab
  timeSec?: number
  command?: 'play' | 'pause' | 'mute' | 'unmute'
  statusLabel?: string
  meta?: Record<string, unknown>
}

export interface GhostCursorState {
  x: number
  y: number
  targetX: number
  targetY: number
  visible: boolean
  isClicking: boolean
  statusText: string | null
  activeTargetRect: DOMRect | null
  phase: 'idle' | 'moving' | 'hovering' | 'clicking' | 'yielding'
}

export type AutonomousUIEventListener = (state: GhostCursorState) => void
