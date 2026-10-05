export type PerformanceMetric = 'views' | 'likes' | 'comments' | 'shares' | 'watchTimeSeconds' | 'retentionRate' | 'engagementRate'

export type DashboardAccount = {
  id: string
  platform: string
  platformName: string
  accountName: string
  connected: boolean
  unavailableReason: string | null
}

export type DashboardVideo = {
  id: string
  title: string
  status: string
  thumbnailUrl: string | null
  previewUrl: string | null
  metrics: Record<PerformanceMetric, number>
  platform: string
  platformName: string
  publishedUrl: string | null
}

export type DashboardAccountData = {
  accounts: DashboardAccount[]
  videosByAccount: Record<string, DashboardVideo[]>
}

const metricNames: PerformanceMetric[] = [
  'views', 'likes', 'comments', 'shares', 'watchTimeSeconds', 'retentionRate', 'engagementRate',
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function finite(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeMetrics(value: unknown): Record<PerformanceMetric, number> {
  const record = asRecord(value)
  return Object.fromEntries(metricNames.map((key) => [key, finite(record?.[key])])) as Record<PerformanceMetric, number>
}

/**
 * Read the existing analytics envelope without treating its user-wide metric rows as account data.
 * Metric rows are accepted only when their accountId explicitly matches the connected account.
 */
export function adaptAccountScopedAnalytics(payload: unknown): DashboardAccountData {
  const root = asRecord(payload)
  if (root?.success !== true) return { accounts: [], videosByAccount: {} }

  const rawAccounts = Array.isArray(root.accounts) ? root.accounts : root.connections
  const accounts = (Array.isArray(rawAccounts) ? rawAccounts : []).flatMap((raw): DashboardAccount[] => {
    const account = asRecord(raw)
    const id = asText(account?.id)
    const platform = asText(account?.provider ?? account?.platform)
    if (!id || !platform) return []

    const status = asText(account?.status, account?.connected === true ? 'active' : 'disconnected')
    const connected = account?.connected === true && status === 'active'
    return [{
      id,
      platform,
      platformName: asText(account?.platformName ?? account?.name, platform),
      accountName: asText(account?.accountName ?? account?.provider_username ?? account?.name, 'Linked account'),
      connected,
      unavailableReason: connected ? null : status.replaceAll('_', ' '),
    }]
  })
  const accountById = new Map(accounts.map((account) => [account.id, account]))
  const videosByAccount: Record<string, DashboardVideo[]> = Object.fromEntries(accounts.map(({ id }) => [id, []]))
  const videos = Array.isArray(root.videos) ? root.videos : []

  for (const rawVideo of videos) {
    const video = asRecord(rawVideo)
    const videoId = asText(video?.id)
    const accountId = asText(video?.accountId)
    const account = accountById.get(accountId)
    if (!video || !videoId || !account || !account.connected) continue

    const rawPlatforms = Array.isArray(video.platformBreakdown) ? video.platformBreakdown : []
    const scopedPlatforms = rawPlatforms.filter((value) => asText(asRecord(value)?.accountId) === account.id)
    const entries = rawPlatforms.length > 0
      ? scopedPlatforms.map((value) => ({ record: asRecord(value)!, metrics: normalizeMetrics(asRecord(value)?.metrics ?? value) }))
      : asText(video.platform ?? video.provider) === account.platform
        ? [{ record: video, metrics: normalizeMetrics(video.metrics ?? video.totals ?? video) }]
        : []

    for (const { record, metrics } of entries) {
      const platform = asText(record.platform ?? video.platform ?? account.platform)
      if (!platform) continue
      const latestExport = asRecord(video.latestExport)
      const previewUrl = asText(video.previewUrl ?? video.mediaUrl)
        || (latestExport?.status === 'completed' && asText(latestExport.id)
          ? `/api/exports/${encodeURIComponent(asText(latestExport.id))}/preview`
          : null)

      videosByAccount[account.id]!.push({
        id: videoId,
        title: asText(video.title, 'Untitled video'),
        status: asText(video.status, 'Published'),
        thumbnailUrl: asText(video.thumbnailUrl).trim() || null,
        previewUrl,
        metrics,
        platform,
        platformName: asText(record.platformName ?? video.platformName, account.platformName),
        publishedUrl: asText(record.publishedUrl ?? video.publishedUrl).trim() || null,
      })
    }
  }

  return { accounts, videosByAccount }
}

export function rankVideos(videos: DashboardVideo[], metric: PerformanceMetric, direction: 'desc' | 'asc' = 'desc') {
  const sign = direction === 'desc' ? -1 : 1
  return videos.slice().sort((a, b) => sign * (a.metrics[metric] - b.metrics[metric]) || a.title.localeCompare(b.title))
}

export function filterVideos(videos: DashboardVideo[], platform: string) {
  return platform === 'all' ? videos : videos.filter((video) => video.platform === platform)
}

export function thumbnailSource(video: DashboardVideo, capturedFrame: string | null) {
  return capturedFrame || video.thumbnailUrl
}
