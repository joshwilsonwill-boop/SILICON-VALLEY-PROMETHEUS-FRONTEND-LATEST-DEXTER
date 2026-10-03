'use client'

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react'
import { GeminiLiveClient, type ToolCallHandler } from '@/lib/voice-companion/gemini-live-client'
import { AudioPlayer, AudioRecorder, primeAudioContext } from '@/lib/voice-companion/audio-streamer'
import {
  getVoiceCompanionBridge,
  subscribeVoiceCompanionBridge,
  type VoiceCompanionBridgeHandlers,
} from '@/lib/voice-companion/bridge'
import type { EditorActionDraft } from '@/lib/editor-actions'
import type { ChatEditorContext } from '@/lib/prometheus-assistant/editor-context'
import { autonomousCoordinator } from '@/lib/autonomous-ui/coordinator'
import { getJarvisMemory, saveJarvisMemory } from '@/lib/voice-companion/memory'
import { detectFillerWords } from '@/lib/voice-companion/filler-words'
import { buildEditorialPlan } from '@/lib/editor/timeline-document'
import { searchTranscriptText } from '@/lib/voice-companion/transcript-search'
import { inspectVoiceVideo, switchVoiceWorkspace } from '@/lib/voice-companion/session-controls'
import { performVoiceMusicAction, type VoiceMusicActionArgs } from '@/lib/voice-companion/music-controls'
import { performVoiceReferenceStyleAction } from '@/lib/voice-companion/reference-controls'
import { ensureVoiceEditingAccess } from '@/lib/voice-companion/editing-access'
import { ResponseRecovery, type ResponseStatus } from '@/lib/voice-companion/response-recovery'
import { useAutonomousStore } from '@/lib/autonomous-ui/autonomous-store'

export type VoiceCompanionStatus =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'error'

export interface VoiceCompanionTranscriptItem {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
  status?: ResponseStatus
}

export interface UseVoiceCompanionOptions {
  contextProvider?: () => ChatEditorContext | null
  onApplyActions?: (drafts: EditorActionDraft[]) => Promise<void> | void
  onSeek?: (timeSec: number) => Promise<void> | void
  onPlay?: () => Promise<void> | void
  onPause?: () => Promise<void> | void
  onMute?: () => Promise<void> | void
  onUnmute?: () => Promise<void> | void
  onTabChange?: (tab: 'Editor' | 'Music' | 'Motion') => Promise<void> | void
  onFitModeChange?: (mode: 'fill' | 'fit') => Promise<void> | void
}

export interface UseVoiceCompanionReturn {
  // Visual-frame controls were removed; editor context still arrives through the bridge.
  status: VoiceCompanionStatus
  isMuted: boolean
  userVolume: number
  assistantVolume: number
  getUserVolume: () => number
  getAssistantVolume: () => number
  transcripts: VoiceCompanionTranscriptItem[]
  error: string | null
  connectionNotice: string | null
  canReplayResponse: boolean
  lastResponseText: string
  replayLastResponse: () => Promise<void>
  reconnect: () => Promise<void>
  getCapturedAudio: () => Blob | null
  selectedVoice: string
  setSelectedVoice: (voice: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  toggleMute: () => void
  clearTranscripts: () => void
  sendTextMessage: (text: string) => void
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  const result: Partial<T> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) result[key as keyof T] = entry
  }
  return result
}

