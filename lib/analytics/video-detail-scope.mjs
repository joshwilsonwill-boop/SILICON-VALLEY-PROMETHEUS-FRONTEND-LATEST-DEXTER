/**
 * @typedef {object} VideoPlatformMetric
 * @property {string} platform
 * @property {string} platformName
 * @property {string} color
 * @property {boolean} connected
 * @property {number} views
 * @property {number} likes
 * @property {number} comments
 * @property {number} shares
 * @property {number} watchTimeSeconds
 * @property {number} retentionRate
 * @property {number} engagementRate
 * @property {string | null} publishedUrl
 * @property {string | null} capturedAt
 */

/**
 * @typedef {object} VideoAnalyticsForDetail
 * @property {{ views: number, retentionRate: number, engagementRate: number }} totals
 * @property {VideoPlatformMetric[]} platformBreakdown
 */

/**
 * @typedef {object} VideoAnalyticsAccount
 * @property {string} id
 * @property {string} name
 * @property {string | null} [accountName]
 * @property {boolean} connected
 * @property {string} [status]
 */

/**
 * @typedef {object} VideoAnalyticsDetailScope
 * @property {VideoPlatformMetric[]} platforms
 * @property {VideoAnalyticsAccount | undefined} account
 * @property {VideoAnalyticsForDetail['totals'] | null} totals
 * @property {'available' | 'stale' | 'unavailable' | 'no-data'} state
 */

/**
 * Keep this selection at the detail boundary so headline totals and channel rows
 * always share one account/platform scope.
 * @param {VideoAnalyticsForDetail} video
 * @param {VideoAnalyticsAccount[]} accounts
 * @param {string | null} selectedPlatformId
 * @returns {VideoAnalyticsDetailScope}
 */
export function resolveVideoAnalyticsDetailScope(video, accounts, selectedPlatformId) {
  const account = selectedPlatformId
    ? accounts.find((candidate) => candidate.id === selectedPlatformId)
    : undefined
  const accountUnavailable = Boolean(selectedPlatformId && account && !account.connected)
  const platforms = accountUnavailable
    ? []
    : video.platformBreakdown.filter((platform) =>
        platform.connected && (!selectedPlatformId || platform.platform === selectedPlatformId),
      )
  const selectedPlatform = platforms[0]
  const totals = selectedPlatformId && selectedPlatform
    ? {
        views: selectedPlatform.views,
        retentionRate: selectedPlatform.retentionRate,
        engagementRate: selectedPlatform.engagementRate,
      }
    : null
  const state = selectedPlatformId && account && !account.connected
    ? 'unavailable'
    : platforms.length === 0
      ? 'no-data'
      : platforms.some((platform) => isVideoAnalyticsReadStale(platform.capturedAt))
        ? 'stale'
        : 'available'

  return { platforms, account, totals, state }
}

/** @param {string | null} capturedAt @param {number} [now] */
export function isVideoAnalyticsReadStale(capturedAt, now = Date.now()) {
  if (!capturedAt) return false
  const capturedTime = Date.parse(capturedAt)
  return Number.isFinite(capturedTime) && now - capturedTime > 30 * 24 * 60 * 60 * 1000
}
