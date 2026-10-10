export const DEFAULT_THUMBNAIL_IMAGE_MODEL = 'gpt-image-2'
export const DEFAULT_THUMBNAIL_IMAGE_BASE_URL = 'https://codex-everywhere.com/v1'

type ThumbnailAspectRatio = '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
type ThumbnailQuality = 'fast' | 'pro'

type ImageEditSize = {
  fast: string
  pro: string
}

const IMAGE_EDIT_SIZES: Record<ThumbnailAspectRatio, ImageEditSize> = {
  '9:16': { fast: '648x1152', pro: '864x1536' },
  '2:3': { fast: '704x1056', pro: '1024x1536' },
  '1:1': { fast: '816x816', pro: '1536x1536' },
  '3:2': { fast: '1056x704', pro: '1536x1024' },
  '16:9': { fast: '1152x648', pro: '1536x864' },
}

const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

export type OpenAIImageEditRequest = {
  model: string
  prompt: string
  images: Array<{ image_url: string }>
  size: string
  quality: 'medium' | 'high'
  output_format: 'png'
  /** Retained in the internal descriptor for compatibility; GPT Image 2 FormData omits it. */
  input_fidelity: 'high'
  n: 1
}

export type OpenAIImageEditInput = {
  model?: string
  prompt: string
  frameDataUrl: string
  baseThumbnailUrl?: string
  referenceImages?: string[]
  aspectRatio: ThumbnailAspectRatio
  quality: ThumbnailQuality
}

export function buildOpenAIImageEditRequest(input: OpenAIImageEditInput): OpenAIImageEditRequest {
  if (!IMAGE_DATA_URL_PATTERN.test(input.frameDataUrl)) {
    throw new Error('A valid video frame is required to generate a thumbnail.')
  }

  const hasBase = Boolean(input.baseThumbnailUrl && IMAGE_DATA_URL_PATTERN.test(input.baseThumbnailUrl))
  const images: Array<{ image_url: string }> = []

  if (hasBase) {
    images.push({ image_url: input.baseThumbnailUrl! })
    images.push({ image_url: input.frameDataUrl })
  } else {
    images.push({ image_url: input.frameDataUrl })
  }

  for (const reference of input.referenceImages?.slice(0, 4) ?? []) {
    if (IMAGE_DATA_URL_PATTERN.test(reference)) images.push({ image_url: reference })
  }

  const promptText = hasBase
    ? `${input.prompt}\n\nUse the first attached image as the base thumbnail to edit iteratively. The second attached image is the video subject anchor. This is an explicitly requested iterative refinement. The first selected reference image is the primary thumbnail style reference; later references are secondary. Preserve the person's identity, base composition, and visual lighting unless the creator asks to change them. Apply the selected reference's visual treatment closely where requested. Do not recreate the image from scratch. Never copy reference faces, logos, or exact wording.`
    : `${input.prompt}\n\nImage roles and priority: use the first attached image as the video subject anchor. The second attached image is the selected primary thumbnail style reference. Any later reference images are secondary style cues. Follow the selected reference closely: transfer its macro-composition, subject-to-text relationship, visual hierarchy, palette, lighting, background treatment, typography style, texture, and graphic devices. Rebuild those qualities around the source subject, exact requested headline, creative brief, and aspect ratio. Keep the source person's identity, expression, and recognizable features. Never copy the reference person's identity, logos, exact words, or factual claims. Create a complete thumbnail, not a flat text overlay on the source frame.`

  return {
    model: input.model?.trim() || DEFAULT_THUMBNAIL_IMAGE_MODEL,
    prompt: promptText,
    images,
    size: IMAGE_EDIT_SIZES[input.aspectRatio][input.quality],
    quality: input.quality === 'pro' ? 'high' : 'medium',
    output_format: 'png',
    input_fidelity: 'high',
    n: 1,
  }
}

/** Build the multipart transport required by OpenAI-compatible image edit APIs. */
export function buildOpenAIImageEditFormData(input: OpenAIImageEditInput): FormData {
  const request = buildOpenAIImageEditRequest(input)
  const form = new FormData()
  form.append('model', request.model)
  form.append('prompt', request.prompt)
  form.append('size', request.size)
  form.append('quality', request.quality)
  form.append('output_format', request.output_format)
  form.append('n', String(request.n))

  const hasBase = Boolean(input.baseThumbnailUrl && IMAGE_DATA_URL_PATTERN.test(input.baseThumbnailUrl))
  request.images.forEach((image, index) => {
    const parsed = parseImageDataUrl(image.image_url)!
    const bytes = Uint8Array.from(Buffer.from(parsed.data, 'base64'))
    const extension = parsed.mimeType === 'image/jpeg' ? 'jpg' : parsed.mimeType.split('/')[1]
    const label = hasBase
      ? (index === 0 ? 'base-thumbnail' : index === 1 ? 'video-frame' : index === 2 ? 'selected-primary-reference' : `additional-style-reference-${index - 2}`)
      : (index === 0 ? 'video-frame' : index === 1 ? 'selected-primary-reference' : `additional-style-reference-${index - 1}`)
    form.append('image[]', new Blob([bytes], { type: parsed.mimeType }), `${label}.${extension}`)
  })

  return form
}

function parseImageDataUrl(value: string): { mimeType: string; data: string } {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match) throw new Error('A valid image is required to generate a thumbnail.')
  return { mimeType: match[1], data: match[2] }
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
