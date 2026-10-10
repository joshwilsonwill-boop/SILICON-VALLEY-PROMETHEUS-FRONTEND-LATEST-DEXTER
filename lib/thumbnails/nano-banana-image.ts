type ImagePart = { inline_data: { mime_type: string; data: string } }
type TextPart = { text: string }

export type NanoBananaImageRequest = {
  contents: Array<{ role: 'user'; parts: Array<TextPart | ImagePart> }>
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE']
    imageConfig: { aspectRatio: '9:16' | '2:3' | '1:1' | '3:2' | '16:9'; imageSize?: '1K' | '2K' }
  }
}

export function parseImageDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  return match ? { mimeType: match[1], data: match[2] } : null
}

export function buildNanoBananaImageRequest(input: {
  prompt: string
  frameDataUrl: string
  baseThumbnailUrl?: string
  referenceImages?: string[]
  aspectRatio: '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
  imageSize?: '1K' | '2K'
}): NanoBananaImageRequest {
  const frame = parseImageDataUrl(input.frameDataUrl)
  if (!frame) throw new Error('A valid video frame is required to generate a thumbnail.')

  const baseThumbnail = input.baseThumbnailUrl ? parseImageDataUrl(input.baseThumbnailUrl) : null

  const instructionPreamble = baseThumbnail
    ? `${input.prompt}\n\nThis is an iterative refinement of the existing thumbnail, explicitly requested by the creator. Use the first attached image as the video subject anchor and the second attached image as the existing base artwork to refine. The first selected reference image is the primary thumbnail style reference; later references are secondary. Keep the base composition unless the creator asks to change it, while applying the selected reference's visual treatment closely where requested. Preserve the source person's identity. Never copy reference faces, logos, or exact wording.`
    : `${input.prompt}\n\nImage roles and priority: use the first attached image as the video subject anchor. The second attached image is the selected primary thumbnail style reference. Any later reference images are secondary style cues. Follow the selected reference closely: transfer its macro-composition, subject-to-text relationship, visual hierarchy, palette, lighting, background treatment, typography style, texture, and graphic devices. Rebuild those qualities around the source subject, exact requested headline, creative brief, and aspect ratio. Keep the source person's identity, expression, and recognizable features. Never copy the reference person's identity, logos, exact words, or factual claims. Create a complete thumbnail, not a flat text overlay on the source frame.`

  const parts: Array<TextPart | ImagePart> = [
    { text: instructionPreamble },
    { text: 'Video frame and principal subject:' },
    { inline_data: { mime_type: frame.mimeType, data: frame.data } },
  ]

  if (baseThumbnail) {
    parts.push({ text: 'Current base thumbnail being iteratively refined:' })
    parts.push({ inline_data: { mime_type: baseThumbnail.mimeType, data: baseThumbnail.data } })
  }

  input.referenceImages?.slice(0, 4).forEach((value, index) => {
    const reference = parseImageDataUrl(value)
    if (!reference) return
    parts.push({ text: index === 0 ? 'Selected primary thumbnail style reference:' : `Additional secondary style reference ${index}:` })
    parts.push({ inline_data: { mime_type: reference.mimeType, data: reference.data } })
  })

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: input.aspectRatio, ...(input.imageSize ? { imageSize: input.imageSize } : {}) },
    },
  }
}

export function extractGeneratedImage(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const candidates = (response as { candidates?: Array<{ content?: { parts?: Array<{ thought?: boolean; inlineData?: { mimeType?: string; data?: string } }> } }> }).candidates
  for (const candidate of candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.thought) continue
      const image = part.inlineData
      if (image?.mimeType?.startsWith('image/') && image.data) {
        return `data:${image.mimeType};base64,${image.data}`
      }
    }
  }
  return null
}
