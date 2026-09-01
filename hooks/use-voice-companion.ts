'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AudioPlayer,
  AudioRecorder,
} from '@/lib/voice-companion/audio-streamer'
import {
  GeminiLiveClient,
  type ToolCallHandler,
} from '@/lib/voice-companion/gemini-live-client'
import type { ChatEditorContext } from '@/lib/prometheus-assistant/editor-context'
import type { EditorActionDraft } from '@/lib/editor-actions'

export type VoiceCompanionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
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
  contextProvider?: () => (ChatEditorContext & { videoContext?: unknown }) | null
  onApplyActions?: (drafts: EditorActionDraft[]) => void
  onSeek?: (timeSec: number) => void
  onPlay?: () => void
  onPause?: () => void
  onMute?: () => void
  onUnmute?: () => void
  onTabChange?: (tab: 'Editor' | 'Music' | 'Motion') => void
  onFitModeChange?: (mode: 'fill' | 'fit') => void
  autoConnect?: boolean
}

export function useVoiceCompanion({
  contextProvider,
  onApplyActions,
  onSeek,
  onPlay,
  onPause,
  onMute,
  onUnmute,
  onTabChange,
  onFitModeChange,
}: UseVoiceCompanionOptions = {}) {
  const [status, setStatus] = useState<VoiceCompanionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVisionActive, setIsVisionActive] = useState(true)
  const [userVolume, setUserVolume] = useState(0)
  const [assistantVolume, setAssistantVolume] = useState(0)
  const [transcripts, setTranscripts] = useState<VoiceCompanionTranscriptItem[]>([])
  const [lastSeenFrameTime, setLastSeenFrameTime] = useState<number | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('Puck')

  const clientRef = useRef<GeminiLiveClient | null>(null)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const playerRef = useRef<AudioPlayer | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const visionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted

  // Volume animation loop
  const startVolumeLoop = useCallback(() => {
    const loop = () => {
      if (recorderRef.current && !isMutedRef.current) {
        setUserVolume(recorderRef.current.getVolume())
      } else {
        setUserVolume(0)
      }

      if (playerRef.current) {
        setAssistantVolume(playerRef.current.getVolume())
      } else {
        setAssistantVolume(0)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }, [])

  const stopVolumeLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    setUserVolume(0)
    setAssistantVolume(0)
  }, [])

  // Visual frame capture from Prometheus canvas or video element
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

      const offscreenCanvas = document.createElement('canvas')
      const targetWidth = 640
      const sourceWidth = targetSource instanceof HTMLVideoElement ? targetSource.videoWidth : targetSource.width
      const sourceHeight = targetSource instanceof HTMLVideoElement ? targetSource.videoHeight : targetSource.height

      if (sourceWidth === 0 || sourceHeight === 0) return

      const scale = targetWidth / sourceWidth
      const targetHeight = Math.round(sourceHeight * scale)
      offscreenCanvas.width = targetWidth
      offscreenCanvas.height = targetHeight

      const ctx = offscreenCanvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(targetSource, 0, 0, targetWidth, targetHeight)
      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.6)
      const base64 = dataUrl.split(',')[1]

      if (base64) {
        clientRef.current.sendVisualFrame(base64)
        setLastSeenFrameTime(Date.now())
      }
    } catch {
      // Ignore cross-origin frame capture errors
    }
  }, [isVisionActive])

  // Tool call executor
  const handleToolCall: ToolCallHandler = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case 'seek_timeline': {
          const time = typeof args.timeSec === 'number' ? args.timeSec : 0
          if (onSeek) {
            onSeek(time)
          } else if (onApplyActions) {
            onApplyActions([{ kind: 'seek', timeSec: time, summary: `Seek to ${time}s` }])
          }
          return { success: true, currentTime: time }
        }

        case 'preview_control': {
          const cmd = args.command as string
          if (cmd === 'play') onPlay ? onPlay() : onApplyActions?.([{ kind: 'preview_control', command: 'play', summary: 'Play preview' }])
          if (cmd === 'pause') onPause ? onPause() : onApplyActions?.([{ kind: 'preview_control', command: 'pause', summary: 'Pause preview' }])
          if (cmd === 'mute') onMute ? onMute() : onApplyActions?.([{ kind: 'preview_control', command: 'mute', summary: 'Mute preview' }])
          if (cmd === 'unmute') onUnmute ? onUnmute() : onApplyActions?.([{ kind: 'preview_control', command: 'unmute', summary: 'Unmute preview' }])
          return { success: true, command: cmd }
        }

        case 'switch_workspace_tab': {
          const tab = args.tab as 'Editor' | 'Music' | 'Motion'
          if (onTabChange) onTabChange(tab)
          else if (onApplyActions) onApplyActions([{ kind: 'switch_tab', tab, summary: `Switch to ${tab}` }])
          return { success: true, activeTab: tab }
        }

        case 'set_fit_mode': {
          const mode = args.mode as 'fill' | 'fit'
          if (onFitModeChange) onFitModeChange(mode)
          else if (onApplyActions) onApplyActions([{ kind: 'set_fit_mode', mode, summary: `Fit mode: ${mode}` }])
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
            videoContext: liveContext?.videoContext ?? null,
          }
        }

        default:
          return { error: `Tool ${name} not found` }
      }
    },
    [contextProvider, onApplyActions, onFitModeChange, onMute, onPause, onPlay, onSeek, onTabChange, onUnmute]
  )

  const disconnect = useCallback(() => {
    stopVolumeLoop()
    if (visionTimerRef.current) {
      clearInterval(visionTimerRef.current)
      visionTimerRef.current = null
    }
    recorderRef.current?.stop()
    recorderRef.current = null

    playerRef.current?.stop()
    playerRef.current = null

    clientRef.current?.disconnect()
    clientRef.current = null

    setStatus('disconnected')
  }, [stopVolumeLoop])

  const connect = useCallback(async () => {
    disconnect()
    setError(null)
    setStatus('connecting')

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
          setStatus((prev) => {
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
            setStatus('listening')
          },
          onAudio: (base64Pcm24k) => {
            player.playChunk(base64Pcm24k)
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
            // Instant barge-in: flush player
            player.flush()
            setStatus('interrupted')
            setTimeout(() => {
              setStatus((prev) => (prev === 'interrupted' ? 'listening' : prev))
            }, 300)
          },
          onTurnComplete: () => {
            // Ready for next turn
          },
          onError: (err) => {
            setError(err.message)
            setStatus('error')
          },
          onClose: () => {
            setStatus('disconnected')
          },
          onToolCall: handleToolCall,
        }
      )
      clientRef.current = client

      // 4. Connect WebSocket and await setup confirmation
      await client.connect()

      // 5. Start Audio Recorder only after setup is fully confirmed
      const recorder = new AudioRecorder()
      await recorder.start((base64Chunk) => {
        if (!isMutedRef.current && client.isConnected()) {
          client.sendAudioChunk(base64Chunk)
        }
      })
      recorderRef.current = recorder

      // 6. Start volume meter animation
      startVolumeLoop()

      // 7. Start visual frame sync interval (every 1.8 seconds)
      visionTimerRef.current = setInterval(() => {
        captureAndSendVisualFrame()
      }, 1800)

      // Initial visual frame sync
      setTimeout(() => {
        captureAndSendVisualFrame()
      }, 500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to voice companion'
      setError(msg)
      setStatus('error')
      disconnect()
    }
  }, [captureAndSendVisualFrame, disconnect, handleToolCall, selectedVoice, startVolumeLoop])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const toggleVision = useCallback(() => {
    setIsVisionActive((prev) => {
      const next = !prev
      if (next) {
        setTimeout(captureAndSendVisualFrame, 200)
      }
      return next
    })
  }, [captureAndSendVisualFrame])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    error,
    isMuted,
    isVisionActive,
    userVolume,
    assistantVolume,
    transcripts,
    lastSeenFrameTime,
    selectedVoice,
    setSelectedVoice,
    connect,
    disconnect,
    toggleMute,
    toggleVision,
    captureAndSendVisualFrame,
  }
}
