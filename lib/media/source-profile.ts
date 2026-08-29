import type {
  DurationBucket,
  FileWeightBucket,
  MediaKind,
  ProcessingClass,
  OutputProfile,
  SourceAspectFamily,
  SourceInspection,
  SourceOrientation,
  SourceProfile,
  TimeProfile,
} from '@/lib/types'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'])
const MEDIA_KINDS = new Set<MediaKind>(['video', 'image', 'audio', 'file'])
const ORIENTATIONS = new Set<SourceOrientation>(['portrait', 'landscape', 'square', 'unknown'])

export function detectSourceFileKind(file: File): MediaKind {
  const mime = file.type.toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio'
  return 'file'
}

export async function inspectSourceFile(file: File): Promise<SourceProfile> {
  const mediaKind = detectSourceFileKind(file)
  const inspected =
    mediaKind === 'video'
      ? await inspectVideoFile(file)
      : mediaKind === 'image'
        ? await inspectImageFile(file)
        : mediaKind === 'audio'
          ? await inspectAudioFile(file)
          : inspectGenericFile(file)

  return classifySourceProfile(inspected)
}

export function classifySourceProfile(inspection: SourceInspection): SourceProfile {
  const aspectFamily = classifyAspectFamily(inspection)
  const durationBucket = classifyDurationBucket(inspection.durationSec)
  const weightBucket = classifyWeightBucket(inspection)
  const timeProfile = classifyTimeProfile(durationBucket)
  const processingClass = classifyProcessingClass(inspection, weightBucket)
  const supported = inspection.mediaKind === 'video' || inspection.mediaKind === 'image'
  const warnings: string[] = []

  if (inspection.mediaKind === 'file') {
    warnings.push('Unsupported file type for preview and automated processing.')
  }
  if (inspection.mediaKind === 'audio') {
    warnings.push('Audio sources can be staged, but visual framing data is unavailable.')
  }
  if (aspectFamily === 'unsupported' || aspectFamily === 'unknown') {
    warnings.push('Aspect ratio could not be classified cleanly.')
  }
  if (durationBucket === 'very_long') {
    warnings.push('Extended runtime detected. Queue-based processing is recommended.')
  }
  if (processingClass === 'queue_job') {
    warnings.push('This file should be treated as a queue job once backend processing is enabled.')
  }

  return {
    inspection,
    aspectFamily,
    durationBucket,
    weightBucket,
    timeProfile,
    processingClass,
    supported,
    warnings,
  }
}

export function formatAspectFamily(value: SourceAspectFamily): string {
  return FORMATTERS.aspectFamily[value]
}

export function formatDurationBucket(value: DurationBucket): string {
  return FORMATTERS.duration[value]
}

export function formatWeightBucket(value: FileWeightBucket): string {
  return FORMATTERS.weight[value]
}

export function formatTimeProfile(value: TimeProfile): string {
  return FORMATTERS.timeProfile[value]
}

export function formatProcessingClass(value: ProcessingClass): string {
  return FORMATTERS.processingClass[value]
}

export function formatSourceOrientation(value: SourceOrientation): string {
  return FORMATTERS.orientation[value]
}

export function formatSourceProfileMetric(profile: SourceProfile): {
  resolution: string
  duration: string
  fileSize: string
  audio: string
} {
  const inspection = normalizeSourceProfile(profile)?.inspection
  if (!inspection) {
    return {
      resolution: 'Unknown resolution',
      duration: 'Unknown duration',
      fileSize: 'Unknown file size',
      audio: 'Audio unknown',
    }
  }

  return {
    resolution:
      inspection.width && inspection.height ? `${inspection.width}×${inspection.height}` : 'Unknown resolution',
    duration: inspection.durationSec ? formatDurationSeconds(inspection.durationSec) : 'Unknown duration',
    fileSize: inspection.fileSizeBytes > 0 ? formatFileSize(inspection.fileSizeBytes) : 'Unknown file size',
    audio:
      inspection.hasAudio === null ? 'Audio unknown' : inspection.hasAudio ? 'Audio detected' : 'No audio track',
  }
}

