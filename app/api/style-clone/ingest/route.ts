import 'server-only'

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

import { resolveGeminiApiKey } from '@/lib/prometheus-assistant/gemini-stream'
import { normalizeReferenceUrl, parseReferenceAnalysis, type ReferenceAnalysis } from '@/lib/editor/reference-style'

export const maxDuration = 60

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'] as const

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

    let videoUrl: string
    try {
      videoUrl = normalizeReferenceUrl(rawUrl)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Use a public YouTube video link.' }, { status: 400 })
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

    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY for reference analysis.' }, { status: 503 })
    }

    const breakdown = await analyzeReferenceVideo({
      apiKey: geminiApiKey,
      videoUrl,
      styleHint,
    })
    if (!breakdown) {
      return NextResponse.json(
        { error: 'Could not analyze that reference video. Try a public YouTube link.' },
        { status: 502 },
      )
    }

    // Reference editing remains available if optional shared-library storage is unavailable.
    const analysisResponse = { videoUrl, styleReference: breakdown.style_reference, editingBreakdown: breakdown.editing_breakdown, analysis: breakdown, previewOnly: true }
    if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
      return NextResponse.json({ ...analysisResponse, savedToLibrary: false })
    }

    try {

      const openai = new OpenAI({ apiKey: openaiApiKey, timeout: 4000, maxRetries: 0 })
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: `${breakdown.style_reference}\n\n${breakdown.editing_breakdown}`,
        encoding_format: 'float',
      })
      const rawEmbedding = embeddingResponse.data[0]?.embedding
      if (!rawEmbedding?.length) {
        return NextResponse.json({ ...analysisResponse, savedToLibrary: false })
      }
      const embedding = normalizeEmbedding(rawEmbedding)

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await supabase
        .from('motion_knowledge_base')
        .insert({
          video_url: videoUrl,
          style_reference: breakdown.style_reference,
          editing_breakdown: breakdown.editing_breakdown,
          embedding,
        })
        .select('id, video_url, style_reference')
        .abortSignal(AbortSignal.timeout(4000))
        .single()

      if (error || !data) {
        console.error('[api/style-clone/ingest] insert failed:', error)
        return NextResponse.json({ ...analysisResponse, savedToLibrary: false })
      }

      const row = data as SupabaseMotionRow
      return NextResponse.json({
        id: row.id,
        ...analysisResponse,
        savedToLibrary: true,
      })
    } catch {
      return NextResponse.json({ ...analysisResponse, savedToLibrary: false })
    }
  } catch (err) {
    console.error('[api/style-clone/ingest] error:', err)
    return NextResponse.json(
      { error: 'Reference analysis could not finish. Try again.' },
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
}): Promise<ReferenceAnalysis | null> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const prompt = [
    'Analyze this reference video as a Prometheus motion-architect research pass.',
    'Only report what you can see in the supplied video. If it cannot be viewed, return null; do not infer from its title.',
    'Return STRICT JSON only, no markdown fences, with these keys:',
    '{"style_reference":"one sentence","editing_breakdown":"implementable directions", "reference_duration_sec":20, "treatment":"clean|contrast|warm|mono", "caption_style":"none|clean_bold|karaoke_pop|typewriter|lower_third", "zooms":[{"start_sec":2,"end_sec":5,"scale":1.12,"kind":"smooth|punch"}], "observations":[{"time_sec":2,"detail":"visible evidence"}], "limitations":["elements requiring assets or unsupported effects"]}',
    'Use actual measured duration and timestamps in seconds. Give 1-12 timestamped observations supporting every chosen setting.',
    'Return zero zooms if no camera push is observed. Max 24 moves, scale 1.0-1.4, all times within duration. No invented timestamps.',
    'Choose the nearest supported treatment and caption behavior as an approximation; identify deviations in limitations. Exact scenes, LUT matching, transitions and soundtrack copying are not implemented.',
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
          maxOutputTokens: 3000,
          responseMimeType: 'application/json',
        },
      })
      const result = await model.generateContent([
        { text: prompt },
        { fileData: { mimeType: 'video/mp4', fileUri: videoUrl } },
      ], { timeout: 12000 })
      const text = result.response.text()
      const parsed = parseReferenceAnalysis(text)
      if (parsed) return parsed
    } catch (err) {
      console.warn('[api/style-clone/ingest] gemini attempt failed', { model: modelName, error: err })
    }
  }
  return null
}

function normalizeEmbedding(embedding: number[]): number[] {
  if (embedding.length === EMBEDDING_DIMENSIONS) return embedding
  if (embedding.length > EMBEDDING_DIMENSIONS) return embedding.slice(0, EMBEDDING_DIMENSIONS)
  return [...embedding, ...Array(EMBEDDING_DIMENSIONS - embedding.length).fill(0)]
}
