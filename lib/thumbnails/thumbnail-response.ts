export type ThumbnailGenerationResponse = { dataUrl?: unknown; error?: unknown }

/** Parse the studio response without leaking upstream HTML into a JSON syntax error. */
export async function readThumbnailGenerationResponse(response: Pick<Response, 'text' | 'headers' | 'status' | 'redirected'>): Promise<ThumbnailGenerationResponse> {
  const body = await response.text()
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as ThumbnailGenerationResponse
  } catch {
    const isHtml = response.headers.get('content-type')?.includes('text/html') || /^\s*<!doctype html|^\s*<html[\s>]/i.test(body)
    if (isHtml || response.redirected) {
      if (response.status === 401 || response.status === 403) throw new Error('Your session expired. Sign in again, then retry thumbnail generation.')
      throw new Error('The thumbnail service returned a web page instead of artwork. Refresh the editor and try again; your current versions are safe.')
    }
  }
  throw new Error('The thumbnail service returned an unreadable response. Try again; your current versions are safe.')
}
