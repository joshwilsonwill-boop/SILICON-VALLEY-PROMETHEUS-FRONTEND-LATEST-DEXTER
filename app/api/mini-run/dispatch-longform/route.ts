import { NextResponse } from 'next/server'

import { ProjectService } from '@/lib/projects/service'
import { buildMiniRunSourceUrl } from '@/lib/server/mini-run-dispatch'
import { resolveMiniRunConfig } from '@/lib/server/mini-run-proxy'
import { createClient } from '@/lib/supabase/server'

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
  let batchJobId: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : ''
    const sourceAssetId = typeof body.sourceAssetId === 'string' ? body.sourceAssetId.trim() : ''
    const nClips = Math.min(10, Math.max(1, typeof body.nClips === 'number' ? Math.round(body.nClips) : 4))
    const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : undefined
    const brandPreferences = body.brandPreferences && typeof body.brandPreferences === 'object' ? body.brandPreferences : undefined
    const songPolicy = body.songPolicy === 'disabled' ? 'disabled' : 'auto'

    if (!projectId || !sourceAssetId) {
      return NextResponse.json(
        { error: 'projectId and sourceAssetId are required.', code: 'DISPATCH_INPUT_REQUIRED' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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
    batchJobId = `longform_${crypto.randomUUID()}`

    const env = {
      MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
      MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
      MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
    }
    const config = resolveMiniRunConfig(env)
    const sourceUrl = await buildMiniRunSourceUrl(bucket, row.storage_path)

    const dispatchPayload: Record<string, unknown> = {
      source: {
        url: sourceUrl,
        durationMs: row.duration_ms ?? row.durationMs,
        width: row.width,
        height: row.height,
      },
      nClips,
      prompt,
      brandPreferences,
      audio: {
        songPolicy,
      },
      batchJobId,
    }

    const response = await fetch(`${config.baseUrl}/api/pipeline/longform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Modal-Key': config.proxyKey,
        'Modal-Secret': config.proxySecret,
      },
      body: JSON.stringify(dispatchPayload),
      cache: 'no-store',
    })

    const upstream = (await response.json().catch(() => ({}))) as {
      batchJobId?: unknown
      status?: unknown
      nClips?: unknown
      error?: unknown
    }

    if (!response.ok) {
      const message =
        typeof upstream.error === 'string'
          ? upstream.error
          : `Mini-Run longform batch returned HTTP ${response.status}.`
      return NextResponse.json({ error: message, code: 'LONGFORM_DISPATCH_FAILED' }, { status: 502 })
    }

    const dispatchedBatchId = typeof upstream.batchJobId === 'string' ? upstream.batchJobId : batchJobId
    return NextResponse.json({
      batchJobId: dispatchedBatchId,
      status: typeof upstream.status === 'string' ? upstream.status : 'queued',
      nClips,
      pollUrl: `/api/mini-run/api/pipeline/longform/${encodeURIComponent(dispatchedBatchId)}`,
    })
  } catch (err) {
    console.error('[api/mini-run/dispatch-longform] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to dispatch longform viral batch.' },
      { status: 500 },
    )
  }
}
