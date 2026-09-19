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
  status: VoiceCompanionStatus
  isMuted: boolean
  isVisionActive: boolean
  userVolume: number
  assistantVolume: number
  getUserVolume: () => number
  getAssistantVolume: () => number
  transcripts: VoiceCompanionTranscriptItem[]
  lastSeenFrameTime: number | null
  error: string | null
  selectedVoice: string
  setSelectedVoice: (voice: string) => void
  connect: () => Promise<void>
  disconnect: () => void
  toggleMute: () => void
  toggleVision: () => void
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
  const [isVisionActive, setIsVisionActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userVolume, setUserVolume] = useState(0)
  const [assistantVolume, setAssistantVolume] = useState(0)
  const [transcripts, setTranscripts] = useState<VoiceCompanionTranscriptItem[]>([])
  const [lastSeenFrameTime, setLastSeenFrameTime] = useState<number | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('Puck')

  const clientRef = useRef<GeminiLiveClient | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const visionTimerRef = useRef<NodeJS.Timeout | null>(null)
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
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
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

  // Visual frame capture from Prometheus canvas or video element using reused canvas
  const captureAndSendVisualFrame = useCallback(() => {
    if (!clientRef.current?.isConnected() || !isVisionActive) return

    try {
      // Find the active video or Remotion canvas in the Prometheus editor
      const videoEl = document.querySelector('video') as HTMLVideoElement | null
      const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null

      let targetSource: HTMLVideoElement | HTMLCanvasElement | null = null
      if (videoEl && videoEl.videoWidth > 0 && !videoEl.paused) {
        targetSource = videoEl
      } else if (canvasEl && canvasEl.width > 0) {
        targetSource = canvasEl
      } else if (videoEl && videoEl.videoWidth > 0) {
        targetSource = videoEl
      }

      if (!targetSource) return

      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas')
      }
      const offscreenCanvas = offscreenCanvasRef.current
      const targetWidth = 640
      const sourceWidth = targetSource instanceof HTMLVideoElement ? targetSource.videoWidth : targetSource.width
      const sourceHeight = targetSource instanceof HTMLVideoElement ? targetSource.videoHeight : targetSource.height

      if (sourceWidth === 0 || sourceHeight === 0) return

      const scale = targetWidth / sourceWidth
      const targetHeight = Math.round(sourceHeight * scale)
      if (offscreenCanvas.width !== targetWidth || offscreenCanvas.height !== targetHeight) {
        offscreenCanvas.width = targetWidth
        offscreenCanvas.height = targetHeight
      }

      const ctx = offscreenCanvas.getContext('2d', { alpha: false })
      if (!ctx) return

      ctx.drawImage(targetSource, 0, 0, targetWidth, targetHeight)
      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.5)
      const base64 = dataUrl.split(',')[1]

      if (base64) {
        clientRef.current.sendVisualFrame(base64)
        setLastSeenFrameTime(Date.now())
      }
    } catch {
      // Ignore cross-origin frame capture errors
    }
  }, [isVisionActive])

  // Tool call executor. Reads handlers through a ref so late-registered editor
  // bridges (or re-mounted panels) are always honored without reconnecting.
  const handleToolCall: ToolCallHandler = useCallback(
    async (name: string, args: Record<string, unknown>) => {
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
        isTakeoverEnabled,
        onToggleTakeover,
      } = handlersRef.current

      switch (name) {
        case 'seek_timeline': {
          const time = typeof args.timeSec === 'number' ? args.timeSec : 0
          if (onSeek) {
            await onSeek(time)
          } else if (onApplyActions) {
            await onApplyActions([{ kind: 'seek', timeSec: time, summary: `Seek to ${time}s` }])
          }
          return { success: true, newPlayheadSec: time }
        }

        case 'preview_control': {
          const cmd = args.command as 'play' | 'pause' | 'mute' | 'unmute'
          if (cmd === 'play') onPlay ? await onPlay() : await onApplyActions?.([{ kind: 'preview_control', command: 'play', summary: 'Play preview' }])
          if (cmd === 'pause') onPause ? await onPause() : await onApplyActions?.([{ kind: 'preview_control', command: 'pause', summary: 'Pause preview' }])
          if (cmd === 'mute') onMute ? await onMute() : await onApplyActions?.([{ kind: 'preview_control', command: 'mute', summary: 'Mute preview' }])
          if (cmd === 'unmute') onUnmute ? await onUnmute() : await onApplyActions?.([{ kind: 'preview_control', command: 'unmute', summary: 'Unmute preview' }])
          return { success: true, command: cmd }
        }

        case 'switch_workspace_tab': {
          const tab = args.tab as 'Editor' | 'Music' | 'Motion'
          if (onTabChange) await onTabChange(tab)
          else if (onApplyActions) await onApplyActions([{ kind: 'switch_tab', tab, summary: `Switch to ${tab}` }])
          return { success: true, activeTab: tab }
        }

        case 'set_fit_mode': {
          const mode = args.mode as 'fill' | 'fit'
          if (onFitModeChange) await onFitModeChange(mode)
          else if (onApplyActions) await onApplyActions([{ kind: 'set_fit_mode', mode, summary: `Fit mode: ${mode}` }])
          return { success: true, fitMode: mode }
        }

        case 'get_editor_state': {
          const liveContext = contextProvider?.()
          return {
            success: true,
            playheadSec: liveContext?.playheadSec ?? 0,
            durationSec: liveContext?.durationSec ?? 0,
            workspaceTab: liveContext?.workspaceTab ?? 'Editor',
            fitMode: liveContext?.fitMode ?? 'fit',
            muted: liveContext?.muted ?? false,
          }
        }

        case 'autonomous_transcript_cut': {
          const phrase = String(args.phrase ?? '')
          const success = await autonomousCoordinator.executeTranscriptCut(phrase, {
            onSwitchTab: onTabChange ? (tab) => onTabChange(tab as 'Editor' | 'Music' | 'Motion') : undefined,
          })
          return { success, cutPhrase: phrase }
        }

        case 'autonomous_music_action': {
          const trackId = args.trackId ? String(args.trackId) : undefined
          const genreOrMood = args.genreOrMood ? String(args.genreOrMood) : undefined
          const success = await autonomousCoordinator.executeMusicSelection({
            trackId,
            genreOrMood,
            query: genreOrMood,
            onSwitchTab: onTabChange ? (tab) => onTabChange(tab as 'Editor' | 'Music' | 'Motion') : undefined,
          })
          return { success, action: args.action, genreOrMood }
        }

        case 'toggle_agent_takeover': {
          if (!onToggleTakeover) return { success: false, error: 'Editor not linked — cannot toggle takeover.' }
          onToggleTakeover()
          return { success: true, takeoverEnabled: !isTakeoverEnabled }
        }

        case 'set_playback_rate': {
          const rate = typeof args.rate === 'number' ? args.rate : Number(args.rate)
          if (!Number.isFinite(rate) || rate <= 0) return { success: false, error: 'Invalid playback rate.' }
          onApplyActions?.([{ kind: 'set_playback_rate', rate: Math.min(4, Math.max(0.25, rate)), summary: `Playback speed ${rate}x` }])
          return { success: true, rate }
        }

        case 'step_frames': {
          const frames = typeof args.frames === 'number' ? args.frames : Number(args.frames)
          if (!Number.isFinite(frames) || frames === 0) return { success: false, error: 'Invalid frame count.' }
          onApplyActions?.([{ kind: 'step_frames', frames: Math.round(Math.min(90, Math.max(-90, frames))), summary: `Frame step ${frames}` }])
          return { success: true, frames }
        }

        case 'set_caption_style': {
          const style = String(args.style ?? '')
          if (!isTakeoverEnabled) return { success: false, error: 'Takeover mode is off — ask the user to enable it first.' }
          onApplyActions?.([{ kind: 'set_caption_style', style: style as 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third', summary: `Caption style: ${style}` }])
          return { success: true, style }
        }

        case 'start_render': {
          const mode = args.mode === 'final' ? 'final' : 'preview'
          await onApplyActions?.([{ kind: 'start_render', mode, summary: mode === 'final' ? 'Opening Master Review for final export' : 'Dispatching viral batch render' }])
          return { success: true, mode }
        }

        default:
          return { error: `Tool ${name} not found` }
      }
    },
    []
  )

  const disconnect = useCallback(() => {
    if (visionTimerRef.current) {
      clearInterval(visionTimerRef.current)
      visionTimerRef.current = null
    }
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current)
      volumeTimerRef.current = null
    }
    assistantTurnActiveRef.current = false
    recorderRef.current?.stop()
    recorderRef.current = null

    playerRef.current?.stop()
    playerRef.current = null

    clientRef.current?.disconnect()
    clientRef.current = null

    setUserVolume(0)
    setAssistantVolume(0)
    setUserStatus('disconnected')
  }, [setUserStatus])

  const connect = useCallback(async () => {
    disconnect()
    setError(null)
    setUserStatus('connecting')

    // 0. Prime and resume AudioContext synchronously on the user click gesture
    try {
      primeAudioContext()
    } catch {
      // Ignore initial SSR/non-browser checks
    }

    try {
      // 1. Fetch authorized session credentials
      const res = await fetch('/api/voice-companion/session')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to initialize voice session')
      }
      const sessionData = await res.json()

      // 2. Initialize Audio Player and unlock Web Audio context
      const player = new AudioPlayer({
        onPlaybackStateChange: (playing) => {
          if (!playing) assistantTurnActiveRef.current = false
          setUserStatus((prev) => {
            if (prev === 'disconnected' || prev === 'error') return prev
            return playing ? 'speaking' : 'listening'
          })
        },
      })
      await player.resume()
      playerRef.current = player

      // 3. Initialize Gemini Live Client
      const client = new GeminiLiveClient(
        {
          wsUrl: sessionData.wsUrl,
          wsUrls: sessionData.wsUrls,
          model: sessionData.model,
          voiceName: selectedVoice || sessionData.voiceName,
        },
        {
          onOpen: () => {
            // Connected to socket
          },
          onSetupConfirmed: () => {
            setUserStatus('listening')
          },
          onAudio: (base64Pcm24k) => {
            // Assistant turn is live: keep the echo gate engaged even between
            // chunks (and after a barge-in flush) until turnComplete arrives.
            assistantTurnActiveRef.current = true
            void player.playChunk(base64Pcm24k).catch((playbackError) => {
              const message = playbackError instanceof Error ? playbackError.message : 'Jarvis audio playback failed.'
              setError(message)
              setUserStatus('error')
            })
          },
          onTranscript: (text, isUser) => {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.role === (isUser ? 'user' : 'assistant')) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: `${last.text} ${text}`.trim() },
                ]
              }
              return [
                ...prev.slice(-15),
                {
                  id: `tr-${Date.now()}-${Math.random()}`,
                  role: isUser ? 'user' : 'assistant',
                  text,
                  timestamp: Date.now(),
                },
              ]
            })
          },
          onInterrupted: () => {
            // When Gemini Live server sends an interrupted event, its server-side VAD
            // detected user speech barge-in. We honor the interrupt whenever:
            // 1. Instantaneous mic volume is above minimal background noise (> 0.04), OR
            // 2. The recorder detected speech energy recently (hasRecentSpeech), OR
            // 3. Audio was playing or queued and the user is unmuted.
            // This guarantees Jarvis stops immediately when the user interrupts instead
            // of forcing statement completion.
            const userVol = recorderRef.current?.getVolume() ?? 0
            const hadRecentSpeech = recorderRef.current?.hasRecentSpeech(1200) ?? false
            const isPlayingOrPending =
              (playerRef.current?.getIsPlaying() ?? false) ||
              ((playerRef.current?.getPendingMs() ?? 0) > 0)

            if (userVol > 0.04 || hadRecentSpeech || isPlayingOrPending) {
              assistantTurnActiveRef.current = false
              player.flush()
              recorderRef.current?.resetBargeFrames()
              setUserStatus('interrupted')
              setTimeout(() => {
                setUserStatus((prev) => (prev === 'interrupted' ? 'listening' : prev))
              }, 300)
            }
          },
          onTurnComplete: () => {
            assistantTurnActiveRef.current = false
          },
          onError: (err) => {
            setError(err.message)
            setUserStatus('error')
          },
          onClose: () => {
            assistantTurnActiveRef.current = false
            setUserStatus((prev) => (prev === 'error' ? 'error' : 'disconnected'))
          },
          onToolCall: handleToolCall,
        }
      )
      clientRef.current = client

      // 4. Connect WebSocket and await setup confirmation
      await client.connect()

      // 5. Start Audio Recorder with turn-aware echo gating. Gating stays
      //    engaged for the whole assistant turn (turn flag OR pending buffer),
      //    which is what kills the interrupt-flush-open-gate feedback loop.
      const recorder = new AudioRecorder({
        getIsSpeaking: () =>
          assistantTurnActiveRef.current ||
          (playerRef.current?.getIsPlaying() ?? false) ||
          (playerRef.current?.getPendingMs() ?? 0) > 0,
      })
      await recorder.start((base64Chunk) => {
        if (!isMutedRef.current && client.isConnected()) {
          client.sendAudioChunk(base64Chunk)
        }
      })
      recorderRef.current = recorder

      // 6. Poll live volumes for reactive HUD visuals (throttled state updates)
      volumeTimerRef.current = setInterval(() => {
        const nextUser = recorderRef.current?.getVolume() ?? 0
        const nextAssistant = playerRef.current?.getVolume() ?? 0
        setUserVolume((prev) => (Math.abs(prev - nextUser) > 0.02 ? nextUser : prev))
        setAssistantVolume((prev) => (Math.abs(prev - nextAssistant) > 0.02 ? nextAssistant : prev))
      }, 90)

      // 7. Start visual frame sync interval (every 2.2 seconds)
      visionTimerRef.current = setInterval(() => {
        captureAndSendVisualFrame()
      }, 2200)

      // Initial visual frame sync
      setTimeout(() => {
        captureAndSendVisualFrame()
      }, 600)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to voice companion'
      setError(msg)
      setUserStatus('error')
      disconnect()
    }
  }, [captureAndSendVisualFrame, disconnect, handleToolCall, selectedVoice, setUserStatus])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const toggleVision = useCallback(() => {
    setIsVisionActive((prev) => !prev)
  }, [])

  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  const sendTextMessage = useCallback((text: string) => {
    if (!clientRef.current?.isConnected()) return
    clientRef.current.sendContextText(text)
    setTranscripts((prev) => [
      ...prev,
      {
        id: `tr-${Date.now()}`,
        role: 'user',
        text,
        timestamp: Date.now(),
      },
    ])
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    isMuted,
    isVisionActive,
    userVolume,
    assistantVolume,
    getUserVolume,
    getAssistantVolume,
    transcripts,
    lastSeenFrameTime,
    error,
    selectedVoice,
    setSelectedVoice,
    connect,
    disconnect,
    toggleMute,
    toggleVision,
    clearTranscripts,
    sendTextMessage,
  }
}