export function formatDurationSeconds(durationSec: number): string {
  const totalSeconds = Math.max(0, Math.round(durationSec))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function getSourcePreviewAspectRatio(
  profile: SourceProfile | null | undefined,
  fallback = 16 / 9,
): number {
  const normalizedProfile = normalizeSourceProfile(profile)
  const inspectionRatio = normalizedProfile?.inspection.aspectRatio
  if (typeof inspectionRatio === 'number' && Number.isFinite(inspectionRatio) && inspectionRatio > 0) {
    return inspectionRatio
  }

  switch (normalizedProfile?.aspectFamily) {
    case 'vertical_short':
    case 'high_res_vertical':
      return 9 / 16
    case 'square':
      return 1
    case 'ultra_wide':
      return 21 / 9
    case 'horizontal_standard':
    case 'high_res_horizontal':
    case '4k_horizontal':
      return 16 / 9
    default:
      return fallback
  }
}

export function getDefaultOutputProfile(profile: SourceProfile | null | undefined): OutputProfile {
  switch (normalizeSourceProfile(profile)?.aspectFamily) {
    case 'vertical_short':
    case 'high_res_vertical':
      return '9:16'
    case 'square':
      return '1:1'
    case 'horizontal_standard':
    case 'high_res_horizontal':
    case '4k_horizontal':
      return '16:9'
    case 'ultra_wide':
    case 'unknown':
    case 'unsupported':
    default:
      return 'source'
  }
}

export function getOutputProfileAspectRatio(
  profile: OutputProfile,
  sourceProfile?: SourceProfile | null,
): number {
  switch (profile) {
    case 'source':
      return getSourcePreviewAspectRatio(sourceProfile)
    case '9:16':
      return 9 / 16
    case '4:5':
      return 4 / 5
    case '1:1':
      return 1
    case '16:9':
    default:
      return 16 / 9
  }
}

export function normalizeSourceProfile(profile: unknown): SourceProfile | undefined {
  if (!profile || typeof profile !== 'object') return undefined

  const inspection = normalizeSourceInspection((profile as { inspection?: unknown }).inspection)
  if (!inspection) return undefined

  const normalized = classifySourceProfile(inspection)
  const transcript = (profile as { transcript?: unknown }).transcript
  if (!Array.isArray(transcript)) return normalized

  const validTranscript = transcript.filter((segment): segment is {
    id: string
    startMs: number
    endMs: number
    text: string
    speaker?: string
  } => {
    if (!segment || typeof segment !== 'object') return false
    const candidate = segment as Record<string, unknown>
    return typeof candidate.id === 'string'
      && Number.isFinite(candidate.startMs)
      && Number.isFinite(candidate.endMs)
      && typeof candidate.text === 'string'
  })

  return validTranscript.length > 0 ? { ...normalized, transcript: validTranscript } : normalized
}

async function inspectVideoFile(file: File): Promise<SourceInspection> {
  const objectUrl = URL.createObjectURL(file)

  try {
    return await new Promise<SourceInspection>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true

      const cleanup = () => {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }

      const finish = () => {
        cleanup()
        URL.revokeObjectURL(objectUrl)
      }

      video.onloadedmetadata = () => {
        const width = Number.isFinite(video.videoWidth) && video.videoWidth > 0 ? video.videoWidth : null
        const height = Number.isFinite(video.videoHeight) && video.videoHeight > 0 ? video.videoHeight : null
        const durationSec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
        const aspectRatio = width && height ? width / height : null
        const orientation = getOrientation(width, height)
        const maybeAudio = detectVideoAudioPresence(video)
        const estimatedBitrateMbps =
          durationSec && durationSec > 0 ? Number(((file.size * 8) / durationSec / 1_000_000).toFixed(2)) : null

        finish()

        resolve({
          mediaKind: 'video',
          mimeType: file.type,
          fileName: file.name,
          fileSizeBytes: file.size,
          width,
          height,
          aspectRatio,
          durationSec,
          fps: null,
          hasAudio: maybeAudio,
          orientation,
          estimatedBitrateMbps,
        })
      }

      video.onerror = () => {
        finish()
        reject(new Error('Unable to read video metadata'))
      }

      video.src = objectUrl
    })
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function inspectImageFile(file: File): Promise<SourceInspection> {
  const objectUrl = URL.createObjectURL(file)

  try {
    return await new Promise<SourceInspection>((resolve, reject) => {
      const image = new Image()

      image.onload = () => {
        const width = Number.isFinite(image.naturalWidth) && image.naturalWidth > 0 ? image.naturalWidth : null
        const height = Number.isFinite(image.naturalHeight) && image.naturalHeight > 0 ? image.naturalHeight : null
        const aspectRatio = width && height ? width / height : null

        URL.revokeObjectURL(objectUrl)
        resolve({
          mediaKind: 'image',
          mimeType: file.type,
          fileName: file.name,
          fileSizeBytes: file.size,
          width,
          height,
          aspectRatio,
          durationSec: null,
          fps: null,
          hasAudio: false,
          orientation: getOrientation(width, height),
          estimatedBitrateMbps: null,
        })
      }

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to read image metadata'))
      }

      image.src = objectUrl
    })
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function inspectAudioFile(file: File): Promise<SourceInspection> {
  const objectUrl = URL.createObjectURL(file)

  try {
    return await new Promise<SourceInspection>((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'

      const cleanup = () => {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }

      const finish = () => {
        cleanup()
        URL.revokeObjectURL(objectUrl)
      }

      audio.onloadedmetadata = () => {
        const durationSec = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null
        const estimatedBitrateMbps =
          durationSec && durationSec > 0 ? Number(((file.size * 8) / durationSec / 1_000_000).toFixed(2)) : null

        finish()
        resolve({
          mediaKind: 'audio',
          mimeType: file.type,
          fileName: file.name,
          fileSizeBytes: file.size,
          width: null,
          height: null,
          aspectRatio: null,
          durationSec,
          fps: null,
          hasAudio: true,
          orientation: 'unknown',
          estimatedBitrateMbps,
        })
      }

      audio.onerror = () => {
        finish()
        reject(new Error('Unable to read audio metadata'))
      }

      audio.src = objectUrl
    })
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

function inspectGenericFile(file: File): SourceInspection {
  return {
    mediaKind: 'file',
    mimeType: file.type,
    fileName: file.name,
    fileSizeBytes: file.size,
    width: null,
    height: null,
    aspectRatio: null,
    durationSec: null,
    fps: null,
    hasAudio: null,
    orientation: 'unknown',
    estimatedBitrateMbps: null,
  }
}

function normalizeSourceInspection(inspection: unknown): SourceInspection | null {
  if (!inspection || typeof inspection !== 'object') return null

  const candidate = inspection as Partial<SourceInspection> & Record<string, unknown>
  const mediaKind = MEDIA_KINDS.has(candidate.mediaKind as MediaKind)
    ? (candidate.mediaKind as MediaKind)
    : null

  if (!mediaKind) return null

  const width = asFiniteNumberOrNull(candidate.width)
  const height = asFiniteNumberOrNull(candidate.height)
  const orientation = ORIENTATIONS.has(candidate.orientation as SourceOrientation)
    ? (candidate.orientation as SourceOrientation)
    : getOrientation(width, height)

  return {
    mediaKind,
    mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : '',
    fileName: typeof candidate.fileName === 'string' ? candidate.fileName : '',
    fileSizeBytes: asNonNegativeNumber(candidate.fileSizeBytes),
    width,
    height,
    aspectRatio: asFiniteNumberOrNull(candidate.aspectRatio),
    durationSec: asFiniteNumberOrNull(candidate.durationSec),
    fps: asFiniteNumberOrNull(candidate.fps),
    hasAudio: typeof candidate.hasAudio === 'boolean' ? candidate.hasAudio : null,
    orientation,
    estimatedBitrateMbps: asFiniteNumberOrNull(candidate.estimatedBitrateMbps),
  }
}

function classifyAspectFamily(inspection: SourceInspection): SourceAspectFamily {
  if (inspection.mediaKind === 'file' || inspection.mediaKind === 'audio') return 'unsupported'
  if (!inspection.aspectRatio || !inspection.width || !inspection.height) return 'unknown'

  const ratio = inspection.aspectRatio
  const width = inspection.width
  const height = inspection.height

  if (width >= 3840 && ratio >= 1.7 && ratio <= 1.95) return '4k_horizontal'
  if (ratio >= 2.2) return 'ultra_wide'
  if (Math.abs(ratio - 1) <= 0.08) return 'square'
  if (ratio < 1) {
    if (height >= 1920 || width >= 1080) return 'high_res_vertical'
    if (Math.abs(ratio - 9 / 16) <= 0.12) return 'vertical_short'
    return 'vertical_short'
  }
  if (ratio >= 1.6 && ratio <= 1.95) {
    if (width >= 2560) return 'high_res_horizontal'
    return 'horizontal_standard'
  }

  return 'unknown'
}

function classifyDurationBucket(durationSec: number | null): DurationBucket {
  if (!durationSec || durationSec <= 0) return 'unknown'
  if (durationSec < 30) return 'very_short'
  if (durationSec < 90) return 'short'
  if (durationSec < 5 * 60) return 'medium'
  if (durationSec < 20 * 60) return 'long'
  return 'very_long'
}

function classifyTimeProfile(durationBucket: DurationBucket): TimeProfile {
  switch (durationBucket) {
    case 'very_short':
    case 'short':
      return 'quick_edit'
    case 'medium':
      return 'standard_edit'
    case 'long':
      return 'long_form_edit'
    case 'very_long':
      return 'extended_processing'
    default:
      return 'unknown'
  }
}

function classifyWeightBucket(inspection: SourceInspection): FileWeightBucket {
  const sizeScore =
    inspection.fileSizeBytes >= 1_500_000_000
      ? 3
      : inspection.fileSizeBytes >= 450_000_000
        ? 2
        : inspection.fileSizeBytes >= 90_000_000
          ? 1
          : 0

  const durationScore =
    !inspection.durationSec || inspection.durationSec <= 0
      ? 0
      : inspection.durationSec >= 20 * 60
        ? 3
        : inspection.durationSec >= 5 * 60
          ? 2
          : inspection.durationSec >= 90
            ? 1
            : 0

  const pixelCount = inspection.width && inspection.height ? inspection.width * inspection.height : 0
  const resolutionScore =
    pixelCount >= 3840 * 2160
      ? 3
      : pixelCount >= 2560 * 1440
        ? 2
        : pixelCount >= 1920 * 1080
          ? 1
          : 0

  const weighted = sizeScore * 0.45 + durationScore * 0.2 + resolutionScore * 0.35

  if (weighted >= 2.4) return 'very_heavy'
  if (weighted >= 1.55) return 'heavy'
  if (weighted >= 0.7) return 'moderate'
  return 'light'
}

function asFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function classifyProcessingClass(
  inspection: SourceInspection,
  weightBucket: FileWeightBucket
): ProcessingClass {
  const durationSec = inspection.durationSec ?? 0
  const width = inspection.width ?? 0
  const height = inspection.height ?? 0
  const bitrate = inspection.estimatedBitrateMbps ?? 0

  if (
    weightBucket === 'very_heavy' ||
    durationSec >= 20 * 60 ||
    width >= 3840 ||
    height >= 3840 ||
    inspection.fileSizeBytes >= 1_500_000_000 ||
    bitrate >= 45
  ) {
    return 'queue_job'
  }

  if (
    weightBucket === 'heavy' ||
    durationSec >= 5 * 60 ||
    width >= 2560 ||
    height >= 2560 ||
    inspection.fileSizeBytes >= 450_000_000 ||
    bitrate >= 18
  ) {
    return 'heavy_job'
  }

  return 'standard_job'
}

function getOrientation(width: number | null, height: number | null): SourceOrientation {
  if (!width || !height) return 'unknown'
  if (Math.abs(width - height) <= Math.max(width, height) * 0.04) return 'square'
  return height > width ? 'portrait' : 'landscape'
}

function detectVideoAudioPresence(video: HTMLVideoElement): boolean | null {
  const maybeVideo = video as HTMLVideoElement & {
    mozHasAudio?: boolean
    webkitAudioDecodedByteCount?: number
    audioTracks?: { length: number }
  }

  if (typeof maybeVideo.mozHasAudio === 'boolean') return maybeVideo.mozHasAudio
  if (typeof maybeVideo.webkitAudioDecodedByteCount === 'number') {
    return maybeVideo.webkitAudioDecodedByteCount > 0
  }
  if (maybeVideo.audioTracks && typeof maybeVideo.audioTracks.length === 'number') {
    return maybeVideo.audioTracks.length > 0
  }
  return null
}

const FORMATTERS = {
  aspectFamily: {
    vertical_short: 'Vertical short',
    horizontal_standard: 'Horizontal standard',
    square: 'Square',
    ultra_wide: 'Ultra-wide',
    high_res_vertical: 'High-res vertical',
    high_res_horizontal: 'High-res horizontal',
    '4k_horizontal': '4K horizontal',
    unknown: 'Unknown',
    unsupported: 'Unsupported',
  } satisfies Record<SourceAspectFamily, string>,
  duration: {
    very_short: 'Very short',
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
    very_long: 'Very long',
    unknown: 'Unknown',
  } satisfies Record<DurationBucket, string>,
  weight: {
    light: 'Light',
    moderate: 'Moderate',
    heavy: 'Heavy',
    very_heavy: 'Very heavy',
  } satisfies Record<FileWeightBucket, string>,
  timeProfile: {
    quick_edit: 'Quick edit',
    standard_edit: 'Standard edit',
    long_form_edit: 'Long-form edit',
    extended_processing: 'Extended processing',
    unknown: 'Unknown',
  } satisfies Record<TimeProfile, string>,
  processingClass: {
    standard_job: 'Standard job',
    heavy_job: 'Heavy job',
    queue_job: 'Queue job',
  } satisfies Record<ProcessingClass, string>,
  orientation: {
    portrait: 'Portrait',
    landscape: 'Landscape',
    square: 'Square',
    unknown: 'Unknown',
  } satisfies Record<SourceOrientation, string>,
}
