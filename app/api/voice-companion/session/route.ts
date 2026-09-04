import 'server-only'

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const DEFAULT_GEMINI_LIVE_MODEL = 'models/gemini-3.1-flash-live-preview'
const SUPPORTED_GEMINI_LIVE_MODELS = new Set([
  DEFAULT_GEMINI_LIVE_MODEL,
  'models/gemini-2.5-flash-native-audio-preview-12-2025',
])

function resolveLiveModel(value: string | undefined): string {
  const candidate = value?.trim()
  if (!candidate) return DEFAULT_GEMINI_LIVE_MODEL

  const normalized = candidate.startsWith('models/') ? candidate : `models/${candidate}`
  return SUPPORTED_GEMINI_LIVE_MODELS.has(normalized) ? normalized : DEFAULT_GEMINI_LIVE_MODEL
}

export async function GET() {
  try {
    // Collect all candidate keys in order of freshness
    const candidates = [
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY,
    ]

    const validKeys = Array.from(
      new Set(
        candidates
          .map((k) => k?.trim())
          .filter((k): k is string => Boolean(k && k.length > 10))
      )
    )

    if (validKeys.length === 0) {
      return NextResponse.json(
        {
          error: 'No Gemini API keys are configured on the server.',
          detail:
            'Please configure GEMINI_API_KEY, GEMINI_API_KEY_2, or GEMINI_API_KEY_3 in Vercel or .env.local.',
        },
        { status: 503 }
      )
    }

    const defaultModel = resolveLiveModel(process.env.GEMINI_LIVE_MODEL)
    const defaultVoice = process.env.GEMINI_LIVE_VOICE || 'Puck'

    const wsUrls = validKeys.map(
      (key) =>
        `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`
    )

    return NextResponse.json({
      wsUrl: wsUrls[0],
      wsUrls,
      keyCount: validKeys.length,
      model: defaultModel,
      candidateModels: [
        defaultModel,
        ...Array.from(SUPPORTED_GEMINI_LIVE_MODELS).filter((model) => model !== defaultModel),
      ],
      voiceName: defaultVoice,
      availableVoices: ['Puck', 'Aoede', 'Charon', 'Fenrir', 'Kore'],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    return NextResponse.json(
      { error: 'Failed to initialize voice session.', detail: message },
      { status: 500 }
    )
  }
}
