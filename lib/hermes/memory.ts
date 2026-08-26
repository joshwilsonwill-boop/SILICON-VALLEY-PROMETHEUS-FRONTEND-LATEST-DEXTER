import type { HermesMemoryDelta } from './types'

/**
 * Hermes memory.
 *
 * The voice-agent memory is NOT a vector store: it's a small, ranked set of
 * *context snippets* (facts, preferences, task intents, file excerpts) that are
 * scored against each new utterance and re-compiled into the prompt whenever a
 * back-and-forth interaction is re-established. This is deliberately dependency
 * free so it can be unit-tested and run in a plain node/tsx harness.
 */

export type HermesMemoryKind = 'fact' | 'preference' | 'task' | 'file_snippet'

export interface HermesMemoryEntry {
  id: string
  userId: string
  sessionId: string
  text: string
  kind: HermesMemoryKind
  sourceTitle?: string
  createdAt: string
  lastTouchedAt: string
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'from',
  'have',
  'into',
  'just',
  'make',
  'that',
  'this',
  'what',
  'when',
  'where',
  'with',
  'your',
  'the',
  'and',
  'for',
  'are',
  'was',
  'can',
  'you',
])

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9:/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .slice(0, 48)
}

function bigrams(tokens: string[]): string[] {
  const result: string[] = []
  for (let index = 0; index < tokens.length - 1; index += 1) {
    result.push(`${tokens[index]} ${tokens[index + 1]}`)
  }
  return result
}

function scoreExcerpt(query: string, content: string): number {
  const normalizedQuery = normalize(query)
  const queryTokens = tokenize(query)
  const normalizedContent = normalize(content)
  let score = 0
  if (normalizedQuery.length > 12 && normalizedContent.includes(normalizedQuery)) score += 9
  for (const token of queryTokens) {
    if (normalizedContent.includes(token)) score += token.length > 7 ? 2.2 : 1
  }
  for (const bigram of bigrams(queryTokens)) {
    if (normalizedContent.includes(bigram)) score += 3
  }
  return score
}

/** Rank memory entries against a query; returns the top-k matches. */
export function recallHermesMemory(
  entries: HermesMemoryEntry[],
  query: string,
  limit = 5,
): HermesMemoryEntry[] {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []
  return entries
    .map((entry) => ({ entry, score: scoreExcerpt(query, entry.text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.lastTouchedAt.localeCompare(a.entry.lastTouchedAt))
    .slice(0, Math.max(1, Math.min(8, limit)))
    .map((item) => item.entry)
}

/**
 * Pull salient one-liner snippets from a long transcript: facts, preferences,
 * and explicit task intents. Kept conservative so memory has signal, not noise.
 */
export function extractSalientSnippets(value: string, max = 4): string[] {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20 && sentence.length <= 240)
  const intentKeywords = /(render|cut|short|drive|video|make|create|export|upload|package|want|need|love|prefer|like|using|9:16|aspect)/i
  const chosen = sentences
    .filter((sentence) => intentKeywords.test(sentence))
    .slice(0, max)
  if (chosen.length) return chosen
  return sentences[0] ? [sentences[0]] : []
}

/** Rule-of-thumb memory compaction: drop near-duplicates, keep the newest. */
export function compactHermesMemory(entries: HermesMemoryEntry[], max = 120): HermesMemoryEntry[] {
  const seen = new Set<string>()
  const result: HermesMemoryEntry[] = []
  const sorted = [...entries].sort((a, b) => b.lastTouchedAt.localeCompare(a.lastTouchedAt))
  for (const entry of sorted) {
    const key = normalize(entry.text).slice(0, 90)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
    if (result.length >= max) break
  }
  return result
}

/** Render the memory entries into a compact block for the system prompt. */
export function renderMemoryBlock(entries: HermesMemoryEntry[]): string {
  if (!entries.length) return ''
  return entries
    .map((entry, index) => {
      const line = `${entry.kind}${entry.sourceTitle ? ` from ${entry.sourceTitle}` : ''}: ${entry.text}`
      return `- ${index + 1}. ${line}`
    })
    .join('\n')
}

export function buildMemoryDelta(input: {
  userId: string
  sessionId: string
  recalled: number
  snippets: string[]
}): HermesMemoryDelta {
  return {
    userId: input.userId,
    sessionId: input.sessionId,
    added: input.snippets.length,
    recalled: input.recalled,
    snippets: input.snippets,
  }
}

export interface HermesMemoryStore {
  load(userId: string): Promise<HermesMemoryEntry[]>
  save(userId: string, entries: HermesMemoryEntry[]): Promise<void>
}

/**
 * In-memory store for tests / dev. Keyed by userId.
 */
export class InMemoryHermesMemoryStore implements HermesMemoryStore {
  private readonly buckets = new Map<string, HermesMemoryEntry[]>()

  async load(userId: string): Promise<HermesMemoryEntry[]> {
    return this.buckets.get(userId) ?? []
  }

  async save(userId: string, entries: HermesMemoryEntry[]): Promise<void> {
    this.buckets.set(userId, compactHermesMemory(entries))
  }
}
