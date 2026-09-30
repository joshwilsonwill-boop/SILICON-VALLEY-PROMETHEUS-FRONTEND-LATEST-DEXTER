import * as React from 'react'

const thumbnailCache = new Map<string, string[]>()

/** Capture a small, real filmstrip from the source without seeking the preview player. */
export function useEditorialTimelineThumbnails(sourceUrl: string, count = 10) {
  const [thumbnails, setThumbnails] = React.useState<string[]>(() => thumbnailCache.get(sourceUrl) ?? [])

  React.useEffect(() => {
    const cached = thumbnailCache.get(sourceUrl)
    if (cached) {
      setThumbnails(cached)
      return
    }
    setThumbnails([])
    if (!sourceUrl) return

    let cancelled = false
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.playsInline = true
    if (/^https?:\/\//i.test(sourceUrl)) video.crossOrigin = 'anonymous'

    const waitFor = (eventName: string) => new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup()
        reject(new Error(`Timeline frame ${eventName} timed out`))
      }, 6000)
      const onReady = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); reject(new Error('Timeline source unavailable')) }
      const cleanup = () => {
        window.clearTimeout(timeout)
        video.removeEventListener(eventName, onReady)
        video.removeEventListener('error', onError)
      }
      video.addEventListener(eventName, onReady, { once: true })
      video.addEventListener('error', onError, { once: true })
    })

    const capture = async () => {
      try {
        const metadata = waitFor('loadedmetadata')
        video.src = sourceUrl
        await metadata
        if (cancelled || !Number.isFinite(video.duration) || video.duration <= 0) return

        const canvas = document.createElement('canvas')
        canvas.width = 144
        canvas.height = 81
        const context = canvas.getContext('2d')
        if (!context) return
        const frames: string[] = []
        for (let index = 0; index < count; index += 1) {
          if (cancelled) return
          const seeked = waitFor('seeked')
          video.currentTime = Math.min(Math.max(0, video.duration - 0.08), ((index + 0.5) / count) * video.duration)
          await seeked
          if (cancelled) return
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.68))
        }
        thumbnailCache.set(sourceUrl, frames)
        if (!cancelled) setThumbnails(frames)
      } catch {
        // Remote sources without canvas CORS support retain the visual fallback.
      } finally {
        video.removeAttribute('src')
        video.load()
      }
    }

    void capture()
    return () => {
      cancelled = true
      video.removeAttribute('src')
      video.load()
    }
  }, [sourceUrl, count])

  return thumbnails
}
