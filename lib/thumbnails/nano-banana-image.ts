type ImagePart = { inline_data: { mime_type: string; data: string } }
type TextPart = { text: string }

export type NanoBananaImageRequest = {
  contents: Array<{ role: 'user'; parts: Array<TextPart | ImagePart> }>
  generationConfig: {
    responseModalities: ['TEXT', 'IMAGE']
    imageConfig: { aspectRatio: '9:16' | '2:3' | '1:1' | '16:9' }
  }
}

export function parseImageDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  return match ? { mimeType: match[1], data: match[2] } : null
}

export function buildNanoBananaImageRequest(input: {
  prompt: string
  frameDataUrl: string
  referenceImages?: string[]
  aspectRatio: '9:16' | '2:3' | '1:1' | '16:9'
}): NanoBananaImageRequest {
  const frame = parseImageDataUrl(input.frameDataUrl)
  if (!frame) throw new Error('A valid video frame is required to generate a thumbnail.')

  const parts: Array<TextPart | ImagePart> = [
    { text: `${input.prompt}\n\nUse the first attached image as the video subject anchor. Preserve the person's identity, expression, and recognizable features. Recompose the scene as a new, complete cinematic thumbnail; do not simply add text to the original frame. Any following images are visual style references only. Do not copy their people, logos, exact text, or layout. Render the requested headline exactly, with a clear reading order and safe margins.` },
    { text: 'Video frame and principal subject:' },
    { inline_data: { mime_type: frame.mimeType, data: frame.data } },
  ]

  input.referenceImages?.slice(0, 4).forEach((value, index) => {
    const reference = parseImageDataUrl(value)
    if (!reference) return
    parts.push({ text: `Visual style reference ${index + 1}:` })
    parts.push({ inline_data: { mime_type: reference.mimeType, data: reference.data } })
  })

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: input.aspectRatio },
    },
  }
}

export function extractGeneratedImage(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const candidates = (response as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> }).candidates
  for (const candidate of candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const image = part.inlineData
      if (image?.mimeType?.startsWith('image/') && image.data) {
        return `data:${image.mimeType};base64,${image.data}`
      }
    }
  }
  return null
}
