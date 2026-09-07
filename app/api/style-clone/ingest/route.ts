import 'server-only'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'] as const

const SUPPORTED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'vimeo.com',
  'player.vimeo.com',
]

type StyleBreakdown = {
  style_reference: string
  editing_breakdown: string
}

type SupabaseMotionRow = {
  id: number
  video_url: string
  style_reference: string
}

function cleanEnvValue(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      url?: unknown
      styleHint?: unknown
    }

    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    const styleHint = typeof body.styleHint === 'string' ? body.styleHint.trim().slice(0, 200) : ''
    if (!rawUrl) {
      return NextResponse.json({ error: 'A reference video URL is required.' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'That does not look like a valid URL.' }, { status: 400 })
    }
    if (!/^https?:$/.test(parsed.protocol) || !SUPPORTED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json(
        { error: 'Only YouTube, TikTok, and Vimeo reference links are supported.' },
        { status: 400 },
      )
    }

    // Auth: only signed-in users may grow the shared knowledge base.
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || cleanEnvValue(process.env.SUPABASE_URL)
    const supabaseServiceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
    const openaiApiKey = cleanEnvValue(process.env.OPENAI_API_KEY)
    const geminiApiKey = resolveGeminiApiKey()

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Server is missing Supabase service configuration.' }, { status: 503 })
    }
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'Server is missing OPENAI_API_KEY for style embeddings.' }, { status: 503 })
    }
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY for reference analysis.' }, { status: 503 })
    }

    const breakdown = await analyzeReferenceVideo({
      apiKey: geminiApiKey,
      videoUrl: parsed.toString(),
      styleHint,
    })
    if (!breakdown) {
      return NextResponse.json(
        { error: 'Could not analyze that reference video. Try a public YouTube link.' },
        { status: 502 },
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: `${breakdown.style_reference}\n\n${breakdown.editing_breakdown}`,
      encoding_format: 'float',
    })
    const rawEmbedding = embeddingResponse.data[0]?.embedding
    if (!rawEmbedding?.length) {
      return NextResponse.json({ error: 'Embedding service returned an empty vector.' }, { status: 502 })
    }
    const embedding = normalizeEmbedding(rawEmbedding)

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('motion_knowledge_base')
      .insert({
        video_url: parsed.toString(),
        style_reference: breakdown.style_reference,
        editing_breakdown: breakdown.editing_breakdown,
        embedding,
      })
      .select('id, video_url, style_reference')
      .single()

    if (error || !data) {
      console.error('[api/style-clone/ingest] insert failed:', error)
      return NextResponse.json({ error: 'Could not save the style breakdown.' }, { status: 500 })
    }

    const row = data as SupabaseMotionRow
    return NextResponse.json({
      id: row.id,
      videoUrl: row.video_url,
      styleReference: row.style_reference,
      editingBreakdown: breakdown.editing_breakdown,
    })
  } catch (err) {
    console.error('[api/style-clone/ingest] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to ingest the reference style.' },
      { status: 500 },
    )
  }
}

async function createAuthClient() {
  const { createClient } = await import('@/lib/supabase/server')
  return createClient()
}

async function analyzeReferenceVideo({
  apiKey,
  videoUrl,
  styleHint,
}: {
  apiKey: string
  videoUrl: string
  styleHint: string
}): Promise<StyleBreakdown | null> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const prompt = [
    'Analyze this reference video as a Prometheus motion-architect research pass.',
    'Return STRICT JSON only, no markdown fences, with exactly two keys:',
    '{"style_reference": "<one vivid sentence naming the style>", "editing_breakdown": "<5-8 sentences of implementable editing direction>"}',
    'The editing_breakdown must specify: cut rhythm and average shot length, kinetic typography/caption behavior,',
    'transition logic between shots, color/grade and lighting mood, sound-design alignment, and one signature move worth cloning.',
    styleHint ? `The creator wants emphasis on: ${styleHint}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1400,
          responseMimeType: 'application/json',
        },
      })
      const result = await model.generateContent([
        { text: prompt },
        { fileData: { mimeType: 'video/mp4', fileUri: videoUrl } },
      ])
      const text = result.response.text()
      const parsed = parseBreakdown(text)
      if (parsed) return parsed
    } catch (err) {
      console.warn('[api/style-clone/ingest] gemini attempt failed', { model: modelName, error: err })
    }
  }
  return null
}

function parseBreakdown(text: string): StyleBreakdown | null {
  if (!text) return null
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const styleReference = typeof parsed.style_reference === 'string' ? parsed.style_reference.trim() : ''
    const editingBreakdown = typeof parsed.editing_breakdown === 'string' ? parsed.editing_breakdown.trim() : ''
    if (!styleReference || !editingBreakdown) return null
    return {
      style_reference: styleReference.slice(0, 300),
      editing_breakdown: editingBreakdown.slice(0, 4000),
    }
  } catch {
    return null
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  if (embedding.length === EMBEDDING_DIMENSIONS) return embedding
  if (embedding.length > EMBEDDING_DIMENSIONS) return embedding.slice(0, EMBEDDING_DIMENSIONS)
  return [...embedding, ...Array(EMBEDDING_DIMENSIONS - embedding.length).fill(0)]
}
