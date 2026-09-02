/**
 * Prometheus Autonomous UI - Motion Driver
 *
 * Smooth cubic-bezier trajectory interpolation, spring easing,
 * click simulation, and autonomous scroll handling.
 */

export interface Point {
  x: number
  y: number
}

/**
 * Cubic bezier easing function for natural human-like cursor glide
 */
export function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Interpolate a 2D trajectory between start and target points with natural curve arc
 */
export function computeTrajectoryPoint(
  start: Point,
  target: Point,
  progress: number
): Point {
  const eased = cubicEaseInOut(Math.min(1, Math.max(0, progress)))

  // Slight natural arc deviation (max 24px curve height)
  const distance = Math.hypot(target.x - start.x, target.y - start.y)
  const arcHeight = Math.min(24, distance * 0.08)
  const arcOffset = Math.sin(progress * Math.PI) * arcHeight

  // Perpendicular vector for the arc
  const dx = target.x - start.x
  const dy = target.y - start.y
  const angle = Math.atan2(dy, dx)
  const perpX = -Math.sin(angle) * arcOffset
  const perpY = Math.cos(angle) * arcOffset

  return {
    x: start.x + (target.x - start.x) * eased + perpX,
    y: start.y + (target.y - start.y) * eased + perpY,
  }
}

/**
 * Animate a smooth glide from start to target over durationMs, updating onStep
 */
export function animateGlide(
  start: Point,
  target: Point,
  durationMs: number,
  onStep: (p: Point, progress: number) => void,
  onComplete: () => void
): () => void {
  let animId: number | null = null
  const startTime = performance.now()
  let cancelled = false

  const frame = (now: number) => {
    if (cancelled) return

    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / durationMs)
    const current = computeTrajectoryPoint(start, target, progress)

    onStep(current, progress)

    if (progress < 1) {
      animId = requestAnimationFrame(frame)
    } else {
      onComplete()
    }
  }

  animId = requestAnimationFrame(frame)

  return () => {
    cancelled = true
    if (animId !== null) cancelAnimationFrame(animId)
  }
}

/**
 * Smoothly scroll an element or window into view if outside the visible viewport
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
    await new Promise((resolve) => setTimeout(resolve, 320))
  }
}
