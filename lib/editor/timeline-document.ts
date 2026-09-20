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
  transcriptText?: string
  brandProfile?: {
    brandName?: string
    tone?: string
    preferredCaptionStyle?: string
  }
}

export interface EditorialPlan {
  summary: string
  captionStyle: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third'
  lookPreset: string
  lightingAdjustment?: string
  musicDirection: string
  suggestedTrackId?: string
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
  const transcript = context.transcriptText?.toLowerCase() || ''

  // Infer tone & caption style
  let captionStyle: 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third' = 'clean_bold'
  let lookPreset = 'cinematic_teal_orange'
  let musicDirection = 'Cinematic Trailer Epic Intense'
  let suggestedTrackId = 'music-preview-cinematic-trailer-epic-intense-trailer'
  let pacing: 'cinematic' | 'fast' | 'deliberate' = 'cinematic'

  if (p.includes('hype') || p.includes('tiktok') || p.includes('short') || p.includes('viral')) {
    captionStyle = 'karaoke_pop'
    lookPreset = 'vibrant_high_contrast'
    musicDirection = 'Upbeat Electronic Drive'
    suggestedTrackId = 'music-preview-upbeat-electronic-drive'
    pacing = 'fast'
  } else if (p.includes('typewriter') || p.includes('minimal') || p.includes('clean')) {
    captionStyle = 'typewriter'
    lookPreset = 'nordic_minimal_desaturated'
    musicDirection = 'Ambient Lofi Chill Beat'
    suggestedTrackId = 'music-preview-ambient-lofi-chill-beat'
    pacing = 'deliberate'
  } else if (p.includes('documentary') || p.includes('interview') || p.includes('film') || p.includes('cinematic')) {
    captionStyle = 'clean_bold'
    lookPreset = 'documentary_35mm_warmth'
    musicDirection = 'Cinematic Trailer Epic Intense'
    suggestedTrackId = 'music-preview-cinematic-trailer-epic-intense-trailer'
    pacing = 'cinematic'
  }

  // Generate dynamic zooms aligned with backend ZOOM_KINDS
  const zooms: TimelineZoomCue[] = []
  const zoomInterval = Math.max(6, Math.min(14, Math.floor(duration / 4)))

  for (let t = 2; t < duration - 3; t += zoomInterval) {
    const kind: ZoomArchetype =
      t % 3 === 0 ? 'punch_zoom' : t % 2 === 0 ? 'joseph_edit' : 'smooth_zoom_in'
    const scale = kind === 'punch_zoom' ? 1.25 : kind === 'joseph_edit' ? 1.18 : 1.12
    zooms.push({
      id: `zoom-${t}`,
      startSec: t,
      endSec: Math.min(duration, t + 3.5),
      kind,
      scale,
    })
  }

  if (zooms.length === 0) {
    zooms.push({
      id: 'zoom-init',
      startSec: 1,
      endSec: Math.min(duration, 5),
      kind: 'smooth_zoom_in',
      scale: 1.15,
    })
  }

  // Generate contextual B-roll suggestions
  const brollSuggestions: string[] = []
  if (transcript.includes('garage') || transcript.includes('start') || transcript.includes('built')) {
    brollSuggestions.push('Archival workshop or garage drafting table B-roll')
  }
  if (transcript.includes('product') || transcript.includes('tech') || transcript.includes('code')) {
    brollSuggestions.push('Macro hardware engineering or software workflow montage')
  }
  if (brollSuggestions.length === 0) {
    brollSuggestions.push('Wide establishing atmospheric slow-motion shot')
    brollSuggestions.push('Close-up focused reaction shot')
  }

  return {
    summary: `Cinematic editorial plan: ${captionStyle} captions, ${lookPreset} color grading, ${zooms.length} dynamic camera moves (${zooms.map((z) => z.kind).slice(0, 3).join(', ')}), and ${musicDirection}.`,
    captionStyle,
    lookPreset,
    lightingAdjustment: '35mm Film Print Emulation + Soft High-Key Fill',
    musicDirection,
    suggestedTrackId,
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
      music: {
        ...doc.tracks.music,
        trackId: plan.suggestedTrackId || doc.tracks.music.trackId,
      },
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
