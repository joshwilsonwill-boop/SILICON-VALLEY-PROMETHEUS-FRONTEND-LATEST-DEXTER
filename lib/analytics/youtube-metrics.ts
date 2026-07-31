import 'server-only'

import { getValidAccessToken } from '@/lib/oauth/refresh'

export type YouTubeMetricSnapshot = {
  externalVideoId: string
  title: string
  thumbnailUrl: string | null
  views: number
  likes: number
  comments: number
  shares: number
  watchTimeSeconds: number
  retentionRate: number
  engagementRate: number
  capturedAt: string
  publishedUrl: string
}

type YouTubeReport = {
  columnHeaders?: Array<{ name?: string }>
  rows?: unknown[][]
}

type YouTubeVideoDetails = {
  id?: string
  snippet?: {
    title?: string
    thumbnails?: {
      high?: { url?: string }
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

function toNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toReportRows(report: YouTubeReport) {
  const headers = report.columnHeaders?.map((header) => header.name ?? '') ?? []

  return (report.rows ?? []).map((row) =>
    headers.reduce<Record<string, unknown>>((record, header, index) => {
      record[header] = row[index]
      return record
    }, {}),
  )
}

/**
 * Reads daily per-video analytics from the authenticated YouTube channel. The caller
 * persists the returned records; this module never exposes an OAuth token to the client.
 */
export async function readYouTubeVideoMetrics(userId: string, days = 90): Promise<YouTubeMetricSnapshot[]> {
  const accessToken = await getValidAccessToken(userId, 'youtube')
  if (!accessToken) return []

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(1, days - 1))

  const reportParams = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    metrics: 'views,likes,comments,shares,estimatedMinutesWatched,averageViewPercentage',
    dimensions: 'day,video',
    sort: 'day',
    maxResults: '5000',
  })

  const reportResponse = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${reportParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
  })

  if (!reportResponse.ok) {
    const detail = await reportResponse.text().catch(() => '')
    throw new Error(`YouTube Analytics request failed (${reportResponse.status}): ${detail.slice(0, 240)}`)
  }

  const reportRows = toReportRows((await reportResponse.json()) as YouTubeReport)
  const videoIds = [...new Set(reportRows.map((row) => String(row.video ?? '')).filter(Boolean))]
  const details = new Map<string, YouTubeVideoDetails>()

  for (let index = 0; index < videoIds.length; index += 50) {
    const ids = videoIds.slice(index, index + 50)
    const detailParams = new URLSearchParams({ part: 'snippet', id: ids.join(',') })
    const detailResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
    })

    if (!detailResponse.ok) continue
    const payload = (await detailResponse.json()) as { items?: YouTubeVideoDetails[] }
    for (const detail of payload.items ?? []) {
      if (detail.id) details.set(detail.id, detail)
    }
  }

  return reportRows.flatMap((row) => {
    const externalVideoId = String(row.video ?? '')
    const day = String(row.day ?? '')
    if (!externalVideoId || !day) return []

    const detail = details.get(externalVideoId)
    const views = toNumber(row.views)
    const likes = toNumber(row.likes)
    const comments = toNumber(row.comments)
    const shares = toNumber(row.shares)
    const thumbnail = detail?.snippet?.thumbnails

    return [{
      externalVideoId,
      title: detail?.snippet?.title ?? 'YouTube video',
      thumbnailUrl: thumbnail?.high?.url ?? thumbnail?.medium?.url ?? thumbnail?.default?.url ?? null,
      views,
      likes,
      comments,
      shares,
      watchTimeSeconds: Math.round(toNumber(row.estimatedMinutesWatched) * 60),
      retentionRate: Math.round(toNumber(row.averageViewPercentage) * 10) / 10,
      engagementRate: views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0,
      capturedAt: `${day}T00:00:00.000Z`,
      publishedUrl: `https://www.youtube.com/watch?v=${externalVideoId}`,
    }]
  })
}
