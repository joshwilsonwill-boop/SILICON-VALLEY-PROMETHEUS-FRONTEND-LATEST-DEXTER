import { listAvailableMusicCatalog } from '@/lib/music-drive'
import type { MusicCatalogTrack as OwnedMusicCatalogTrack } from '@/lib/music-catalog'

export type MusicCatalogUrlMode = 'public_url' | 'signed_url' | 'object_key_only'

export type MusicCatalogLicenseSummary = {
  licenseType: string
  commercialAllowed: boolean
  attributionRequired: boolean
  licenseVerified: boolean
}

export type MusicCatalogApiTrack = {
  id: string
  title: string
  artist: string | null
  album?: string
  category: string
  genreTags: string[]
  moodTags: string[]
  useCaseTags: string[]
  avoidWhen: string[]
  previewAllowed: boolean
  renderAllowed: boolean
  analysisStatus: string
  durationSec?: number
  audioPreviewUrl?: string
  audioObjectKey?: string
  thumbnailUrl?: string
  thumbnailObjectKey?: string
  urlMode?: MusicCatalogUrlMode
  playableInBrowser?: boolean
  licenseSummary: MusicCatalogLicenseSummary
  recommendationMetadata: Pick<OwnedMusicCatalogTrack,
    | 'subtitle'
    | 'description'
    | 'producer'
    | 'bpm'
    | 'mood'
    | 'energy'
    | 'vibeTags'
    | 'rankingKeywords'
    | 'energyScore'
    | 'tempoRange'
    | 'instrumentation'
    | 'cinematicTags'
    | 'tensionLevel'
    | 'emotionalTone'
    | 'idealUseCases'
    | 'avoidContexts'
    | 'releaseYear'
    | 'qualityScore'
    | 'usageCount'
    | 'freshnessScore'
    | 'sourcePlatform'
    | 'sourceUrl'
    | 'storageKey'
    | 'license'
    | 'previewTone'
  >
}

export type MusicCatalogListResponse = {
  tracks: MusicCatalogApiTrack[]
  total: number
  limit: number
  offset: number
  urlMode: MusicCatalogUrlMode
  categories: string[]
}

export type MusicPreviewUrlResponse = {
  trackId: string
  encodedTrackId: string
  urlMode: MusicCatalogUrlMode
  playableInBrowser: boolean
  audioPreviewUrl?: string
  audioObjectKey?: string
  reason: string
}

