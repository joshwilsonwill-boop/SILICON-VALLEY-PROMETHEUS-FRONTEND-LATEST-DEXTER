export type MortyLivePhase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'reconnecting' | 'error'

export type MortyLiveToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
}

export type MortyLiveEvent =
  | { type: 'noop' }
  | { type: 'input_transcript'; text: string }
  | { type: 'output_transcript'; text: string }
  | { type: 'audio'; data: string }
  | { type: 'interrupted' }
  | { type: 'turn_complete' }
  | { type: 'tool_calls'; calls: MortyLiveToolCall[] }
  | { type: 'resumption'; handle: string }

export type MortyLiveState = {
  phase: MortyLivePhase
  liveUserTranscript: string
  liveAssistantTranscript: string
  previousExchange: Array<{ role: 'user' | 'assistant'; text: string }>
  scheduledOutput: boolean
  interrupted: boolean
  resumptionHandle: string | null
  reconnectAttempts: number
  inputLevel: number
  error: string | null
}

export type MortyLiveAction =
  | { type: 'connect' }
  | { type: 'connected' }
  | { type: 'provider_event'; event: MortyLiveEvent }
  | { type: 'audio_scheduled' }
  | { type: 'user_activity_started' }
  | { type: 'set_input_level'; level: number }
  | { type: 'reconnecting' }
  | { type: 'reconnect_failed' }
  | { type: 'error'; message: string }
  | { type: 'closed' }

export const initialMortyLiveState: MortyLiveState = {
  phase: 'idle',
  liveUserTranscript: '',
  liveAssistantTranscript: '',
  previousExchange: [],
  scheduledOutput: false,
  interrupted: false,
  resumptionHandle: null,
  reconnectAttempts: 0,
  inputLevel: 0,
  error: null,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

/**
 * Gemini Live transcription events carry the cumulative partial transcript so
 * far, not incremental deltas. Each incoming `text` therefore *replaces* the
 * previous partial (normalized whitespace) instead of being appended to it —
 * appending duplicated the text and made the rail look laggy/garbled.
 */
function replaceTranscript(_existing: string, incoming: string) {
  return incoming.replace(/\s+/g, ' ').trim()
}

function normalizeToolCalls(value: unknown): MortyLiveToolCall[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry, index) => {
    const call = asRecord(entry)
    const name = asText(call?.name)
    if (!name) return []
    const args = asRecord(call?.args) ?? {}
    return [{ id: asText(call?.id) ?? `${name}-${index}`, name, args }]
  })
}

/** Convert only supported Gemini Live envelope fields into client-safe events. */
export function parseGeminiLiveMessage(value: unknown): MortyLiveEvent {
  const message = asRecord(value)
  if (!message) return { type: 'noop' }

  const serverContent = asRecord(message.serverContent)
  if (serverContent) {
    const input = asRecord(serverContent.inputTranscription)
    const inputText = asText(input?.text)
    if (inputText) return { type: 'input_transcript', text: inputText }

    const output = asRecord(serverContent.outputTranscription)
    const outputText = asText(output?.text)
    if (outputText) return { type: 'output_transcript', text: outputText }

    if (serverContent.interrupted === true) return { type: 'interrupted' }
    if (serverContent.turnComplete === true) return { type: 'turn_complete' }

    const modelTurn = asRecord(serverContent.modelTurn)
    const parts = Array.isArray(modelTurn?.parts) ? modelTurn.parts : []
    for (const part of parts) {
      const inlineData = asRecord(asRecord(part)?.inlineData)
      const data = asText(inlineData?.data)
      if (data) return { type: 'audio', data }
    }
  }

  const toolCall = asRecord(message.toolCall)
  const calls = normalizeToolCalls(toolCall?.functionCalls)
  if (calls.length) return { type: 'tool_calls', calls }

  const resumption = asRecord(message.sessionResumptionUpdate)
  const handle = asText(resumption?.newHandle)
  if (handle) return { type: 'resumption', handle }

  return { type: 'noop' }
}

function finalizeExchange(state: MortyLiveState): MortyLiveState['previousExchange'] {
  const entries = [...state.previousExchange]
  if (state.liveUserTranscript) entries.push({ role: 'user', text: state.liveUserTranscript })
  if (state.liveAssistantTranscript) entries.push({ role: 'assistant', text: state.liveAssistantTranscript })
  return entries.slice(-2)
}

export function mortyLiveReducer(state: MortyLiveState, action: MortyLiveAction): MortyLiveState {
  switch (action.type) {
    case 'connect':
      return { ...state, phase: 'connecting', error: null, interrupted: false }
    case 'connected':
      return { ...state, phase: 'listening', reconnectAttempts: 0, error: null }
    case 'audio_scheduled':
      return { ...state, phase: 'speaking', scheduledOutput: true, interrupted: false }
    case 'user_activity_started':
      return { ...state, phase: 'listening', scheduledOutput: false, interrupted: true }
    case 'set_input_level':
      return { ...state, inputLevel: Math.max(0, Math.min(1, action.level)) }
    case 'reconnecting':
      return { ...state, phase: 'reconnecting', scheduledOutput: false }
    case 'reconnect_failed': {
      const reconnectAttempts = state.reconnectAttempts + 1
      return reconnectAttempts >= 3
        ? { ...state, phase: 'error', reconnectAttempts, error: 'Live connection could not reconnect.' }
        : { ...state, phase: 'reconnecting', reconnectAttempts }
    }
    case 'error':
      return { ...state, phase: 'error', error: action.message, scheduledOutput: false }
    case 'closed':
      return { ...initialMortyLiveState, previousExchange: finalizeExchange(state) }
    case 'provider_event':
      switch (action.event.type) {
        case 'input_transcript':
          return { ...state, phase: 'listening', liveUserTranscript: replaceTranscript(state.liveUserTranscript, action.event.text) }
        case 'output_transcript':
          return { ...state, phase: 'speaking', liveAssistantTranscript: replaceTranscript(state.liveAssistantTranscript, action.event.text) }
        case 'interrupted':
          return { ...state, phase: 'listening', scheduledOutput: false, interrupted: true }
        case 'turn_complete':
          return {
            ...state,
            phase: 'listening',
            scheduledOutput: false,
            previousExchange: finalizeExchange(state),
            liveUserTranscript: '',
            liveAssistantTranscript: '',
          }
        case 'resumption':
          return { ...state, resumptionHandle: action.event.handle }
        default:
          return state
      }
  }
}

export function toGeminiToolResponse(callId: string, name: string, response: unknown): Record<string, unknown> {
  return {
    toolResponse: {
      functionResponses: [{ id: callId, name, response: { result: response ?? {} } }],
    },
  }
}
