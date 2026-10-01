import { z } from 'zod'

const seconds = z.number().finite().min(0).max(86400)
export const referenceAnalysisSchema = z.object({
  style_reference: z.string().trim().min(1).max(300),
  editing_breakdown: z.string().trim().min(1).max(4000),
  reference_duration_sec: seconds.refine(value => value > 0),
  treatment: z.enum(['clean', 'contrast', 'warm', 'mono']),
  caption_style: z.enum(['none', 'clean_bold', 'karaoke_pop', 'typewriter', 'lower_third']),
  zooms: z.array(z.object({
    start_sec: seconds, end_sec: seconds,
    scale: z.number().finite().min(1).max(1.4), kind: z.enum(['smooth', 'punch']),
  }).refine(cue => cue.end_sec > cue.start_sec)).max(24),
  observations: z.array(z.object({ time_sec: seconds, detail: z.string().trim().min(1).max(600) })).min(1).max(12),
  limitations: z.array(z.string().trim().min(1).max(500)).max(12),
}).refine(plan => plan.zooms.every(cue => cue.end_sec <= plan.reference_duration_sec)
  && plan.observations.every(item => item.time_sec <= plan.reference_duration_sec))
export type ReferenceAnalysis = z.infer<typeof referenceAnalysisSchema>

export const appliedReferenceStyleSchema = z.object({
  videoUrl: z.string().max(2048).refine(url => { try { normalizeReferenceUrl(url); return true } catch { return false } }),
  styleReference: z.string().min(1).max(300),
  treatment: z.enum(['clean', 'contrast', 'warm', 'mono']),
  captionStyle: z.enum(['none', 'clean_bold', 'karaoke_pop', 'typewriter', 'lower_third']),
  zooms: z.array(z.object({
    id: z.string().min(1).max(200), start: seconds, end: seconds,
    scale: z.number().finite().min(1).max(1.4), kind: z.enum(['smooth', 'punch']),
  }).refine(cue => cue.end > cue.start)).max(24),
})
export type AppliedReferenceStyle = z.infer<typeof appliedReferenceStyleSchema>

/** Direct video URL support in the provider is limited to public YouTube videos. */
export function normalizeReferenceUrl(raw: string): string {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a public HTTPS YouTube video link.')
  const host = url.hostname.toLowerCase()
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) throw new Error('Reference analysis currently supports public YouTube videos.')
  const id = host === 'youtu.be' ? url.pathname.slice(1) : url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1]
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error('Use a link to a specific YouTube video.')
  return `https://www.youtube.com/watch?v=${id}`
}

export function parseReferenceAnalysis(text: string): ReferenceAnalysis | null {
  try {
    const result = referenceAnalysisSchema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()))
    return result.success ? result.data : null
  } catch { return null }
}

/** Copy timing proportions, not source content or claims of frame-exact equivalence. */
export function mapReferenceStyle(analysis: ReferenceAnalysis, url: string, durationSec: number): AppliedReferenceStyle {
  const checked = referenceAnalysisSchema.parse(analysis)
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 86400) throw new Error('A ready source video with a known duration is required.')
  const ratio = durationSec / checked.reference_duration_sec
  return appliedReferenceStyleSchema.parse({
    videoUrl: normalizeReferenceUrl(url), styleReference: checked.style_reference,
    treatment: checked.treatment, captionStyle: checked.caption_style,
    zooms: checked.zooms.map((cue, index) => ({ id: `reference-zoom-${index}`, start: cue.start_sec * ratio, end: Math.min(durationSec, cue.end_sec * ratio), scale: cue.scale, kind: cue.kind })),
  })
}

export const REFERENCE_TREATMENT_FILTERS = {
  clean: 'none', contrast: 'contrast(1.12) saturate(1.08)',
  warm: 'sepia(.15) saturate(1.12) contrast(1.04)', mono: 'grayscale(1) contrast(1.12)',
} as const

export function referencePreviewAt(style: AppliedReferenceStyle | null | undefined, timeSec: number) {
  const cue = style?.zooms.find(item => timeSec >= item.start && timeSec < item.end)
  const fraction = cue ? Math.max(0, Math.min(1, (timeSec - cue.start) / (cue.end - cue.start))) : 0
  const eased = fraction * fraction * (3 - 2 * fraction)
  const scale = cue ? cue.kind === 'punch' ? cue.scale : 1 + (cue.scale - 1) * eased : 1
  return { scale, filter: style ? REFERENCE_TREATMENT_FILTERS[style.treatment] : 'none' }
}
