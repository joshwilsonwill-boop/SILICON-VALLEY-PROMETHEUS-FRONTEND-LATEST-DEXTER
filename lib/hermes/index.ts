import type { MiniRunEnvironment } from '@/lib/server/mini-run-proxy'
import type { HermesAgentResult, HermesIntent, HermesRequest, HermesToolCallResult } from './types'
import { HERMES_IDENTITY, hermesSystemPrompt } from './identity'
import { runHermesTurn } from './gemini'
import {
  buildMemoryDelta,
  compactHermesMemory,
  extractSalientSnippets,
  recallHermesMemory,
  renderMemoryBlock,
  type HermesMemoryEntry,
  type HermesMemoryStore,
} from './memory'
import {
  createHermesToolExecutor,
  HERMES_TOOL_DEFINITIONS,
  toHermesToolCallResult,
  type HermesToolContext,
} from './tools'

export interface HermesTurnDeps {
  apiKey: string
  memoryStore: HermesMemoryStore
  getDriveToken?: () => Promise<string | null>
  miniRunEnv?: MiniRunEnvironment
  fetchImpl?: typeof fetch
  userName?: string
  brand?: string
  now?: string
}

function classifyIntent(toolResults: HermesToolCallResult[]): HermesIntent {
  const names = new Set(toolResults.map((tool) => tool.name))
  if (names.has('dispatch_mini_run')) return 'render'
  if (names.has('list_google_drive_videos')) return 'drive'
  if (names.has('search_hermes_knowledge') || names.has('hermes_recall_memory')) return 'memory'
  return 'chat'
}

function collectSources(toolResults: HermesToolCallResult[]): HermesAgentResult['sources'] {
  const sources: HermesAgentResult['sources'] = []
  for (const tool of toolResults) {
    for (const source of tool.sources ?? []) {
      const key = `${source.title}|${source.kind}`
      if (!sources.some((existing) => `${existing.title}|${existing.kind}` === key)) sources.push(source)
    }
  }
  return sources.slice(0, 12)
}

function nonEmptySnippets(snippets: string[]): string[] {
  return snippets.map((snippet) => snippet.trim()).filter(Boolean)
}

/**
 * Run a single Hermes turn end-to-end: hydrate context + memory, run the Gemini
 * tool loop, normalize the result, and persist any new memory snippets.
 */
export async function handleHermesTurn(
  request: HermesRequest,
  deps: HermesTurnDeps,
): Promise<HermesAgentResult> {
  const userId = request.userId?.trim() || 'anonymous'
  const sessionId = request.sessionId?.trim() || 'default'
  const userName = request.userName || deps.userName
  const brand = request.brand || deps.brand || HERMES_IDENTITY.brand

  const existing = await deps.memoryStore.load(userId)
  const recalled = recallHermesMemory(existing, request.transcript, 5)
  const memoryBlock = renderMemoryBlock(recalled)

  const driveConnected = Boolean(request.driveAccessToken || (await deps.getDriveToken?.()))

  const systemPrompt = hermesSystemPrompt({
    userName,
    brand,
    memoryBlock,
    driveConnected,
    now: deps.now,
  })

  const toolContext: HermesToolContext = {
    userId,
    sessionId,
    memoryStore: deps.memoryStore,
    driveAccessToken: request.driveAccessToken,
    getDriveToken: deps.getDriveToken,
    miniRunEnv: deps.miniRunEnv,
    fetchImpl: deps.fetchImpl,
  }
  const executeTool = createHermesToolExecutor(toolContext)

  const turn = await runHermesTurn({
    apiKey: deps.apiKey,
    systemPrompt,
    history: request.messages,
    userMessage: request.transcript,
    tools: HERMES_TOOL_DEFINITIONS,
    executeTool,
  })

  const toolResults: HermesToolCallResult[] = []
  for (const tool of turn.results) {
    const result = toHermesToolCallResult(tool.name, tool.value)
    toolResults.push(result)
  }

  const intent = classifyIntent(toolResults)
  const sources = collectSources(toolResults)

  const reply =
    turn.text.trim() ||
    (toolResults.length > 0 && toolResults[toolResults.length - 1]?.status !== 'error'
      ? `${toolResults[toolResults.length - 1]?.label ?? 'Done'}.`
      : "I didn't quite catch that. Could you say it again?")

  const snippetCandidates = nonEmptySnippets([
    ...extractSalientSnippets(request.transcript),
    ...extractSalientSnippets(turn.text),
  ])
  const addedEntries: HermesMemoryEntry[] = snippetCandidates.map((text) => ({
    id: `${userId}:${sessionId}:${Date.now()}:${snippetCandidates.indexOf(text)}`,
    userId,
    sessionId,
    text,
    kind: 'fact',
    createdAt: new Date().toISOString(),
    lastTouchedAt: new Date().toISOString(),
  }))

  let persisted = false
  if (addedEntries.length) {
    await deps.memoryStore.save(userId, compactHermesMemory([...existing, ...addedEntries]))
    persisted = true
  }

  const memory = {
    persisted,
    added: addedEntries.length,
    recalled: recalled.length,
  }

  return {
    schemaVersion: '1.0',
    agent: HERMES_IDENTITY,
    reply,
    intent,
    toolCalls: toolResults,
    memory,
    sources,
    memoryDelta: buildMemoryDelta({ userId, sessionId, recalled: recalled.length, snippets: snippetCandidates }),
  }
}
