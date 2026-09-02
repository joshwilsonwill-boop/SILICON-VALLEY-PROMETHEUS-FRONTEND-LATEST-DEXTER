/**
 * Comprehensive Short-Form Video Thumbnail & Visual Engine for Prometheus Studio.
 *
 * Implements real-world short-form video cover art archetypes:
 * - Depth separation: Headline positioned behind principal speaker with subject mask
 * - Multi-typographic systems: Ultra-bold display sans + flowing cursive script + telemetry
 * - Floating contextual 3D/2D visual assets (hourglass, book, calendar, camera, question marks, doodle arrows)
 * - Brand palette coloring: Accent glows, rim lighting, script text, and pill badges
 * - Photo treatments: Cinematic vignetting, procedural film grain & dust, fringe blur (chromatic aberration), text ink bleed
 */

export type ThumbnailStylePreset =
  | 'impact'
  | 'editorial'
  | 'neon'
  | 'minimal'
  | 'bold_accent'
  | 'cinematic'
  | 'behind_subject_blueprint'
  | 'confessional_gold'
  | 'script_sans_split'
  | 'paper_collage_pinup'
  | 'creator_3d_icons'
  | 'super_confident_script'
  | 'torn_edge_editorial'
  | 'mrbeast_grid_contrast'

export type ThumbnailTextPosition = 'top' | 'center' | 'bottom'
export type TextLayerMode = 'behind' | 'foreground' | 'split'

export interface ShortFormPhotoTreatments {
  vignette: boolean
  vignetteIntensity: number // 0 to 1
  filmGrain: boolean
  filmGrainIntensity: number // 0 to 1
  fringeBlur: boolean
  inkBleed: boolean
  rimLight: boolean
  backgroundGrid: boolean
  telemetryRuler: boolean
}

export interface ThumbnailTextConfig {
  headline: string
  scriptAccent?: string
  subtitle?: string
  preset: ThumbnailStylePreset
  position: ThumbnailTextPosition
  fontSizeScale: number // 0.6 to 1.8 (default 1.0)
  showBadge: boolean
  badgeColor?: string
  textColor?: string
  brandColor?: string
  secondaryColor?: string
  textLayer?: TextLayerMode
  floatingAssets?: string[]
  treatments?: Partial<ShortFormPhotoTreatments>
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
  private static _displayFont: string | null = null
  private static _scriptFont: string | null = null

  /**
   * Resolves a CSS custom-property font-family to its concrete font-family string so
   * the canvas 2D context can use the app's loaded editorial/script faces. Falls back
   * gracefully to a serif/cursive stack when the document is unavailable.
   */
  private static resolveFontStack(varExpression: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback
    const probe = document.createElement('span')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = `position:absolute;left:-9999px;top:-9999px;visibility:hidden;font-family:${varExpression};`
    document.body.appendChild(probe)
    const computed = getComputedStyle(probe).fontFamily
    probe.remove()
    return computed || fallback
  }

  /**
   * The app's editorial serif display face (Migra / Elegist) with a Georgia fallback.
   */
  private static getDisplayFont(): string {
    if (!ThumbnailEngine._displayFont) {
      ThumbnailEngine._displayFont = ThumbnailEngine.resolveFontStack(
        'var(--font-migra), var(--font-ui), Georgia, "Times New Roman", serif',
        'Georgia, "Times New Roman", serif',
      )
    }
    return ThumbnailEngine._displayFont
  }

