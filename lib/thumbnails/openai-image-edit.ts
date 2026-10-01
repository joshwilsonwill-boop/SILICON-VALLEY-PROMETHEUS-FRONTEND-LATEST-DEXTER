export const DEFAULT_THUMBNAIL_IMAGE_MODEL = 'gpt-image-2'
export const DEFAULT_THUMBNAIL_IMAGE_BASE_URL = 'https://codex-everywhere.com/v1'

type ThumbnailAspectRatio = '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
type ThumbnailQuality = 'fast' | 'pro'

type ImageEditSize = {
  fast: string
  pro: string
}

const IMAGE_EDIT_SIZES: Record<ThumbnailAspectRatio, ImageEditSize> = {
  '9:16': { fast: '576x1024', pro: '864x1536' },
  '2:3': { fast: '672x1024', pro: '1024x1536' },
  '1:1': { fast: '1024x1024', pro: '1536x1536' },
  '3:2': { fast: '960x640', pro: '1536x1024' },
  '16:9': { fast: '1024x576', pro: '1536x864' },
}

const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

export type OpenAIImageEditRequest = {
  model: string
  prompt: string
  images: Array<{ image_url: string }>
  size: string
  quality: 'medium' | 'high'
  output_format: 'png'
  input_fidelity: 'high'
  n: 1
}

export function buildOpenAIImageEditRequest(input: {
  model?: string
  prompt: string
  frameDataUrl: string
  referenceImages?: string[]
  aspectRatio: ThumbnailAspectRatio
  quality: ThumbnailQuality
}): OpenAIImageEditRequest {
  if (!IMAGE_DATA_URL_PATTERN.test(input.frameDataUrl)) {
    throw new Error('A valid video frame is required to generate a thumbnail.')
  }

  const images = [{ image_url: input.frameDataUrl }]
  for (const reference of input.referenceImages?.slice(0, 4) ?? []) {
    if (IMAGE_DATA_URL_PATTERN.test(reference)) images.push({ image_url: reference })
  }

  return {
    model: input.model?.trim() || DEFAULT_THUMBNAIL_IMAGE_MODEL,
    prompt: `${input.prompt}\n\nUse the first attached image as the video subject anchor. Preserve the person's identity, expression, and recognizable features. Recompose the scene as a new, complete cinematic thumbnail; do not simply add text to the original frame. Any following images are visual style references only. Do not copy their people, logos, exact text, or layout. Render the requested headline exactly, with a clear reading order and safe margins.`,
    images,
    size: IMAGE_EDIT_SIZES[input.aspectRatio][input.quality],
    quality: input.quality === 'pro' ? 'high' : 'medium',
    output_format: 'png',
    input_fidelity: 'high',
    n: 1,
  }
}

export function resolveOpenAIImageEditEndpoint(baseUrl?: string) {
  const configured = baseUrl?.trim() || DEFAULT_THUMBNAIL_IMAGE_BASE_URL
  const parsed = new URL(configured)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('The thumbnail image service URL must be an HTTPS base URL without embedded credentials or query parameters.')
  }

  const basePath = parsed.pathname.replace(/\/+$/, '')
  if (basePath.endsWith('/v1/images/edits') || basePath.endsWith('/images/edits')) {
    parsed.pathname = basePath
  } else if (!basePath || basePath === '/') parsed.pathname = '/v1/images/edits'
  else if (basePath.endsWith('/v1')) parsed.pathname = `${basePath}/images/edits`
  else parsed.pathname = `${basePath}/v1/images/edits`

  return parsed.toString()
}

export function extractOpenAIImageEditResult(response: unknown) {
  if (!response || typeof response !== 'object') return null
  const data = (response as { data?: Array<{ b64_json?: unknown }> }).data
  const encoded = data?.[0]?.b64_json
  if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(encoded)) return null
  return `data:image/png;base64,${encoded}`
}
