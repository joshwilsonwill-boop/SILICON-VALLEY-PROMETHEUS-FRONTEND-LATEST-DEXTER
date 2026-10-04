import type { MusicRecommendation } from '../types'
import type { MusicCatalogApiTrack } from '../music-catalog-api'

export function mapVoiceCatalogTrack(track: MusicCatalogApiTrack): MusicRecommendation {
  return {
    ...track.recommendationMetadata,
    id: track.id, title: track.title, artist: track.artist || 'Unknown artist',
    producer: track.recommendationMetadata?.producer || 'Prometheus',
    genre: track.genreTags?.[0] || track.category || 'Soundtrack',
    bpm: track.recommendationMetadata?.bpm || 0,
    vibeTags: [...(track.genreTags ?? []), ...(track.moodTags ?? [])],
    coverArtUrl: track.thumbnailUrl || '',
    previewUrl: track.audioPreviewUrl || `/api/music/preview?trackId=${encodeURIComponent(track.id)}`,
    reason: 'Loaded from the available music catalog.',
    mood: track.recommendationMetadata?.mood || 'minimal',
    energy: track.recommendationMetadata?.energy || 'low',
    sourcePlatform: track.recommendationMetadata?.sourcePlatform || 'local', durationSec: track.durationSec || 0,
  }
}

/** Ordinary browsing and artist/title search do not depend on an AI recommender. */
export async function fetchVoiceCatalog(query: string, request: typeof fetch = fetch): Promise<MusicRecommendation[]> {
  const tracks = new Map<string, MusicRecommendation>()
  let offset = 0
  for (let page = 0; page < 100; page++) {
    const response = await request(`/api/music/catalog?limit=200&offset=${offset}&search=${encodeURIComponent(query.trim())}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`Music catalog request failed (${response.status}).`)
    const data = await response.json() as { tracks?: MusicCatalogApiTrack[]; total?: number; limit?: number }
    if (!Array.isArray(data.tracks)) throw new Error('The music catalog returned invalid track data.')
    for (const track of data.tracks) if (track?.id && track.title) tracks.set(track.id, mapVoiceCatalogTrack(track))
    if (!data.tracks.length) return [...tracks.values()]
    const nextOffset = offset + (typeof data.limit === 'number' && data.limit > 0 ? data.limit : data.tracks.length)
    if (nextOffset <= offset) throw new Error('The music catalog did not advance to the next page.')
    offset = nextOffset
    if (!Number.isFinite(data.total) || offset >= data.total!) return [...tracks.values()]
  }
  throw new Error('The music catalog exceeded the browsing limit.')
}
