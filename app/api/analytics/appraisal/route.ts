import { NextResponse } from 'next/server'

import { appraiseCatalogWithLaya } from '@/lib/analytics/laya-engine'
import type { LayaCatalogAppraisal, LayaPostInput } from '@/lib/analytics/laya-types'
import { createTtlCache } from '@/lib/server/ttl-cache'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APPRAISAL_CACHE_TTL_MS = 45_000

type AppraisalCacheItem = {
  status: number
  body: LayaCatalogAppraisal | { error: string }
}

const appraisalCache = createTtlCache<AppraisalCacheItem>({ ttlMs: APPRAISAL_CACHE_TTL_MS })

type MetricRow = {
  project_id: string | null
  platform: string | null
  external_video_id: string | null
  title: string | null
  thumbnail_url: string | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  watch_time_seconds: number | null
  retention_rate: number | null
  engagement_rate: number | null
  published_url: string | null
  captured_at: string | null
}

type ProjectRow = {
  id: string
  name: string | null
  thumbnail_url: string | null
  editor_state?: Record<string, unknown> | null
  source_profile?: Record<string, unknown> | null
}

function toNumber(val: unknown, fallback = 0): number {
  const num = typeof val === 'number' ? val : Number(val)
  return Number.isFinite(num) ? num : fallback
}

/**
 * GET /api/analytics/appraisal
 * Authenticates user, gathers all social platform metrics & projects,
 * executes instantaneous LAYA batch appraisal, and caches the result.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const result = await appraisalCache.resolve(
    user.id,
    async () => {
      try {
        const { data: metricRows, error: metricError } = await supabase
          .from('video_platform_metrics')
          .select('project_id, platform, external_video_id, title, thumbnail_url, views, likes, comments, shares, watch_time_seconds, retention_rate, engagement_rate, published_url, captured_at')
          .eq('user_id', user.id)
          .order('captured_at', { ascending: false })
          .limit(1000)
          .returns<MetricRow[]>()

        if (metricError) {
          return {
            status: 500,
            body: { error: `Failed to fetch telemetry metrics: ${metricError.message}` },
          }
        }

        const { data: projectRows } = await supabase
          .from('projects')
          .select('id, name, thumbnail_url, editor_state, source_profile')
          .eq('user_id', user.id)
          .limit(1000)
          .returns<ProjectRow[]>()

        const projectMap = new Map((projectRows ?? []).map((p) => [p.id, p]))

        const posts: LayaPostInput[] = (metricRows ?? []).map((row, idx) => {
          const project = row.project_id ? projectMap.get(row.project_id) : undefined
          const views = toNumber(row.views, 0)
          const retentionRate = toNumber(row.retention_rate, 65)

          // Extract editing decisions from project editor state if available
          const cutsPerMinute = project?.editor_state && typeof project.editor_state === 'object'
            ? toNumber((project.editor_state as Record<string, unknown>).cutsPerMinute, 22)
            : 22

          return {
            id: row.project_id || row.external_video_id || `post-${idx}`,
            title: row.title || project?.name || 'Untitled Video',
            platform: row.platform || 'youtube',
            publishedUrl: row.published_url,
            capturedAt: row.captured_at,
            thumbnailUrl: row.thumbnail_url || project?.thumbnail_url,
            views,
            likes: toNumber(row.likes, 0),
            comments: toNumber(row.comments, 0),
            shares: toNumber(row.shares, 0),
            watchTimeSeconds: toNumber(row.watch_time_seconds, 0),
            retentionRate,
            retention3s: Math.min(100, retentionRate + 12),
            retention15s: Math.max(10, retentionRate - 15),
            engagementRate: toNumber(row.engagement_rate, 0),
            cutsPerMinute,
            hookTransitionLatencyMs: 650,
            audioVocalToMusicDb: -15,
            captionPreset: 'vogue',
          }
        })

        const appraisal = appraiseCatalogWithLaya(posts)
        return { status: 200, body: appraisal }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'LAYA appraisal failed'
        return { status: 500, body: { error: message } }
      }
    },
    (entry) => entry.status === 200,
  )

  return NextResponse.json(result.body, { status: result.status })
}

/**
 * POST /api/analytics/appraisal
 * Callable endpoint to appraise an explicit array of posts on-demand.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { posts?: LayaPostInput[] }
    const posts = Array.isArray(payload.posts) ? payload.posts : []
    const appraisal = appraiseCatalogWithLaya(posts)
    return NextResponse.json(appraisal, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request payload'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
