export interface GlowTexture {
  canvas: HTMLCanvasElement
  padding: number
}

interface GlowColors {
  bright: string
  dim: string
}

export function createGlowTexture(
  sourceCanvas: HTMLCanvasElement,
  padding: number,
  blurAmount: number,
  dpr: number,
  colors: GlowColors,
): GlowTexture {
  const canvas = document.createElement('canvas')
  const paddingPixels = Math.ceil(padding * dpr)
  canvas.width = sourceCanvas.width + paddingPixels * 2
  canvas.height = sourceCanvas.height + paddingPixels * 2

  const context = canvas.getContext('2d')
  if (!context) return { canvas, padding }

  const blurPixels = Math.max(1, blurAmount * dpr)
  context.save()

  const hasCanvasFilter = typeof (context as { filter?: unknown }).filter === 'string'

  if (hasCanvasFilter) {
    context.filter = `blur(${blurPixels}px)`
    context.drawImage(sourceCanvas, paddingPixels, paddingPixels)
  } else {
    context.shadowColor = colors.dim
    context.shadowBlur = blurPixels
    context.drawImage(sourceCanvas, paddingPixels, paddingPixels)
  }

  context.filter = 'none'
  context.shadowBlur = 0
  context.globalCompositeOperation = 'source-in'
  const tint = context.createLinearGradient(0, 0, canvas.width, 0)
  tint.addColorStop(0, colors.dim)
  tint.addColorStop(0.55, colors.dim)
  tint.addColorStop(1, colors.bright)
  context.fillStyle = tint
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.restore()
  return { canvas, padding }
}
