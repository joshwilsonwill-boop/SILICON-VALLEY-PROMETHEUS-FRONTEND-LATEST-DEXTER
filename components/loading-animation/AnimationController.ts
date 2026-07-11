import type { AnimationPhase, AnimationState } from './types'

export const CYCLE_DURATION = 3500

export const PHASE_TIMINGS = {
  rotating: { start: 0, end: 830, duration: 830 },
  tilting: { start: 830, end: 1170, duration: 340 },
  contracting: { start: 1170, end: 2170, duration: 1000 },
  black: { start: 2170, end: 2330, duration: 160 },
  rebuilding: { start: 2330, end: 3170, duration: 840 },
  settling: { start: 3170, end: 3500, duration: 330 },
} as const satisfies Record<AnimationPhase, { start: number; end: number; duration: number }>

const TAU = Math.PI * 2
const QUARTER_TURN = Math.PI / 2
const BASE_ROTATION_RADIANS_PER_MS = QUARTER_TURN / 1000
const FULL_RING_RADIUS = 0.18
const MIN_RING_RADIUS = 0.02
const DOT_RADIUS = 0.025
const BLOB_WIDTH = 0.06
const BLOB_HEIGHT = 0.08
const SETTLE_ROTATION_START = TAU - BASE_ROTATION_RADIANS_PER_MS * PHASE_TIMINGS.settling.duration

type Easing = (value: number) => number

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const sample = (t: number, a1: number, a2: number) => {
    const inverse = 1 - t
    return 3 * inverse * inverse * t * a1 + 3 * inverse * t * t * a2 + t * t * t
  }

  return (value: number) => {
    const x = clamp01(value)
    if (x === 0 || x === 1) return x

    let lower = 0
    let upper = 1
    let t = x

    for (let iteration = 0; iteration < 16; iteration += 1) {
      const estimate = sample(t, x1, x2)
      if (Math.abs(estimate - x) < 1e-7) break
      if (estimate < x) lower = t
      else upper = t
      t = (lower + upper) / 2
    }

    return sample(t, y1, y2)
  }
}

export const EASINGS = {
  easeInOut: cubicBezier(0.42, 0, 0.58, 1),
  blobFormation: cubicBezier(0.4, 0, 0.2, 1),
  contraction: cubicBezier(0.7, 0, 0.84, 0),
  fadeIn: cubicBezier(0.42, 0, 1, 1),
  rebuild: cubicBezier(0.16, 1, 0.3, 1),
  blobToDot: cubicBezier(0.34, 1.56, 0.64, 1),
} as const

function getPulseRadius(elapsed: number) {
  const periodProgress = (elapsed % 500) / 500
  let pulse: number

  if (periodProgress < 0.25) {
    pulse = EASINGS.easeInOut(periodProgress * 4)
  } else if (periodProgress < 0.75) {
    pulse = 1 - EASINGS.easeInOut((periodProgress - 0.25) * 2) * 2
  } else {
    pulse = -1 + EASINGS.easeInOut((periodProgress - 0.75) * 4)
  }

  return DOT_RADIUS * (1 + pulse * 0.15)
}

function getPhase(elapsed: number): AnimationPhase {
  if (elapsed < PHASE_TIMINGS.rotating.end) return 'rotating'
  if (elapsed < PHASE_TIMINGS.tilting.end) return 'tilting'
  if (elapsed < PHASE_TIMINGS.contracting.end) return 'contracting'
  if (elapsed < PHASE_TIMINGS.black.end) return 'black'
  if (elapsed < PHASE_TIMINGS.rebuilding.end) return 'rebuilding'
  return 'settling'
}

function createBaseState(
  phase: AnimationPhase,
  phaseProgress: number,
  cycleProgress: number,
): AnimationState {
  return {
    phase,
    phaseProgress,
    cycleProgress,
    rotation: 0,
    tilt: 0,
    ringRadius: FULL_RING_RADIUS,
    blobWidth: 0,
    blobHeight: 0,
    blobRoundness: 1,
    centerDotRadius: DOT_RADIUS,
    opacity: 1,
    glowIntensity: 1,
    brightnessOffset: 0,
  }
}

