import { NextResponse } from 'next/server'

import { ProjectService } from '@/lib/projects/service'
import { buildMiniRunRenderPayload } from '@/lib/server/mini-run-render-payload'
import { buildMiniRunSourceUrl } from '@/lib/server/mini-run-dispatch'
import { resolveMiniRunConfig } from '@/lib/server/mini-run-proxy'
import { createClient } from '@/lib/supabase/server'

/**
 * Rapid Mini-Run plan synthesis route (Phase 1).
 *
 * Runs ASR transcription, silence timeline analysis, smart typography
 * planning, orchestration, and candidate song selection on Modal without
 * rendering video frames. Returns the editable `DraftManifest` to the frontend
 * in 3-5 seconds for live zero-lag interactive preview and voice mutation.
 */

type SourceAssetRow = {
  id: string
  storage_path?: string
  storage_bucket?: string
  mime_type?: string
  duration_ms?: number
  durationMs?: number
  width?: number
  height?: number
}

export async function POST(req: Request) {
  let jobId: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const sourceAssetId = typeof body.sourceAssetId === 'string' ? body.sourceAssetId.trim() : ''
    const shot = (body.shot && typeof body.shot === 'object' ? body.shot : {}) as Record<string, unknown>

    if (!projectId || !sourceAssetId) {
      return NextResponse.json(
        { error: 'projectId and sourceAssetId are required.', code: 'PLAN_INPUT_REQUIRED' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const project = await ProjectService.getProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found.', code: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }
    if (project.sourceAssetId !== sourceAssetId) {
      return NextResponse.json(
        { error: 'The selected source does not belong to this project.', code: 'SOURCE_MISMATCH' },
        { status: 400 },
      )
    }

    const { data: asset, error: assetError } = await supabase
      .from('source_assets')
      .select('*')
      .eq('id', sourceAssetId)
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Source asset record not found.', code: 'SOURCE_ASSET_NOT_FOUND' },
        { status: 404 },
      )
    }

    const row = asset as SourceAssetRow
    if (!row.storage_path) {
      return NextResponse.json(
        { error: 'Source asset has no storage path.', code: 'SOURCE_PATH_MISSING' },
        { status: 500 },
      )
    }

    const bucket = row.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources'
    jobId = crypto.randomUUID()

    const env = {
      MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
      MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
      MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
    }
    const config = resolveMiniRunConfig(env)
    const sourceUrl = await buildMiniRunSourceUrl(bucket, row.storage_path)
    const bodyPayload = buildMiniRunRenderPayload({
      sourceUrl,
      source: {
        durationMs: row.duration_ms ?? row.durationMs,
        width: row.width,
        height: row.height,
      },
      shot,
      jobId,
    })

    const response = await fetch(`${config.baseUrl}/api/pipeline/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Modal-Key': config.proxyKey,
        'Modal-Secret': config.proxySecret,
      },
      body: JSON.stringify(bodyPayload),
      cache: 'no-store',
    })

    const upstream = (await response.json().catch(() => ({}))) as {
      jobId?: unknown
      manifest?: unknown
      source?: unknown
      error?: unknown
    }

    if (!response.ok) {
      const message =
        typeof upstream.error === 'string' ? upstream.error : `Mini-Run plan returned HTTP ${response.status}.`
      return NextResponse.json({ error: message, code: 'PLAN_SYNTHESIS_FAILED' }, { status: 502 })
    }

    const plannedJobId = typeof upstream.jobId === 'string' ? upstream.jobId : jobId
    return NextResponse.json({
      ok: true,
      jobId: plannedJobId,
      manifest: upstream.manifest,
      source: upstream.source,
    })
  } catch (err) {
    console.error('[api/mini-run/plan] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to synthesize Mini-Run plan.' },
      { status: 500 },
    )
  }
}
