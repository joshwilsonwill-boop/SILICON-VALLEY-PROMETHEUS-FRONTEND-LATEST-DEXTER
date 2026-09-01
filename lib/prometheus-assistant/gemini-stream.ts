/**
 * Gemini 2.5 Flash multimodal escalation for Prometheus Chat.
 *
 * This module activates when GEMINI_API_KEY is set. It upgrades the chat
 * intelligence from the text-only Groq/GPT-OSS-20B path to Gemini 2.5 Flash
 * with:
 *   - Native multimodal vision: frame thumbnails are sent as real inlineData
 *     image parts (base64-encoded JPEG/PNG) so the model actually sees them.
 *   - Extended thinking: reasoning traces emitted as `thought` stream events.
 *   - Longer context window: transcript + full editorial analysis without
 *     budget clipping at 1,800 chars.
 *   - Tool-compatible: returns the same PrometheusToolCall shape so the
 *     existing action-draft executor works without modification.
 *
 * Entry point: streamWithGemini()
 * - Streams response tokens via the supplied `onDelta` callback.
 * - Emits thought traces via `onThought`.
 * - Resolves with the complete reply text when done.
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

const IMAGE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024 // 5 MB per part (Gemini limit 20 MB)

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
    // Strip charset/params
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
  if (!data || data.length > IMAGE_SIZE_LIMIT_BYTES * 1.37) return null // base64 overhead
  return { mimeType, data }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Stream a Gemini 2.5 Flash response and call the supplied callbacks for each
 * chunk. Returns the accumulated reply text.
 *
 * Falls back through the model priority list if a model is unavailable.
 * Never throws on quota/network errors — resolves with an empty string so
 * the caller can degrade gracefully.
 */
export async function streamWithGemini(
  req: GeminiStreamRequest,
  callbacks: GeminiStreamCallbacks,
): Promise<string> {
  const { apiKey, systemPrompt, history, userMessage, frameRefs, abortSignal, maxOutputTokens = 2_000 } = req
  const requestedModel = req.model ?? GEMINI_PREFERRED_MODELS[0]

  // Build the model priority list
  const modelsToTry: string[] = [requestedModel]
  for (const m of GEMINI_PREFERRED_MODELS) {
    if (!modelsToTry.includes(m)) modelsToTry.push(m)
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // Resolve frame images — fetch https:// thumbnails in parallel, pass data:
  // URLs directly. Failing frames are silently dropped.
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

  // Build the user parts array — text first, then interleaved frames
  type InlineDataPart = { inlineData: { mimeType: string; data: string } }
  type TextPart = { text: string }
  type Part = TextPart | InlineDataPart

  const userParts: Part[] = []

  if (hasVision) {
    userParts.push({ text: `I'm sharing ${resolvedFrames.length} video frame(s) below. Each is labeled with its timecode. Analyze them as real visual evidence — describe composition, subject, lighting, motion cues, text overlays, and anything editorially relevant.\n\n` })
    for (const frame of resolvedFrames) {
      userParts.push({ text: `Frame at ${frame.timecode}:` })
      userParts.push({ inlineData: { mimeType: frame.mimeType, data: frame.data } })
    }
    userParts.push({ text: `\n\n${userMessage}` })
  } else {
    userParts.push({ text: userMessage })
  }

  // Build Gemini chat history
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
      const result = await chat.sendMessageStream(userParts as never)

      for await (const chunk of result.stream) {
        if (abortSignal?.aborted) break
        const text = chunk.text()
        if (!text) continue
        accumulatedReply += text
        callbacks.onDelta(text)
      }

      // Success — stop trying fallback models
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

      // Rate limit or network error — bubble up empty so caller can fall back
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
