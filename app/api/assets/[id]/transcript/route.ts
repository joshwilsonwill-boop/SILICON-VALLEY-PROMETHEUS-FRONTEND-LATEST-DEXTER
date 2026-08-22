import { NextResponse } from 'next/server'

import { assemblyTranscriptToSegments } from '@/lib/r2/assembly-transcript'
import { downloadTextFromR2 } from '@/lib/r2/download-text'
import { startSourceAssetTranscription } from '@/lib/server/source-transcript'
import { createClient } from '@/lib/supabase/server'

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
    const { data: { user } } = await supabase.auth.getUser()

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

    if (asset.transcript_status === 'queued' || asset.transcript_status === 'transcribing') {
      return NextResponse.json({ status: 'transcribing' })
    }

    if (asset.transcript_status === 'completed' && asset.transcript_r2_key) {
      const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
      const raw = await downloadTextFromR2(bucket, asset.transcript_r2_key)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        return NextResponse.json({ status: 'completed', segments: assemblyTranscriptToSegments(parsed) })
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

/**
 * Starts an AssemblyAI transcription for a source asset and returns immediately.
 * The frontend polls `/api/assets/{id}/transcript/sync` for progress.
 *
 * Runs straight after a video of sensible length is uploaded — it must not wait
 * on the chat system or any editor step.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: assetId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    const started = await startSourceAssetTranscription({ assetId, supabase })

    if (!started) {
      const tooLong =
        Number.isFinite(Number(asset.duration_ms)) &&
        Number(asset.duration_ms) > 40 * 60 * 1000
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
