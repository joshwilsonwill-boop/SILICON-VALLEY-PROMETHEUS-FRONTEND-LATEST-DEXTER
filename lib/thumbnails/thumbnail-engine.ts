/**
 * Client-Side Video Thumbnail & Overlay Engine for Prometheus Studio.
 *
 * Provides:
 * - Canvas-based native resolution frame extraction from any video stream.
 * - Multi-candidate keyframe sampling across video duration.
 * - Dynamic typography rendering (Impact, Elegist, Neon, Minimal) with
 *   drop shadows, background badges, and contrast strokes.
 * - High-res Blob and DataURL export in PNG and WebP formats.
 */

export type ThumbnailStylePreset = 'impact' | 'editorial' | 'neon' | 'minimal' | 'bold_accent'

export type ThumbnailTextPosition = 'top' | 'center' | 'bottom'

export interface ThumbnailTextConfig {
  headline: string
  subtitle?: string
  preset: ThumbnailStylePreset
  position: ThumbnailTextPosition
  fontSizeScale: number // 0.6 to 1.8 (default 1.0)
  showBadge: boolean
  badgeColor?: string
  textColor?: string
  accentColor?: string
}

export interface ExtractedFrameCandidate {
  timeSec: number
  timecode: string
  dataUrl: string
  width: number
  height: number
}

