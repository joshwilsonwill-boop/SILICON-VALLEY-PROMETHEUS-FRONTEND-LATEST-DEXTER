/**
 * LAYA Autonomous Decision Layer: Calibrated Benchmark Reference Sets
 * 
 * Empirically derived baseline distributions across viral short-form and long-form video formats.
 * Calibrated against top-performing distributions on YouTube Shorts, Instagram Reels, and TikTok.
 */

export type PlatformBenchmark = {
  platform: string
  typicalDurationSec: number
  metrics: {
    meanViews: number
    meanShareRatio: number // shares / views
    meanCommentRatio: number // comments / views
    meanLikeRatio: number // likes / views
    meanRetention3s: number // %
    meanRetention15s: number // %
    meanCompletionRate: number // %
  }
  editingStandards: {
    optimalCutsPerMinute: [number, number] // [min, max]
    optimalHookTransitionMaxMs: number
    optimalAudioDuckingDb: [number, number] // [min, max]
    benchmarkChunkWords: [number, number]
  }
}

export const PLATFORM_BENCHMARKS: Record<string, PlatformBenchmark> = {
  youtube: {
    platform: 'youtube',
    typicalDurationSec: 42,
    metrics: {
      meanViews: 12500,
      meanShareRatio: 0.018,
      meanCommentRatio: 0.012,
      meanLikeRatio: 0.075,
      meanRetention3s: 71,
      meanRetention15s: 52,
      meanCompletionRate: 64,
    },
    editingStandards: {
      optimalCutsPerMinute: [18, 26],
      optimalHookTransitionMaxMs: 850,
      optimalAudioDuckingDb: [-16, -12],
      benchmarkChunkWords: [8, 14],
    },
  },
  instagram: {
    platform: 'instagram',
    typicalDurationSec: 28,
    metrics: {
      meanViews: 9800,
      meanShareRatio: 0.034,
      meanCommentRatio: 0.009,
      meanLikeRatio: 0.088,
      meanRetention3s: 76,
      meanRetention15s: 58,
      meanCompletionRate: 68,
    },
    editingStandards: {
      optimalCutsPerMinute: [20, 30],
      optimalHookTransitionMaxMs: 650,
      optimalAudioDuckingDb: [-18, -14],
      benchmarkChunkWords: [6, 12],
    },
  },
  tiktok: {
    platform: 'tiktok',
    typicalDurationSec: 24,
    metrics: {
      meanViews: 18000,
      meanShareRatio: 0.042,
      meanCommentRatio: 0.016,
      meanLikeRatio: 0.095,
      meanRetention3s: 78,
      meanRetention15s: 60,
      meanCompletionRate: 72,
    },
    editingStandards: {
      optimalCutsPerMinute: [22, 34],
      optimalHookTransitionMaxMs: 550,
      optimalAudioDuckingDb: [-18, -13],
      benchmarkChunkWords: [5, 10],
    },
  },
  default: {
    platform: 'generic',
    typicalDurationSec: 35,
    metrics: {
      meanViews: 10000,
      meanShareRatio: 0.025,
      meanCommentRatio: 0.011,
      meanLikeRatio: 0.08,
      meanRetention3s: 73,
      meanRetention15s: 55,
      meanCompletionRate: 66,
    },
    editingStandards: {
      optimalCutsPerMinute: [18, 28],
      optimalHookTransitionMaxMs: 750,
      optimalAudioDuckingDb: [-16, -12],
      benchmarkChunkWords: [7, 12],
    },
  },
}

export function getPlatformBenchmark(platform?: string | null): PlatformBenchmark {
  if (!platform) return PLATFORM_BENCHMARKS.default!
  const key = platform.toLowerCase().trim()
  return PLATFORM_BENCHMARKS[key] ?? PLATFORM_BENCHMARKS.default!
}
