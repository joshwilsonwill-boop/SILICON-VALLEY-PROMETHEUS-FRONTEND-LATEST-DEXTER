'use client'

import type { EditorActionDraft } from '@/lib/editor-actions'
import type { ChatEditorContext } from '@/lib/prometheus-assistant/editor-context'
import type { VoiceActionResult, VoiceMusicTrack } from './music-controls'
import type { VoiceEditResult } from './edit-results'
import type { AppliedReferenceStyle } from '@/lib/editor/reference-style'
import type { EditorialPlan } from '@/lib/editor/timeline-document'

/**
 * Shared registry that lets the editor page expose live state + action handlers
 * to any VoiceCompanion instance (including the global filament, which mounts
 * outside the editor tree and therefore receives no props).
 */
export interface VoiceCompanionBridgeHandlers {
  projectId?: string
  sourceAssetId?: string | null
  onApplyReferenceStyle?: (style: AppliedReferenceStyle) => Promise<VoiceActionResult>
  onApplyEditorialPlan?: (plan: EditorialPlan) => Promise<VoiceActionResult>
  contextProvider?: () => ChatEditorContext | null
  onApplyActions?: (drafts: EditorActionDraft[]) => Promise<void> | void
  /** Starts an export and returns only after the editor confirms its outcome. */
  onStartRender?: (mode: 'preview' | 'final') => Promise<{ success: boolean; summary: string }>
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
  /** Pre-briefed transcript text and segments from AssemblyAI/source */
  transcriptText?: string
  transcriptSegments?: unknown
  /** User brand context and stylistic DNA */
  brandProfile?: unknown
  /** Direct word cut handler for transcript inline strike-out ("read canceled out") */
  onToggleCutWord?: (segmentId: string, wordIndex: number) => VoiceEditResult | void
  onToggleCutSegment?: (segmentId: string) => VoiceEditResult | void
  onCutTranscriptWord?: (segmentId: string, wordIndex: number) => VoiceEditResult
  onCutTranscriptSegment?: (segmentId: string) => VoiceEditResult
  onCutTranscriptPhrase?: (phrase: string) => VoiceEditResult
  onReplaceTranscriptPhrase?: (targetPhrase: string, replacementPhrase: string) => VoiceEditResult | Promise<VoiceEditResult>
  onCutSilence?: (minDurationSec?: number, targetDurationSec?: number) => Promise<VoiceEditResult> | VoiceEditResult
  onRemoveFillerWords?: () => Promise<VoiceEditResult> | VoiceEditResult
  /** Direct music track staging and audition handlers */
  getMusicCatalog?: () => VoiceMusicTrack[]
  searchMusicTracks?: (query: string, options?: { recommendation?: boolean }) => Promise<VoiceMusicTrack[]>
  getActiveWorkspaceTab?: () => 'Editor' | 'Music' | 'Motion'
  onSelectMusicTrack?: (trackId: string) => Promise<VoiceActionResult> | VoiceActionResult | void
  onPlayMusicPreview?: (trackId: string) => Promise<VoiceActionResult> | VoiceActionResult | void
  onStopMusicPlayback?: () => Promise<VoiceActionResult> | VoiceActionResult
  onSetMusicMuted?: (muted: boolean) => Promise<VoiceActionResult> | VoiceActionResult
  /** Confirmed soundtrack mix and caption mutations; optional for older bridge clients. */
  onSetMusicVolume?: (volume: number) => Promise<VoiceActionResult> | VoiceActionResult
  onSetMusicDucking?: (enabled: boolean) => Promise<VoiceActionResult> | VoiceActionResult
  onRemoveMusicTrack?: () => Promise<VoiceActionResult> | VoiceActionResult
  onApplyCaptionStyle?: (style: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third') => Promise<VoiceActionResult>
  onRequestTranscription?: () => Promise<VoiceActionResult & { pending?: boolean }>
  getMusicState?: () => { trackId: string | null; title: string | null; volume: number; muted: boolean; ducking: boolean }
  /** Capture the current decoded source frame as a JPEG data URL for live visual analysis. */
  captureVideoFrame?: (timeSec: number) => Promise<string | null>
  /** Inferred video mood, tempo, and audio energy context */
  videoMusicContext?: unknown
  /** Video existence and project metadata across all tabs */
  hasVideo?: boolean
  videoTitle?: string
  videoDurationSec?: number
  timelineDurationSec?: number
  sourceMediaState?: 'ready' | 'loading' | 'missing' | 'unavailable' | 'non_video'
  videoThumbnailUrl?: string
  activeThumbnailUrl?: string
  activeThumbnailHeadline?: string
  onModifyThumbnail?: (args: { changes: string; headline?: string; referenceId?: string }) => Promise<VoiceActionResult> | VoiceActionResult
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
