/**
 * Hermes — shared type contract for the Gemini-backed Prometheus voice agent.
 *
 * The contract is deliberately UI-agnostic: any consumer (a CLI, a websocket
 * handler, or a future React surface) can render a `HermesAgentResult` without
 * knowing anything about Gemini, Drive, or the memory store.
 */

export type HermesGender = 'male' | 'female'

/**
 * The high-level intent of a single turn. Used to (a) drive downstream routing
 * and (b) let a UI render the right affordance (e.g. a render-job card).
 */
export type HermesIntent =
  | 'chat'
  | 'memory'
  | 'task'
  | 'drive'
  | 'render'
  | 'handoff'

export interface HermesAgentIdentity {
  /** Stable id for the agent. Always 'hermes'. */
  id: 'hermes'
  name: string
  gender: HermesGender
  tagline: string
  /**
   * The brand segment the agent represents. Used as the persona's worldview so
   * fallback content lands in-the-voice when the project has no context.
   */
  brand: string
}

export interface HermesChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Raw inbound turn. A voice pipeline (AssemblyAI) hands us `transcript`; a
 * text client hands us `messages`. Either path routes into `handleHermesTurn`.
 */
export interface HermesRequest {
  /** The user's current utterance (voice transcript or typed message). */
  transcript: string
  /** Optional prior turns for multi-shot back-and-forth. */
  messages?: HermesChatMessage[]
  sessionId?: string
  userId?: string
  userName?: string
  /** Brand / project display name used to ground the persona. */
  brand?: string
  /**
   * Optional short-lived Google OAuth access token. When present the agent can
   * read the caller's connected Drive scope. (Prefer the server-side refresh in
   * the route; this is the escape hatch for clients that already hold a token.)
   */
  driveAccessToken?: string
  extraContext?: Record<string, unknown>
}

export interface HermesSource {
  title: string
  kind: 'knowledge' | 'video' | 'file' | 'memory'
  href?: string
  score?: number
}

export interface HermesToolCallResult {
  name: string
  label: string
  status: 'ok' | 'error' | 'needs_google_drive' | 'skipped'
  /** One-line, human-readable description for the UI / logs. */
  summary: string
  /** Structured payload the UI may render (files, render job, snippets…). */
  payload?: unknown
  intent?: HermesIntent
  sources?: HermesSource[]
}

export interface HermesMemoryDelta {
  userId: string
  sessionId: string
  added: number
  recalled: number
  snippets: string[]
}

export interface HermesAgentResult {
  schemaVersion: '1.0'
  agent: HermesAgentIdentity
  reply: string
  intent: HermesIntent
  toolCalls: HermesToolCallResult[]
  memory: { persisted: boolean; added: number; recalled: number }
  sources: HermesSource[]
  memoryDelta?: HermesMemoryDelta
}

export function isIntent(value: unknown): value is HermesIntent {
  return (
    value === 'chat' ||
    value === 'memory' ||
    value === 'task' ||
    value === 'drive' ||
    value === 'render' ||
    value === 'handoff'
  )
}
