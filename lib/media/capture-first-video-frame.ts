'use client'

/** Decode a representative opening frame, skipping a brief black lead-in when possible. */
export async function captureFirstVideoFrame(src: string, timeoutMs = 8_000): Promise<string | null> {
  if (typeof document === 'undefined' || !src) return null
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.src = src

  try {
    await new Promise<void>((resolve, reject) => {
      let timeout = 0
      const finish = (error?: Error) => {
        window.clearTimeout(timeout)
        video.onloadedmetadata = null
        video.onloadeddata = null
        video.onseeked = null
        video.onerror = null
        error ? reject(error) : resolve()
      }
      timeout = window.setTimeout(() => finish(new Error('Video preview timed out')), timeoutMs)
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0
        const targetTime = Math.min(0.75, Math.max(0, duration - 0.05))
        if (targetTime <= 0) {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish()
          else video.onloadeddata = () => finish()
          return
        }

        video.onseeked = () => finish()
        video.currentTime = targetTime
      }
      video.onerror = () => finish(new Error('Video preview could not be loaded'))
      video.load()
    })

    if (!video.videoWidth || !video.videoHeight) return null
    const scale = Math.min(1, 640 / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
}
