import {getPresignedGetUrl} from '@/lib/r2/presigned-url'
import {
  miniRunUserHeaders,
  resolveMiniRunConfig,
  PRODUCTION_ORACLE_GATEWAY_URL,
  type MiniRunEnvironment,
} from '@/lib/server/mini-run-proxy'
import {buildMiniRunRenderPayload} from '@/lib/server/mini-run-render-payload'
import type {MiniRunShotSpec} from '@/lib/api/mini-run-console'
import {OracleClient} from '@/lib/oracle'

/**
 * Server-side dispatch to the Prometheus Mini-Runs long-form→short-form render
 * pipeline. It runs in the Next.js server process (never in the browser), forwards
 * the user's Supabase access token, and hands the pipeline a long-lived presigned URL for the source
 * object so the asynchronously-executing worker can download it even after the
 * upload completes.
 */

// The pipeline worker may pick the job up well after the upload response has
// returned, so use a day-long presigned URL rather than the short default.
const SOURCE_URL_EXPIRES_SECONDS = 24 * 60 * 60

export type MiniRunRenderDispatchRequest = {
  projectId: string
  sourceAssetId: string
  bucket: string
  storagePath: string
  mimeType: string
  durationMs?: number
  width?: number
  height?: number
  jobId?: string
  editorialRevision?: number
  songPolicy?: 'auto' | 'disabled'
  songTrackId?: string
  songTitle?: string
  songArtist?: string
  songGenre?: string
  songMood?: string
  songUrl?: string
  brollPreference?: string
  motionGraphicsPreference?: string
  brandPreferences?: Record<string, unknown>
  shot?: Partial<MiniRunShotSpec>
  draftManifest?: Record<string, unknown>
  transcriptSegments?: unknown[]
  words?: unknown[]
  prompt?: string
  quality?: 'draft' | 'standard' | 'maximum'
  format?: 'mp4' | 'mov' | 'prores'
  safeMode?: boolean
  textLayers?: unknown[]
}

/**
 * Extracts authoritatively saved song selection and editorial directives from editor state
 * so that background and export pipelines receive the user\'s explicit choices.
 */
export function extractExportDirectives(editorState: Record<string, unknown> | null | undefined): {
  songTrackId?: string
  songTitle?: string
  songArtist?: string
  songGenre?: string
  songMood?: string
  songUrl?: string
  brollPreference?: string
  motionGraphicsPreference?: string
  brandPreferences?: Record<string, unknown>
} {
  if (!editorState || typeof editorState !== 'object') return {}
  const timeline = (editorState.editorialTimeline as Record<string, unknown>) || {}
  const music = (timeline.music as Record<string, unknown>) || (editorState.music as Record<string, unknown>) || {}
  const track = (music.track as Record<string, unknown>) || (editorState.selectedMusicTrack as Record<string, unknown>) || {}
  const songProgram = (editorState.songProgram as Record<string, unknown>) || {}

  const songTrackId = (track.id || track.trackId || songProgram.trackId || editorState.songTrackId) as string | undefined
  const songTitle = (track.title || track.name || songProgram.title || editorState.songTitle) as string | undefined
  const songArtist = (track.artist || songProgram.artist || editorState.songArtist) as string | undefined
  const songGenre = (track.category || track.genre || songProgram.category || editorState.songGenre) as string | undefined
  const songMood = (track.mood || songProgram.mood || editorState.songMood) as string | undefined
  const songUrl = (track.audioSrc || track.previewUrl || track.src || songProgram.audioUrl || editorState.songUrl) as string | undefined

  const brollPreference = (editorState.brollPreference || (editorState.brandPreferences as any)?.preferredKind) as string | undefined
  const motionGraphicsPreference = (editorState.motionGraphicsPreference || (editorState.design as any)?.motionGraphicsPreference) as string | undefined
  const brandPreferences = (editorState.brandPreferences || (editorState.design as any)?.brandPreferences) as Record<string, unknown> | undefined

  return {
    ...(songTrackId ? { songTrackId } : {}),
    ...(songTitle ? { songTitle } : {}),
    ...(songArtist ? { songArtist } : {}),
    ...(songGenre ? { songGenre } : {}),
    ...(songMood ? { songMood } : {}),
    ...(songUrl ? { songUrl } : {}),
    ...(brollPreference ? { brollPreference } : {}),
    ...(motionGraphicsPreference ? { motionGraphicsPreference } : {}),
    ...(brandPreferences ? { brandPreferences } : {}),
  }
}

export type MiniRunRenderDispatchEnvironment = MiniRunEnvironment

export async function buildMiniRunSourceUrl(bucket: string, storagePath: string): Promise<string> {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }
  return getPresignedGetUrl(bucket, storagePath, undefined, SOURCE_URL_EXPIRES_SECONDS)
}

