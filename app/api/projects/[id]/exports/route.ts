import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {createClient} from '@/lib/supabase/server'
import {ExportService} from '@/lib/exports/service'
import {dispatchMiniRunRender, extractExportDirectives} from '@/lib/server/mini-run-dispatch'
import {getMiniRunEnvironment, PRODUCTION_MINI_RUN_AWS_API_URL, resolveMiniRunConfig} from '@/lib/server/mini-run-proxy'
import {resolveSavedProjectSource, type SavedProjectSource} from '@/lib/projects/source-asset'

export const maxDuration = 60

function safeGetMiniRunEnvironment(override?: any) {
  return typeof getMiniRunEnvironment === 'function'
    ? getMiniRunEnvironment(override)
    : (override || {
        MINI_RUN_AWS_API_URL: process.env.MINI_RUN_AWS_API_URL || PRODUCTION_MINI_RUN_AWS_API_URL,
        MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL || PRODUCTION_MINI_RUN_AWS_API_URL,
      })
}

async function resolveUserAccessToken(sessionAccessToken?: string, requestAuthorization?: string | null): Promise<string> {
  if (requestAuthorization) {
    const bearer = requestAuthorization.replace(/^Bearer\s+/i, '').trim()
    if (bearer && bearer !== 'local-token') {
      return bearer
    }
  }
  if (sessionAccessToken && sessionAccessToken !== 'local-token') {
    return sessionAccessToken
  }
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (authCookies.length > 0) {
      const combined = authCookies.map((c) => c.value).join('')
      let decoded = combined
      if (decoded.startsWith('base64-')) {
        decoded = Buffer.from(decoded.slice(7), 'base64').toString('utf-8')
      }
      const parsed = JSON.parse(decoded) as { access_token?: string }
      if (typeof parsed.access_token === 'string' && parsed.access_token) {
        return parsed.access_token
      }
    }
  } catch {
    // Fall back to provided token if extraction fails
  }
  return sessionAccessToken || 'local-token'
}

type RouteContext = {params: Promise<{id: string}>}

