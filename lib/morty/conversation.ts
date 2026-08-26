export type MortyStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'

export type MortyMessage = {
  role: 'user' | 'assistant'
  content: string
  intent?: string
  toolCalls?: unknown[]
  sources?: unknown[]
}

export type MortyAgentResult = {
  reply: string
  intent: string
  toolCalls: unknown[]
  sources: unknown[]
}

export type MortyConversationState = {
  status: MortyStatus
  messages: MortyMessage[]
  pendingTranscript: string | null
  error: string | null
}

export const initialMortyConversation: MortyConversationState = {
  status: 'idle',
  messages: [],
  pendingTranscript: null,
  error: null,
}

export type MortyConversationAction =
  | { type: 'submit'; transcript: string }
  | { type: 'result'; result: MortyAgentResult }
  | { type: 'status'; status: MortyStatus }
  | { type: 'error'; message: string }
  | { type: 'clear_error' }

export function mortyConversationReducer(
  state: MortyConversationState,
  action: MortyConversationAction,
): MortyConversationState {
  switch (action.type) {
    case 'submit':
      return {
        ...state,
        status: 'thinking',
        pendingTranscript: action.transcript.trim(),
        error: null,
      }
    case 'result':
      return {
        ...state,
        status: 'idle',
        pendingTranscript: null,
        error: null,
        messages: [
          ...state.messages,
          { role: 'user', content: state.pendingTranscript ?? '' },
          {
            role: 'assistant',
            content: action.result.reply,
            intent: action.result.intent,
            toolCalls: action.result.toolCalls,
            sources: action.result.sources,
          },
        ],
      }
    case 'status':
      return { ...state, status: action.status }
    case 'error':
      return { ...state, status: 'error', error: action.message }
    case 'clear_error':
      return { ...state, status: 'idle', error: null }
  }
}

export function normalizeMortyResult(payload: unknown): MortyAgentResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Morty response.')
  }

  const value = payload as Record<string, unknown>
  if (typeof value.reply !== 'string' || !value.reply.trim()) {
    throw new Error('Invalid Morty response.')
  }

  return {
    reply: value.reply.trim(),
    intent: typeof value.intent === 'string' ? value.intent : 'chat',
    toolCalls: Array.isArray(value.toolCalls) ? value.toolCalls : [],
    sources: Array.isArray(value.sources) ? value.sources : [],
  }
}

export function buildMortyRequest(
  transcript: string,
  messages: MortyMessage[],
  sessionId: string,
) {
  return {
    transcript: transcript.trim(),
    messages,
    sessionId,
  }
}
