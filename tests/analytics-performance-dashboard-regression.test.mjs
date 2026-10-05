import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { adaptAccountScopedAnalytics, filterVideos, rankVideos, thumbnailSource } from '../lib/analytics/video-performance-dashboard.ts'

const fixture = {
  success: true,
  connections: [
    { id: 'yt-a', provider: 'youtube', platformName: 'YouTube', provider_username: '@north', connected: true, status: 'active' },
    { id: 'tt-b', provider: 'tiktok', platformName: 'TikTok', provider_username: '@south', connected: true, status: 'active' },
    { id: 'ig-off', provider: 'instagram', platformName: 'Instagram', provider_username: '@offline', connected: false, status: 'disconnected' },
  ],
  videos: [
    { id: 'one', accountId: 'yt-a', title: 'North winner', platform: 'youtube', metrics: { views: 90 }, thumbnailUrl: null, latestExport: { id: 'exp/1', status: 'completed' } },
    { id: 'two', accountId: 'tt-b', title: 'South winner', platform: 'tiktok', metrics: { views: 500 } },
    { id: 'offline', accountId: 'ig-off', title: 'Disconnected row', platform: 'instagram', metrics: { views: 999 } },
    { id: 'legacy-aggregate', title: 'Unscoped aggregate', platform: 'youtube', metrics: { views: 10000 } },
    { id: 'mixed-platform-total', accountId: 'yt-a', title: 'Mixed platform leak', platform: 'youtube', metrics: { views: 20000 }, platformBreakdown: [{ accountId: 'tt-b', platform: 'tiktok', metrics: { views: 20000 } }] },
  ],
}

const adapted = adaptAccountScopedAnalytics(fixture)
assert.equal(adapted.accounts.length, 3)
assert.deepEqual(adapted.videosByAccount['yt-a']?.map((video) => video.id), ['one'])
assert.deepEqual(adapted.videosByAccount['tt-b']?.map((video) => video.id), ['two'])
assert.deepEqual(adapted.videosByAccount['ig-off'], [])
assert.deepEqual(adapted.videosByAccount['yt-a']?.map((video) => video.metrics.views), [90])
assert.equal(adapted.videosByAccount['yt-a']?.[0]?.previewUrl, '/api/exports/exp%2F1/preview')

const selected = adapted.videosByAccount['yt-a'] ?? []
assert.deepEqual(rankVideos(selected, 'views').map((video) => video.id), ['one'])
assert.deepEqual(filterVideos(selected, 'youtube').map((video) => video.id), ['one'])
assert.deepEqual(filterVideos(selected, 'tiktok'), [])
assert.equal(thumbnailSource({ ...selected[0], thumbnailUrl: null }, 'data:image/jpeg;base64,frame'), 'data:image/jpeg;base64,frame')
assert.equal(adaptAccountScopedAnalytics({ success: true, connections: fixture.connections, videos: [{ id: 'aggregate', totals: { views: 10 } }] }).videosByAccount['yt-a']?.length, 0)

const dashboard = readFileSync('components/analytics/VideoPerformanceDashboard.tsx', 'utf8')
const page = readFileSync('app/analytics/page.tsx', 'utf8')
assert.match(page, /VideoPerformanceDashboard/)
assert.match(dashboard, /aria-label="Filter by linked account"/)
assert.match(dashboard, /aria-label="Filter by platform"/)
assert.match(dashboard, /aria-label="Sort videos by metric"/)
assert.match(dashboard, /captureFirstFrame\(video\.previewUrl/)
assert.match(dashboard, /Account-scoped results are not available yet/)
assert.doesNotMatch(dashboard, /VideoPerformanceSheet|<Sheet/)

console.log('analytics performance dashboard regression checks passed')
