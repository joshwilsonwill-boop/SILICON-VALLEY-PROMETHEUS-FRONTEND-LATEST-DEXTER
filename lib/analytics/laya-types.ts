/**
 * LAYA Autonomous Decision Layer: Type Definitions
 * 
 * Formal schemas for LAYA's non-autoregressive "System 1" decision primitives
 * (score, choice, noul), post state vectors, editing-to-retention correlation
 * matrices, and Jarvis executive synthesis.
 */

/** Continuous calibrated score [0.0 - 1.0] with confidence interval and percentile rank. */
export type LayaScore = {
  value: number
  confidence: number
  percentile: number
  tier: 'elite' | 'strong' | 'average' | 'underperforming'
}

/** Discrete classification choice from a fixed decision taxonomy with calibrated probabilities. */
export type LayaChoice<T extends string = string> = {
  decision: T
  probability: number
  alternatives: Array<{ decision: T; probability: number }>
}

/** Calibrated boolean judgment (yes/no probability with mathematical rationale). */
export type LayaNoul = {
  value: boolean
  probability: number
  rationale: string
}

/** Taxonomy of primary factors that cause audience drop-off. */
export type RetentionDragChoice =
  | 'slow_hook_onset'
  | 'pacing_drag_mid'
  | 'soundtrack_masking_vocals'
  | 'visual_monotony'
  | 'early_call_to_action_bounce'
  | 'optimal_retention_flow'

/** Taxonomy of autonomous editing recommendations for future cuts and Mini-Runs. */
export type NextEditChoice =
  | 'tighten_first_3s_cuts'
  | 'increase_cut_frequency'
  | 'duck_soundtrack_under_vocals'
  | 'accelerate_transition_speed'
  | 'switch_to_vogue_typography'
  | 'maintain_current_editorial_tempo'

/** Normalized social post state vector input into LAYA. */
export type LayaPostInput = {
  id: string
  title: string
  platform: 'youtube' | 'instagram' | 'tiktok' | 'x' | 'facebook' | 'linkedin' | string
  publishedUrl?: string | null
  capturedAt?: string | null
  thumbnailUrl?: string | null

  // Telemetry signals (outcomes)
  views: number
  likes: number
  comments: number
  shares: number
  watchTimeSeconds: number
  retentionRate?: number // Average completion rate (0-100)
  retention3s?: number // 3-second hook survival (0-100)
  retention15s?: number // 15-second survival (0-100)
  engagementRate?: number // (likes + comments + shares) / views * 100

  // Prometheus timeline / editing decisions (causes)
  cutsPerMinute?: number
  silenceCutRatio?: number
  hookTransitionLatencyMs?: number // Milliseconds to first visual cut/motion
  audioVocalToMusicDb?: number // Audio ducking depth (dB)
  captionPreset?: 'vogue' | 'brutalist' | 'minimalist' | 'classic' | string
  aspectRatio?: '9:16' | '16:9' | '1:1' | string
  durationSeconds?: number
}

/** Single post evaluation output produced by LAYA. */
export type LayaPostAppraisal = {
  id: string
  title: string
  platform: string
  publishedUrl: string | null
  thumbnailUrl: string | null

  scores: {
    viralityPotential: LayaScore
    retentionEfficiency: LayaScore
    hookVelocity: LayaScore
    editorialPacing: LayaScore
  }

  decisions: {
    primaryRetentionDrag: LayaChoice<RetentionDragChoice>
    recommendedAction: LayaChoice<NextEditChoice>
    isViralOutlierCandidate: LayaNoul
    requiresHookReCut: LayaNoul
  }

  editingAttribution: {
    cutPacingImpact: number // Estimated % contribution to retention
    hookTimingImpact: number
    audioClarityImpact: number
  }
}

/** Editing correlation relationship. */
export type EditingCorrelation = {
  correlation: number // Pearson-derived coefficient [-1.0, 1.0]
  strength: 'strong_positive' | 'moderate_positive' | 'neutral' | 'moderate_negative' | 'strong_negative'
  interpretation: string
  optimalValueDescription: string
}

/** Complete catalog appraisal returned by the LAYA decision layer. */
export type LayaCatalogAppraisal = {
  success: true
  analyzedAt: string
  executionLatencyMs: number
  totalPostsAnalyzed: number
  platformBreakdown: Record<string, number>

  catalogSummary: {
    averageViralityScore: number
    averageRetentionScore: number
    viralOutliersCount: number
    topPerformingVideoId: string | null
    criticalWeakestVideoId: string | null
  }

  correlationMatrix: {
    cutsPerMinuteVsRetention: EditingCorrelation
    hookLatencyVsRetention: EditingCorrelation
    audioDuckingVsRetention: EditingCorrelation
    captionPresetPerformance: Array<{
      preset: string
      postCount: number
      avgRetention: number
      avgVirality: number
    }>
  }

  miniRunOptimizationDirectives: {
    targetChunkWords: number
    maxChunkWords: number
    recommendedCutsPerMinute: number
    hookCutBeforeMs: number
    recommendedAudioDuckingDb: number
    recommendedCaptionPreset: string
  }

  jarvisSynthesis: {
    headline: string
    executiveBrief: string
    keyStrengths: string[]
    criticalLeaks: string[]
    spokenVoiceLine: string
  }

  appraisals: LayaPostAppraisal[]
}
