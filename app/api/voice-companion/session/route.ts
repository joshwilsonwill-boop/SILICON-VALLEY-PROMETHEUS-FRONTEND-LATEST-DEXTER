import 'server-only'

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY_3 ||
      process.env.GEMINI_API_KEY_2

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY is not configured on the server.',
          detail: 'Please configure GEMINI_API_KEY in .env.local to enable the Jarvis voice companion.',
        },
        { status: 503 }
      )
    }

    const defaultModel =
      process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.0-flash-exp'
    const defaultVoice = process.env.GEMINI_LIVE_VOICE || 'Puck'
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey.trim()}`

    return NextResponse.json({
      wsUrl,
      model: defaultModel,
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