function interpolateState(elapsed: number): AnimationState {
  const phase = getPhase(elapsed)
  const timing = PHASE_TIMINGS[phase]
  const phaseProgress = clamp01((elapsed - timing.start) / timing.duration)
  const state = createBaseState(phase, phaseProgress, elapsed / CYCLE_DURATION)

  if (phase === 'rotating') {
    state.rotation = elapsed * BASE_ROTATION_RADIANS_PER_MS
    state.centerDotRadius = getPulseRadius(elapsed)
    return state
  }

  if (phase === 'tilting') {
    const tiltProgress = EASINGS.easeInOut(phaseProgress)
    const blobProgress = EASINGS.blobFormation(phaseProgress)
    state.rotation = elapsed * BASE_ROTATION_RADIANS_PER_MS
    state.tilt = tiltProgress * (Math.PI / 4)
    state.blobWidth = BLOB_WIDTH * blobProgress
    state.blobHeight = BLOB_HEIGHT * blobProgress
    state.blobRoundness = 1 - blobProgress
    state.centerDotRadius = DOT_RADIUS * (1 - blobProgress)
    state.glowIntensity = lerp(1, 1.5, blobProgress)
    state.brightnessOffset = (Math.PI / 2) * blobProgress
    return state
  }

  if (phase === 'contracting') {
    const contractionProgress = EASINGS.contraction(phaseProgress)
    const fadeProgress = clamp01((phaseProgress - 0.5) * 2)
    state.rotation = elapsed * BASE_ROTATION_RADIANS_PER_MS
    state.tilt = Math.PI / 4 + contractionProgress * (Math.PI / 4)
    state.ringRadius = lerp(FULL_RING_RADIUS, MIN_RING_RADIUS, contractionProgress)
    state.blobWidth = BLOB_WIDTH * (1 - contractionProgress)
    state.blobHeight = BLOB_HEIGHT * (1 - contractionProgress)
    state.blobRoundness = contractionProgress
    state.centerDotRadius = 0
    state.opacity = 1 - EASINGS.fadeIn(fadeProgress)
    state.glowIntensity = 1.5 * (1 - contractionProgress)
    state.brightnessOffset = Math.PI / 2
    return state
  }

  if (phase === 'black') {
    state.rotation = PHASE_TIMINGS.contracting.end * BASE_ROTATION_RADIANS_PER_MS
    state.tilt = Math.PI / 2
    state.ringRadius = MIN_RING_RADIUS
    state.centerDotRadius = 0
    state.opacity = 0
    state.glowIntensity = 0
    state.brightnessOffset = Math.PI / 2
    return state
  }

  if (phase === 'rebuilding') {
    const rebuildProgress = EASINGS.rebuild(phaseProgress)
    const blobEnvelope = Math.sin(phaseProgress * Math.PI)
    const dotStart = 1 - 330 / PHASE_TIMINGS.rebuilding.duration
    const dotProgress = clamp01((phaseProgress - dotStart) / (1 - dotStart))
    state.rotation = lerp(Math.PI / 2, SETTLE_ROTATION_START, rebuildProgress)
    state.tilt = (Math.PI / 2) * (1 - rebuildProgress)
    state.ringRadius = lerp(MIN_RING_RADIUS, FULL_RING_RADIUS, rebuildProgress)
    state.blobWidth = BLOB_WIDTH * blobEnvelope
    state.blobHeight = BLOB_HEIGHT * blobEnvelope
    state.blobRoundness = dotProgress
    state.centerDotRadius = DOT_RADIUS * EASINGS.blobToDot(dotProgress)
    state.opacity = rebuildProgress
    state.glowIntensity = rebuildProgress * lerp(1.5, 1, phaseProgress)
    state.brightnessOffset = (Math.PI / 2) * (1 - rebuildProgress)
    return state
  }

  state.rotation = lerp(SETTLE_ROTATION_START, TAU, phaseProgress)
  state.centerDotRadius = DOT_RADIUS * (1 + Math.sin(phaseProgress * Math.PI) * 0.12)
  return state
}

export class AnimationController {
  private readonly startTime: number
  private pausedAt: number | null = null
  private pausedDuration = 0

  constructor(startTime = 0) {
    this.startTime = startTime
  }

  update(timestamp: number): AnimationState {
    const effectiveTimestamp = this.pausedAt ?? timestamp
    const rawElapsed = effectiveTimestamp - this.startTime - this.pausedDuration
    const elapsed = ((rawElapsed % CYCLE_DURATION) + CYCLE_DURATION) % CYCLE_DURATION
    return interpolateState(elapsed)
  }

  pause(timestamp: number) {
    if (this.pausedAt === null) this.pausedAt = timestamp
  }

  resume(timestamp: number) {
    if (this.pausedAt === null) return
    this.pausedDuration += Math.max(0, timestamp - this.pausedAt)
    this.pausedAt = null
  }
}