  /**
   * A quiet cursive accent face (Black Delights) with a Georgia cursive fallback.
   */
  private static getScriptFont(): string {
    if (!ThumbnailEngine._scriptFont) {
      ThumbnailEngine._scriptFont = ThumbnailEngine.resolveFontStack(
        'var(--font-black-delights), var(--font-ui), Georgia, cursive',
        'Georgia, cursive',
      )
    }
    return ThumbnailEngine._scriptFont
  }

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
   * Renders the base image + styled short-form typography & photo treatments onto an export canvas.
   */
  static async renderThumbnail(
    baseImageSource: string | HTMLImageElement,
    config: ThumbnailTextConfig,
    targetWidth = 720,
    targetHeight = 1280,
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

    // 1. Draw base image with cover fit
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

    const treatments: ShortFormPhotoTreatments = {
      vignette: config.treatments?.vignette ?? true,
      vignetteIntensity: config.treatments?.vignetteIntensity ?? 0.75,
      filmGrain: config.treatments?.filmGrain ?? true,
      filmGrainIntensity: config.treatments?.filmGrainIntensity ?? 0.35,
      fringeBlur: config.treatments?.fringeBlur ?? false,
      inkBleed: config.treatments?.inkBleed ?? false,
      rimLight: config.treatments?.rimLight ?? true,
      backgroundGrid: config.treatments?.backgroundGrid ?? false,
      telemetryRuler: config.treatments?.telemetryRuler ?? false,
    }

    const brandColor = config.brandColor || '#3E5C76'
    const textLayer = config.textLayer || 'foreground'

    // 2. Background Grid if enabled
    if (treatments.backgroundGrid) {
      ThumbnailEngine.drawBackgroundGrid(ctx, targetWidth, targetHeight, brandColor)
    }

    // 3. Telemetry Ruler if enabled
    if (treatments.telemetryRuler) {
      ThumbnailEngine.drawTelemetryRuler(ctx, targetWidth, targetHeight, brandColor)
    }

    // 4. Background Headline ("Text Behind Speaker")
    if (textLayer === 'behind' || textLayer === 'split') {
      ThumbnailEngine.drawBehindHeadline(ctx, config, targetWidth, targetHeight, brandColor)
      // Draw extracted speaker foreground over background text
      ThumbnailEngine.drawSpeakerCutout(ctx, img, offsetX, offsetY, drawWidth, drawHeight, targetWidth, targetHeight, treatments.rimLight, brandColor)
    }

    // 5. Floating Visual Assets (3D Hourglass, Calendar, Book, Camera, Question Marks, etc.)
    if (config.floatingAssets && config.floatingAssets.length > 0) {
      ThumbnailEngine.drawFloatingAssets(ctx, config.floatingAssets, targetWidth, targetHeight, brandColor)
    }

    // 6. Foreground Typography (Primary Headline + Script Accent + Badges)
    if (textLayer === 'foreground' || textLayer === 'split' || !config.textLayer) {
      ThumbnailEngine.drawForegroundTypography(ctx, config, targetWidth, targetHeight, brandColor, treatments.inkBleed)
    }

    // 7. Script Accent Overlay (e.g. "The future", "bo'lish uchun", "new year")
    if (config.scriptAccent?.trim()) {
      ThumbnailEngine.drawScriptAccent(ctx, config.scriptAccent.trim(), targetWidth, targetHeight, brandColor)
    }

    // 8. Photo Treatments: Vignette
    if (treatments.vignette) {
      ThumbnailEngine.drawVignette(ctx, targetWidth, targetHeight, treatments.vignetteIntensity)
    }

    // 9. Photo Treatments: Fringe Blur (Chromatic Aberration)
    if (treatments.fringeBlur) {
      ThumbnailEngine.drawFringeBlur(ctx, targetWidth, targetHeight)
    }

    // 10. Photo Treatments: Film Grain & Dust
    if (treatments.filmGrain) {
      ThumbnailEngine.drawFilmGrain(ctx, targetWidth, targetHeight, treatments.filmGrainIntensity)
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
   * Draws background grid lines for blueprint / high-tech short-form styles.
   */
  private static drawBackgroundGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string,
  ) {
    ctx.save()
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.12
    ctx.lineWidth = 1

    const step = Math.round(width / 12)
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  /**
   * Draws telemetry ruler coordinate markers across the top edge.
   */
  private static drawTelemetryRuler(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number,
    color: string,
  ) {
    ctx.save()
    ctx.font = '600 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = color
    ctx.globalAlpha = 0.75

    const points = [160, 140, 120, 100, 80, 60, 40, 20, 0, 20, 40, 60, 80, 100, 120, 140, 160]
    const step = width / (points.length + 1)
    points.forEach((val, idx) => {
      const x = step * (idx + 1)
      ctx.fillText(String(val), x, 22)
      ctx.fillRect(x - 0.5, 26, 1, idx === 8 ? 8 : 4)
    })
    ctx.restore()
  }

  /**
   * Draws giant headline text positioned behind the speaker's head/torso.
   */
  private static drawBehindHeadline(
    ctx: CanvasRenderingContext2D,
    config: ThumbnailTextConfig,
    width: number,
    height: number,
    brandColor: string,
  ) {
    const text = config.headline.trim().toUpperCase()
    if (!text) return

    ctx.save()
    const fontSize = Math.round(height * 0.11 * (config.fontSizeScale || 1.0))
    ctx.font = `800 ${fontSize}px ${ThumbnailEngine.getDisplayFont()}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const centerX = width / 2
    const centerY = height * 0.28 // Positioned behind head & shoulders

    // Ambient backlight halo behind the text
    const halo = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, width * 0.45)
    halo.addColorStop(0, brandColor)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.38
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1.0

    // Stroke and fill behind text
    ctx.shadowColor = brandColor
    ctx.shadowBlur = 28
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = Math.round(fontSize * 0.12)
    ctx.strokeText(text, centerX, centerY)

    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, centerX, centerY)
    ctx.restore()
  }

  /**
   * Re-draws the principal speaker with silhouette mask & colored rim light over background text.
   */
  private static drawSpeakerCutout(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    offsetX: number,
    offsetY: number,
    drawWidth: number,
    drawHeight: number,
    targetWidth: number,
    targetHeight: number,
    hasRimLight: boolean,
    rimColor: string,
  ) {
    ctx.save()

    // Create an elliptical portrait clip mask centered on the speaker's head & torso
    ctx.beginPath()
    const cx = targetWidth / 2
    const cy = targetHeight * 0.58
    const rx = targetWidth * 0.44
    const ry = targetHeight * 0.44

    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.clip()

    if (hasRimLight) {
      ctx.shadowColor = rimColor
      ctx.shadowBlur = 32
    }

    // Redraw speaker inside clip mask
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
    ctx.restore()

    // Add subtle rim light outline around silhouette
    if (hasRimLight) {
      ctx.save()
      ctx.strokeStyle = rimColor
      ctx.globalAlpha = 0.25
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx + 1, ry + 1, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  /**
   * Renders floating contextual 3D/2D visual assets (hourglass, book, calendar, camera, question mark, doodle arrows).
   */
  private static drawFloatingAssets(
    ctx: CanvasRenderingContext2D,
    assets: string[],
    width: number,
    height: number,
    brandColor: string,
  ) {
    ctx.save()
    assets.forEach((asset, idx) => {
      // Coordinate layout around subject
      const x = idx % 2 === 0 ? width * 0.18 : width * 0.82
      const y = height * (0.32 + Math.floor(idx / 2) * 0.24)

      ctx.save()
      ctx.shadowColor = brandColor
      ctx.shadowBlur = 24

      switch (asset) {
        case 'hourglass':
          ThumbnailEngine.renderHourglassIcon(ctx, x, y, brandColor)
          break
        case 'book':
          ThumbnailEngine.renderBookIcon(ctx, x, y, brandColor)
          break
        case 'calendar_x':
        case 'calendar':
          ThumbnailEngine.renderCalendarIcon(ctx, x, y, brandColor)
          break
        case 'question_mark':
          ThumbnailEngine.renderQuestionMark(ctx, x, y, brandColor)
          break
        case 'notepad':
          ThumbnailEngine.renderNotepadIcon(ctx, x, y, brandColor)
          break
        case 'camera':
          ThumbnailEngine.renderCameraIcon(ctx, x, y, brandColor)
          break
        case 'dollar':
          ThumbnailEngine.renderDollarIcon(ctx, x, y, brandColor)
          break
        case 'doodle_arrow':
          ThumbnailEngine.renderDoodleArrow(ctx, x, y, brandColor)
          break
        default:
          ThumbnailEngine.renderStarBadge(ctx, x, y, brandColor)
          break
      }
      ctx.restore()
    })
    ctx.restore()
  }

  // --- Procedural Asset Renderers ---
  private static renderHourglassIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.strokeStyle = color
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x - 24, y - 32)
    ctx.lineTo(x + 24, y - 32)
    ctx.lineTo(x - 12, y)
    ctx.lineTo(x + 24, y + 32)
    ctx.lineTo(x - 24, y + 32)
    ctx.lineTo(x + 12, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  private static renderBookIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.strokeStyle = color
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.arc(x - 14, y, 18, 0, Math.PI * 2)
    ctx.arc(x + 14, y, 18, 0, Math.PI * 2)
    ctx.stroke()
  }

  private static renderCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = color
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(x - 26, y - 24, 52, 48, 8)
    ctx.fill()
    ctx.stroke()

    // X badge
    ctx.fillStyle = '#3E5C76'
    ctx.beginPath()
    ctx.arc(x + 18, y + 16, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('X', x + 18, y + 16)
  }

  private static renderQuestionMark(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.font = '900 48px -apple-system, sans-serif'
    ctx.fillStyle = color
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'
    ctx.lineWidth = 6
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText('?', x, y)
    ctx.fillText('?', x, y)
  }

  private static renderNotepadIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = '#3E5C76'
    ctx.beginPath()
    ctx.roundRect(x - 24, y - 24, 48, 48, 10)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x - 14, y - 10, 28, 4)
    ctx.fillRect(x - 14, y - 2, 28, 4)
    ctx.fillRect(x - 14, y + 6, 18, 4)
  }

  private static renderCameraIcon(ctx: CanvasRenderingContext2D, x: number, y: number, _color: string) {
    ctx.fillStyle = '#1A1A1A'
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - 26, y - 18, 52, 36, 6)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#3E5C76'
    ctx.fill()
  }

  private static renderDollarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.font = '900 42px Impact, sans-serif'
    ctx.fillStyle = color
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 5
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText('$', x, y)
    ctx.fillText('$', x, y)
  }

  private static renderDoodleArrow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x - 20, y + 16)
    ctx.quadraticCurveTo(x - 5, y - 10, x + 20, y - 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 12, y - 18)
    ctx.lineTo(x + 22, y - 7)
    ctx.lineTo(x + 10, y + 2)
    ctx.stroke()
  }

  private static renderStarBadge(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, 16, 0, Math.PI * 2)
    ctx.fill()
  }

  /**
   * Draws primary foreground typography (Headline + Subtitle + Pill Badges).
   */
  private static drawForegroundTypography(
    ctx: CanvasRenderingContext2D,
    config: ThumbnailTextConfig,
    width: number,
    height: number,
    brandColor: string,
    inkBleed: boolean,
  ) {
    const scale = config.fontSizeScale || 1.0
    const baseFontSize = Math.round((height / 12) * scale)
    const headline = config.headline.trim().toUpperCase()
    const subtitle = config.subtitle?.trim()

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Compute Y center based on position
    let centerY = height * 0.82
    if (config.position === 'top') {
      centerY = height * 0.22
    } else if (config.position === 'center') {
      centerY = height * 0.5
    }

    const centerX = width / 2
    const lines = headline.split('\n')

    // Wrap headline into lines
    const wrappedLines: string[] = []
    lines.forEach((l) => {
      const words = l.split(' ')
      let current = ''
      for (const w of words) {
        const test = current ? `${current} ${w}` : w
        ctx.font = `800 ${baseFontSize}px ${ThumbnailEngine.getDisplayFont()}`
        if (ctx.measureText(test).width > width * 0.88 && current) {
          wrappedLines.push(current)
          current = w
        } else {
          current = test
        }
      }
      if (current) wrappedLines.push(current)
    })

    const lineHeight = baseFontSize * 1.12
    const totalHeight = wrappedLines.length * lineHeight

    // Pill badge background if enabled
    if (config.showBadge) {
      const maxW = Math.max(...wrappedLines.map((l) => ctx.measureText(l).width))
      const padX = baseFontSize * 0.4
      const padY = baseFontSize * 0.28
      const badgeW = maxW + padX * 2
      const badgeH = totalHeight + padY * 2

      ctx.save()
      ctx.fillStyle = config.badgeColor || 'rgba(0,0,0,0.85)'
      ctx.strokeStyle = brandColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(centerX - badgeW / 2, centerY - totalHeight / 2 - padY, badgeW, badgeH, 14)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    // Render lines with outer glow & ink bleed
    wrappedLines.forEach((line, idx) => {
      const y = centerY - totalHeight / 2 + idx * lineHeight + lineHeight / 2

      ctx.save()
      if (inkBleed) {
        ctx.shadowColor = brandColor
        ctx.shadowBlur = 32
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.9)'
        ctx.shadowBlur = 18
      }

      ctx.font = `800 ${baseFontSize}px ${ThumbnailEngine.getDisplayFont()}`
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = Math.round(baseFontSize * 0.16)
      ctx.strokeText(line, centerX, y)

      ctx.fillStyle = config.textColor || '#FFFFFF'
      ctx.fillText(line, centerX, y)
      ctx.restore()
    })

    // Subtitle rendering
    if (subtitle) {
      const subSize = Math.round(baseFontSize * 0.38)
      const subY = centerY + totalHeight / 2 + subSize * 1.2
      ctx.save()
      ctx.font = `800 ${subSize}px -apple-system, sans-serif`
      ctx.fillStyle = brandColor
      ctx.strokeStyle = 'rgba(0,0,0,0.95)'
      ctx.lineWidth = 4
      ctx.strokeText(subtitle.toUpperCase(), centerX, subY)
      ctx.fillText(subtitle.toUpperCase(), centerX, subY)
      ctx.restore()
    }

    ctx.restore()
  }

  /**
   * Draws flowing cursive script accent text across/over the headline.
   */
  private static drawScriptAccent(
    ctx: CanvasRenderingContext2D,
    scriptText: string,
    width: number,
    height: number,
    brandColor: string,
  ) {
    ctx.save()
    const scriptSize = Math.round(height * 0.055)
    ctx.font = `italic 600 ${scriptSize}px ${ThumbnailEngine.getScriptFont()}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const x = width * 0.52
    const y = height * 0.88

    // Slight angle tilt
    ctx.translate(x, y)
    ctx.rotate(-0.06)

    ctx.shadowColor = brandColor
    ctx.shadowBlur = 16
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'
    ctx.lineWidth = 4
    ctx.strokeText(scriptText, 0, 0)

    ctx.fillStyle = brandColor
    ctx.fillText(scriptText, 0, 0)
    ctx.restore()
  }

  /**
   * Draws cinematic vignette dark gradient falloff.
   */
  private static drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
  ) {
    ctx.save()
    // Radial center-to-edge
    const radial = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.25,
      width / 2,
      height / 2,
      width * 0.78,
    )
    radial.addColorStop(0, 'rgba(0,0,0,0)')
    radial.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, intensity * 0.85)})`)
    ctx.fillStyle = radial
    ctx.fillRect(0, 0, width, height)

    // Extra heavy bottom third gradient to ensure text readability over dark clothing
    const bottomGrad = ctx.createLinearGradient(0, height * 0.55, 0, height)
    bottomGrad.addColorStop(0, 'rgba(0,0,0,0)')
    bottomGrad.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, intensity * 0.9)})`)
    ctx.fillStyle = bottomGrad
    ctx.fillRect(0, height * 0.55, width, height * 0.45)

    ctx.restore()
  }

  /**
   * Applies fringe blur (chromatic aberration) channel shift.
   */
  private static drawFringeBlur(ctx: CanvasRenderingContext2D, width: number, height: number) {
    try {
      const imgData = ctx.getImageData(0, 0, width, height)
      const data = imgData.data
      const offset = 3 // 3px red-blue shift

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width - offset; x++) {
          const idx = (y * width + x) * 4
          const shiftIdx = (y * width + (x + offset)) * 4
          data[idx] = data[shiftIdx] // Shift red channel
        }
      }
      ctx.putImageData(imgData, 0, 0)
    } catch {
      // Ignore if tainted canvas
    }
  }

  /**
   * Draws procedural film dust & grain texture.
   */
  private static drawFilmGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
  ) {
    ctx.save()
    const grainCanvas = document.createElement('canvas')
    grainCanvas.width = 160
    grainCanvas.height = 160
    const gCtx = grainCanvas.getContext('2d')
    if (!gCtx) return

    const gData = gCtx.createImageData(160, 160)
    const buf = new Uint32Array(gData.data.buffer)
    const alpha = Math.round(intensity * 42)

    for (let i = 0; i < buf.length; i++) {
      const val = (Math.random() * 255) | 0
      buf[i] = (alpha << 24) | (val << 16) | (val << 8) | val
    }
    gCtx.putImageData(gData, 0, 0)

    const pattern = ctx.createPattern(grainCanvas, 'repeat')
    if (pattern) {
      ctx.fillStyle = pattern
      ctx.globalAlpha = 0.65
      ctx.fillRect(0, 0, width, height)
    }
    ctx.restore()
  }
}

