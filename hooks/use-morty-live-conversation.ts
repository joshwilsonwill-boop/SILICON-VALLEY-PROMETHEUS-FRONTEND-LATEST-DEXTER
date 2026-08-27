'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'

import { MortyAudioCapture, MortyAudioPlayback } from '@/lib/morty/live-audio'
import {
  initialMortyLiveState,
  mortyLiveReducer,
  parseGeminiLiveMessage,
  toGeminiToolResponse,
  type MortyLiveToolCall,
} from '@/lib/morty/live-protocol'

type TokenResponse = { token: string; sessionId: string }

const LIVE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

export function useMortyLiveConversation() {
  const [state, dispatch] = useReducer(mortyLiveReducer, initialMortyLiveState)
  const socketRef = useRef<WebSocket | null>(null)
  const captureRef = useRef<MortyAudioCapture | null>(null)
  const playbackRef = useRef<MortyAudioPlayback | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const closingRef = useRef(false)
  const transcriptRef = useRef({ user: '', assistant: '' })
  const reopenRef = useRef<(() => Promise<void>) | null>(null)
  const reconnectAttemptsRef = useRef(0)

  useEffect(() => {
    transcriptRef.current = { user: state.liveUserTranscript, assistant: state.liveAssistantTranscript }
  }, [state.liveAssistantTranscript, state.liveUserTranscript])

  const persistMemory = useCallback(async () => {
    const sessionId = sessionIdRef.current
    const transcript = transcriptRef.current
    if (!sessionId || (!transcript.user && !transcript.assistant)) return
    await fetch('/api/morty/live/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userTranscript: transcript.user, assistantTranscript: transcript.assistant }),
      keepalive: true,
    }).catch(() => undefined)
  }, [])

  const relayToolCall = useCallback(async (call: MortyLiveToolCall) => {
    const socket = socketRef.current
    const sessionId = sessionIdRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !sessionId) return
    const response = await fetch('/api/morty/live/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, callId: call.id, name: call.name, args: call.args }),
    })
    const payload = await response.json().catch(() => ({})) as { response?: unknown }
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(toGeminiToolResponse(call.id, call.name, payload.response ?? {})))
  }, [])

  const close = useCallback(async () => {
    closingRef.current = true
    abortRef.current?.abort()
    socketRef.current?.close()
    socketRef.current = null
    await captureRef.current?.stop()
    await playbackRef.current?.close()
    captureRef.current = null
    playbackRef.current = null
    await persistMemory()
    sessionIdRef.current = null
    dispatch({ type: 'closed' })
  }, [persistMemory])

  const open = useCallback(async () => {
    if (socketRef.current || state.phase === 'connecting') return
    closingRef.current = false
    dispatch({ type: 'connect' })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const tokenResponse = await fetch('/api/morty/live/token', { method: 'POST', signal: controller.signal })
      const token = await tokenResponse.json().catch(() => null) as TokenResponse | null
      if (!tokenResponse.ok || !token?.token || !token.sessionId) throw new Error('Morty could not start a live session.')
      sessionIdRef.current = token.sessionId
      const playback = new MortyAudioPlayback()
      await playback.start()
      playbackRef.current = playback
      const socket = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(token.token)}`)
      socketRef.current = socket
      socket.onopen = async () => {
        reconnectAttemptsRef.current = 0
        socket.send(JSON.stringify({ setup: { model: `models/${process.env.NEXT_PUBLIC_MORTY_LIVE_MODEL || 'gemini-3.1-flash-live-preview'}`, generationConfig: { responseModalities: ['AUDIO'] } } }))
        const capture = new MortyAudioCapture()
        captureRef.current = capture
        await capture.start(
          (data) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ realtimeInput: { audio: { data, mimeType: 'audio/pcm;rate=16000' } } })),
          (level) => dispatch({ type: 'set_input_level', level }),
        )
        dispatch({ type: 'connected' })
      }
      socket.onmessage = (message) => {
        const event = parseGeminiLiveMessage(JSON.parse(String(message.data)))
        if (event.type === 'audio') {
          playback.enqueue(event.data)
          dispatch({ type: 'audio_scheduled' })
        } else if (event.type === 'tool_calls') {
          for (const call of event.calls) void relayToolCall(call)
        } else if (event.type === 'interrupted') {
          playback.clear()
          dispatch({ type: 'user_activity_started' })
        } else dispatch({ type: 'provider_event', event })
      }
      socket.onclose = () => {
        socketRef.current = null
        if (!closingRef.current) {
          reconnectAttemptsRef.current += 1
          dispatch({ type: 'reconnect_failed' })
          if (reconnectAttemptsRef.current < 3) window.setTimeout(() => void reopenRef.current?.(), 600)
        }
      }
      socket.onerror = () => dispatch({ type: 'error', message: 'Morty lost the live connection.' })
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) dispatch({ type: 'error', message: error instanceof Error ? error.message : 'Morty could not start a live session.' })
    }
  }, [relayToolCall, state.phase])

  useEffect(() => {
    reopenRef.current = open
  }, [open])

  useEffect(() => () => { void close() }, [close])

  return { state, open, close, retry: open }
}
