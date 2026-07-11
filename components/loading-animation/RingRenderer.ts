import { createGlowTexture, type GlowTexture } from './shaders/GlowBlur'
import type { AnimationState, BlobParams, RingRendererOptions } from './types'

export const RING_SEGMENTS = 72
export const REFLECTION_OPACITY = 0.15
export const MAX_CANVAS_BUFFER_BYTES = 18 * 1024 * 1024

export const PALETTE = {
  background: '#000000',
  centerDot: '#F9FEFD',
  ringCore: '#F2F3FF',
  ringBody: '#1E1D2E',
  ringShadow: '#100E22',
  glowBright: '#F3FBFF',
  glowDim: '#7A7CBE',
  blobPeak: '#FFFFFF',
  blobBody: '#A7A8EE',
} as const

interface LayoutMetrics {
  baseSize: number
  cx: number
  cy: number
  outerRadius: number
  innerRadius: number
  centerDotRadius: number
  blobMaxWidth: number
  blobMaxHeight: number
  reflectionOffset: number
  reflectionHeight: number
}

interface RGB {
  r: number
  g: number
  b: number
}

const FULL_RING_RADIUS = 0.18
const TAU = Math.PI * 2

export function capDevicePixelRatio(dpr: number | undefined) {
  if (!dpr || dpr <= 0) return 1
  return Math.min(dpr, 2)
}

export function getLayoutMetrics(width: number, height: number, inline: boolean): LayoutMetrics {
  const baseSize = Math.max(1, Math.min(width, height))
  const outerRadius = baseSize * (inline ? 0.35 : 0.18)
  const reflectionOffset = baseSize * (inline ? 0.4 : 0.22)
  const reflectionHeight = baseSize * (inline ? 0.25 : 0.15)
  const centeredY = height / 2
  const containedY = height - reflectionOffset - reflectionHeight

  return {
    baseSize,
    cx: width / 2,
    cy: inline ? Math.min(centeredY, Math.max(outerRadius, containedY)) : centeredY,
    outerRadius,
    innerRadius: baseSize * (inline ? 0.28 : 0.14),
    centerDotRadius: baseSize * (inline ? 0.05 : 0.025),
    blobMaxWidth: baseSize * (inline ? 0.12 : 0.06),
    blobMaxHeight: baseSize * (inline ? 0.16 : 0.08),
    reflectionOffset,
    reflectionHeight,
  }
}

function backingArea(width: number, height: number, dpr: number) {
  return Math.max(1, Math.ceil(width * dpr)) * Math.max(1, Math.ceil(height * dpr))
}

export function estimateCanvasBufferBytes(
  width: number,
  height: number,
  inline: boolean,
  dpr: number,
) {
  const metrics = getLayoutMetrics(width, height, inline)
  const ringSize = metrics.outerRadius * 2
  const glowPadding = metrics.outerRadius * 0.35
  const intenseGlowPadding = glowPadding * 1.5
  const dotSize = metrics.centerDotRadius * 3.6
  const blobWidth = metrics.blobMaxWidth * 2
  const blobHeight = metrics.blobMaxHeight * 1.8

  const pixels =
    backingArea(width, height, dpr) * 2
    + backingArea(width, metrics.reflectionHeight, dpr)
    + backingArea(ringSize, ringSize, dpr)
    + backingArea(ringSize + glowPadding * 2, ringSize + glowPadding * 2, dpr)
    + backingArea(ringSize + intenseGlowPadding * 2, ringSize + intenseGlowPadding * 2, dpr)
    + backingArea(dotSize, dotSize, dpr)
    + backingArea(blobWidth, blobHeight, dpr)

  return pixels * 4
}

export function getCanvasPixelRatio(
  width: number,
  height: number,
  inline: boolean,
  devicePixelRatio: number | undefined,
) {
  const cappedDpr = capDevicePixelRatio(devicePixelRatio)
  if (inline) return cappedDpr

  const bytesAtOne = estimateCanvasBufferBytes(width, height, false, 1)
  const memoryAwareDpr = Math.sqrt(MAX_CANVAS_BUFFER_BYTES / bytesAtOne) * 0.98
  return Math.min(cappedDpr, memoryAwareDpr)
}

function parseHex(color: string): RGB {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  }
}

function interpolateColor(from: string, to: string, progress: number) {
  const start = parseHex(from)
  const end = parseHex(to)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * progress)
  return `rgb(${mix(start.r, end.r)}, ${mix(start.g, end.g)}, ${mix(start.b, end.b)})`
}

function segmentBrightness(angle: number) {
  const distanceFromBrightCenter = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)))
  if (distanceFromBrightCenter <= Math.PI / 4) return 1
  const progress = (distanceFromBrightCenter - Math.PI / 4) / (Math.PI - Math.PI / 4)
  return 1 - progress * 0.85
}

