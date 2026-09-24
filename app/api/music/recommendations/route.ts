import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { buildMusicRecommendationSet } from '@/lib/music-recommendation-core'
import { generateIdealSoundtrackProfile } from '@/lib/music-soundtrack-profile.server'
import { listAvailableMusicCatalog } from '@/lib/music-drive'
import { normalizeMusicIntent } from '@/lib/music-intent'
import type { MusicPreference, MusicVideoContext } from '@/lib/types'

export const runtime = 'nodejs'

type MusicRecommendationRequest = {
  query?: string
  projectTitle?: string
  initialPrompt?: string
  musicPreference?: Partial<MusicPreference> | null
  videoContext?: MusicVideoContext | null
  variantHint?: string
  recentlyUsedTrackIds?: string[]
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as MusicRecommendationRequest
    const query = sanitizeInline(body.query ?? '')
    const projectTitle = sanitizeInline(body.projectTitle ?? '')
    const initialPrompt = sanitizeInline(body.initialPrompt ?? '')
    const variantHint = sanitizeInline(body.variantHint ?? '')
    const videoContext = normalizeVideoContext(body.videoContext)
    const catalog = await listAvailableMusicCatalog()
    const profileResult = await generateIdealSoundtrackProfile({
      query,
      projectTitle,
      initialPrompt,
      preference: body.musicPreference ?? null,
      videoContext,
      variantHint,
      catalog,
    })

    const result = buildMusicRecommendationSet({
      query,
      projectTitle,
      initialPrompt,
      preference: body.musicPreference ?? null,
      videoContext,
      variantHint,
      recentlyUsedTrackIds: normalizeStringArray(body.recentlyUsedTrackIds),
      catalog,
      profileOverride: profileResult.profile,
      profileSource: profileResult.source,
    })

    return NextResponse.json({
      ...result,
      contextSummary: result.reasoningSummary,
      profileModel: profileResult.model,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to build music recommendations right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function sanitizeInline(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeStringArray(value?: string[] | null) {
  return Array.isArray(value) ? value.map((item) => sanitizeInline(item)).filter(Boolean).slice(0, 20) : []
}

function normalizeVideoContext(videoContext?: MusicVideoContext | null): MusicVideoContext | null {
  if (!videoContext) return null

  const pace = videoContext.pace === 'fast' || videoContext.pace === 'slow' ? videoContext.pace : 'medium'
  const summary = sanitizeInline(videoContext.summary ?? '')
  const signals = Array.isArray(videoContext.signals)
    ? videoContext.signals.map((signal) => sanitizeInline(signal)).filter(Boolean).slice(0, 8)
    : []
  const intent = normalizeMusicIntent(videoContext.intent)

  return {
    pace,
    summary,
    signals,
    confidence:
      typeof videoContext.confidence === 'number' && Number.isFinite(videoContext.confidence)
        ? Math.max(0, Math.min(1, videoContext.confidence))
        : undefined,
    intent: intent ?? undefined,
  }
}
