'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'

import { useVoiceInput } from '@/hooks/use-voice-input'

import {
  buildMortyRequest,
  initialMortyConversation,
  mortyConversationReducer,
  normalizeMortyResult,
  type MortyMessage,
  type MortyStatus,
} from '@/lib/morty/conversation'

function displayError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Morty could not complete that turn. Try again.'
}

export function useMortyConversation({ sessionId = 'morty-workspace' }: { sessionId?: string } = {}) {
  const [state, dispatch] = useReducer(mortyConversationReducer, initialMortyConversation)
  const requestControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const speakingRef = useRef(false)

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    speakingRef.current = false
  }, [])

  const submitTranscript = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim()
      if (!trimmed || requestControllerRef.current) return

      cancelSpeech()
      dispatch({ type: 'submit', transcript: trimmed })

      const controller = new AbortController()
      requestControllerRef.current = controller
      const requestId = ++requestIdRef.current

      try {
        const messages: MortyMessage[] = state.messages.map(({ role, content }) => ({ role, content }))
        const response = await fetch('/api/hermes/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildMortyRequest(trimmed, messages, sessionId)),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).error === 'string'
              ? String((payload as Record<string, unknown>).error)
              : 'Morty could not complete that turn.',
          )
        }

        const result = normalizeMortyResult(payload)
        if (requestId !== requestIdRef.current) return
        dispatch({ type: 'result', result })

        if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(result.reply)
          speakingRef.current = true
          dispatch({ type: 'status', status: 'speaking' })
          utterance.onend = () => {
            speakingRef.current = false
            dispatch({ type: 'status', status: 'idle' })
          }
          utterance.onerror = () => {
            speakingRef.current = false
            dispatch({ type: 'status', status: 'idle' })
          }
          window.speechSynthesis.speak(utterance)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (requestId === requestIdRef.current) dispatch({ type: 'error', message: displayError(error) })
      } finally {
        if (requestId === requestIdRef.current) requestControllerRef.current = null
      }
    },
    [cancelSpeech, sessionId, state.messages],
  )

  const handleTranscript = useCallback(
    (text: string) => {
      dispatch({ type: 'status', status: 'transcribing' })
      void submitTranscript(text)
    },
    [submitTranscript],
  )

  const voice = useVoiceInput({ onTranscript: handleTranscript })
  const { state: voiceState, error: voiceError, start: startVoice, stop: stopVoice } = voice

  useEffect(() => {
    if (voiceState === 'recording') dispatch({ type: 'status', status: 'listening' })
    if (voiceState === 'transcribing') dispatch({ type: 'status', status: 'transcribing' })
    if (voiceState === 'error' && voiceError) dispatch({ type: 'error', message: voiceError })
  }, [voiceError, voiceState])

  const startListening = useCallback(async () => {
    if (requestControllerRef.current || voiceState === 'recording' || voiceState === 'transcribing') return
    cancelSpeech()
    dispatch({ type: 'status', status: 'requesting_permission' })
    await startVoice()
  }, [cancelSpeech, startVoice, voiceState])

  const stopListening = useCallback(() => {
    stopVoice()
  }, [stopVoice])

  const submitText = useCallback(
    (text: string) => {
      void submitTranscript(text)
    },
    [submitTranscript],
  )

  const retry = useCallback(() => {
    if (state.pendingTranscript) void submitTranscript(state.pendingTranscript)
    else dispatch({ type: 'clear_error' })
  }, [state.pendingTranscript, submitTranscript])

  const close = useCallback(() => {
    requestIdRef.current += 1
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    stopVoice()
    cancelSpeech()
    dispatch({ type: 'status', status: 'idle' })
  }, [cancelSpeech, stopVoice])

  const status: MortyStatus = state.status

  return {
    state,
    status,
    voiceError,
    speaking: speakingRef.current,
    submitText,
    startListening,
    stopListening,
    close,
    retry,
    cancelSpeech,
  }
}
