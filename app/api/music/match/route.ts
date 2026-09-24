import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { buildMusicRecommendationSet } from '@/lib/music-recommendation-core'
import { generateIdealSoundtrackProfile } from '@/lib/music-soundtrack-profile.server'
import { listAvailableMusicCatalog } from '@/lib/music-drive'
import { normalizeMusicIntent } from '@/lib/music-intent'
import type { MusicPreference, MusicVideoContext } from '@/lib/types'

export const runtime = 'nodejs'

type MusicMatchRequest = {
  trackIds?: unknown
  query?: string
  projectTitle?: string
  initialPrompt?: string
  musicPreference?: Partial<MusicPreference> | null
  videoContext?: unknown
  variantHint?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as MusicMatchRequest | null
    const trackIds = normalizeStringArray(body?.trackIds, 100)

    if (!trackIds.length) {
      return NextResponse.json({ error: 'Select at least one track to match.' }, { status: 400 })
    }

    const catalog = await listAvailableMusicCatalog()
    const requestedTrackIds = new Set(trackIds.map(normalizeText))
    const selectedCatalog = catalog.filter((track) => requestedTrackIds.has(normalizeText(track.id)))

    if (!selectedCatalog.length) {
      return NextResponse.json({ error: 'None of the selected tracks were found in the catalog.' }, { status: 404 })
    }

    const query = sanitizeInline(body?.query ?? '')
    const projectTitle = sanitizeInline(body?.projectTitle ?? '')
    const initialPrompt = sanitizeInline(body?.initialPrompt ?? '')
    const variantHint = sanitizeInline(body?.variantHint ?? '')
    const videoContext = normalizeVideoContext(body?.videoContext)
    const profileResult = await generateIdealSoundtrackProfile({
      query,
      projectTitle,
      initialPrompt,
      preference: body?.musicPreference ?? null,
      videoContext,
      variantHint,
      catalog: selectedCatalog,
    })
    const result = buildMusicRecommendationSet({
      query,
      projectTitle,
      initialPrompt,
      preference: body?.musicPreference ?? null,
      videoContext,
      variantHint,
      catalog: selectedCatalog,
      limit: Math.min(20, selectedCatalog.length),
      profileOverride: profileResult.profile,
      profileSource: profileResult.source,
    })

    return NextResponse.json({
      ok: true,
      matchedTrackIds: result.recommendations.map((track) => track.id),
      recommendations: result.recommendations,
      count: result.recommendations.length,
      confidence: result.confidence,
      source: result.source,
      fallback: result.fallback,
      profileModel: profileResult.model,
      profile: result.profile,
      reasoningSummary: result.reasoningSummary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run AI Auto-Match right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function sanitizeInline(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeStringArray(value: unknown, limit: number) {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeInline(typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .slice(0, limit)
    : []
}

function normalizeText(value: string) {
  return sanitizeInline(value).toLowerCase()
}

function normalizeVideoContext(value: unknown): MusicVideoContext | null {
  if (!value || typeof value !== 'object') return null

  const videoContext = value as Partial<MusicVideoContext>
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
