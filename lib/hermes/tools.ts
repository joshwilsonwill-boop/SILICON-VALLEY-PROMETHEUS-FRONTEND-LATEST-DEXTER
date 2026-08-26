import { retrievePrometheusKnowledge } from '@/lib/prometheus-assistant/retrieval'
import { dispatchMiniRunRender, type MiniRunRenderDispatchRequest } from '@/lib/server/mini-run-dispatch'
import type { MiniRunEnvironment } from '@/lib/server/mini-run-proxy'
import type { HermesMemoryStore } from './memory'
import { recallHermesMemory } from './memory'
import type { HermesToolCallResult } from './types'

export interface HermesToolContext {
  userId: string
  sessionId: string
  memoryStore: HermesMemoryStore
  driveAccessToken?: string
  getDriveToken?: () => Promise<string | null>
  miniRunEnv?: MiniRunEnvironment
  fetchImpl?: typeof fetch
}

const VIDEO_MIME_PREFIX = 'video/'

function isMiniRunEnvComplete(env?: MiniRunEnvironment): boolean {
  return Boolean(env?.MINI_RUN_BACKEND_URL && env.MODAL_PROXY_KEY && env.MODAL_PROXY_SECRET)
}

export { HERMES_TOOL_DEFINITIONS } from './tool-definitions'


async function listDriveVideos(token: string, query: string | undefined, fetchImpl: typeof fetch) {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('pageSize', '100')
  url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,thumbnailLink),nextPageToken')
  const base = `mimeType contains '${VIDEO_MIME_PREFIX}'`
  url.searchParams.set('q', query?.trim() ? `name contains '${query.trim().replace(/['"]/g, '')}' and (${base})` : base)
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) {
    const error = (await response.text().catch(() => '')) || `HTTP ${response.status}`
    return { error, status: response.status }
  }
  const data = (await response.json()) as { files?: Array<{ id?: string; name?: string; mimeType?: string; size?: string; modifiedTime?: string; thumbnailLink?: string }>; nextPageToken?: string }
  return {
    files: (data.files ?? []).map((file) => ({ id: file.id, name: file.name, mimeType: file.mimeType, size: file.size, modifiedTime: file.modifiedTime, thumbnailLink: file.thumbnailLink })),
    truncated: Boolean(data.nextPageToken),
  }
}

export function createHermesToolExecutor(ctx: HermesToolContext) {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const fetchImpl = ctx.fetchImpl ?? fetch
    switch (name) {
      case 'search_hermes_knowledge': {
        const query = typeof args.query === 'string' ? args.query : ''
        const matches = retrievePrometheusKnowledge(query, 6)
        return { matches: matches.map((match) => ({ title: match.title, score: match.score, content: match.content.slice(0, 240) })) }
      }
      case 'hermes_recall_memory': {
        const query = typeof args.query === 'string' ? args.query : ''
        const entries = await ctx.memoryStore.load(ctx.userId)
        const recalled = recallHermesMemory(entries, query, 5)
        return { snippets: recalled.map((entry) => entry.text), recalled: recalled.length }
      }
      case 'list_google_drive_videos': {
        const token = ctx.driveAccessToken || (await ctx.getDriveToken?.()) || null
        if (!token) return { needsGoogleDrive: true, message: 'The caller has not connected Google Drive.' }
        const query = typeof args.query === 'string' ? args.query : undefined
        const outcome = await listDriveVideos(token, query, fetchImpl)
        if ('error' in outcome) return { needsGoogleDrive: true, message: `Google Drive rejected the access token (${outcome.error}). Reconnect Drive.` }
        return { files: outcome.files, truncated: outcome.truncated, count: outcome.files.length }
      }
      case 'dispatch_mini_run': {
        if (!ctx.miniRunEnv || !isMiniRunEnvComplete(ctx.miniRunEnv)) {
          return { status: 'not_wired', message: 'Mini-Run render backend is not configured on this environment.', needs: ['MINI_RUN_BACKEND_URL', 'MODAL_PROXY_KEY', 'MODAL_PROXY_SECRET'] }
        }
        const request: MiniRunRenderDispatchRequest = {
          projectId: String(args.projectId ?? ''), sourceAssetId: String(args.sourceAssetId ?? ''), bucket: String(args.bucket ?? ''), storagePath: String(args.storagePath ?? ''), mimeType: String(args.mimeType ?? 'video/mp4'),
          durationMs: typeof args.durationMs === 'number' ? args.durationMs : undefined, width: typeof args.width === 'number' ? args.width : undefined, height: typeof args.height === 'number' ? args.height : undefined,
        }
        const rendered = await dispatchMiniRunRender({ request, env: ctx.miniRunEnv, fetchImpl })
        return { status: rendered.status, jobId: rendered.jobId, pipelineJobId: rendered.pipelineJobId }
      }
      default:
        return { error: `Unknown tool: ${name}` }
    }
  }
}

const LABELS: Record<string, string> = {
  search_hermes_knowledge: 'Searched Prometheus knowledge',
  hermes_recall_memory: 'Recalled the caller’s context',
  list_google_drive_videos: 'Listed Google Drive videos',
  dispatch_mini_run: 'Dispatched a Mini-Run render',
}

export function toHermesToolCallResult(name: string, value: unknown): HermesToolCallResult {
  const record = (value ?? {}) as Record<string, unknown>
  const hasNeedsDrive = typeof record.needsGoogleDrive === 'boolean' && record.needsGoogleDrive === true
  const hasError = typeof record.error === 'string' && Boolean(record.error)
  const status: HermesToolCallResult['status'] = hasNeedsDrive ? 'needs_google_drive' : hasError ? 'error' : 'ok'
  const summary = (typeof record.message === 'string' && record.message) || (typeof record.error === 'string' && record.error) || LABELS[name] || name
  const sources: HermesToolCallResult['sources'] = []
  if (Array.isArray(record.matches)) for (const match of record.matches as Array<Record<string, unknown>>) sources.push({ title: String(match.title ?? 'Knowledge'), kind: 'knowledge', href: typeof match.href === 'string' ? match.href : undefined })
  if (Array.isArray(record.files)) for (const file of record.files as Array<Record<string, unknown>>) sources.push({ title: String(file.name ?? 'Untitled'), kind: 'video' })
  return { name, label: LABELS[name] ?? name, status, summary: String(summary), payload: value, sources }
}