export interface ThumbnailExportResult {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export class ThumbnailEngine {
  /**
   * Captures the current frame from an HTMLVideoElement at its native resolution.
   */
  static captureFrameFromVideo(video: HTMLVideoElement): ExtractedFrameCandidate | null {
    if (!video || video.readyState < 2) return null

    const width = video.videoWidth || 1920
    const height = video.videoHeight || 1080
    if (width === 0 || height === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    return {
      timeSec: video.currentTime,
      timecode: formatTimecode(video.currentTime),
      dataUrl,
      width,
      height,
    }
  }

  /**
   * Samples N evenly distributed candidate keyframes from a video element or URL.
   */
  static async extractCandidateFrames(
    videoSource: string | HTMLVideoElement,
    count = 6,
    signal?: AbortSignal,
  ): Promise<ExtractedFrameCandidate[]> {
    let video: HTMLVideoElement
    let shouldCleanup = false

    if (typeof videoSource === 'string') {
      video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.src = videoSource
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      shouldCleanup = true

      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => resolve()
        const onError = () => reject(new Error('Failed to load video for thumbnail extraction'))
        video.addEventListener('loadedmetadata', onLoaded, { once: true })
        video.addEventListener('error', onError, { once: true })
        if (signal) {
          signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true })
        }
      })
    } else {
      video = videoSource
    }

    const duration = video.duration || 10
    const candidates: ExtractedFrameCandidate[] = []

    // Calculate sampling percentages (e.g. 10%, 25%, 45%, 65%, 80%, 92%)
    const samplePoints: number[] = []
    for (let i = 0; i < count; i++) {
      const pct = (i + 0.8) / (count + 0.8)
      samplePoints.push(Math.min(duration - 0.5, Math.max(0.2, pct * duration)))
    }

    for (const timeSec of samplePoints) {
      if (signal?.aborted) break

      const candidate = await new Promise<ExtractedFrameCandidate | null>((resolve) => {
        const onSeeked = () => {
          const frame = ThumbnailEngine.captureFrameFromVideo(video)
          resolve(frame)
        }
        video.addEventListener('seeked', onSeeked, { once: true })
        video.currentTime = timeSec
      })

      if (candidate) {
        candidates.push(candidate)
      }
    }

    if (shouldCleanup) {
      video.src = ''
      video.remove()
    }

    return candidates
  }

  /**
   * Renders the base image + styled typography overlays onto an export canvas.
   */
  static async renderThumbnail(
    baseImageSource: string | HTMLImageElement,
    config: ThumbnailTextConfig,
    targetWidth = 1280,
    targetHeight = 720,
  ): Promise<ThumbnailExportResult> {
    let img: HTMLImageElement

    if (typeof baseImageSource === 'string') {
      img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = baseImageSource
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load base image for rendering'))
      })
    } else {
      img = baseImageSource
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not obtain canvas 2D context')

    // Draw base image with cover fit (center crop)
    const imgAspect = img.naturalWidth / img.naturalHeight
    const canvasAspect = targetWidth / targetHeight
    let drawWidth = targetWidth
    let drawHeight = targetHeight
    let offsetX = 0
    let offsetY = 0

    if (imgAspect > canvasAspect) {
      drawWidth = targetHeight * imgAspect
      offsetX = (targetWidth - drawWidth) / 2
    } else {
      drawHeight = targetWidth / imgAspect
      offsetY = (targetHeight - drawHeight) / 2
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

    // Render subtle cinematic vignette overlay
    const vignette = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.25,
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.75,
    )
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, targetWidth, targetHeight)

    // Render Text Overlay
    if (config.headline.trim()) {
      ThumbnailEngine.drawTypography(ctx, config, targetWidth, targetHeight)
    }

    const dataUrl = canvas.toDataURL('image/png')
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png')
    })

    return {
      blob,
      dataUrl,
      width: targetWidth,
      height: targetHeight,
    }
  }

  /**
   * Internal typography drawing routine with support for multi-line wrapping,
   * high-contrast strokes, badges, and preset aesthetics.
   */
  private static drawTypography(
    ctx: CanvasRenderingContext2D,
    config: ThumbnailTextConfig,
    width: number,
    height: number,
  ) {
    const scale = config.fontSizeScale || 1.0
    const baseFontSize = Math.round((height / 10) * scale)
    const headline = config.headline.trim().toUpperCase()
    const subtitle = config.subtitle?.trim()

    let fontFamily = 'Impact, sans-serif'
    let primaryColor = '#FFFFFF'
    let strokeColor = '#000000'
    let strokeWidth = Math.round(baseFontSize * 0.16)
    let badgeBg = 'rgba(0,0,0,0.82)'
    let letterSpacing = 2

    switch (config.preset) {
      case 'impact':
        fontFamily = 'Impact, -apple-system, sans-serif'
        primaryColor = config.textColor || '#FFE600' // Viral high-energy yellow
        strokeColor = '#000000'
        strokeWidth = Math.round(baseFontSize * 0.18)
        badgeBg = 'rgba(0, 0, 0, 0.88)'
        letterSpacing = 2
        break
      case 'editorial':
        fontFamily = 'Georgia, "Times New Roman", serif'
        primaryColor = config.textColor || '#F5F5F0' // Warm luxury cream
        strokeColor = 'rgba(0,0,0,0.6)'
        strokeWidth = Math.round(baseFontSize * 0.08)
        badgeBg = 'rgba(18, 18, 20, 0.9)'
        letterSpacing = 4
        break
      case 'neon':
        fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        primaryColor = config.textColor || '#00F0FF' // Cyber cyan
        strokeColor = '#002B36'
        strokeWidth = Math.round(baseFontSize * 0.14)
        badgeBg = 'rgba(10, 20, 30, 0.92)'
        letterSpacing = 3
        break
      case 'minimal':
        fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        primaryColor = config.textColor || '#FFFFFF'
        strokeColor = 'rgba(0,0,0,0.4)'
        strokeWidth = Math.max(2, Math.round(baseFontSize * 0.06))
        badgeBg = 'rgba(0,0,0,0.75)'
        letterSpacing = 1
        break
      case 'bold_accent':
        fontFamily = 'Impact, -apple-system, sans-serif'
        primaryColor = config.textColor || '#FFFFFF'
        strokeColor = '#FF2D55'
        strokeWidth = Math.round(baseFontSize * 0.16)
        badgeBg = 'rgba(255, 45, 85, 0.2)'
        letterSpacing = 2
        break
    }

    ctx.font = `900 ${baseFontSize}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Compute Y position based on placement
    let centerY = height * 0.82
    if (config.position === 'top') {
      centerY = height * 0.22
    } else if (config.position === 'center') {
      centerY = height * 0.5
    }

    const centerX = width / 2

    // Wrap headline into lines (max 26 chars per line)
    const words = headline.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      if (metrics.width > width * 0.86 && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    const lineHeight = baseFontSize * 1.15
    const totalBlockHeight = lines.length * lineHeight

    // Draw background badge pill if enabled
    if (config.showBadge) {
      const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width))
      const paddingX = baseFontSize * 0.5
      const paddingY = baseFontSize * 0.35
      const badgeW = maxLineWidth + paddingX * 2
      const badgeH = totalBlockHeight + paddingY * 2
      const badgeX = centerX - badgeW / 2
      const badgeY = centerY - totalBlockHeight / 2 - paddingY

      ctx.save()
      ctx.fillStyle = config.badgeColor || badgeBg
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, Math.min(24, baseFontSize * 0.25))
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Draw lines with outer glow and stroke
    lines.forEach((line, index) => {
      const y = centerY - (totalBlockHeight / 2) + index * lineHeight + lineHeight / 2

      ctx.save()
      // Outer drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.85)'
      ctx.shadowBlur = 18
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 6

      // Stroke
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineJoin = 'miter'
      ctx.miterLimit = 2
      ctx.strokeText(line, centerX, y)

      // Fill
      ctx.fillStyle = primaryColor
      ctx.fillText(line, centerX, y)
      ctx.restore()
    })

    // Subtitle if provided
    if (subtitle) {
      const subFontSize = Math.round(baseFontSize * 0.44)
      ctx.font = `600 ${subFontSize}px -apple-system, sans-serif`
      const subY = centerY + totalBlockHeight / 2 + subFontSize * 1.2
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'
      ctx.lineWidth = 3
      ctx.strokeText(subtitle, centerX, subY)
      ctx.fillText(subtitle, centerX, subY)
    }
  }
}
