/**
 * Timeline Document & Editorial Plan Engine
 * Treats the multi-track video timeline as an editable JSON document and
 * aligns frontend zoom archetypes with the backend orchestration pipeline.
 */

export const ZOOM_ARCHETYPES = [
  'joseph_edit',
  'smooth_zoom_in',
  'punch_zoom',
  'slow_drift',
  'snap_cut',
] as const

export type ZoomArchetype = typeof ZOOM_ARCHETYPES[number]

export interface TimelineZoomCue {
  id: string
  startSec: number
  endSec: number
  kind: ZoomArchetype
  scale: number
  targetX?: number
  targetY?: number
}

export interface TimelineTrackVideo {
  sourceAssetId: string
  opacity: number
  volume: number
  cutRanges: Array<{ startSec: number; endSec: number }>
  lookPreset?: string
  lut?: string
}

export interface TimelineTrackMusic {
  trackId: string | null
  trackTitle?: string
  volume: number
  ducking: boolean
  startSec?: number
}

export interface TimelineTrackCaptions {
  enabled: boolean
  style: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third'
  color: string
  fontSize?: number
  alignment?: 'center' | 'bottom' | 'top'
}

export interface TimelineDocumentTracks {
  video: TimelineTrackVideo
  music: TimelineTrackMusic
  captions: TimelineTrackCaptions
  zooms: TimelineZoomCue[]
  brolls?: Array<{ id: string; startSec: number; endSec: number; prompt: string }>
}

export interface TimelineDocument {
  version: string
  durationSec: number
  tracks: TimelineDocumentTracks
  metadata: {
    createdAt: string
    updatedAt: string
    title?: string
  }
}

export interface EditorialPlanOptions {
  durationSec?: number
  transcriptSegments?: Array<{ startSec: number; endSec: number; text: string; isCut?: boolean }>
}

export interface EditorialPlan {
  summary: string
  captionStyle: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third'
  lookPreset: string
  lightingAdjustment?: string
  musicDirection: string
  zooms: TimelineZoomCue[]
  brollSuggestions: string[]
  pacing: 'cinematic' | 'fast' | 'deliberate'
}

/**
 * Creates an initial default timeline document for a project.
 */
export function createDefaultTimelineDocument(options: {
  durationSec?: number
  sourceAssetId?: string
  title?: string
}): TimelineDocument {
  const durationSec = options.durationSec ?? 60
  const sourceAssetId = options.sourceAssetId ?? 'default-asset'

  return {
    version: '1.0.0',
    durationSec,
    tracks: {
      video: {
        sourceAssetId,
        opacity: 1,
        volume: 1,
        cutRanges: [],
        lookPreset: 'natural',
      },
      music: {
        trackId: null,
        volume: 0.65,
        ducking: true,
      },
      captions: {
        enabled: true,
        style: 'clean_bold',
        color: '#ffffff',
        alignment: 'bottom',
      },
      zooms: [],
      brolls: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: options.title ?? 'Untitled Timeline',
    },
  }
}

/**
 * Analyzes the user's creative prompt and video transcript to build
 * a structured editorial plan with pacing, LUT look, caption presets, and dynamic zooms.
 */
