'use client'

/** Decode only enough of a video to use its opening frame as a lightweight preview. */
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
        video.onloadeddata = null
        video.onerror = null
        error ? reject(error) : resolve()
      }
      timeout = window.setTimeout(() => finish(new Error('Video preview timed out')), timeoutMs)
      video.onloadeddata = () => finish()
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
