/**
 * Prometheus Autonomous UI - Kinematic Motion Driver
 *
 * Implements biological arm/hand motor control physics:
 * - Flash & Hogan (1985) Minimum Jerk Trajectory optimization (10t^3 - 15t^4 + 6t^5)
 * - Fitts's Law target acquisition timing (ID = log2(2D / W))
 * - Orthogonal curvature (perpendicular arc modeling human forearm rotation)
 * - Two-component ballistic velocity profile with micro-overshoot & damped settle
 * - Velocity-derived banking tilt angle (-8° to +8°)
 * - Sub-millisecond synchronous requestAnimationFrame dispatch (zero Promise lag)
 * - Dynamic post-scroll viewport re-centering
 */

export interface Point {
  x: number
  y: number
}

export interface TrajectoryPoint extends Point {
  velocityX: number
  velocityY: number
  tiltAngleDeg: number
}

/**
 * Fitts's Law dynamic duration model
 * Computes optimal movement duration based on distance and target bounding width.
 * Short jumps take ~180-240ms; screen-wide sweeps take ~450-540ms.
 */
export function computeFittsDuration(
  start: Point,
  target: Point,
  targetWidth = 40,
  baseMs = 175,
  maxMs = 540
): number {
  const distance = Math.hypot(target.x - start.x, target.y - start.y)
  if (distance < 1) return 0
  const effectiveWidth = Math.max(16, Math.min(300, targetWidth))
  // Index of Difficulty: ID = log2(2D / W)
  const id = Math.log2(Math.max(1, (2 * distance) / effectiveWidth))
  const calculated = baseMs + 70 * id
  return Math.min(maxMs, Math.max(160, Math.round(calculated)))
}

/**
 * Flash & Hogan (1985) Minimum Jerk Trajectory
 * Minimizes the third derivative of position (jerk), ensuring zero acceleration
 * and jerk at both boundaries (t=0 and t=1) — the exact mathematical signature
 * of human biological arm/hand movements.
 */
export function minimumJerk(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * clamped * (10 + clamped * (-15 + 6 * clamped))
}

/**
 * Minimum Jerk with human-like ballistic micro-overshoot & damped settling
 * For high-velocity sweeps (>220px), humans naturally overshoot slightly (~1.5%)
 * before settling into the target center within the final 12% of the trajectory.
 */
export function minimumJerkWithOvershoot(t: number, distance = 0): number {
  const clamped = Math.min(1, Math.max(0, t))
  const base = minimumJerk(clamped)
  if (distance < 200) return base

  // Sub-movement ballistic impulse
  const overshootPeak = Math.min(0.018, distance * 0.000025)
  // Damped sinusoidal correction peaking at t=0.90, decaying to 0 at t=1.0
  if (clamped >= 0.82 && clamped < 1.0) {
    const phase = (clamped - 0.82) / 0.18
    const damping = Math.sin(phase * Math.PI) * (1 - phase)
    return base + overshootPeak * damping
  }

  return base
}

/**
 * Legacy cubic easing preserved for backward compatibility
 */
export function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Interpolate a 2D trajectory between start and target points with natural curve arc,
 * velocity derivation, and banking tilt angle.
 */
export function computeTrajectoryPoint(
  start: Point,
  target: Point,
  progress: number,
  arcSign: 1 | -1 = 1
): TrajectoryPoint {
  const dx = target.x - start.x
  const dy = target.y - start.y
  const distance = Math.hypot(dx, dy)

  const eased = minimumJerkWithOvershoot(progress, distance)

  // Natural arc deviation (radius scales gently with distance: 10-24px max)
  const arcHeight = Math.min(24, Math.max(6, distance * 0.06)) * arcSign
  // Bell curve displacement peaking midway (sin(progress * PI))
  const arcOffset = Math.sin(progress * Math.PI) * arcHeight

  // Perpendicular unit vector
  const angle = Math.atan2(dy, dx)
  const perpX = -Math.sin(angle) * arcOffset
  const perpY = Math.cos(angle) * arcOffset

  const currentX = start.x + dx * eased + perpX
  const currentY = start.y + dy * eased + perpY

  // First derivative of minimum jerk: 30 * t^2 * (1 - t)^2
  const jerkDerivative = 30 * progress * progress * Math.pow(1 - progress, 2)
  const vx = distance > 0 ? (dx * jerkDerivative) / distance : 0
  const vy = distance > 0 ? (dy * jerkDerivative) / distance : 0

  // Banking tilt angle: tilts into lateral acceleration (-8deg to +8deg)
  const tiltAngleDeg = Math.min(8, Math.max(-8, vx * 12))

  return {
    x: currentX,
    y: currentY,
    velocityX: vx,
    velocityY: vy,
    tiltAngleDeg,
  }
}

/**
 * Animate a smooth, hardware-accelerated glide from start to target over durationMs.
 * Uses requestAnimationFrame with high-resolution performance.now() timestamps
 * for zero-latency, sub-millisecond synchronous dispatch without dynamic import overhead.
 */
export function animateGlide(
  start: Point,
  target: Point,
  durationMs: number,
  onStep: (p: TrajectoryPoint, progress: number) => void,
  onComplete: () => void
): () => void {
  let animId: number | null = null
  let cancelled = false
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const effectiveDuration = Math.max(40, durationMs)

  // Determine natural curvature sign based on direction
  const arcSign: 1 | -1 = target.x >= start.x ? 1 : -1

  const frame = (now: number) => {
    if (cancelled) return
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / effectiveDuration)

    const point = computeTrajectoryPoint(start, target, progress, arcSign)
    onStep(point, progress)

    if (progress < 1) {
      animId = requestAnimationFrame(frame)
    } else {
      // Settle at exact target coordinates on completion
      onStep(
        {
          x: target.x,
          y: target.y,
          velocityX: 0,
          velocityY: 0,
          tiltAngleDeg: 0,
        },
        1
      )
      onComplete()
    }
  }

  animId = requestAnimationFrame(frame)

  return () => {
    cancelled = true
    if (animId !== null) {
      cancelAnimationFrame(animId)
    }
  }
}

/**
 * Smoothly scroll an element into view if outside the visible viewport
 */
export async function ensureElementInView(element: HTMLElement, margin = 40): Promise<void> {
  const rect = element.getBoundingClientRect()
  const isVisible =
    rect.top >= margin &&
    rect.bottom <= window.innerHeight - margin &&
    rect.left >= margin &&
    rect.right <= window.innerWidth - margin

  if (!isVisible) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    // Allow brief time for smooth scroll momentum to settle
    await new Promise((resolve) => setTimeout(resolve, 280))
  }
}

/**
 * Re-sample fresh bounding client rect and center coordinates after scroll / layout shift
 */
export function getFreshTargetPoint(element: HTMLElement): { x: number; y: number; rect: DOMRect } {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    rect,
  }
}
