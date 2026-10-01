export type ThumbnailPromptContext = {
  projectTitle: string
  transcriptSnippet: string
  headline: string
  creativeDirection: string
  aspectRatio: string
  referenceCue: string
}

export const THUMBNAIL_PROMPT_PLANNER_INSTRUCTIONS = `You are the thumbnail creative director for a video platform. Inspect the attached source frame and visual reference images. Return JSON with one string field, "artDirection" (maximum 1200 characters). Create a specific image-generation direction from the creator's brief and video's actual topic. Optimize for truthful viewer retention: clear subject and promise at feed size, a strong but honest curiosity gap, emotional specificity, visual contrast, and one obvious focal point. Never invent statistics, outcomes, quotes, products, or scene details. The first image is the person or subject whose identity must remain recognizable. Following images are style references only: transfer their visual language, not their subjects, logos, or exact layout. Honor the exact supplied headline, reference look, creative brief, and aspect ratio. Describe composition, lighting, color, supporting prop, and negative space. Do not write the headline again or add any other text.`

export function buildThumbnailPromptPlannerText(context: ThumbnailPromptContext): string {
  return [
    'Plan one finished thumbnail image for this project.',
    `Project: ${context.projectTitle.trim().slice(0, 120) || 'Untitled project'}`,
    `Video transcript/context: ${context.transcriptSnippet.trim().slice(0, 5000) || 'No transcript supplied; infer only from visible source and creator brief.'}`,
    `Exact headline to render: ${JSON.stringify(context.headline.trim().slice(0, 64))}`,
    `Creator brief: ${context.creativeDirection.trim().slice(0, 500) || 'No extra brief; use a strong truthful visual hook for the video topic.'}`,
    `Selected aspect ratio: ${context.aspectRatio}`,
    `Selected library reference: ${context.referenceCue.trim().slice(0, 500) || 'No named library reference.'}`,
    'The images are attached in this order: source video frame first, then selected library or creator style references.',
  ].join('\n')
}

export function extractPlannedArtDirection(responseText: string): string | null {
  try {
    const parsed = JSON.parse(responseText) as { artDirection?: unknown }
    if (typeof parsed.artDirection !== 'string') return null
    const direction = parsed.artDirection.replace(/\s+/g, ' ').trim().slice(0, 1200)
    return direction || null
  } catch {
    return null
  }
}
