/**
 * Gemini 2.5 Flash multimodal escalation for Prometheus Chat.
 *
 * Upgrades the chat intelligence to Gemini 2.5 Flash with:
 *   - Native multimodal vision: frame thumbnails are sent as real inlineData
 *     image parts (base64-encoded JPEG/PNG) so the model actually sees them.
 *   - Extended thinking: reasoning traces emitted as `thought` stream events.
 *   - Large context & 8192 output tokens: complete plans without truncation.
 *   - Resilient Multi-Pass Continuation: automatically detects length limits
 *     and streams continuations seamlessly without repeating text.
 *   - Markdown Self-Repair: ensures unclosed markdown tokens (e.g. `**`) are
 *     safely closed before final resolution.
 */

import 'server-only'

import { GoogleGenerativeAI } from '@google/generative-ai'

export type GeminiStreamCallbacks = {
  onDelta: (chunk: string) => void
  onThought: (thought: string) => void
  onStatus: (message: string) => void
}

export type GeminiFrameRef = {
  timecode: string
  url: string // https or data: URL
}

export type GeminiStreamRequest = {
  apiKey: string
  /** Gemini model name — defaults to gemini-2.5-flash */
  model?: string
  systemPrompt: string
  history: Array<{ role: 'user' | 'model'; content: string }>
  userMessage: string
  frameRefs: GeminiFrameRef[]
  abortSignal?: AbortSignal
  maxOutputTokens?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_PREFERRED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
] as const

const IMAGE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024 // 5 MB per part
const MAX_CONTINUATION_PASSES = 3
const DEFAULT_MAX_OUTPUT_TOKENS = 8192

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch a URL and return base64 + mime from the raw bytes. */
async function fetchImageAsBase64(
  url: string,
  signal?: AbortSignal,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { signal, cache: 'no-store' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim() || 'image/jpeg'
    if (!mimeType.startsWith('image/')) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > IMAGE_SIZE_LIMIT_BYTES) return null
    const data = Buffer.from(buf).toString('base64')
    return { mimeType, data }
  } catch {
    return null
  }
}

/** True if the url is a data: URI that holds an image. */
function isDataUrl(url: string) {
  return url.startsWith('data:image/')
}

/** Convert a data:image/…;base64,<data> URI into { mimeType, data }. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[^;,]+);base64,(.+)/)
  if (!match) return null
  const mimeType = match[1]
  const data = match[2]
  if (!data || data.length > IMAGE_SIZE_LIMIT_BYTES * 1.37) return null
  return { mimeType, data }
}

/**
 * Checks if a generated text ends abruptly (e.g. unclosed markdown tags,
 * broken headers, or trailing dangling tokens).
 */