export function useVoiceCompanion(options: UseVoiceCompanionOptions = {}): UseVoiceCompanionReturn {

  const [status, setStatus] = useState<VoiceCompanionStatus>('disconnected')
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userVolume, setUserVolume] = useState(0)
  const [assistantVolume, setAssistantVolume] = useState(0)
  const [transcripts, setTranscripts] = useState<VoiceCompanionTranscriptItem[]>([])
  const [selectedVoice, setSelectedVoice] = useState('Puck')
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null)
  const [canReplayResponse, setCanReplayResponse] = useState(false)
  const [lastResponseText, setLastResponseText] = useState('')
  const recoveryRef = useRef(new ResponseRecovery())
  const connectionGenerationRef = useRef(0)
  const inspectedMusicVideoRef = useRef<string | null>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)
  const capturedAudioRef = useRef<Blob | null>(null)
  const localInterruptRef = useRef(false)
  const syncRecovery = useCallback(() => {
    setTranscripts(recoveryRef.current.snapshot())
    setCanReplayResponse(recoveryRef.current.replayAudio.length > 0)
    setLastResponseText(recoveryRef.current.lastResponseText)
  }, [])

  const clientRef = useRef<GeminiLiveClient | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const volumeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const assistantTurnActiveRef = useRef(false)
  const statusRef = useRef<VoiceCompanionStatus>('disconnected')
  const setUserStatus = useCallback(
    (next: VoiceCompanionStatus | ((prev: VoiceCompanionStatus) => VoiceCompanionStatus)) => {
      const resolved = typeof next === 'function' ? next(statusRef.current) : next
      statusRef.current = resolved
      setStatus(resolved)
    },
    [],
  )
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted

  // Editor-registered handlers (the global filament mounts outside the editor
  // tree and gets its wiring through this bridge).
  const bridgeSnapshot = useSyncExternalStore(
    subscribeVoiceCompanionBridge,
    getVoiceCompanionBridge,
    getVoiceCompanionBridge,
  )
  const handlersRef = useRef<VoiceCompanionBridgeHandlers & UseVoiceCompanionOptions>(options)
  useEffect(() => {
    handlersRef.current = { ...bridgeSnapshot, ...stripUndefined(options) }
  })

  const getUserVolume = useCallback(() => {
    if (isMutedRef.current || !recorderRef.current) return 0
    return recorderRef.current.getVolume()
  }, [])

  const getAssistantVolume = useCallback(() => {
    if (!playerRef.current) return 0
    return playerRef.current.getVolume()
  }, [])

  // Tool call executor. Reads handlers through a ref so late-registered editor
  // bridges (or re-mounted panels) are always honored without reconnecting.
  const executeToolCall = useCallback(
    async (name: string, args: Record<string, unknown>, isSessionActive: () => boolean) => {
      const getCurrentHandlers = () => isSessionActive() ? handlersRef.current : {}
      const requireEditingAccess = async () => ensureVoiceEditingAccess(getCurrentHandlers)
      const {
        contextProvider,
        onApplyActions,
        onSeek,
        onPlay,
        onPause,
        onMute,
        onUnmute,
        onTabChange,
        onFitModeChange,
      } = handlersRef.current

      switch (name) {
        case 'seek_timeline': {
          const time = typeof args.timeSec === 'number' ? args.timeSec : 0
          if (!Number.isFinite(time) || time < 0) return { success: false, error: 'Choose a valid timeline time.' }
          if (onSeek) {
            await onSeek(time)
          } else if (onApplyActions) {
            await onApplyActions([{ kind: 'seek', timeSec: time, summary: `Seek to ${time}s` }])
          } else {
            return { success: false, error: 'The editor is not linked, so I cannot move the playhead.' }
          }
          return { success: true, newPlayheadSec: time }
        }

        case 'preview_control': {
          const cmd = args.command as 'play' | 'pause' | 'mute' | 'unmute'
          if (!['play', 'pause', 'mute', 'unmute'].includes(cmd)) return { success: false, error: 'That playback command is not supported.' }
          if (cmd === 'play' && onPlay) await onPlay()
          else if (cmd === 'pause' && onPause) await onPause()
          else if (cmd === 'mute' && onMute) await onMute()
          else if (cmd === 'unmute' && onUnmute) await onUnmute()
          else if (onApplyActions) await onApplyActions([{ kind: 'preview_control', command: cmd, summary: `${cmd} preview` }])
          else return { success: false, error: 'The editor is not linked, so I cannot control playback.' }
          return { success: true, command: cmd }
        }

        case 'switch_workspace_tab': {
          return switchVoiceWorkspace(args.tab, () => handlersRef.current)
        }

        case 'set_fit_mode': {
          const mode = args.mode as 'fill' | 'fit'
          if (onFitModeChange) await onFitModeChange(mode)
          else if (onApplyActions) await onApplyActions([{ kind: 'set_fit_mode', mode, summary: `Fit mode: ${mode}` }])
          else return { success: false, error: 'The editor is not linked, so I cannot change the frame view.' }
          return { success: true, fitMode: mode }
        }

        case 'get_editor_state': {
          const liveContext = contextProvider?.()
          const bridge = handlersRef.current
          const hasVideo = bridge.hasVideo ?? false
          return {
            success: true,
            playheadSec: liveContext?.playheadSec ?? 0,
            durationSec: liveContext?.durationSec ?? bridge.timelineDurationSec ?? 0,
            timelineDurationSec: liveContext?.durationSec ?? bridge.timelineDurationSec ?? 0,
            workspaceTab: liveContext?.workspaceTab ?? null,
            fitMode: liveContext?.fitMode ?? 'fit',
            muted: liveContext?.muted ?? false,
            hasVideo,
            sourceMediaState: bridge.sourceMediaState ?? (hasVideo ? 'ready' : 'missing'),
            videoTitle: hasVideo ? (bridge.videoTitle ?? null) : null,
            videoDurationSec: hasVideo ? (bridge.videoDurationSec ?? 0) : 0,
            videoMusicContext: bridge.videoMusicContext,
            transcriptAvailable: Boolean(bridge.transcriptText || bridge.transcriptSegments),
          }
        }

        case 'inspect_video': {
          const inspectingClient = clientRef.current
          autonomousCoordinator.setPillMode('waiting', 'Inspecting source video')
          try {
            const result = await inspectVoiceVideo(
              () => handlersRef.current,
              (frame) => inspectingClient?.sendVisualFrame(frame),
              { isSessionActive: () => clientRef.current === inspectingClient && (inspectingClient?.isConnected() ?? false) },
            )
            const inspectedBridge = handlersRef.current
            if (result.success && inspectedBridge.hasVideo && inspectedBridge.sourceAssetId) {
              inspectedMusicVideoRef.current = `${inspectedBridge.projectId ?? ''}:${inspectedBridge.sourceAssetId}`
            }
            return result
          } finally {
            // Inspection does not own a persistent cursor badge or moving scrim.
            if (clientRef.current === inspectingClient) autonomousCoordinator.abortAction('cancelled')
          }
        }

        case 'search_video_transcript': {
          const transcript = handlersRef.current.transcriptText || ''
          if (!transcript.trim()) return { success: false, error: 'There is no video transcript available in this project.' }
          const query = String(args.query ?? '').trim()
          if (!query) return { success: false, error: 'Provide a word or phrase to search for.' }
          const excerpts = searchTranscriptText(transcript, query)
          return excerpts.length > 0
            ? { success: true, query, excerpts }
            : { success: true, query, excerpts: [], summary: 'No matching words were found in the transcript.' }
        }

        case 'autonomous_transcript_cut': {
          const phrase = String(args.phrase ?? '')
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          if (!Array.isArray(handlersRef.current.transcriptSegments) || handlersRef.current.transcriptSegments.length === 0) return { success: false, error: 'There is no timed transcript to cut from yet.' }
          if (!handlersRef.current.onCutTranscriptPhrase) return { success: false, error: 'Confirmed phrase editing is unavailable in this editor.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          const switched = await switchVoiceWorkspace('Motion', () => handlersRef.current)
          if (!switched.success) return switched
          const outcome = await handlersRef.current.onCutTranscriptPhrase(phrase)
          return { ...outcome, cutPhrase: phrase, precision: 'Transcript word timestamps; ambiguous repeated phrases require clarification.' }
        }

        case 'autonomous_music_action': {
          const action = args.action as VoiceMusicActionArgs['action']
          const exactSong = typeof args.trackName === 'string' && args.trackName.trim() || typeof args.trackTitle === 'string' && args.trackTitle.trim() || typeof args.trackId === 'string' && args.trackId.trim()
          const needsVideoUnderstanding = ['search', 'select', 'select_and_preview'].includes(action ?? '') && !exactSong
          const musicBridge = handlersRef.current
          if (needsVideoUnderstanding) {
            if (!musicBridge.hasVideo || !musicBridge.sourceAssetId) {
              return { success: false, error: 'Add a playable source video before I choose music to fit the footage.' }
            }
            const sourceKey = `${musicBridge.projectId ?? ''}:${musicBridge.sourceAssetId}`
            if (inspectedMusicVideoRef.current !== sourceKey) {
              return { success: false, error: 'Inspect the current video first, then search for music using what the footage shows.' }
            }
          }
          if (action === 'select' || action === 'select_and_preview') {
            const access = await requireEditingAccess()
            if (!access.success) return access
          }
          return performVoiceMusicAction({
            action,
            trackId: typeof args.trackId === 'string' ? args.trackId : undefined,
            trackName: typeof args.trackName === 'string' ? args.trackName : typeof args.trackTitle === 'string' ? args.trackTitle : undefined,
            recommendation: args.recommendation === true,
            query: typeof args.query === 'string' ? args.query : typeof args.genreOrMood === 'string' ? args.genreOrMood : undefined,
            context: handlersRef.current.videoMusicContext,
          }, getCurrentHandlers)
        }

        case 'create_video_thumbnail': {
          const handlers = handlersRef.current
          if (!handlers.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          if (!onApplyActions) return { success: false, error: 'Thumbnail Studio is not connected to this editor.' }
          const headline = typeof args.headline === 'string' ? args.headline.trim().slice(0, 64) : ''
          const creativeDirection = typeof args.creativeDirection === 'string' ? args.creativeDirection.trim().slice(0, 500) : ''
          if (!headline || !creativeDirection) return { success: false, error: 'I need a grounded headline and creative direction before starting thumbnail generation.' }
          await onApplyActions([{
            kind: 'open_thumbnail_studio',
            headline,
            creativeDirection,
            generateNow: true,
            summary: 'Generate a thumbnail for this video',
          }])
          return { success: true, generationStarted: true, headline, message: 'Thumbnail Studio opened and image generation was started. Report the image as ready only after the studio confirms completion.' }
        }

        case 'reference_video_style': {
          if (args.apply === true) {
            const access = await requireEditingAccess()
            if (!access.success) return access
          }
          return performVoiceReferenceStyleAction({
            url: typeof args.url === 'string' ? args.url : '',
            styleHint: typeof args.styleHint === 'string' ? args.styleHint : undefined,
            apply: args.apply === true,
          }, getCurrentHandlers)
        }

        case 'toggle_agent_takeover': {
          const access = await requireEditingAccess()
          if (!access.success) return { ...access, takeoverEnabled: false }
          return { success: true, takeoverEnabled: true, status: 'Persistent editing access is already active for this task.' }
        }

        case 'end_agent_takeover': {
          autonomousCoordinator.endTakeover()
          return { success: true, takeoverEnabled: false, status: 'Control returned to the user.' }
        }

        case 'set_playback_rate': {
          const rate = typeof args.rate === 'number' ? args.rate : Number(args.rate)
          if (!Number.isFinite(rate) || rate <= 0) return { success: false, error: 'Invalid playback rate.' }
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          if (!onApplyActions) return { success: false, error: 'The editor is not linked, so I cannot change playback speed.' }
          await onApplyActions([{ kind: 'set_playback_rate', rate: Math.min(4, Math.max(0.25, rate)), summary: `Playback speed ${rate}x` }])
          return { success: true, rate }
        }

        case 'step_frames': {
          const frames = typeof args.frames === 'number' ? args.frames : Number(args.frames)
          if (!Number.isFinite(frames) || frames === 0) return { success: false, error: 'Invalid frame count.' }
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video to step through.' }
          if (!onApplyActions) return { success: false, error: 'The editor is not linked, so I cannot step frames.' }
          await onApplyActions([{ kind: 'step_frames', frames: Math.round(Math.min(90, Math.max(-90, frames))), summary: `Frame step ${frames}` }])
          return { success: true, frames }
        }

        case 'set_caption_style': {
          const style = String(args.style ?? '')
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          if (!onApplyActions) return { success: false, error: 'The editor is not linked, so I cannot change caption styling.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          await onApplyActions([{ kind: 'set_caption_style', style: style as 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third', summary: `Caption style: ${style}` }])
          return { success: true, style }
        }

        case 'start_render': {
          const mode = args.mode === 'final' ? 'final' : 'preview'
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video to render.' }
          if (!onApplyActions) return { success: false, error: 'The editor is not linked, so I cannot start a render.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          await onApplyActions([{ kind: 'start_render', mode, summary: mode === 'final' ? 'Opening Master Review for final export' : 'Opening export workflow' }])
          return { success: true, mode, status: mode === 'final' ? 'Master Video Review opened.' : 'Export workflow opened. No render has been confirmed yet.' }
        }

        case 'detect_filler_words': {
          const rawSegments = handlersRef.current.transcriptSegments
          const segments = Array.isArray(rawSegments) ? rawSegments : []
          if (segments.length === 0) return { success: false, error: 'There is no timed transcript to analyze yet.' }
          const result = detectFillerWords(segments)
          const shouldApply = Boolean(args.applyCuts)

          if (shouldApply) {
            if (!handlersRef.current.onRemoveFillerWords) return { success: false, error: 'Confirmed filler-word editing is unavailable in this editor.' }
            const access = await requireEditingAccess()
            if (!access.success) return access
            const outcome = await handlersRef.current.onRemoveFillerWords()
            return { ...outcome, appliedCuts: outcome.success && outcome.count > 0 }
          }

          return {
            success: true,
            count: result.count,
            items: result.items,
            summary: result.summary,
            appliedCuts: shouldApply && result.items.length > 0,
          }
        }

        case 'cut_silence':
        case 'remove_silence': {
          const minDurationSec = typeof args.minDurationSec === 'number' ? args.minDurationSec : 0.4
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          if (!Array.isArray(handlersRef.current.transcriptSegments) || handlersRef.current.transcriptSegments.length === 0) return { success: false, error: 'There is no timed transcript to find silences in yet.' }
          if (!Number.isFinite(minDurationSec) || minDurationSec <= 0) return { success: false, error: 'Choose a positive silence duration.' }
          if (!handlersRef.current.onCutSilence) return { success: false, error: 'Confirmed silence editing is unavailable in this editor.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          const outcome = await handlersRef.current.onCutSilence(minDurationSec)
          return { ...outcome, minDurationSec, precision: 'Transcript timestamps; not sample-accurate waveform analysis.' }
        }

        case 'apply_editorial_plan':
        case 'execute_timeline_plan': {
          const prompt = String(args.prompt || 'Balanced talking-head edit')
          const liveContext = contextProvider?.()
          const durationSec = liveContext?.durationSec ?? handlersRef.current.timelineDurationSec ?? 0
          if (!handlersRef.current.hasVideo) return { success: false, error: 'There is no playable source video in this project yet.' }
          if (durationSec <= 0) return { success: false, error: 'The source video duration is not available yet.' }
          const applyPlan = getCurrentHandlers().onApplyEditorialPlan
          if (!applyPlan) return { success: false, error: 'The editor does not have a complete editorial-plan path connected.' }
          const access = await requireEditingAccess()
          if (!access.success) return access
          const plan = buildEditorialPlan(prompt, {
            durationSec,
            transcriptSegments: (Array.isArray(handlersRef.current.transcriptSegments) ? handlersRef.current.transcriptSegments : []).flatMap((item) => {
              if (!item || typeof item !== 'object') return []
              const segment = item as Record<string, unknown>
              const startSec = typeof segment.startMs === 'number' ? segment.startMs / 1000 : segment.start
              const endSec = typeof segment.endMs === 'number' ? segment.endMs / 1000 : segment.end
              return typeof startSec === 'number' && typeof endSec === 'number' && typeof segment.text === 'string'
                ? [{ startSec, endSec, text: segment.text, isCut: segment.isCut === true }]
                : []
            }),
          })

          if (args.captionStyle && typeof args.captionStyle === 'string') {
            plan.captionStyle = args.captionStyle as any
          }

          const switched = await switchVoiceWorkspace('Motion', getCurrentHandlers)
          if (!switched.success) return switched
          const outcome = await applyPlan(plan)
          return {
            ...outcome,
            summary: outcome.summary,
            applied: { captionStyle: plan.captionStyle, movementCueCount: outcome.success ? plan.zooms.length : 0 },
            musicSelected: false,
          }
        }

        default:
          return { error: `Tool ${name} not found` }
      }
    },
    []
  )

  const handleToolCall: ToolCallHandler = useCallback(async (name, args) => {
    const generation = connectionGenerationRef.current
    const labels: Record<string, string> = {
      autonomous_music_action: 'Choosing soundtrack', autonomous_transcript_cut: 'Cutting transcript',
      detect_filler_words: args.applyCuts ? 'Removing hesitation words' : 'Checking hesitation words',
      cut_silence: 'Removing pauses', remove_silence: 'Removing pauses', inspect_video: 'Inspecting video',
      reference_video_style: args.apply ? 'Applying reference look' : 'Analyzing reference',
      apply_editorial_plan: 'Applying caption plan', set_caption_style: 'Restyling captions',
      switch_workspace_tab: 'Opening workspace', start_render: 'Opening export workflow',
    }
    const label = labels[name]
    const receipt = label ? useAutonomousStore.getState().beginAction({ label }) : null
    try {
      const result = await executeToolCall(name, args, () => generation === connectionGenerationRef.current) as Record<string, any>
      if (receipt) {
        useAutonomousStore.getState().finishAction(receipt, {
          status: result.success === false || result.error ? (result.staged || result.previewStarted ? 'partial' : 'failed') : 'succeeded',
          summary: String(result.summary ?? result.status ?? result.error ?? (result.success ? 'Action confirmed.' : 'Action finished without a confirmed outcome.')),
          affectedCount: typeof result.affectedCount === 'number' ? result.affectedCount : typeof result.count === 'number' ? result.count : undefined,
          durationRemovedSec: typeof result.totalRemovedSec === 'number' ? result.totalRemovedSec : undefined,
        })
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The editor action failed.'
      if (receipt) useAutonomousStore.getState().finishAction(receipt, { status: 'failed', summary: message })
      return { success: false, error: message }
    }
  }, [executeToolCall])

  const disconnect = useCallback(() => {
    connectionGenerationRef.current += 1
    fetchAbortRef.current?.abort()
    fetchAbortRef.current = null
    if (clientRef.current || recorderRef.current || playerRef.current) autonomousCoordinator.endTakeover()
    if (volumeTimerRef.current) clearInterval(volumeTimerRef.current)
    volumeTimerRef.current = null
    assistantTurnActiveRef.current = false
    localInterruptRef.current = false
    capturedAudioRef.current = recorderRef.current?.getCapturedAudio() ?? capturedAudioRef.current
    recorderRef.current?.stop()
    recorderRef.current = null
    playerRef.current?.stop()
    playerRef.current = null
    clientRef.current?.disconnect()
    clientRef.current = null
    recoveryRef.current.finish('partial')
    syncRecovery()
    setUserVolume(0)
    setAssistantVolume(0)
    setConnectionNotice(null)
    setUserStatus('disconnected')
  }, [setUserStatus, syncRecovery])

  const connect = useCallback(async () => {
    disconnect()
    const generation = connectionGenerationRef.current
    const isCurrent = () => connectionGenerationRef.current === generation
    const controller = new AbortController()
    fetchAbortRef.current = controller
    setError(null)
    setConnectionNotice(null)
    setUserStatus('connecting')
    // Preserve the browser click gesture when unlocking speaker playback.
    try { primeAudioContext() } catch {}
    try {
      const res = await fetch('/api/voice-companion/session', { signal: controller.signal })
      if (!isCurrent()) return
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to initialize voice session')
      }
      const sessionData = await res.json()
      if (!isCurrent()) return
      const player = new AudioPlayer({
        onPlaybackStateChange: (playing) => {
          if (!isCurrent()) return
          // An underrun is not a turn boundary. Keep microphone echo gating
          // active until the server completes or genuine local speech interrupts.
          setUserStatus((prev) => {
            if (prev === 'disconnected' || prev === 'error' || prev === 'connecting') return prev
            return playing ? 'speaking' : 'listening'
          })
        },
      })
      playerRef.current = player
      await player.resume()
      if (!isCurrent()) { player.stop(); return }
      const bridgeHandlers = getVoiceCompanionBridge()
      const projectContext = JSON.stringify({
        hasVideo: bridgeHandlers.hasVideo ?? false,
        sourceMediaState: bridgeHandlers.sourceMediaState ?? 'missing',
        videoTitle: bridgeHandlers.hasVideo ? bridgeHandlers.videoTitle ?? null : null,
        videoDurationSec: bridgeHandlers.hasVideo ? bridgeHandlers.videoDurationSec ?? 0 : 0,
        videoMusicSummary: (bridgeHandlers.videoMusicContext as { summary?: string } | undefined)?.summary ?? null,
        transcriptAvailable: Boolean(bridgeHandlers.transcriptText || bridgeHandlers.transcriptSegments),
      })
      const client = new GeminiLiveClient({
        wsUrl: sessionData.wsUrl, wsUrls: sessionData.wsUrls, model: sessionData.model,
        voiceName: selectedVoice || sessionData.voiceName, projectContext,
      }, {
        onSetupConfirmed: () => { if (isCurrent()) setUserStatus('listening') },
        onAudio: (chunk) => {
          if (!isCurrent()) return
          assistantTurnActiveRef.current = true
          recoveryRef.current.addAudio(chunk)
          syncRecovery()
          if (localInterruptRef.current) return
          void player.playChunk(chunk).catch((err) => {
            if (!isCurrent()) return
            setError(err instanceof Error ? err.message : 'Jarvis audio playback failed.')
            setConnectionNotice('Playback failed. Read the received reply below or replay its received audio.')
          })
        },
        onTranscript: (text, isUser, finished) => {
          if (!isCurrent()) return
          recoveryRef.current.append(text, isUser, finished)
          syncRecovery()
        },
        onInterrupted: () => {
          if (!isCurrent()) return
          const genuineSpeech = !isMutedRef.current && localInterruptRef.current
          assistantTurnActiveRef.current = false
          localInterruptRef.current = false
          recoveryRef.current.finishRole('assistant', genuineSpeech ? 'interrupted' : 'partial')
          syncRecovery()
          if (genuineSpeech) {
            player.flush()
            setUserStatus('interrupted')
          } else {
            // The server already stopped generation. Preserve buffered audio
            // rather than discarding it because playback itself was active.
            setConnectionNotice('The reply stopped before completion. Received text and audio are retained; replay it or ask Jarvis to continue.')
          }
        },
        onTurnComplete: () => {
          if (!isCurrent()) return
          assistantTurnActiveRef.current = false
          recoveryRef.current.finish(localInterruptRef.current ? 'interrupted' : 'complete')
          localInterruptRef.current = false
          syncRecovery()
          if (!player.getIsPlaying() && player.getPendingMs() <= 0) setUserStatus('listening')
        },
        onError: (err) => {
          if (!isCurrent()) return
          recoveryRef.current.finish('partial')
          syncRecovery()
          setError(err.message)
          setConnectionNotice('Voice connection interrupted. Received replies are retained. Reconnect to continue; incomplete audio cannot be recovered from the server.')
          setUserStatus('error')
        },
        onClose: () => {
          if (!isCurrent()) return
          assistantTurnActiveRef.current = false
          capturedAudioRef.current = recorderRef.current?.getCapturedAudio() ?? capturedAudioRef.current
          recorderRef.current?.stop()
          recorderRef.current = null
          if (volumeTimerRef.current) clearInterval(volumeTimerRef.current)
          volumeTimerRef.current = null
          clientRef.current = null
          recoveryRef.current.finish('partial')
          syncRecovery()
          setUserVolume(0)
          autonomousCoordinator.endTakeover()
          setConnectionNotice('The voice stream ended. Received text and audio are retained. Reconnect to start a new stream.')
          setUserStatus('error')
          // Let already scheduled audio finish; disconnect/replay still stops it.
        },
        onToolCall: async (name, args) => {
          if (!isCurrent()) return { success: false, error: 'The voice session ended before this action started.' }
          return handleToolCall(name, args)
        },
      })
      clientRef.current = client
      await client.connect()
      if (!isCurrent()) { client.disconnect(); return }
      const recorder = new AudioRecorder({
        getIsSpeaking: () => assistantTurnActiveRef.current || player.getIsPlaying() || player.getPendingMs() > 0,
        shouldCapture: () => !isMutedRef.current,
        onSpeechOnset: () => {
          if (!isCurrent() || isMutedRef.current) return
          if (assistantTurnActiveRef.current || player.getIsPlaying() || player.getPendingMs() > 0) {
            localInterruptRef.current = true
            // This callback is emitted only after sustained speech confirmation.
            player.flush()
            recoveryRef.current.markRole('assistant', 'interrupted')
            syncRecovery()
            setUserStatus('interrupted')
          }
        },
      })
      // Register before awaiting permission so cancellation can stop a pending
      // getUserMedia request and dispose its tracks when it eventually resolves.
      recorderRef.current = recorder
      await recorder.start((chunk) => {
        if (isCurrent() && !isMutedRef.current && client.isConnected()) client.sendAudioChunk(chunk)
      })
      if (!isCurrent()) { recorder.stop(); return }
      volumeTimerRef.current = setInterval(() => {
        if (!isCurrent()) return
        const nextUser = isMutedRef.current ? 0 : recorder.getVolume()
        const nextAssistant = player.getVolume()
        setUserVolume((prev) => Math.abs(prev - nextUser) > 0.02 ? nextUser : prev)
        setAssistantVolume((prev) => Math.abs(prev - nextAssistant) > 0.02 ? nextAssistant : prev)
      }, 90)
    } catch (err) {
      if (!isCurrent()) return
      const msg = err instanceof Error ? err.message : 'Failed to connect to voice companion'
      disconnect()
      setError(msg)
      setConnectionNotice('Voice could not connect. Your received conversation is retained. Reconnect to try again.')
      setUserStatus('error')
    }
  }, [disconnect, handleToolCall, selectedVoice, setUserStatus, syncRecovery])

  const replayLastResponse = useCallback(async () => {
    const chunks = recoveryRef.current.replayAudio
    if (!chunks.length) return
    const generation = connectionGenerationRef.current
    try {
      const player = playerRef.current ?? new AudioPlayer()
      playerRef.current = player
      player.flush()
      await player.resume()
      if (generation !== connectionGenerationRef.current) { player.stop(); return }
      setConnectionNotice(recoveryRef.current.replayIsPartial
        ? 'Replaying the received portion of this reply. Missing audio was not received.'
        : 'Replaying the received reply.')
      await Promise.all(chunks.map((chunk) => player.playChunk(chunk)))
    } catch (err) {
      if (generation === connectionGenerationRef.current) setError(err instanceof Error ? err.message : 'Replay failed.')
    }
  }, [])

  const getCapturedAudio = useCallback(() => recorderRef.current?.getCapturedAudio() ?? capturedAudioRef.current, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const clearTranscripts = useCallback(() => {
    recoveryRef.current.clear()
    syncRecovery()
  }, [syncRecovery])

  const sendTextMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !clientRef.current?.isConnected()) return

    // Immediately stop any residual assistant playback so it does not talk over the user
    playerRef.current?.flush()
    assistantTurnActiveRef.current = false
    setUserStatus('listening')

    // Clear any stale barge-in state before sending this complete text turn.
    recorderRef.current?.resetBargeFrames()

    clientRef.current.sendContextText(text)
    recoveryRef.current.addUserMessage(text)
    syncRecovery()
  }, [setUserStatus, syncRecovery])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    isMuted,
    userVolume,
    assistantVolume,
    getUserVolume,
    getAssistantVolume,
    transcripts,
    error,
    connectionNotice,
    canReplayResponse,
    lastResponseText,
    replayLastResponse,
    reconnect: connect,
    getCapturedAudio,
    selectedVoice,
    setSelectedVoice,
    connect,
    disconnect,
    toggleMute,
    clearTranscripts,
    sendTextMessage,
  }
}
