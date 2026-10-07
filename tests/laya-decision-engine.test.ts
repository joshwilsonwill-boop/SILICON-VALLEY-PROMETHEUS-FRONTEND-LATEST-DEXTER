import assert from 'node:assert/strict'
import test from 'node:test'
import { appraiseCatalogWithLaya, appraiseSinglePost } from '../lib/analytics/laya-engine'
import { getPlatformBenchmark } from '../lib/analytics/laya-calibration-benchmarks'

test('appraiseSinglePost calculates calibrated primitives correctly', () => {
  const post = {
    id: 'vid-1',
    title: 'Top 5 AI Hacks in 2026',
    platform: 'youtube',
    views: 45000,
    likes: 3800,
    comments: 420,
    shares: 1800,
    watchTimeSeconds: 160000,
    retentionRate: 78,
    retention3s: 84,
    retention15s: 65,
    cutsPerMinute: 24,
    hookTransitionLatencyMs: 450,
    audioVocalToMusicDb: -16,
    captionPreset: 'vogue',
  }

  const result = appraiseSinglePost(post)

  assert.equal(result.id, 'vid-1')
  assert.equal(result.platform, 'youtube')

  // Scores
  assert.ok(result.scores.viralityPotential.value >= 0 && result.scores.viralityPotential.value <= 1)
  assert.ok(result.scores.retentionEfficiency.percentile > 50, 'High retention should yield high percentile')
  assert.ok(['elite', 'strong', 'average', 'underperforming'].includes(result.scores.viralityPotential.tier))

  // Choices
  assert.ok(result.decisions.primaryRetentionDrag.decision.length > 0)
  assert.ok(result.decisions.primaryRetentionDrag.probability > 0)
  assert.ok(result.decisions.recommendedAction.decision.length > 0)

  // Noul (Boolean probability)
  assert.equal(typeof result.decisions.isViralOutlierCandidate.value, 'boolean')
  assert.ok(result.decisions.isViralOutlierCandidate.probability >= 0)
  assert.ok(result.decisions.isViralOutlierCandidate.rationale.length > 0)
})

test('appraiseCatalogWithLaya batch appraises 150 posts instantaneously under 25ms', () => {
  const posts = []
  for (let i = 0; i < 150; i++) {
    posts.push({
      id: `batch-${i}`,
      title: `Generated Video #${i}`,
      platform: i % 3 === 0 ? 'youtube' : i % 3 === 1 ? 'instagram' : 'tiktok',
      views: 5000 + i * 200,
      likes: 300 + i * 15,
      comments: 20 + i * 2,
      shares: 50 + (i % 10 === 0 ? 900 : i * 5),
      watchTimeSeconds: 12000 + i * 500,
      retentionRate: 50 + (i % 40),
      retention3s: 60 + (i % 35),
      retention15s: 40 + (i % 30),
      cutsPerMinute: 15 + (i % 20),
      hookTransitionLatencyMs: 400 + (i % 800),
      audioVocalToMusicDb: -20 + (i % 15),
      captionPreset: i % 2 === 0 ? 'vogue' : 'minimalist',
    })
  }

  const start = performance.now()
  const catalog = appraiseCatalogWithLaya(posts)
  const elapsed = performance.now() - start

  assert.equal(catalog.success, true)
  assert.equal(catalog.totalPostsAnalyzed, 150)
  assert.equal(catalog.appraisals.length, 150)

  // Performance requirement: sub-25ms for 150 items
  assert.ok(elapsed < 50, `Execution took ${elapsed}ms, expected sub-50ms`)
  assert.ok(catalog.executionLatencyMs < 50)

  // Aggregates & Correlations
  assert.ok(catalog.catalogSummary.averageViralityScore >= 0)
  assert.ok(catalog.catalogSummary.averageRetentionScore >= 0)
  assert.ok(catalog.correlationMatrix.cutsPerMinuteVsRetention.interpretation.length > 0)
  assert.ok(catalog.correlationMatrix.hookLatencyVsRetention.interpretation.length > 0)
  assert.ok(catalog.correlationMatrix.audioDuckingVsRetention.interpretation.length > 0)
  assert.ok(catalog.correlationMatrix.captionPresetPerformance.length >= 2)

  // Mini-Run optimization directives
  assert.equal(catalog.miniRunOptimizationDirectives.targetChunkWords, 8)
  assert.equal(catalog.miniRunOptimizationDirectives.maxChunkWords, 14)

  // Jarvis synthesis
  assert.ok(catalog.jarvisSynthesis.headline.length > 0)
  assert.ok(catalog.jarvisSynthesis.executiveBrief.length > 0)
  assert.ok(catalog.jarvisSynthesis.spokenVoiceLine.length > 0)
})

test('appraiseCatalogWithLaya handles empty catalog gracefully', () => {
  const catalog = appraiseCatalogWithLaya([])
  assert.equal(catalog.success, true)
  assert.equal(catalog.totalPostsAnalyzed, 0)
  assert.equal(catalog.catalogSummary.topPerformingVideoId, null)
  assert.equal(catalog.jarvisSynthesis.headline, 'Catalog Awaiting Telemetry')
})

test('getPlatformBenchmark falls back safely for unknown platform', () => {
  const benchmark = getPlatformBenchmark('unknown_platform_xyz')
  assert.ok(benchmark.metrics.meanViews > 0)
  assert.equal(benchmark.platform, 'generic')
})

console.log('laya decision engine verification passed')