export async function dispatchMiniRunRender({
  request,
  env,
  accessToken,
  fetchImpl = fetch,
}: {
  request: MiniRunRenderDispatchRequest
  env: MiniRunRenderDispatchEnvironment
  accessToken: string
  fetchImpl?: typeof fetch
}): Promise<{jobId: string; pipelineJobId: string; status: string}> {
  const config = resolveMiniRunConfig(env)
  const sourceUrl = await buildMiniRunSourceUrl(request.bucket, request.storagePath)

  const isOracle =
    config.baseUrl === PRODUCTION_ORACLE_GATEWAY_URL ||
    config.baseUrl.includes('prometheus-runner') ||
    config.baseUrl.includes('taile46eb2') ||
    config.baseUrl.includes('oracle')

  if (isOracle) {
    const oracleClient = new OracleClient({
      baseUrl: config.baseUrl,
      token: accessToken,
      fetchImpl,
    })

    const filename =
      request.storagePath.split('/').pop() ||
      `${request.sourceAssetId || 'source'}.mp4`
    const contentType = request.mimeType || 'video/mp4'
    const creativePrompt = request.prompt?.trim() || 'Autonomous cinematic cut'

    // Rule 13 (Intake Law): Client sends ONLY raw video references and creative prompt.
    // Transcripts, word timestamps, chunks, manifests, and client userId are strictly omitted.
    const processResult = await oracleClient.startProcess(
      {
        bucket: request.bucket || 'prometheus-sources',
        key: request.storagePath,
        filename,
        contentType,
        mediaUrl: sourceUrl,
        metadata: {
          creativePrompt,
          designOptions: {
            aspectRatio:
              request.width && request.height && request.width > request.height
                ? '16:9'
                : '9:16',
            pacing: 'dynamic',
          },
        },
      },
      accessToken,
    )

    let renderJobId = processResult.jobId
    if (processResult.urls?.render) {
      try {
        const renderResult = await oracleClient.triggerRender(
          processResult.urls.render,
          {
            format: request.format || 'mp4',
            quality: request.quality || 'high',
          },
          accessToken,
        )
        if (renderResult?.renderJobId) {
          renderJobId = renderResult.renderJobId
        }
      } catch (err) {
        console.warn('[ORACLE_RENDER_TRIGGER_DEFERRED]', err)
      }
    }

    return {
      jobId: renderJobId || processResult.jobId || crypto.randomUUID(),
      pipelineJobId: processResult.sessionId || '',
      status: processResult.status || 'queued',
    }
  }

  const frontendJobId = request.jobId ?? crypto.randomUUID()
  const body = buildMiniRunRenderPayload({
    sourceUrl,
    source: {durationMs: request.durationMs, width: request.width, height: request.height},
    shot: {
      ...request.shot,
      songPolicy: request.songPolicy ?? request.shot?.songPolicy,
      ...(request.songTrackId ? { songTrackId: request.songTrackId } : {}),
      ...(request.songTitle ? { songTitle: request.songTitle } : {}),
      ...(request.songArtist ? { songArtist: request.songArtist } : {}),
      ...(request.songGenre ? { songGenre: request.songGenre } : {}),
      ...(request.songMood ? { songMood: request.songMood } : {}),
      ...(request.songUrl ? { songUrl: request.songUrl } : {}),
      ...(request.brollPreference ? { brollPreference: request.brollPreference } : {}),
      ...(request.motionGraphicsPreference ? { motionGraphicsPreference: request.motionGraphicsPreference } : {}),
      ...(request.brandPreferences ? { brandPreferences: request.brandPreferences } : {}),
    },
    jobId: frontendJobId,
    draftManifest: request.draftManifest,
    transcriptSegments: request.transcriptSegments,
    words: request.words,
    prompt: request.prompt,
    quality: request.quality,
    format: request.format,
    safeMode: request.safeMode,
    textLayers: request.textLayers,
  })

  const response = await fetchImpl(`${config.baseUrl}/api/pipeline/render`, {
    method: 'POST',
    headers: miniRunUserHeaders(accessToken, {'Content-Type': 'application/json', 'Idempotency-Key': frontendJobId}),
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const responseBody = (await response.json().catch(() => ({}))) as {
    jobId?: unknown
    pipelineJobId?: unknown
    status?: unknown
    error?: unknown
  }

  if (!response.ok) {
    throw new Error(
      typeof responseBody.error === 'string' ? responseBody.error : `Mini-Run render returned HTTP ${response.status}.`,
    )
  }
  if (typeof responseBody.jobId !== 'string' || !responseBody.jobId) {
    throw new Error('Mini-Run render response omitted jobId.')
  }

  return {
    jobId: responseBody.jobId,
    pipelineJobId: typeof responseBody.pipelineJobId === 'string' ? responseBody.pipelineJobId : '',
    status: typeof responseBody.status === 'string' ? responseBody.status : 'queued',
  }
}
