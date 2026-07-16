export type SourceMetadata = {
  duration?: number | null
  height?: number | null
  size?: number | null
  width?: number | null
}

export type SourceStatus = {
  duration: string
  fileSize: string
  resolution: string
}

const EMPTY_VALUE = '—'

export function formatSourceStatus(metadata: SourceMetadata): SourceStatus {
  return {
    duration: formatDuration(metadata.duration),
    fileSize: formatFileSize(metadata.size),
    resolution: formatResolution(metadata.width, metadata.height),
  }
}

function formatDuration(duration: number | null | undefined) {
  if (!Number.isFinite(duration) || !duration || duration < 0) return EMPTY_VALUE

  const totalSeconds = Math.floor(duration)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)

  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatFileSize(size: number | null | undefined) {
  if (!Number.isFinite(size) || !size || size < 0) return EMPTY_VALUE
  const megabytes = size / (1024 * 1024)
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`
}

function formatResolution(width: number | null | undefined, height: number | null | undefined) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !width || !height) return EMPTY_VALUE
  return `${width} × ${height}`
}