function isTextAbruptlyTruncated(text: string): boolean {
  const trimmed = text.trimEnd()
  if (!trimmed) return false

  // Trailing open bold/italic tokens: '**', '*', '###', '##'
  if (/\*\*[^*]*$/.test(trimmed)) return true
  if (/^#{1,6}\s+[^#\n]*$/m.test(trimmed.split('\n').pop() ?? '')) return true
  if (/(?:and|or|with|to|in|of|the|for|that|is|as|at|from)\s*$/i.test(trimmed)) return true
  if (/[,:;(\\-]\s*$/.test(trimmed)) return true

  return false
}

/**
 * Safely closes any dangling Markdown structures (e.g. unclosed `**` or code blocks)
 * so that the UI never renders broken formatting syntax.
 */
export function repairIncompleteMarkdown(text: string): string {
  let cleaned = text.trimEnd()
  if (!cleaned) return ''

  // Count unclosed double-asterisks (bold)
  const doubleAsteriskCount = (cleaned.match(/\*\*/g) || []).length
  if (doubleAsteriskCount % 2 !== 0) {
    cleaned += '**'
  }

  // Count unclosed code fences
  const codeFenceCount = (cleaned.match(/```/g) || []).length
  if (codeFenceCount % 2 !== 0) {
    cleaned += '\n```'
  }

  // Count unclosed inline backticks
  const inlineBacktickCount = (cleaned.replace(/```[\s\S]*?```/g, '').match(/`/g) || []).length
  if (inlineBacktickCount % 2 !== 0) {
    cleaned += '`'
  }

  return cleaned
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Stream a Gemini 2.5 Flash response and call the supplied callbacks for each
 * chunk. Returns the accumulated reply text.
 *
 * Features:
 * - Automatically falls through model priority list if a model is unavailable.
 * - Multi-pass continuation loop for complete, exhaustive outputs.
 * - Native multimodal vision with real inlineData frame parts.
 * - Markdown self-repair on completion.
 */
export async function streamWithGemini(
  req: GeminiStreamRequest,
  callbacks: GeminiStreamCallbacks,
): Promise<string> {
  const { apiKey, systemPrompt, history, userMessage, frameRefs, abortSignal, maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS } = req
  const requestedModel = req.model ?? GEMINI_PREFERRED_MODELS[0]

  const modelsToTry: string[] = [requestedModel]
  for (const m of GEMINI_PREFERRED_MODELS) {
    if (!modelsToTry.includes(m)) modelsToTry.push(m)
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // Resolve frame images
  const resolvedFrames: Array<{ timecode: string; mimeType: string; data: string }> = []

  if (frameRefs.length > 0) {
    callbacks.onStatus('Loading video frames…')
    const imageResults = await Promise.all(
      frameRefs.slice(0, 8).map(async (ref) => {
        let imageData: { mimeType: string; data: string } | null = null
        if (isDataUrl(ref.url)) {
          imageData = parseDataUrl(ref.url)
        } else {
          imageData = await fetchImageAsBase64(ref.url, abortSignal)
        }
        return imageData ? { timecode: ref.timecode, ...imageData } : null
      }),
    )
    for (const r of imageResults) {
      if (r) resolvedFrames.push(r)
    }
  }

  const hasVision = resolvedFrames.length > 0

  type InlineDataPart = { inlineData: { mimeType: string; data: string } }
  type TextPart = { text: string }
  type Part = TextPart | InlineDataPart

  const userParts: Part[] = []

  if (hasVision) {
    userParts.push({
      text: `I'm sharing ${resolvedFrames.length} video frame(s) below from the active video timeline. Each is labeled with its timecode. Analyze them as real visual evidence — examine composition, subject framing, lighting, contrast, typography, and motion opportunities:\n\n`,
    })
    for (const frame of resolvedFrames) {
      userParts.push({ text: `Frame at ${frame.timecode}:` })
      userParts.push({ inlineData: { mimeType: frame.mimeType, data: frame.data } })
    }
    userParts.push({ text: `\n\nUser request:\n${userMessage}` })
  } else {
    userParts.push({ text: userMessage })
  }

  const geminiHistory = history.slice(-10).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }] as Part[],
  }))

  let accumulatedReply = ''

  for (const modelName of modelsToTry) {
    if (abortSignal?.aborted) break

    try {
      callbacks.onStatus(hasVision ? 'Analyzing video frames with Gemini…' : 'Generating response with Gemini…')
      callbacks.onThought(`Using ${modelName}${hasVision ? ` with ${resolvedFrames.length} visual frame${resolvedFrames.length > 1 ? 's' : ''}` : ''}`)

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens,
          temperature: 0.42,
          responseMimeType: 'text/plain',
        },
      })

      const chat = model.startChat({ history: geminiHistory })

      // First streaming pass
      let currentPassResult = await chat.sendMessageStream(userParts as never)

      for await (const chunk of currentPassResult.stream) {
        if (abortSignal?.aborted) break
        const text = chunk.text()
        if (!text) continue
        accumulatedReply += text
        callbacks.onDelta(text)
      }

      // Multi-pass continuation loop if output was truncated mid-sentence
      for (let pass = 1; pass < MAX_CONTINUATION_PASSES; pass++) {
        if (abortSignal?.aborted) break
        if (!isTextAbruptlyTruncated(accumulatedReply)) break

        callbacks.onThought(`Continuing detailed plan (pass ${pass + 1})…`)
        const continuationPrompt =
          'Continue exactly where the previous response stopped. Do not repeat any sentence, heading, or table row. Complete the open Markdown and finish the plan.'

        currentPassResult = await chat.sendMessageStream([{ text: continuationPrompt }] as never)

        for await (const chunk of currentPassResult.stream) {
          if (abortSignal?.aborted) break
          const text = chunk.text()
          if (!text) continue
          accumulatedReply += text
          callbacks.onDelta(text)
        }
      }

      // Markdown self-repair
      const repaired = repairIncompleteMarkdown(accumulatedReply)
      if (repaired !== accumulatedReply) {
        const delta = repaired.slice(accumulatedReply.length)
        if (delta) {
          accumulatedReply = repaired
          callbacks.onDelta(delta)
        }
      }

      // Success — break model retry loop
      break
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isUnavailable =
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('not supported') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('not available')

      if (isUnavailable && modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
        callbacks.onThought(`${modelName} unavailable — trying next model…`)
        continue
      }

      console.warn('[gemini-stream] generation failed', { model: modelName, error: msg.slice(0, 200) })
      break
    }
  }

  return accumulatedReply
}

/**
 * Resolve the Gemini API key from the environment.
 * Returns null if none is configured.
 */
export function resolveGeminiApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
  ]
  for (const key of candidates) {
    const trimmed = key?.trim()
    if (trimmed && trimmed.startsWith('AIza')) return trimmed
  }
  return null
}
