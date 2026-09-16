import { NextResponse } from 'next/server'

import { fetchCloudflareMusicCatalog, listAvailableMusicCatalog } from '@/lib/music-drive'
import { findOwnedMusicTrackById, searchOwnedMusicLibrary } from '@/lib/music-library'
import type { MusicPreference, MusicVideoContext } from '@/lib/types'

export const runtime = 'nodejs'

// Shared catalog data â€” safe for edge caching with background refresh.
const CATALOG_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

type MusicLibraryRequest = {
  query?: string
  trackId?: string
  limit?: number
  musicPreference?: Partial<MusicPreference> | null
  videoContext?: MusicVideoContext | null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const query = sanitizeInline(url.searchParams.get('query') ?? '')
    const trackId = sanitizeInline(url.searchParams.get('trackId') ?? '')
    const limit = parseLimit(url.searchParams.get('limit'))
    const source = sanitizeInline(url.searchParams.get('source') ?? '')

    if (source === 'r2') {
      const r2Tracks = await fetchCloudflareMusicCatalog()
      return NextResponse.json({
        tracks: r2Tracks.map((track) => {
          const duration = normalizeMusicLibraryDuration(track.durationSec)

          return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            genre: track.genre,
            duration,
            durationSec: duration,
            url: track.sourceUrl ?? '',
            coverUrl: track.coverArtUrl ?? null,
            thumbnail: track.coverArtUrl ?? null,
          }
        }),
        total: r2Tracks.length,
        source: 'r2',
      }, { headers: CATALOG_HEADERS })
    }

    const catalog = await listAvailableMusicCatalog()

    if (trackId) {
      const exactMatch = findOwnedMusicTrackById(trackId, catalog)
      return NextResponse.json({
        query: query || trackId,
        results: exactMatch ? [exactMatch] : [],
        exactMatch,
        preference: null,
        fallback: !exactMatch,
        total: exactMatch ? 1 : 0,
        source: 'library',
        confidence: exactMatch ? 1 : 0,
        needsRefinement: !exactMatch,
        pace: 'medium',
      }, { headers: CATALOG_HEADERS })
    }

    const result = searchOwnedMusicLibrary({ query, limit, videoContext: null, catalog })
    return NextResponse.json({
      ...result,
      source: 'library',
      confidence: buildConfidence(result.results),
      needsRefinement: shouldRefine(result.results, query),
      pace: 'medium',
    }, { headers: CATALOG_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to search the music library right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as MusicLibraryRequest
    const query = sanitizeInline(body.query ?? '')
    const trackId = sanitizeInline(body.trackId ?? '')
    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? clampLimit(body.limit) : 3
    const videoContext = normalizeVideoContext(body.videoContext)
    const catalog = await listAvailableMusicCatalog()

    if (trackId) {
      const exactMatch = findOwnedMusicTrackById(trackId, catalog)
      return NextResponse.json({
        query: query || trackId,
        results: exactMatch ? [exactMatch] : [],
        exactMatch,
        preference: null,
        fallback: !exactMatch,
        total: exactMatch ? 1 : 0,
      })
    }

    const result = searchOwnedMusicLibrary({
      query,
      limit,
      preference: body.musicPreference,
      videoContext,
      catalog,
    })

    return NextResponse.json({
      ...result,
      source: 'library',
      confidence: buildConfidence(result.results),
      needsRefinement: shouldRefine(result.results, query),
      pace: videoContext?.pace ?? 'medium',
      contextSummary: videoContext?.summary ?? '',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to search the music library right now.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function sanitizeInline(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeMusicLibraryDuration(value: number | null | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) return 0
  return Math.round(value > 1000 ? value / 1000 : value)
}

function parseLimit(value: string | null) {
  if (!value) return 3
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 3
  return clampLimit(parsed)
}

function clampLimit(value: number) {
  return Math.max(1, Math.min(3, Math.floor(value)))
}

function normalizeVideoContext(videoContext?: MusicVideoContext | null): MusicVideoContext | null {
  if (!videoContext) return null

  const pace = videoContext.pace === 'fast' || videoContext.pace === 'slow' ? videoContext.pace : 'medium'
  const summary = sanitizeInline(videoContext.summary ?? '')
  const signals = Array.isArray(videoContext.signals)
    ? videoContext.signals.map((signal) => sanitizeInline(signal)).filter(Boolean).slice(0, 8)
    : []

  return {
    pace,
    summary,
    signals,
    confidence: typeof videoContext.confidence === 'number' && Number.isFinite(videoContext.confidence)
      ? Math.max(0, Math.min(1, videoContext.confidence))
      : undefined,
  }
}

function buildConfidence(results: Array<{ matchScore?: number; exactMatch?: boolean }>) {
  const topScore = Math.max(0, ...(results.map((result) => result.matchScore ?? 0)))
  const exactBonus = results.some((result) => result.exactMatch) ? 14 : 0
  return Math.max(0, Math.min(1, (topScore + exactBonus) / 80))
}

function shouldRefine(results: Array<{ matchScore?: number; exactMatch?: boolean }>, query: string) {
  const confidence = buildConfidence(results)
  return confidence < 0.58 || results.length === 0 || query.trim().length < 3
}