export type ListMusicCatalogApiParams = {
  category?: string
  genre?: string
  useCase?: string
  search?: string
  limit?: number
  offset?: number
  includeUnsafe?: boolean
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function listMusicCatalogApi(params: ListMusicCatalogApiParams = {}): Promise<MusicCatalogListResponse> {
  const catalog = await getMappedCatalog()
  const filtered = catalog.filter((track) => matchesCatalogFilters(track, params))
  const total = filtered.length
  const limit = normalizeLimit(params.limit)
  const offset = normalizeOffset(params.offset, total)

  return {
    tracks: filtered.slice(offset, offset + limit),
    total,
    limit,
    offset,
    urlMode: 'public_url',
    categories: collectCategories(catalog),
  }
}

export async function getMusicCatalogApiTrack(trackId: string): Promise<MusicCatalogApiTrack | null> {
  const normalizedTrackId = normalizeText(trackId)
  if (!normalizedTrackId) return null

  const catalog = await getMappedCatalog()
  return catalog.find((track) => normalizeText(track.id) === normalizedTrackId) ?? null
}

export async function getMusicCatalogPreviewUrl(trackId: string): Promise<MusicPreviewUrlResponse | null> {
  const track = await getMusicCatalogApiTrack(trackId)
  if (!track) return null

  const previewUrl = track.audioPreviewUrl ?? `/api/music/preview?trackId=${encodeURIComponent(track.id)}`

  return {
    trackId: track.id,
    encodedTrackId: encodeURIComponent(track.id),
    urlMode: 'public_url',
    playableInBrowser: track.previewAllowed,
    audioPreviewUrl: track.previewAllowed ? previewUrl : undefined,
    audioObjectKey: track.audioObjectKey,
    reason: track.previewAllowed
      ? 'Preview URL is a public browser-playable catalog URL.'
      : 'Preview is unavailable for this track.',
  }
}

export function joinTrackIdParam(trackId: string[] | string | undefined) {
  if (Array.isArray(trackId)) {
    return trackId.join('/').trim()
  }

  return typeof trackId === 'string' ? trackId.trim() : ''
}

async function getMappedCatalog() {
  const catalog = await listAvailableMusicCatalog()
  return catalog.map(mapTrackToApiTrack)
}

function mapTrackToApiTrack(track: OwnedMusicCatalogTrack): MusicCatalogApiTrack {
  const renderAllowed = isTrackRenderAllowed(track)
  const storageKey = track.storageKey ?? track.id
  const genreTags = uniqueNormalized([
    track.genre,
    track.subgenre,
    ...(track.cinematicTags ?? []),
    ...track.vibeTags,
  ])
  const moodTags = uniqueNormalized([
    track.mood,
    ...(track.moodTags ?? []),
    ...track.vibeTags,
  ])
  const useCaseTags = uniqueNormalized(track.idealUseCases ?? [])
  const avoidWhen = uniqueNormalized(track.avoidContexts ?? [])

  return {
    id: track.id,
    title: track.title,
    artist: track.artist || null,
    album: track.album,
    category: track.mood,
    genreTags,
    moodTags,
    useCaseTags,
    avoidWhen,
    previewAllowed: true,
    renderAllowed,
    analysisStatus: 'ready',
    durationSec: track.durationSec,
    audioPreviewUrl: resolveDirectAudioUrl(track) ?? undefined,
    audioObjectKey: storageKey,
    thumbnailUrl: track.coverArtUrl,
    thumbnailObjectKey: resolvePublicAssetObjectKey(track.coverArtUrl),
    urlMode: 'public_url',
    playableInBrowser: true,
    licenseSummary: buildLicenseSummary(track, renderAllowed),
    recommendationMetadata: {
      subtitle: track.subtitle,
      description: track.description,
      producer: track.producer,
      bpm: track.bpm,
      mood: track.mood,
      energy: track.energy,
      vibeTags: track.vibeTags,
      rankingKeywords: track.rankingKeywords,
      energyScore: track.energyScore,
      tempoRange: track.tempoRange,
      instrumentation: track.instrumentation,
      cinematicTags: track.cinematicTags,
      tensionLevel: track.tensionLevel,
      emotionalTone: track.emotionalTone,
      idealUseCases: track.idealUseCases,
      avoidContexts: track.avoidContexts,
      releaseYear: track.releaseYear,
      qualityScore: track.qualityScore,
      usageCount: track.usageCount,
      freshnessScore: track.freshnessScore,
      sourcePlatform: track.sourcePlatform,
      sourceUrl: track.sourceUrl,
      storageKey: track.storageKey,
      license: track.license,
      previewTone: track.previewTone,
    },
  }
}

function resolveDirectAudioUrl(track: OwnedMusicCatalogTrack) {
  if (!track.sourceUrl) return null

  try {
    const parsed = new URL(track.sourceUrl)
    const path = parsed.pathname.toLowerCase()
    if (isBrowserAudioAssetPath(path)) {
      return track.sourceUrl
    }
  } catch {
    return null
  }

  return null
}

function isBrowserAudioAssetPath(path: string) {
  return path.endsWith('.mp3') || path.endsWith('.wav') || path.endsWith('.ogg') || path.endsWith('.m4a')
}

function resolvePublicAssetObjectKey(value: string | undefined) {
  if (!value || value.startsWith('/')) return undefined

  try {
    const parsed = new URL(value)
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, '')) || undefined
  } catch {
    return undefined
  }
}

function buildLicenseSummary(track: OwnedMusicCatalogTrack, renderAllowed: boolean): MusicCatalogLicenseSummary {
  const licenseType = track.license === 'online-preview' ? 'preview_only' : (track.license ?? 'unknown')

  return {
    licenseType,
    commercialAllowed: renderAllowed,
    attributionRequired: false,
    licenseVerified: renderAllowed,
  }
}

function isTrackRenderAllowed(track: OwnedMusicCatalogTrack) {
  if (track.license === 'online-preview') return false
  if (track.license === 'owned' || track.license === 'licensed' || track.license === 'public-domain' || track.license === 'internal') {
    return true
  }

  return track.sourcePlatform === 'local'
}

function matchesCatalogFilters(track: MusicCatalogApiTrack, params: ListMusicCatalogApiParams) {
  const category = normalizeText(params.category ?? '')
  const genre = normalizeText(params.genre ?? '')
  const useCase = normalizeText(params.useCase ?? '')
  const search = normalizeText(params.search ?? '')
  const includeUnsafe = params.includeUnsafe ?? true

  if (!includeUnsafe && !track.renderAllowed) {
    return false
  }

  if (category && normalizeText(track.category) !== category) {
    return false
  }

  if (genre && !track.genreTags.some((tag) => normalizeText(tag).includes(genre))) {
    return false
  }

  if (useCase && !track.useCaseTags.some((tag) => normalizeText(tag).includes(useCase))) {
    return false
  }

  if (search) {
    const haystack = normalizeText(
      [
        track.id,
        track.title,
        track.artist ?? '',
        track.category,
        track.genreTags.join(' '),
        track.moodTags.join(' '),
        track.useCaseTags.join(' '),
        track.avoidWhen.join(' '),
      ].join(' '),
    )

    if (!haystack.includes(search)) {
      return false
    }
  }

  return true
}

function collectCategories(catalog: MusicCatalogApiTrack[]) {
  return [...new Set(catalog.map((track) => track.category).filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

function uniqueNormalized(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .filter((value, index, all) => all.findIndex((candidate) => normalizeText(candidate) === normalizeText(value)) === index)
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(value as number)))
}

function normalizeOffset(value: number | undefined, total: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(total, Math.floor(value as number)))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}
