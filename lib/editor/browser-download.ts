function clickDownload(url: string, filename: string, openInNewTab = false) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  if (openInNewTab) anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function isCrossOriginHttpUrl(url: string, baseUrl = window.location.href) {
  try {
    const parsedUrl = new URL(url, baseUrl)
    const parsedBaseUrl = new URL(baseUrl)
    return /^https?:$/.test(parsedUrl.protocol) && parsedUrl.origin !== parsedBaseUrl.origin
  } catch {
    return false
  }
}

export async function downloadMedia(url: string, filename: string, fetcher = fetch) {
  let response: Response
  try {
    response = await fetcher(url)
  } catch (error) {
    // A signed R2 preview can be valid while blocking JavaScript fetches via
    // CORS. The browser can still follow that delivery URL directly.
    if (isCrossOriginHttpUrl(url)) {
      clickDownload(url, filename, true)
      return
    }
    throw error
  }

  if (!response.ok) throw new Error('Unable to download the video.')

  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}
