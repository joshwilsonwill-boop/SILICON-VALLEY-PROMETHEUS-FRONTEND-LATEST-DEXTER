import { NextResponse } from 'next/server'

import { readYouTubeVideoMetrics } from '@/lib/analytics/youtube-metrics'
import { getProviderMetadata, parseConnectionScopes, type ProviderStatus } from '@/lib/oauth/provider-metadata'
import { createClient } from '@/lib/supabase/server'

const PUBLISHING_PROVIDERS = ['youtube', 'instagram', 'tiktok', 'x', 'facebook', 'linkedin'] as const

type PublishingProvider = (typeof PUBLISHING_PROVIDERS)[number]

type ConnectionRow = {
  id: string
  provider: string
  provider_user_id: string | null
  provider_username: string | null
  scope: string | string[] | null
  expires_at: string | null
  updated_at: string | null
  is_active: boolean | null
}

type ProjectRow = {
  id: string
  name: string | null
  status: string | null
  thumbnail_url: string | null
  created_at: string | null
  updated_at: string | null
  source_profile: Record<string, unknown> | null
  preview_kind: string | null
}

type ExportRow = {
  id: string
  project_id: string
  status: string | null
  preset: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
  file_size_bytes: number | null
  duration_ms: number | null
  metadata: Record<string, unknown> | null
}

type MetricRow = {
  project_id: string | null
  export_id: string | null
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

function errorResponse(status: number, code: string, message: string, details: unknown = null) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    },
    { status },
  )
}

function deriveStatus(expiresAt: string | null, isActive: boolean | null): ProviderStatus {
  if (isActive === false) return 'disconnected'
  if (!expiresAt) return 'active'

  const expiresAtTime = new Date(expiresAt).getTime()
  const now = Date.now()

  if (Number.isNaN(expiresAtTime) || expiresAtTime <= now) return 'expired'
  if (expiresAtTime <= now + 60 * 60 * 1000) return 'expiring_soon'
  return 'active'
}

function isPublishingProvider(provider: string): provider is PublishingProvider {
  return PUBLISHING_PROVIDERS.includes(provider as PublishingProvider)
}

