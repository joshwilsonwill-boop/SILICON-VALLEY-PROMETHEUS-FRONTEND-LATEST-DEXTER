/**
 * Prometheus Autonomous UI Coordination System - Type Definitions
 *
 * Core contracts for the Browser/GUI agent layer:
 * - Ghost Cursor tracking and spring kinetics
 * - Ambient Signaling (gradient glows and bounding box targets)
 * - Autonomous Action payloads (transcript cuts, music curation, timeline navigation)
 * - Target resolution schemas for DOM components
 * - Cinematic Takeover Layers (scrim, spotlight, escape hatch, bounding reticle)
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
  /** Optional convenience shortcut; target.trackId takes precedence if both provided */
  trackId?: string
  tab?: AutonomousWorkspaceTab
  timeSec?: number
  command?: 'play' | 'pause' | 'mute' | 'unmute'
  statusLabel?: string
  meta?: Record<string, unknown>
}

/**
 * Pill mode controls the visual state of the cursor action badge.
 * - 'action'   : Short declarative verb phrase (e.g. "Selecting variant")
 * - 'waiting'  : Indeterminate micro-loader spinner
 * - 'typing'   : Animated text-caret / pencil icon
 * - 'idle'     : Badge is hidden
 */
export type PillMode = 'action' | 'waiting' | 'typing' | 'idle'

export interface GhostCursorState {
  /** Current interpolated screen X coordinate */
  x: number
  /** Current interpolated screen Y coordinate */
  y: number
  /** The final destination screen coordinates driving the motion physics spring */
  targetX: number
  targetY: number
  visible: boolean
  isClicking: boolean
  statusText: string | null
  activeTargetRect: DOMRect | null
  phase: 'idle' | 'moving' | 'hovering' | 'clicking' | 'yielding'

  /**
   * Cinematic Takeover extensions — new fields added for the full takeover UX.
   * These drive the scrim, spotlight, reticle, and escape-hatch layers.
   */
  /** True while Jarvis is actively controlling the UI (scrim is visible) */
  isTakeover: boolean
  /** Current action-pill visual mode */
  pillMode: PillMode
  /**
   * The element the agent intends to interact with NEXT (200–300ms ahead of click).
   * Used to animate the bounding reticle before the cursor arrives.
   */
  anticipatedTargetRect: DOMRect | null
  /**
   * When set, a glowing spotlight "punches through" the scrim around this rect.
   * Usually the same as activeTargetRect but can differ for large panel spotlights.
   */
  spotlightRect: DOMRect | null
}

export type AutonomousUIEventListener = (state: GhostCursorState) => void
