export type ThumbnailGenerationResponse = { dataUrl?: unknown; error?: unknown }

/** Parse the studio response without leaking upstream HTML into a JSON syntax error. */
export async function readThumbnailGenerationResponse(response: Pick<Response, 'text' | 'headers' | 'status' | 'redirected' | 'url'>): Promise<ThumbnailGenerationResponse> {
  const body = await response.text()
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as ThumbnailGenerationResponse
  } catch {
    const isHtml = response.headers.get('content-type')?.includes('text/html') || /^\s*<!doctype html|^\s*<html[\s>]/i.test(body)
    if (isHtml || response.redirected) {
      const contentType = response.headers.get('content-type')?.split(';')[0] || 'unknown content type'
      const platformError = response.headers.get('x-vercel-error')?.match(/^[A-Z0-9_-]{1,80}$/)?.[0]
      const requestId = response.headers.get('x-vercel-id') || response.headers.get('x-request-id')
      const diagnostic = [platformError, requestId ? 'request ' + requestId : ''].filter(Boolean).join(', ')
      let finalPath = ''
      try { finalPath = new URL(response.url).pathname.toLowerCase() } catch { /* synthetic responses may have no URL */ }
      if ((response.status === 401 || response.status === 403) || /\/(login|signin|sign-in|auth)(\/|$)/.test(finalPath)) throw new Error('The thumbnail request was redirected to sign-in (HTTP ' + response.status + '). Your session may have expired; sign in and retry. Your saved versions are safe.')
      if (response.status === 413) throw new Error('The server rejected the thumbnail request as too large (HTTP 413) before generation. Try a smaller source image or fewer style references. Your current versions are safe.')
      if (response.status === 404) throw new Error('The thumbnail API route was not found (HTTP 404); this usually means the editor is connected to a stale or incorrect app server. Refresh the app. Your current versions are safe.')
      throw new Error('The thumbnail service returned a gateway page instead of artwork (HTTP ' + response.status + ', ' + contentType + '). This usually points to the app function or gateway; it does not identify a Gemini key error.' + (diagnostic ? ' Vercel details: ' + diagnostic + '.' : '') + ' Check the Vercel function logs. Your current versions are safe.')
    }
  }
  throw new Error('The thumbnail service returned an unreadable response. Try again; your current versions are safe.')
}