function sumRows(rows: Array<{ views: number; likes: number; comments: number; shares: number; watchTimeSeconds: number }>) {
  return rows.reduce(
    (total, row) => ({
      views: total.views + row.views,
      likes: total.likes + row.likes,
      comments: total.comments + row.comments,
      shares: total.shares + row.shares,
      watchTimeSeconds: total.watchTimeSeconds + row.watchTimeSeconds,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, watchTimeSeconds: 0 },
  )
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildTimeSeries(rows: MetricRow[]) {
  const points = new Map<string, { label: string; reach: number; watchTime: number; engagementTotal: number; engagementCount: number }>()

  for (const row of rows) {
    if (!row.captured_at) continue
    const label = row.captured_at.slice(0, 10)
    const point = points.get(label) ?? { label, reach: 0, watchTime: 0, engagementTotal: 0, engagementCount: 0 }
    point.reach += toNumber(row.views)
    point.watchTime += toNumber(row.watch_time_seconds)
    if (toNumber(row.engagement_rate) > 0) {
      point.engagementTotal += toNumber(row.engagement_rate)
      point.engagementCount += 1
    }
    points.set(label, point)
  }

  return [...points.values()]
    .sort((first, second) => first.label.localeCompare(second.label))
    .map((point) => ({
      label: point.label,
      reach: point.reach,
      watchTime: point.watchTime,
      engagement: point.engagementCount ? Math.round((point.engagementTotal / point.engagementCount) * 10) / 10 : 0,
    }))
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
  }

  const { data: connectionRows, error: connectionsError } = await supabase
    .from('user_connections')
    .select('id, provider, provider_user_id, provider_username, scope, expires_at, updated_at, is_active')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .returns<ConnectionRow[]>()

  if (connectionsError) {
    return errorResponse(500, 'CONNECTIONS_FETCH_FAILED', connectionsError.message, connectionsError.details ?? null)
  }

  const connections = (connectionRows ?? [])
    .filter((connection) => isPublishingProvider(connection.provider))
    .map((connection) => {
      const metadata = getProviderMetadata(connection.provider)
      const status = deriveStatus(connection.expires_at, connection.is_active)

      return {
        id: connection.id,
        provider: connection.provider,
        platformName: metadata?.name ?? connection.provider,
        platformIcon: metadata?.iconName ?? 'Link2',
        color: metadata?.color ?? '#ffffff',
        accountName: connection.provider_username ?? connection.provider_user_id ?? null,
        connected: status === 'active',
        status,
        scope: parseConnectionScopes(connection.scope),
        updatedAt: connection.updated_at,
      }
    })

  const activeProviders = new Set(
    connections
      .filter((connection) => connection.connected)
      .map((connection) => connection.provider),
  )
  const needsConnections = activeProviders.size === 0

  const selectMetrics = () =>
    supabase
      .from('video_platform_metrics')
      .select('project_id, export_id, platform, external_video_id, title, thumbnail_url, views, likes, comments, shares, watch_time_seconds, retention_rate, engagement_rate, published_url, captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(5000)
      .returns<MetricRow[]>()

  let { data: metricRows, error: metricError } = await selectMetrics()
  let syncedYouTube = false
  const hasYouTubeConnection = activeProviders.has('youtube')
  const latestYouTubeCapture = (metricRows ?? []).find((metric) => metric.platform === 'youtube')?.captured_at
  const isYouTubeStale = !latestYouTubeCapture || Date.now() - new Date(latestYouTubeCapture).getTime() > 15 * 60 * 1000

  if (hasYouTubeConnection && isYouTubeStale) {
    try {
      const snapshots = await readYouTubeVideoMetrics(user.id)
      if (snapshots.length > 0) {
        const { error: syncError } = await supabase.from('video_platform_metrics').upsert(
          snapshots.map((snapshot) => ({
            user_id: user.id,
            platform: 'youtube',
            external_video_id: snapshot.externalVideoId,
            title: snapshot.title,
            thumbnail_url: snapshot.thumbnailUrl,
            views: snapshot.views,
            likes: snapshot.likes,
            comments: snapshot.comments,
            shares: snapshot.shares,
            watch_time_seconds: snapshot.watchTimeSeconds,
            retention_rate: snapshot.retentionRate,
            engagement_rate: snapshot.engagementRate,
            published_url: snapshot.publishedUrl,
            captured_at: snapshot.capturedAt,
          })),
          { onConflict: 'user_id,platform,external_video_id,captured_at' },
        )

        if (!syncError) {
          const refreshed = await selectMetrics()
          metricRows = refreshed.data
          metricError = refreshed.error
          syncedYouTube = true
        }
      }
    } catch {
      // Cached reports remain available if YouTube temporarily rejects a sync request.
    }
  }

  const { data: projectRows, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, thumbnail_url, created_at, updated_at, source_profile, preview_kind')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(12)
    .returns<ProjectRow[]>()

  if (projectsError) {
    return errorResponse(500, 'PROJECTS_FETCH_FAILED', projectsError.message, projectsError.details ?? null)
  }

  const projectIds = (projectRows ?? []).map((project) => project.id)
  const { data: exportRows } =
    projectIds.length > 0
      ? await supabase
          .from('project_exports')
          .select('id, project_id, status, preset, completed_at, created_at, updated_at, file_size_bytes, duration_ms, metadata')
          .eq('user_id', user.id)
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(36)
          .returns<ExportRow[]>()
      : { data: [] as ExportRow[] }

  const metricsAvailable = !metricError && Array.isArray(metricRows) && metricRows.length > 0
  const exportsByProjectId = new Map<string, ExportRow[]>()

  for (const exportRow of exportRows ?? []) {
    const current = exportsByProjectId.get(exportRow.project_id) ?? []
    current.push(exportRow)
    exportsByProjectId.set(exportRow.project_id, current)
  }

  const metricsByProjectId = new Map<string, MetricRow[]>()

  for (const metric of metricRows ?? []) {
    if (!metric.project_id || !metric.platform) continue
    const current = metricsByProjectId.get(metric.project_id) ?? []
    current.push(metric)
    metricsByProjectId.set(metric.project_id, current)
  }

  const visibleProviders = PUBLISHING_PROVIDERS.filter((provider) => activeProviders.has(provider))

  const videos = (projectRows ?? []).map((project) => {
    const projectMetrics = metricsByProjectId.get(project.id) ?? []
    const projectExports = exportsByProjectId.get(project.id) ?? []
    const latestExport = projectExports[0] ?? null

    const platformBreakdown = visibleProviders.map((provider) => {
      const metric = projectMetrics.find((row) => row.platform === provider)
      const connected = activeProviders.has(provider)
      const views = toNumber(metric?.views)
      const likes = toNumber(metric?.likes)
      const comments = toNumber(metric?.comments)
      const shares = toNumber(metric?.shares)
      const watchTimeSeconds = toNumber(metric?.watch_time_seconds)
      const retentionRate = toNumber(metric?.retention_rate, 0)
      const engagementRate = toNumber(metric?.engagement_rate, 0)
      const metadata = getProviderMetadata(provider)

      return {
        platform: provider,
        platformName: metadata?.name ?? provider,
        color: metadata?.color ?? '#ffffff',
        connected,
        views,
        likes,
        comments,
        shares,
        watchTimeSeconds,
        retentionRate,
        engagementRate,
        publishedUrl: metric?.published_url ?? null,
        capturedAt: metric?.captured_at ?? latestExport?.completed_at ?? project.updated_at,
      }
    })

    const totals = sumRows(platformBreakdown)
    const retentionValues = platformBreakdown.map((platform) => platform.retentionRate).filter((value) => value > 0)
    const engagementValues = platformBreakdown.map((platform) => platform.engagementRate).filter((value) => value > 0)

    return {
      id: project.id,
      title: project.name ?? 'Untitled video',
      status: project.status ?? 'draft',
      thumbnailUrl: project.thumbnail_url,
      previewKind: project.preview_kind ?? 'video',
      updatedAt: project.updated_at,
      createdAt: project.created_at,
      latestExport: latestExport
        ? {
            id: latestExport.id,
            status: latestExport.status,
            preset: latestExport.preset,
            completedAt: latestExport.completed_at,
            durationMs: latestExport.duration_ms,
          }
        : null,
      totals: {
        ...totals,
        retentionRate: retentionValues.length
          ? Math.round(retentionValues.reduce((sum, value) => sum + value, 0) / retentionValues.length)
          : 0,
        engagementRate: engagementValues.length
          ? Math.round((engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length) * 10) / 10
          : 0,
      },
      platformBreakdown,
    }
  })

  const unlinkedMetrics = (metricRows ?? []).filter((metric) => !metric.project_id && metric.external_video_id && metric.platform)
  const remoteVideosById = new Map<string, MetricRow[]>()

  for (const metric of unlinkedMetrics) {
    const key = `${metric.platform}:${metric.external_video_id}`
    remoteVideosById.set(key, [...(remoteVideosById.get(key) ?? []), metric])
  }

  const remoteVideos = [...remoteVideosById.entries()].map(([key, records]) => {
    const latest = records[0]!
    const totals = sumRows(
      records.map((record) => ({
        views: toNumber(record.views),
        likes: toNumber(record.likes),
        comments: toNumber(record.comments),
        shares: toNumber(record.shares),
        watchTimeSeconds: toNumber(record.watch_time_seconds),
      })),
    )
    const retentionValues = records.map((record) => toNumber(record.retention_rate)).filter((value) => value > 0)
    const engagementValues = records.map((record) => toNumber(record.engagement_rate)).filter((value) => value > 0)
    const retentionRate = retentionValues.length
      ? Math.round((retentionValues.reduce((sum, value) => sum + value, 0) / retentionValues.length) * 10) / 10
      : 0
    const engagementRate = engagementValues.length
      ? Math.round((engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length) * 10) / 10
      : 0
    const metadata = getProviderMetadata(latest.platform ?? '')

    return {
      id: key,
      title: latest.title ?? 'Connected video',
      status: `${metadata?.name ?? latest.platform} report`,
      thumbnailUrl: latest.thumbnail_url,
      previewKind: 'video',
      updatedAt: latest.captured_at,
      createdAt: latest.captured_at,
      latestExport: null,
      totals: { ...totals, retentionRate, engagementRate },
      platformBreakdown: [{
        platform: latest.platform,
        platformName: metadata?.name ?? latest.platform,
        color: metadata?.color ?? '#ffffff',
        connected: true,
        ...totals,
        retentionRate,
        engagementRate,
        publishedUrl: latest.published_url,
        capturedAt: latest.captured_at,
      }],
    }
  })

  const allVideos = [...videos, ...remoteVideos]
  const allPlatformRows = allVideos.flatMap((video) => video.platformBreakdown)
  const totals = sumRows(allPlatformRows)
  const connectedPlatforms = PUBLISHING_PROVIDERS.map((provider) => {
    const metadata = getProviderMetadata(provider)
    const connection = connections.find((item) => item.provider === provider)
    const rows = allPlatformRows.filter((row) => row.platform === provider)
    const platformTotals = sumRows(rows)
    const retentionValues = rows.map((row) => row.retentionRate).filter((value) => value > 0)

    return {
      id: provider,
      name: metadata?.name ?? provider,
      iconName: metadata?.iconName ?? 'Link2',
      color: metadata?.color ?? '#ffffff',
      connected: connection?.connected ?? false,
      status: connection?.status ?? 'disconnected',
      accountName: connection?.accountName ?? null,
      totals: {
        ...platformTotals,
        retentionRate: retentionValues.length
          ? Math.round(retentionValues.reduce((sum, value) => sum + value, 0) / retentionValues.length)
          : 0,
      },
    }
  })

  return NextResponse.json({
    success: true,
    userId: user.id,
    generatedAt: new Date().toISOString(),
    dataSource: syncedYouTube ? 'youtube_live' : metricsAvailable ? 'cached_platform_reports' : 'unavailable',
    metricsWarning: metricError
      ? 'Analytics storage is unavailable. Apply the latest database migration, then reconnect the account.'
      : metricsAvailable
        ? null
        : 'No platform reports are available yet. Connect a channel with analytics access to begin reading performance.',
    needsConnections,
    connections,
    platforms: connectedPlatforms,
    videos: allVideos,
    timeSeries: buildTimeSeries(metricRows ?? []),
    totals: {
      ...totals,
      connectedPlatformCount: activeProviders.size,
      videoCount: allVideos.length,
      exportCount: exportRows?.length ?? 0,
    },
  })
}