function createCanvas(width: number, height: number, dpr: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  return canvas
}

function getLogicalContext(canvas: HTMLCanvasElement, dpr: number) {
  const context = canvas.getContext('2d')
  if (!context) return null
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return context
}

function buildRingTexture(metrics: LayoutMetrics, dpr: number) {
  const size = metrics.outerRadius * 2
  const canvas = createCanvas(size, size, dpr)
  const context = getLogicalContext(canvas, dpr)
  if (!context) return canvas

  const center = metrics.outerRadius
  const innerRatio = metrics.innerRadius / metrics.outerRadius

  for (let index = 0; index < RING_SEGMENTS; index += 1) {
    const angle = (index / RING_SEGMENTS) * TAU
    const nextAngle = ((index + 1.08) / RING_SEGMENTS) * TAU
    const brightness = segmentBrightness(angle)
    const coreColor = interpolateColor(PALETTE.ringBody, PALETTE.ringCore, brightness)
    const edgeColor = interpolateColor(PALETTE.ringShadow, PALETTE.ringBody, brightness * 0.7)
    const gradient = context.createRadialGradient(center, center, 0, center, center, metrics.outerRadius)
    const middleRatio = innerRatio + (1 - innerRatio) * 0.48

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(Math.max(0, innerRatio - 0.002), 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(innerRatio, edgeColor)
    gradient.addColorStop(middleRatio, coreColor)
    gradient.addColorStop(1, edgeColor)

    context.beginPath()
    context.moveTo(
      center + metrics.outerRadius * Math.cos(angle),
      center + metrics.outerRadius * Math.sin(angle),
    )
    context.arc(center, center, metrics.outerRadius, angle, nextAngle)
    context.lineTo(
      center + metrics.innerRadius * Math.cos(nextAngle),
      center + metrics.innerRadius * Math.sin(nextAngle),
    )
    context.arc(center, center, metrics.innerRadius, nextAngle, angle, true)
    context.closePath()
    context.fillStyle = gradient
    context.fill()
  }

  return canvas
}

function buildDotTexture(maxRadius: number, dpr: number) {
  const radius = maxRadius * 1.8
  const size = radius * 2
  const canvas = createCanvas(size, size, dpr)
  const context = getLogicalContext(canvas, dpr)
  if (!context) return canvas

  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius)
  gradient.addColorStop(0, PALETTE.centerDot)
  gradient.addColorStop(0.35, 'rgba(249, 254, 253, 0.98)')
  gradient.addColorStop(0.58, 'rgba(243, 251, 255, 0.55)')
  gradient.addColorStop(1, 'rgba(122, 124, 190, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return canvas
}

function buildBlobTexture(width: number, height: number, dpr: number) {
  const canvas = createCanvas(width * 2, height * 1.8, dpr)
  const context = getLogicalContext(canvas, dpr)
  if (!context) return canvas

  const logicalWidth = canvas.width / dpr
  const logicalHeight = canvas.height / dpr
  const gradient = context.createRadialGradient(
    logicalWidth / 2,
    logicalHeight * 0.3,
    0,
    logicalWidth / 2,
    logicalHeight * 0.35,
    logicalWidth / 2,
  )
  gradient.addColorStop(0, PALETTE.blobPeak)
  gradient.addColorStop(0.5, 'rgba(167, 168, 238, 0.8)')
  gradient.addColorStop(1, 'rgba(122, 124, 190, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, logicalWidth, logicalHeight)
  return canvas
}

export class RingRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly inline: boolean
  private width: number
  private height: number
  private dpr: number
  private metrics: LayoutMetrics
  private sceneCanvas!: HTMLCanvasElement
  private sceneContext!: CanvasRenderingContext2D
  private reflectionCanvas!: HTMLCanvasElement
  private reflectionContext!: CanvasRenderingContext2D
  private reflectionMask!: CanvasGradient
  private ringTexture!: HTMLCanvasElement
  private glowTexture!: GlowTexture
  private intenseGlowTexture!: GlowTexture
  private dotTexture!: HTMLCanvasElement
  private blobTexture!: HTMLCanvasElement

  constructor(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: RingRendererOptions = {},
  ) {
    this.context = context
    this.inline = options.inline ?? false
    this.width = width
    this.height = height
    this.dpr = capDevicePixelRatio(options.dpr)
    this.metrics = getLayoutMetrics(width, height, this.inline)

    this.rebuildCaches()
  }

  setSize(width: number, height: number, dpr = this.dpr) {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.dpr = capDevicePixelRatio(dpr)
    this.metrics = getLayoutMetrics(this.width, this.height, this.inline)
    this.rebuildCaches()
  }

  render(state: AnimationState) {
    this.prepareContext(this.context)
    this.context.clearRect(0, 0, this.width, this.height)

    if (!this.inline) {
      this.context.fillStyle = PALETTE.background
      this.context.fillRect(0, 0, this.width, this.height)
    }

    this.prepareContext(this.sceneContext)
    this.sceneContext.clearRect(0, 0, this.width, this.height)

    if (state.opacity > 0) {
      this.drawGlow(state)
      this.drawRing(state)
      this.drawCenterDot(state)
      this.drawBlob(state)
    }

    this.drawReflection(state)
    this.context.drawImage(
      this.reflectionCanvas,
      0,
      this.metrics.cy + this.metrics.reflectionOffset,
      this.width,
      this.metrics.reflectionHeight,
    )
    this.context.drawImage(this.sceneCanvas, 0, 0, this.width, this.height)
  }

  destroy() {
    this.context.clearRect(0, 0, this.width, this.height)
    this.releaseCaches()
  }

  private prepareContext(context: CanvasRenderingContext2D) {
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.filter = 'none'
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
  }

  private rebuildCaches() {
    this.releaseCaches()
    this.sceneCanvas = createCanvas(this.width, this.height, this.dpr)
    this.sceneContext = getLogicalContext(this.sceneCanvas, this.dpr) as CanvasRenderingContext2D
    this.reflectionCanvas = createCanvas(this.width, this.metrics.reflectionHeight, this.dpr)
    this.reflectionContext = getLogicalContext(this.reflectionCanvas, this.dpr) as CanvasRenderingContext2D
    this.reflectionMask = this.reflectionContext.createLinearGradient(
      0,
      0,
      0,
      this.metrics.reflectionHeight,
    )
    this.reflectionMask.addColorStop(0, 'rgba(0, 0, 0, 1)')
    this.reflectionMask.addColorStop(1, 'rgba(0, 0, 0, 0)')
    this.ringTexture = buildRingTexture(this.metrics, this.dpr)

    const glowPadding = this.metrics.outerRadius * 0.35
    const glowColors = { bright: PALETTE.glowBright, dim: PALETTE.glowDim }
    this.glowTexture = createGlowTexture(
      this.ringTexture,
      glowPadding,
      this.metrics.outerRadius * 0.25,
      this.dpr,
      glowColors,
    )
    this.intenseGlowTexture = createGlowTexture(
      this.ringTexture,
      glowPadding * 1.5,
      this.metrics.outerRadius * 0.375,
      this.dpr,
      glowColors,
    )
    this.dotTexture = buildDotTexture(this.metrics.centerDotRadius, this.dpr)
    this.blobTexture = buildBlobTexture(
      this.metrics.blobMaxWidth,
      this.metrics.blobMaxHeight,
      this.dpr,
    )
  }

  private releaseCaches() {
    const canvases = [
      this.sceneCanvas,
      this.reflectionCanvas,
      this.ringTexture,
      this.glowTexture?.canvas,
      this.intenseGlowTexture?.canvas,
      this.dotTexture,
      this.blobTexture,
    ]

    for (const canvas of canvases) {
      if (!canvas) continue
      canvas.width = 1
      canvas.height = 1
    }
  }

  private drawGlow(state: AnimationState) {
    const radiusScale = state.ringRadius / FULL_RING_RADIUS
    const yScale = Math.max(0.015, Math.cos(state.tilt))
    const bloomProgress = Math.max(0, Math.min(1, (state.glowIntensity - 1) / 0.5))
    const glowAlpha = 0.4
      * state.opacity
      * (state.glowIntensity <= 1 ? Math.max(0, state.glowIntensity) : 1 + bloomProgress * 0.5)

    this.sceneContext.save()
    this.sceneContext.translate(this.metrics.cx, this.metrics.cy)
    this.sceneContext.scale(radiusScale, radiusScale * yScale)
    this.sceneContext.rotate(state.rotation + state.brightnessOffset)

    const normalPadding = this.glowTexture.padding
    const normalSize = this.metrics.outerRadius * 2 + normalPadding * 2
    this.sceneContext.globalAlpha = glowAlpha * (1 - bloomProgress)
    this.sceneContext.drawImage(this.glowTexture.canvas, -this.metrics.outerRadius - normalPadding, -this.metrics.outerRadius - normalPadding, normalSize, normalSize)

    if (bloomProgress > 0) {
      const intensePadding = this.intenseGlowTexture.padding
      const intenseSize = this.metrics.outerRadius * 2 + intensePadding * 2
      this.sceneContext.globalAlpha = glowAlpha * bloomProgress
      this.sceneContext.drawImage(this.intenseGlowTexture.canvas, -this.metrics.outerRadius - intensePadding, -this.metrics.outerRadius - intensePadding, intenseSize, intenseSize)
    }
    this.sceneContext.restore()
  }

  private drawRing(state: AnimationState) {
    const radiusScale = state.ringRadius / FULL_RING_RADIUS
    const yScale = Math.max(0.015, Math.cos(state.tilt))
    const size = this.metrics.outerRadius * 2

    this.sceneContext.save()
    this.sceneContext.translate(this.metrics.cx, this.metrics.cy)
    this.sceneContext.scale(radiusScale, radiusScale * yScale)
    this.sceneContext.rotate(state.rotation + state.brightnessOffset)
    this.sceneContext.globalAlpha = state.opacity
    this.sceneContext.drawImage(
      this.ringTexture,
      -this.metrics.outerRadius,
      -this.metrics.outerRadius,
      size,
      size,
    )
    this.sceneContext.restore()
  }

  private drawCenterDot(state: AnimationState) {
    if (state.centerDotRadius <= 0) return

    const radiusScale = (state.centerDotRadius / 0.025) * (this.metrics.centerDotRadius / (this.metrics.baseSize * 0.025))
    const radius = this.metrics.baseSize * 0.025 * radiusScale
    const glowRadius = radius * 1.8

    this.sceneContext.save()
    this.sceneContext.globalAlpha = state.opacity
    this.sceneContext.drawImage(
      this.dotTexture,
      this.metrics.cx - glowRadius,
      this.metrics.cy - glowRadius,
      glowRadius * 2,
      glowRadius * 2,
    )
    this.sceneContext.restore()
  }

  private drawBlob(state: AnimationState) {
    if (state.blobWidth <= 0 || state.blobHeight <= 0) return

    const variantScale = this.inline ? 2 : 1
    const width = this.metrics.baseSize * state.blobWidth * variantScale
    const height = this.metrics.baseSize * state.blobHeight * variantScale
    const projectedOuterRadius = this.metrics.outerRadius
      * (state.ringRadius / FULL_RING_RADIUS)
      * Math.max(0.015, Math.cos(state.tilt))
    const cy = this.metrics.cy + projectedOuterRadius - width * 0.2
    const params: BlobParams = {
      cx: this.metrics.cx,
      cy,
      width,
      height,
      roundness: state.blobRoundness,
      opacity: state.opacity,
    }

    const bloomScale = Math.max(1, Math.min(1.5, state.glowIntensity))
    const glowWidth = params.width * 2 * bloomScale
    const glowHeight = params.height * 1.8 * bloomScale

    this.sceneContext.save()
    this.sceneContext.globalAlpha = params.opacity * Math.min(1, state.glowIntensity / 1.5)
    this.sceneContext.drawImage(
      this.blobTexture,
      params.cx - glowWidth / 2,
      params.cy - params.width * 0.6 - (glowHeight - params.height * 1.8) / 2,
      glowWidth,
      glowHeight,
    )
    this.sceneContext.restore()

    this.sceneContext.save()
    this.createBlobPath(params)
    this.sceneContext.clip()
    this.sceneContext.globalAlpha = params.opacity
    this.sceneContext.drawImage(
      this.blobTexture,
      params.cx - params.width / 2,
      params.cy - params.width / 2,
      params.width,
      params.height + params.width,
    )
    this.sceneContext.restore()
  }

  private createBlobPath(params: BlobParams) {
    const { cx, cy, width, height, roundness } = params
    const topRadius = width / 2
    const tipY = cy + height
    const tipSpread = width * 0.1 * roundness

    this.sceneContext.beginPath()
    this.sceneContext.arc(cx, cy, topRadius, Math.PI, 0, false)
    this.sceneContext.bezierCurveTo(
      cx + topRadius,
      cy + height * 0.5,
      cx + width * 0.1 + tipSpread,
      tipY - height * 0.1,
      cx,
      tipY,
    )
    this.sceneContext.bezierCurveTo(
      cx - width * 0.1 - tipSpread,
      tipY - height * 0.1,
      cx - topRadius,
      cy + height * 0.5,
      cx - topRadius,
      cy,
    )
    this.sceneContext.closePath()
  }

  private drawReflection(state: AnimationState) {
    this.prepareContext(this.reflectionContext)
    this.reflectionContext.clearRect(0, 0, this.width, this.metrics.reflectionHeight)
    if (state.opacity <= 0) return

    const reflectY = this.metrics.cy + this.metrics.reflectionOffset
    this.reflectionContext.save()
    this.reflectionContext.translate(0, reflectY)
    this.reflectionContext.scale(1, -1)
    this.reflectionContext.globalAlpha = REFLECTION_OPACITY
    this.reflectionContext.drawImage(this.sceneCanvas, 0, 0, this.width, this.height)
    this.reflectionContext.restore()

    this.reflectionContext.globalCompositeOperation = 'destination-in'
    this.reflectionContext.fillStyle = this.reflectionMask
    this.reflectionContext.fillRect(
      0,
      0,
      this.width,
      this.metrics.reflectionHeight,
    )
    this.reflectionContext.globalCompositeOperation = 'source-over'
  }
}