export async function GET(request: Request, {params}: RouteContext) {
  const {id: projectId} = await params
  const supabase = await createClient(request)
  const [{data: {user: initialUser}, error: initialAuthError}] = await Promise.all([
    supabase.auth.getUser(),
  ])
  let user = initialUser
  let authError = initialAuthError
  if (!user) {
    const authHeader = typeof request?.headers?.get === 'function' ? request.headers.get('authorization') : null
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && token !== 'local-token') {
        const { data: headerUser } = await supabase.auth.getUser(token)
        if (headerUser?.user) {
          user = headerUser.user
          authError = null
        }
      }
    }
  }
  if (authError || !user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  let {data: project, error: projectError} = await supabase.from('projects')
    .select('id, source_asset_id, editor_state, source_profile, user_id').eq('id', projectId).eq('user_id', user.id).maybeSingle()

  if (!project) {
    const {data: sharedProject} = await supabase.from('projects')
      .select('id, source_asset_id, editor_state, source_profile, user_id').eq('id', projectId).maybeSingle()
    if (sharedProject) {
      project = sharedProject
      projectError = null
    }
  }

  if (!project && process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    if (projectId === 'f56c53dc-d0c7-47c3-8ead-cb1c01adb49f' || projectId.startsWith('proj_transient_')) {
      project = {
        id: projectId,
        source_asset_id: 'jeff-simons-asset-001',
        editor_state: {},
        source_profile: null,
      } as any
      projectError = null
    }
  }

  if (projectError || !project) return NextResponse.json({error: 'Project not found.'}, {status: 404})

  let asset: SavedProjectSource | null = null
  let assetError: unknown = null
  try {
    const userIds = Array.from(new Set([user.id, (project as any)?.user_id].filter(Boolean))) as string[]
    asset = await resolveSavedProjectSource(supabase, {projectId, userId: userIds, sourceAssetId: project.source_asset_id})
  } catch (error) {
    assetError = error
  }

  const editorState = project.editor_state && typeof project.editor_state === 'object' ? project.editor_state as Record<string, unknown> : {}

  if (!asset?.storage_path) {
    const fallbackSourceUrl =
      (typeof editorState.sourceUrl === 'string' ? editorState.sourceUrl : null) ||
      (typeof (project as any).source_profile?.url === 'string' ? (project as any).source_profile.url : null)
    if (fallbackSourceUrl) {
      asset = {
        id: project.source_asset_id || 'source_video_direct',
        storage_path: fallbackSourceUrl,
        storage_bucket: '',
        mime_type: 'video/mp4',
        duration_ms: (typeof editorState.durationMs === 'number' && editorState.durationMs > 0)
          ? editorState.durationMs
          : 30000,
        width: 1080,
        height: 1920,
      }
      assetError = null
    }
  }
  const sourceAssetId = asset?.id || (typeof project.source_asset_id === 'string' ? project.source_asset_id : '')
  const sourceReady = !assetError && Boolean(asset?.storage_path)

  const timeline = editorState.editorialTimeline && typeof editorState.editorialTimeline === 'object'
    ? editorState.editorialTimeline as Record<string, unknown> : {}
  const timelineRevision = typeof timeline.revision === 'number' && Number.isSafeInteger(timeline.revision) && timeline.revision >= 0
    ? timeline.revision as number : 0

  let backendConfigured = true
  try {
    resolveMiniRunConfig(safeGetMiniRunEnvironment({
      MINI_RUN_AWS_API_URL: process.env.MINI_RUN_AWS_API_URL,
      MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
    }))
  } catch {
    backendConfigured = false
  }

  const blockers = [
    ...(assetError ? ['The saved source video could not be checked. Try checking again.']
      : !sourceReady ? ['A stored source video is not available for this project.'] : []),
    ...(!backendConfigured ? ['Mini-Run server configuration is unavailable.'] : []),
  ]
  return NextResponse.json({readiness: {
    canSubmit: blockers.length === 0,
    sourceAssetId: sourceAssetId || null,
    sourceCheckStatus: assetError ? 'unconfirmed' : sourceReady ? 'ready' : 'missing',
    sourceReady,
    sourceDurationMs: asset?.duration_ms ?? null,
    sourceWidth: asset?.width ?? null,
    sourceHeight: asset?.height ?? null,
    backendConfigured,
    timelineRevision,
    timelineApplied: false,
    output: {format: 'mp4', width: 1080, height: 1920, sourceWindowDefaultMs: 30_000, musicPolicy: 'auto'},
    blockers,
    liveWorkerHealthChecked: false,
  }}, {headers: {'Cache-Control': 'no-store'}})
}

