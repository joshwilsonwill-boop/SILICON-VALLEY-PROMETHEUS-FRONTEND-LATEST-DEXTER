import { NextResponse } from 'next/server'

import { assemblyTranscriptToSegments } from '@/lib/r2/assembly-transcript'
import { downloadTextFromR2 } from '@/lib/r2/download-text'
import { startSourceAssetTranscription } from '@/lib/server/source-transcript'
import { createClient } from '@/lib/supabase/server'

type TranscriptWord = {
  text: string
  startMs: number
  endMs: number
  isCut?: boolean
}

type TranscriptSegment = {
  id: string
  startMs: number
  endMs: number
  text: string
  isCut?: boolean
  words?: TranscriptWord[]
}

function normalizeSegments(value: unknown): TranscriptSegment[] | null {
  if (!Array.isArray(value)) return null

  const segments: TranscriptSegment[] = []
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const text = typeof record.text === 'string' ? record.text : ''
    const rawStart = Number(record.startMs ?? record.start ?? record.start_ms ?? record.startTime ?? 0)
    const rawEnd = Number(record.endMs ?? record.end ?? record.end_ms ?? record.endTime ?? rawStart)
    const startMs = Number.isFinite(rawStart) ? Math.max(0, Math.round(rawStart)) : 0
    const endMs = Number.isFinite(rawEnd) ? Math.max(startMs, Math.round(rawEnd)) : startMs

    const isCut = typeof record.isCut === 'boolean' ? record.isCut : undefined
    let words: TranscriptWord[] | undefined = undefined

    if (Array.isArray(record.words)) {
      const parsedWords: TranscriptWord[] = []
      for (const w of record.words) {
        if (w && typeof w === 'object') {
          const wordRec = w as Record<string, unknown>
          const wStart = Number(wordRec.startMs ?? wordRec.start ?? startMs)
          const wEnd = Number(wordRec.endMs ?? wordRec.end ?? endMs)
          parsedWords.push({
            text: String(wordRec.text ?? '').trim(),
            startMs: Number.isFinite(wStart) ? Math.round(wStart) : startMs,
            endMs: Number.isFinite(wEnd) ? Math.round(wEnd) : endMs,
            ...(typeof wordRec.isCut === 'boolean' ? { isCut: wordRec.isCut } : {}),
          })
        }
      }
      if (parsedWords.length > 0) {
        words = parsedWords
      }
    }

    segments.push({
      id:
        typeof record.id === 'string' && record.id.trim()
          ? record.id.trim()
          : `transcript-${index + 1}`,
      startMs,
      endMs,
      text: text.trim(),
      ...(isCut !== undefined ? { isCut } : {}),
      ...(words && words.length > 0 ? { words } : {}),
    })
  }

  return segments
}

/**
 * GET returns the normalized transcript segments for a source asset (for the
 * motion section), reading from the R2 transcript object. Returns `idle` until
 * a transcription exists, `transcribing` while in flight, or the segments.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const savedSegments = normalizeSegments(asset.transcript_segments)
    if (savedSegments && savedSegments.length > 0) {
      if (asset.transcript_status !== 'completed') {
        await supabase
          .from('source_assets')
          .update({
            transcript_status: 'completed',
            transcript_completed_at: asset.transcript_completed_at || new Date().toISOString(),
            transcript_error: null,
          })
          .eq('id', assetId)
          .eq('user_id', user.id)
      }
      return NextResponse.json({ status: 'completed', segments: savedSegments })
    }

    if (asset.transcript_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: asset.transcript_error || 'Transcription failed.',
      })
    }

    if (asset.transcript_status === 'queued' || asset.transcript_status === 'transcribing') {
      return NextResponse.json({ status: 'transcribing', startedAt: asset.transcript_started_at })
    }

    if (asset.transcript_status === 'completed' && asset.transcript_r2_key) {
      const bucket = (
        process.env.R2_BUCKET_SOURCES ||
        process.env.R2_BUCKET_SOURCES_3 ||
        process.env.R2_BUCKET_SOURCES_2 ||
        'prometheus-sources'
      ).trim()
      const raw = await downloadTextFromR2(bucket, asset.transcript_r2_key)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const segments = assemblyTranscriptToSegments(parsed)
        if (segments.length === 0) {
          const providerText = typeof parsed.text === 'string' ? parsed.text.trim() : ''
          const errorMessage = providerText
            ? 'AssemblyAI completed without timed transcript data. Please retry transcription.'
            : 'AssemblyAI completed without transcript text. Please retry transcription.'
          await supabase
            .from('source_assets')
            .update({
              transcript_status: 'failed',
              transcript_error: errorMessage,
              transcript_synced_at: new Date().toISOString(),
            })
            .eq('id', assetId)
            .eq('user_id', user.id)
          return NextResponse.json({ status: 'failed', error: errorMessage }, { status: 422 })
        }
        await supabase
          .from('source_assets')
          .update({ transcript_segments: segments })
          .eq('id', assetId)
          .eq('user_id', user.id)
        return NextResponse.json({ status: 'completed', segments })
      }
    }

    return NextResponse.json({ status: 'idle' })
  } catch (err) {
    console.error('[api/assets/[id]/transcript] GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load transcript' },
      { status: 500 },
    )
  }
}

/** Save user-authored edits to the normalized transcript segments. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: assetId } = await params
    const body = (await req.json().catch(() => null)) as { segments?: unknown } | null
    const segments = normalizeSegments(body?.segments)
    if (!segments) {
      return NextResponse.json({ error: 'Valid transcript array is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('source_assets')
      .update({
        transcript_status: 'completed',
        transcript_segments: segments,
        transcript_text: segments
          .map((segment) => segment.text)
          .join(' ')
          .slice(0, 500),
        transcript_completed_at: new Date().toISOString(),
        transcript_synced_at: new Date().toISOString(),
        transcript_error: null,
      })
      .eq('id', assetId)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ status: 'completed', segments })
  } catch (err) {
    console.error('[api/assets/[id]/transcript] PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save transcript' },
      { status: 500 },
    )
  }
}

/**
 * Starts an AssemblyAI transcription for a source asset and returns immediately.
 * The frontend polls `/api/assets/{id}/transcript/sync` for progress.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: assetId } = await params
    const restart = new URL(req.url).searchParams.get('restart') === '1'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (!String(asset.mime_type ?? '').startsWith('video/')) {
      return NextResponse.json({ error: 'Only video assets can be transcribed' }, { status: 400 })
    }

    const started = await startSourceAssetTranscription({ assetId, supabase, force: restart })

    if (!started) {
      const tooLong =
        Number.isFinite(Number(asset.duration_ms)) && Number(asset.duration_ms) > 40 * 60 * 1000
      return NextResponse.json(
        {
          status: 'idle',
          error: tooLong
            ? 'Source video is too long to auto-transcribe'
            : 'Asset is not ready for transcription',
        },
        { status: 409 },
      )
    }

    return NextResponse.json(started)
  } catch (err) {
    console.error('[api/assets/[id]/transcript] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start transcript' },
      { status: 500 },
    )
  }
}
