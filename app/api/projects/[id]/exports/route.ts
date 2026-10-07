import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {ExportService} from '@/lib/exports/service'
import {dispatchMiniRunRender} from '@/lib/server/mini-run-dispatch'

type RouteContext = {params: Promise<{id: string}>}

export async function POST(request: Request, {params}: RouteContext) {
  const {id: projectId} = await params
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const sourceAssetId = typeof body.sourceAssetId === 'string' ? body.sourceAssetId : ''
  const editorialRevision = body.editorialRevision
  if (!sourceAssetId || (editorialRevision !== undefined && (!Number.isSafeInteger(editorialRevision) || (editorialRevision as number) < 0))) {
    return NextResponse.json({error: 'A source asset and valid saved timeline revision are required.'}, {status: 400})
  }

  const {data: project, error: projectError} = await supabase.from('projects')
    .select('id, source_asset_id, editor_state').eq('id', projectId).eq('user_id', user.id).maybeSingle()
  if (projectError || !project) return NextResponse.json({error: 'Project not found.'}, {status: 404})
  if (project.source_asset_id !== sourceAssetId) {
    return NextResponse.json({error: 'The source video changed. Reload the project before rendering.'}, {status: 409})
  }

  const editorState = project.editor_state && typeof project.editor_state === 'object' ? project.editor_state as Record<string, unknown> : {}
  const timeline = editorState.editorialTimeline && typeof editorState.editorialTimeline === 'object'
    ? editorState.editorialTimeline as Record<string, unknown> : {}
  if (typeof editorialRevision === 'number' && timeline.revision !== editorialRevision) {
    return NextResponse.json({error: 'The saved timeline changed. Wait for it to finish saving before rendering.'}, {status: 409})
  }

  const {data: asset, error: assetError} = await supabase.from('source_assets').select('*')
    .eq('id', sourceAssetId).eq('project_id', projectId).eq('user_id', user.id).maybeSingle()
  if (assetError || !asset?.storage_path) return NextResponse.json({error: 'Project source video is unavailable.'}, {status: 404})

  const miniRunJobId = crypto.randomUUID()
  let projectExport
  try {
    projectExport = await ExportService.createProjectExport(projectId, {
      preset: 'mini-run-maul-portrait',
      metadata: {
        sourceAssetId,
        outputKind: 'mini-run',
        miniRunJobId,
        editorialRevision: typeof timeline.revision === 'number' ? timeline.revision : 0,
        timelineApplied: false,
        canvas: '1080x1920',
      },
    })
    const dispatched = await dispatchMiniRunRender({
      request: {
        projectId,
        sourceAssetId,
        bucket: asset.storage_bucket || process.env.R2_BUCKET_SOURCES || 'prometheus-sources',
        storagePath: asset.storage_path,
        mimeType: asset.mime_type || 'video/mp4',
        durationMs: asset.duration_ms ?? undefined,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        jobId: miniRunJobId,
        editorialRevision: typeof timeline.revision === 'number' ? timeline.revision : undefined,
        songPolicy: 'auto',
      },
      env: {
        MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
        MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
        MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
      },
    })
    const {data: updated, error: updateError} = await supabase.from('project_exports').update({
      status: dispatched.status === 'queued' ? 'pending' : 'processing',
      metadata: {...projectExport.metadata, miniRunJobId: dispatched.jobId, pipelineJobId: dispatched.pipelineJobId},
    }).eq('id', projectExport.id).eq('user_id', user.id).select('*').single()
    if (updateError || !updated) {
      console.error('[PROJECT_EXPORT_JOB_RECEIPT]', updateError || 'Mini-Run dispatch row was not returned')
      // The durable Mini-Run id was saved before dispatch. Keep the export
      // pending so history polling can reconcile it instead of losing a job
      // the backend has already accepted.
      return NextResponse.json({export: projectExport}, {status: 202, headers: {'Cache-Control': 'no-store'}})
    }
    return NextResponse.json({export: {
      ...projectExport,
      status: updated.status,
      metadata: updated.metadata,
      updatedAt: updated.updated_at,
    }}, {status: 202, headers: {'Cache-Control': 'no-store'}})
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mini-Run render dispatch failed.'
    if (projectExport) {
      await supabase.from('project_exports').update({status: 'failed', error_message: message, failed_at: new Date().toISOString()})
        .eq('id', projectExport.id).eq('user_id', user.id)
    }
    return NextResponse.json({error: message, code: 'RENDER_DISPATCH_FAILED'}, {status: 502})
  }
}