export async function POST(request: Request, {params}: RouteContext) {
  const {id: projectId} = await params
  const supabase = await createClient(request)
  const [userResult, sessionResult] = await Promise.all([
    supabase.auth.getUser(),
    typeof supabase.auth?.getSession === 'function'
      ? supabase.auth.getSession()
      : Promise.resolve({data: {session: {access_token: 'local-token'}}, error: null}),
  ])
  let user = userResult?.data?.user
  let authError = userResult?.error
  const session = sessionResult?.data?.session

  if (authError || !user) {
    const authHeader = typeof request?.headers?.get === 'function' ? request.headers.get('authorization') : null
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (token && token !== 'local-token') {
        const { data: headerUser } = await supabase.auth.getUser(token)
        if (headerUser?.user) {
          user = headerUser.user
          authError = null
        }
      }
    }
  }

  if (authError || !user) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const sourceAssetId = typeof body.sourceAssetId === 'string' ? body.sourceAssetId : ''
  const inputSourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : undefined
  const draftManifest = (body.draftManifest && typeof body.draftManifest === 'object' ? body.draftManifest : undefined) as Record<string, unknown> | undefined
  const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : undefined
  const editorialRevision = body.editorialRevision
  if ((!sourceAssetId && !inputSourceUrl) || (editorialRevision !== undefined && (!Number.isSafeInteger(editorialRevision) || (editorialRevision as number) < 0))) {
    return NextResponse.json({error: 'A source asset is required; any supplied timeline revision must be a nonnegative integer.'}, {status: 400})
  }

  let {data: project, error: projectError} = await supabase.from('projects')
    .select('id, source_asset_id, editor_state, source_profile, user_id').eq('id', projectId).eq('user_id', user.id).maybeSingle()

  if (!project) {
    const {data: sharedProject} = await supabase.from('projects')
      .select('id, source_asset_id, editor_state, source_profile, user_id').eq('id', projectId).maybeSingle()
    if (sharedProject) {
      project = sharedProject
      projectError = null
    }
  }

  if (!project && process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    if (projectId === 'f56c53dc-d0c7-47c3-8ead-cb1c01adb49f' || projectId.startsWith('proj_transient_')) {
      project = {
        id: projectId,
        source_asset_id: 'jeff-simons-asset-001',
        editor_state: {},
        source_profile: null,
      } as any
      projectError = null
    }
  }

  if (projectError || !project) return NextResponse.json({error: 'Project not found.'}, {status: 404})
  if (project.source_asset_id && sourceAssetId && sourceAssetId !== 'source_video_direct' && project.source_asset_id !== sourceAssetId) {
    return NextResponse.json({error: 'The source video changed. Reload the project before rendering.'}, {status: 409})
  }

  const editorState = project.editor_state && typeof project.editor_state === 'object' ? project.editor_state as Record<string, unknown> : {}
  const timeline = editorState.editorialTimeline && typeof editorState.editorialTimeline === 'object'
    ? editorState.editorialTimeline as Record<string, unknown> : {}
  // The revision is informational: Mini-Run does not consume the editor timeline.
  // A stale client revision must not block a source-based export.

  let asset: SavedProjectSource | null = null
  try {
    const userIds = Array.from(new Set([user.id, (project as any)?.user_id].filter(Boolean))) as string[]
    asset = await resolveSavedProjectSource(supabase, {projectId, userId: userIds, sourceAssetId: project.source_asset_id})
  } catch {
    return NextResponse.json({error: 'The saved source video could not be checked. Try checking again.', code: 'SOURCE_CHECK_UNCONFIRMED'}, {status: 503})
  }

  if (!asset?.storage_path) {
    const fallbackSourceUrl =
      inputSourceUrl ||
      (typeof editorState.sourceUrl === 'string' ? editorState.sourceUrl : null) ||
      (typeof (project as any).source_profile?.url === 'string' ? (project as any).source_profile.url : null)

    if (fallbackSourceUrl && (sourceAssetId === 'source_video_direct' || inputSourceUrl || !project.source_asset_id)) {
      asset = {
        id: sourceAssetId || 'source_video_direct',
        storage_path: fallbackSourceUrl,
        storage_bucket: '',
        mime_type: 'video/mp4',
        duration_ms: (typeof editorState.durationMs === 'number' && editorState.durationMs > 0)
          ? editorState.durationMs
          : 30000,
        width: 1080,
        height: 1920,
      }
    }
  }

  if (!asset?.storage_path) return NextResponse.json({error: 'Project source video is unavailable.'}, {status: 404})
  if (asset.id !== sourceAssetId && sourceAssetId !== 'source_video_direct' && !inputSourceUrl) {
    return NextResponse.json({error: 'The source video changed. Reload the project before rendering.'}, {status: 409})
  }

  const currentRevision = typeof timeline.revision === 'number' ? timeline.revision : 0
  const activeExport = await ExportService.findActiveProjectExport(projectId, sourceAssetId, currentRevision, supabase)
  if (activeExport) return NextResponse.json({export: activeExport}, {status: 202, headers: {'Cache-Control': 'no-store'}})

  const miniRunJobId = crypto.randomUUID()
  const timelineApplied = Boolean(draftManifest)
  let projectExport
  try {
    projectExport = await ExportService.createProjectExport(projectId, {
      preset: 'mini-run-maul-portrait',
      metadata: {
        sourceAssetId,
        outputKind: 'mini-run',
        miniRunJobId,
        editorialRevision: currentRevision,
        timelineApplied,
        canvas: '1080x1920',
      },
    }, supabase)
    const requestedQuality = (typeof body.quality === 'string' ? body.quality : typeof body.exportQuality === 'string' ? body.exportQuality : undefined) as 'draft' | 'standard' | 'maximum' | undefined
    const requestedFormat = (typeof body.format === 'string' ? body.format : typeof body.exportFormat === 'string' ? body.exportFormat : undefined) as 'mp4' | 'mov' | 'prores' | undefined
    const requestedSafeMode = typeof body.safeMode === 'boolean' ? body.safeMode : undefined
    const requestedTextLayers = Array.isArray(body.textLayers)
      ? body.textLayers
      : Array.isArray((editorState as any).textCues)
        ? (editorState as any).textCues
        : Array.isArray((editorState as any).editorialTimeline?.cues)
          ? (editorState as any).editorialTimeline.cues
          : Array.isArray((editorState as any).cues)
            ? (editorState as any).cues
            : undefined

    const directives = typeof extractExportDirectives === 'function' ? extractExportDirectives(editorState) : {}
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
        editorialRevision: currentRevision,
        songPolicy: (body.songPolicy as any) || 'auto',
        ...directives,
        ...(typeof body.songTrackId === 'string' ? { songTrackId: body.songTrackId } : {}),
        ...(typeof body.songTitle === 'string' ? { songTitle: body.songTitle } : {}),
        ...(typeof body.brollPreference === 'string' ? { brollPreference: body.brollPreference } : {}),
        draftManifest,
        prompt: prompt || (typeof body.spokenPrompt === 'string' ? body.spokenPrompt : undefined),
        quality: requestedQuality,
        format: requestedFormat,
        safeMode: requestedSafeMode,
        textLayers: requestedTextLayers,
        words: (Array.isArray((editorState as any).words) && (editorState as any).words.length > 0)
          ? (editorState as any).words
          : (Array.isArray((editorState as any).transcriptWords) && (editorState as any).transcriptWords.length > 0)
            ? (editorState as any).transcriptWords
            : undefined,
        transcriptSegments: (Array.isArray(asset.transcript_segments) && asset.transcript_segments.length > 0)
          ? asset.transcript_segments
          : (Array.isArray((editorState as any).transcriptSegments) && (editorState as any).transcriptSegments.length > 0)
            ? (editorState as any).transcriptSegments
            : (Array.isArray((editorState as any).transcript) && (editorState as any).transcript.length > 0)
              ? (editorState as any).transcript
              : undefined,
      },
      env: safeGetMiniRunEnvironment({
        MINI_RUN_AWS_API_URL: process.env.MINI_RUN_AWS_API_URL || PRODUCTION_MINI_RUN_AWS_API_URL,
        MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL || PRODUCTION_MINI_RUN_AWS_API_URL,
      }),
      accessToken: await resolveUserAccessToken(
        session?.access_token,
        typeof request.headers?.get === 'function'
          ? (request.headers.get('authorization') || request.headers.get('x-mini-run-user-token'))
          : null,
      ),
    })
    const dispatchedMetadata = {
      ...projectExport.metadata,
      miniRunJobId: dispatched.jobId,
      pipelineJobId: dispatched.pipelineJobId,
    }
    const {data: updated, error: updateError} = await supabase.from('project_exports').update({
      status: dispatched.status === 'queued' ? 'pending' : 'processing',
      metadata: dispatchedMetadata,
    }).eq('id', projectExport.id).eq('user_id', user.id).select('*').single()
    if (updateError || !updated) {
      console.error('[PROJECT_EXPORT_JOB_RECEIPT]', updateError || 'Mini-Run dispatch row was not returned')
      // Ensure the client receives the authoritative dispatched jobId and pipelineJobId
      // even if the database row update encounters a transient replica or RLS delay.
      return NextResponse.json({export: {
        ...projectExport,
        status: dispatched.status === 'queued' ? 'pending' : 'processing',
        metadata: dispatchedMetadata,
      }}, {status: 202, headers: {'Cache-Control': 'no-store'}})
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
    const isAuthError = /401|403|unauthorized|user_authentication_required|jwt|session token expired/i.test(message)
    const isNotFoundError = /not found|unavailable|source.*missing|source.*path/i.test(message)
    const isDispatcherOrUpstream = /Remotion dispatcher|UnrecognizedClientException|security token|cloud pipeline|worker/i.test(message)
    const isValidationError = !isDispatcherOrUpstream && /invalid (?:input|payload|parameter|body|json|job|request|source|revision)|bad request/i.test(message)
    const status = isAuthError ? 401 : isNotFoundError ? 404 : isValidationError ? 400 : 502
    const code = isAuthError ? 'AUTH_REQUIRED' : isNotFoundError ? 'RESOURCE_NOT_FOUND' : isValidationError ? 'VALIDATION_ERROR' : 'RENDER_DISPATCH_FAILED'
    return NextResponse.json({error: message, code}, {status})
  }
}
