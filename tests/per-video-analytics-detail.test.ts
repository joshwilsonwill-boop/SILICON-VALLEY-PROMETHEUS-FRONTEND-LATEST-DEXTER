import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolveVideoAnalyticsDetailScope } from '../lib/analytics/video-detail-scope.mjs'

const youtube = {
  platform: 'youtube', platformName: 'YouTube', color: '#f00', connected: true,
  views: 100, likes: 10, comments: 2, shares: 1, watchTimeSeconds: 600,
  retentionRate: 50, engagementRate: 13, publishedUrl: 'https://youtube.example/watch/1', capturedAt: '2026-10-01T00:00:00Z',
}
const instagram = {
  platform: 'instagram', platformName: 'Instagram', color: '#f0a', connected: true,
  views: 900, likes: 90, comments: 20, shares: 10, watchTimeSeconds: 3600,
  retentionRate: 80, engagementRate: 15, publishedUrl: 'https://instagram.example/reel/1', capturedAt: '2026-10-01T00:00:00Z',
}
const video = {
  totals: { views: 1000, retentionRate: 65, engagementRate: 14 },
  platformBreakdown: [youtube, instagram],
}

test('a platform-scoped video detail uses only that platform and its linked account', () => {
  const detail = resolveVideoAnalyticsDetailScope(video, [
    { id: 'youtube', name: 'YouTube', accountName: '@northstar', connected: true },
    { id: 'instagram', name: 'Instagram', accountName: '@northstar', connected: true },
  ], 'youtube')

  assert.deepEqual(detail.platforms.map((row) => row.platform), ['youtube'])
  assert.equal(detail.totals?.views, 100)
  assert.equal(detail.account?.accountName, '@northstar')
})

test('all-platform scope retains separate connected rows without cross-platform totals', () => {
  const detail = resolveVideoAnalyticsDetailScope(video, [], null)
  assert.deepEqual(detail.platforms.map((row) => row.platform), ['youtube', 'instagram'])
  assert.equal(detail.totals, null)
})

test('a disconnected selected account is unavailable instead of borrowing another platform report', () => {
  const detail = resolveVideoAnalyticsDetailScope(video, [
    { id: 'youtube', name: 'YouTube', accountName: '@northstar', connected: false, status: 'expired' },
    { id: 'instagram', name: 'Instagram', accountName: '@northstar', connected: true, status: 'active' },
  ], 'youtube')

  assert.equal(detail.state, 'unavailable')
  assert.deepEqual(detail.platforms, [])
  assert.equal(detail.totals, null)
})

test('a connected platform without a video report is reported as no data', () => {
  const detail = resolveVideoAnalyticsDetailScope({ ...video, platformBreakdown: [] }, [
    { id: 'youtube', name: 'YouTube', connected: true, status: 'active' },
  ], 'youtube')

  assert.equal(detail.state, 'no-data')
  assert.deepEqual(detail.platforms, [])
  assert.equal(detail.totals, null)
})

test('a report older than thirty days is marked stale', () => {
  const detail = resolveVideoAnalyticsDetailScope({
    ...video,
    platformBreakdown: [{ ...youtube, capturedAt: '2000-01-01T00:00:00Z' }],
  }, [{ id: 'youtube', name: 'YouTube', connected: true }], 'youtube')

  assert.equal(detail.state, 'stale')
})

console.log('per-video analytics detail verification passed')