export function buildEditorialPlan(
  prompt: string,
  context: EditorialPlanOptions = {}
): EditorialPlan {
  const p = prompt.toLowerCase()
  const duration = context.durationSec || 45
  // Infer tone & caption style
  let captionStyle: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third' = 'clean_bold'
  let lookPreset = 'natural'
  let musicDirection = 'No soundtrack selected; choose one using the video context.'
  let pacing: 'cinematic' | 'fast' | 'deliberate' = 'deliberate'

  if (p.includes('hype') || p.includes('tiktok') || p.includes('short') || p.includes('viral')) {
    captionStyle = 'karaoke_pop'
    lookPreset = 'vibrant_high_contrast'
    musicDirection = 'Upbeat electronic could fit; no track selected.'
    pacing = 'fast'
  } else if (p.includes('typewriter') || p.includes('minimal') || p.includes('clean')) {
    captionStyle = 'typewriter'
    lookPreset = 'nordic_minimal_desaturated'
    musicDirection = 'Ambient or lofi could fit; no track selected.'
    pacing = 'deliberate'
  } else if (p.includes('documentary') || p.includes('interview') || p.includes('film') || p.includes('cinematic')) {
    captionStyle = 'clean_bold'
    lookPreset = 'documentary_35mm_warmth'
    musicDirection = 'A restrained cinematic bed could fit; no track selected.'
    pacing = 'cinematic'
  }

  // Keep movement subtle and attach it to recorded speech timing. Never invent
  // camera beats from a guessed interval when the transcript has no timestamps.
  const zooms: TimelineZoomCue[] = []
  const transcriptBeats = (context.transcriptSegments ?? [])
    .filter((segment) => !segment.isCut && Number.isFinite(segment.startSec) && Number.isFinite(segment.endSec)
      && segment.startSec >= 0 && segment.endSec > segment.startSec && segment.startSec < duration)
    .map((segment, index) => {
      const words = segment.text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []
      const distinctWords = new Set(words)
      const emphasis = /\b(why|how|because|important|secret|mistake|result|first|never|best|worst|finally|remember|discover)\b/iu.test(segment.text)
      return { segment, index, score: Math.min(5, distinctWords.size) + (emphasis ? 3 : 0) }
    })
    .filter((beat) => beat.score > 0)
    .sort((first, second) => second.score - first.score || first.segment.startSec - second.segment.startSec)
  const selectedBeats: typeof transcriptBeats = []
  const maxMoves = Math.min(4, Math.floor(duration / 12))
  for (const beat of transcriptBeats) {
    if (selectedBeats.length >= maxMoves) break
    const center = (beat.segment.startSec + beat.segment.endSec) / 2
    if (selectedBeats.some((picked) => Math.abs(center - (picked.segment.startSec + picked.segment.endSec) / 2) < 8)) continue
    selectedBeats.push(beat)
    if (selectedBeats.length >= maxMoves) break
  }
  for (const [index, beat] of selectedBeats.entries()) {
    const center = Math.max(0, Math.min(duration, (beat.segment.startSec + beat.segment.endSec) / 2))
    const startSec = Math.min(Math.max(0, center - 1), Math.max(0, duration - 0.1))
    zooms.push({
      id: `jarvis-plan-zoom-${beat.index}-${index}`,
      startSec,
      endSec: Math.min(duration, startSec + 3),
      kind: 'smooth_zoom_in',
      scale: 1.08,
    })
  }

  // No b-roll is proposed without sourced footage or a generation pass.
  const brollSuggestions: string[] = []

  return {
    summary: `Editorial plan: ${captionStyle} captions, ${zooms.length} transcript-timed movement cues, and ${musicDirection}`,
    captionStyle,
    lookPreset,
    musicDirection,
    zooms,
    brollSuggestions,
    pacing,
  }
}

/**
 * Applies an editorial plan onto an existing TimelineDocument, updating tracks,
 * caption styling, and camera zooms.
 */
export function applyEditorialPlanToTimeline(
  doc: TimelineDocument,
  plan: EditorialPlan
): TimelineDocument {
  return {
    ...doc,
    tracks: {
      ...doc.tracks,
      captions: {
        ...doc.tracks.captions,
        style: plan.captionStyle,
      },
      video: {
        ...doc.tracks.video,
        lookPreset: plan.lookPreset,
        lut: plan.lookPreset,
      },
      music: { ...doc.tracks.music },
      zooms: [...plan.zooms],
      brolls: plan.brollSuggestions.map((prompt, idx) => ({
        id: `broll-${idx}`,
        startSec: (idx + 1) * 8,
        endSec: (idx + 1) * 8 + 4,
        prompt,
      })),
    },
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString(),
    },
  }
}
