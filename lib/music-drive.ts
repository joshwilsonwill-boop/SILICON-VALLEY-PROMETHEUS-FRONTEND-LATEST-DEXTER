import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import {
  MUSIC_CATALOG,
  normalizeMusicPreference,
  type MusicCatalogTrack,
} from '@/lib/music-catalog'
import { GOOGLE_DRIVE_MUSIC_CATALOG_SNAPSHOT } from '@/lib/generated/google-drive-music-catalog'
import { parseR2TrackFilename, type EnrichedR2TrackMetadata } from '@/lib/music-library'
import { r2Client } from '@/lib/r2/client'
import { resolveR2AssetUrl } from '@/lib/music-url-resolver'
import { getSupabaseConfig } from '@/lib/supabase/config'

const DEFAULT_GOOGLE_DRIVE_MUSIC_FOLDER_ID = '1oczdEdER5h0_6Bv4WqaDZTDZ8rP4DNDa'
const DRIVE_FOLDER_CACHE_TTL_MS = 5 * 60 * 1000
const R2_MUSIC_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000
const MUSIC_CATALOG_FAILURE_CACHE_TTL_MS = 30 * 1000
const MUSIC_CATALOG_SOURCE_TIMEOUT_MS = 4 * 1000
const R2_MUSIC_AUDIO_PREFIX = normalizeR2Prefix(process.env.R2_MUSIC_AUDIO_PREFIX ?? 'music-originals')
const R2_MUSIC_THUMBNAIL_PREFIX = normalizeR2Prefix(process.env.R2_MUSIC_THUMBNAIL_PREFIX ?? 'music-thumbnails')
const R2_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a'])
const R2_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

type DriveMusicFolderCache = {
  expiresAt: number
  tracks: MusicCatalogTrack[]
}

type R2MusicCatalogCache = {
  expiresAt: number
  tracks: MusicCatalogTrack[]
}

type R2ListedObject = {
  key: string
  size: number
}

type ParsedR2AssetKey = {
  category: string
  filename: string
  baseName: string
  extension: string
}

type ParsedDriveEntry = {
  fileId: string
  fileName: string
  viewUrl: string
}

type DriveMusicMetadataOverride = (typeof GOOGLE_DRIVE_MUSIC_CATALOG_SNAPSHOT)[number]

let driveMusicFolderCache: DriveMusicFolderCache | null = null
let driveMusicFolderRequest: Promise<MusicCatalogTrack[]> | null = null
let r2MusicCatalogCache: R2MusicCatalogCache | null = null
let r2MusicCatalogRequest: Promise<MusicCatalogTrack[]> | null = null

const DRIVE_SCRAPE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
} as const

const KNOWN_DRIVE_FILE_PREFIXES = ['aplmate.com - ', 'download from ', 'songslover.com - '] as const
const KNOWN_DRIVE_FILE_NOISE_PATTERNS = [
  /\((?:mp3\.pm|songslover\.com|rilds\.com)\)/gi,
  /\[(?:audiovk\.com|songslover\.com)\]/gi,
  /\b(?:mp3\.pm|songslover\.com|audiovk\.com|rilds\.com)\b/gi,
] as const

const DRIVE_COVER_ART_BY_MOOD: Record<
  NonNullable<MusicCatalogTrack['mood']>,
  { coverArtUrl: string; coverArtPosition?: string }
> = {
  cinematic: {
    coverArtUrl: '/style-previews/podcast-1.jpg',
    coverArtPosition: '50% 22%',
  },
  uplifting: {
    coverArtUrl: '/style-previews/reels-heat-1.webp',
    coverArtPosition: '50% 36%',
  },
  dark: {
    coverArtUrl: '/style-previews/red-statue-1.jpg',
    coverArtPosition: '50% 34%',
  },
  minimal: {
    coverArtUrl: '/style-previews/docs-story-1.jpg',
    coverArtPosition: '52% 28%',
  },
  playful: {
    coverArtUrl: '/style-previews/iman-1.jpg',
    coverArtPosition: '50% 26%',
  },
}

const driveMusicSnapshotByFileId = new Map(
  GOOGLE_DRIVE_MUSIC_CATALOG_SNAPSHOT.map((entry) => [entry.fileId, entry]),
)

export function getConfiguredGoogleDriveMusicFolderId() {
  return process.env.GOOGLE_DRIVE_MUSIC_FOLDER_ID?.trim() || DEFAULT_GOOGLE_DRIVE_MUSIC_FOLDER_ID
}

export function buildGoogleDriveDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
}

export async function fetchDriveMusicCatalog() {
  const folderId = getConfiguredGoogleDriveMusicFolderId()
  if (!folderId) return []

  if (driveMusicFolderCache && driveMusicFolderCache.expiresAt > Date.now()) {
    return driveMusicFolderCache.tracks
  }

  if (driveMusicFolderRequest) {
    return driveMusicFolderRequest
  }

  driveMusicFolderRequest = loadDriveMusicCatalog(folderId)
    .then((tracks) => {
      driveMusicFolderCache = {
        expiresAt: Date.now() + DRIVE_FOLDER_CACHE_TTL_MS,
        tracks,
      }
      return tracks
    })
    .catch((error: unknown) => {
      driveMusicFolderCache = {
        expiresAt: Date.now() + MUSIC_CATALOG_FAILURE_CACHE_TTL_MS,
        tracks: [],
      }
      throw error
    })
    .finally(() => {
      driveMusicFolderRequest = null
    })

  return driveMusicFolderRequest
}

export async function listAvailableMusicCatalog() {
  try {
    const cloudflareTracks = await fetchCloudflareMusicCatalog()
    if (cloudflareTracks.length > 0) {
      return cloudflareTracks
    }
  } catch (error) {
    console.warn('[music-drive] Unable to read the Cloudflare R2 music catalog.', error)
    r2MusicCatalogCache = {
      expiresAt: Date.now() + MUSIC_CATALOG_FAILURE_CACHE_TTL_MS,
      tracks: [],
    }
  }

  try {
    const driveTracks = await fetchDriveMusicCatalog()
    return driveTracks.length > 0 ? driveTracks : MUSIC_CATALOG
  } catch (error) {
    console.warn('[music-drive] Falling back to bundled music catalog.', error)
    driveMusicFolderCache = {
      expiresAt: Date.now() + MUSIC_CATALOG_FAILURE_CACHE_TTL_MS,
      tracks: [],
    }
    return MUSIC_CATALOG
  }
}

export async function fetchCloudflareMusicCatalog() {
  if (r2MusicCatalogCache && r2MusicCatalogCache.expiresAt > Date.now()) {
    return r2MusicCatalogCache.tracks
  }

  if (r2MusicCatalogRequest) {
    return r2MusicCatalogRequest
  }

  r2MusicCatalogRequest = loadCloudflareMusicCatalog()
    .then((tracks) => {
      r2MusicCatalogCache = {
        expiresAt: Date.now() + R2_MUSIC_CATALOG_CACHE_TTL_MS,
        tracks,
      }
      return tracks
    })
    .finally(() => {
      r2MusicCatalogRequest = null
    })

  return r2MusicCatalogRequest
}

async function loadCloudflareMusicCatalog() {
  const bucket = process.env.R2_BUCKET_MUSIC?.trim()
  if (!bucket || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return []
  }

  const listingSignal = AbortSignal.timeout(MUSIC_CATALOG_SOURCE_TIMEOUT_MS)
  const [audioObjects, thumbnailObjects] = await Promise.all([
    listR2Objects(bucket, R2_MUSIC_AUDIO_PREFIX, listingSignal),
    listR2Objects(bucket, R2_MUSIC_THUMBNAIL_PREFIX, listingSignal),
  ])
  const thumbnailIndex = buildR2ThumbnailIndex(thumbnailObjects)
  const enrichedMetadataByTrackId = await loadTrackMetadataCache(
    audioObjects.map((object) => object.key),
    AbortSignal.timeout(MUSIC_CATALOG_SOURCE_TIMEOUT_MS),
  )

  return audioObjects
    .filter((object) => {
      const parsed = parseR2AssetKey(object.key, R2_MUSIC_AUDIO_PREFIX)
      return parsed ? R2_AUDIO_EXTENSIONS.has(parsed.extension) : false
    })
    .map((object, index) => mapR2ObjectToMusicTrack(object, thumbnailIndex, index, enrichedMetadataByTrackId.get(object.key)))
}

async function listR2Objects(bucket: string, prefix: string, signal: AbortSignal): Promise<R2ListedObject[]> {
  const objects: R2ListedObject[] = []
  let continuationToken: string | undefined

  do {
    const response = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
      { abortSignal: signal },
    )

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith('/')) continue
      objects.push({
        key: object.Key,
        size: object.Size ?? 0,
      })
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return objects
}

async function loadTrackMetadataCache(trackIds: string[], signal: AbortSignal) {
  const uniqueTrackIds = [...new Set(trackIds.filter(Boolean))]
  const enrichedMetadata = new Map<string, EnrichedR2TrackMetadata>()
  if (!uniqueTrackIds.length) return enrichedMetadata

  try {
    const { url, publishableKey } = getSupabaseConfig()
    const supabase = createSupabaseClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal }),
      },
    })

    for (let index = 0; index < uniqueTrackIds.length; index += 500) {
      const chunk = uniqueTrackIds.slice(index, index + 500)
      const { data, error } = await supabase
        .from('track_metadata')
        .select('track_id, artist, title')
        .in('track_id', chunk)

      if (error) {
        console.warn('[music-drive] Unable to read enriched track metadata.', error.message)
        return enrichedMetadata
      }

      for (const row of data ?? []) {
        if (!row.track_id) continue
        enrichedMetadata.set(row.track_id, {
          artist: row.artist,
          title: row.title,
        })
      }
    }
  } catch (error) {
    console.warn('[music-drive] Enriched track metadata cache unavailable.', error)
  }

  return enrichedMetadata
}

function buildR2ThumbnailIndex(thumbnailObjects: R2ListedObject[]) {
  const exactByCategoryAndBaseName = new Map<string, string>()
  const byCategory = new Map<string, string[]>()

  for (const object of thumbnailObjects) {
    const parsed = parseR2AssetKey(object.key, R2_MUSIC_THUMBNAIL_PREFIX)
    if (!parsed || !R2_IMAGE_EXTENSIONS.has(parsed.extension)) continue

    exactByCategoryAndBaseName.set(`${parsed.category}/${parsed.baseName}`, object.key)
    const categoryThumbnails = byCategory.get(parsed.category) ?? []
    categoryThumbnails.push(object.key)
    byCategory.set(parsed.category, categoryThumbnails)
  }

  return {
    exactByCategoryAndBaseName,
    byCategory,
  }
}

function mapR2ObjectToMusicTrack(
  object: R2ListedObject,
  thumbnailIndex: ReturnType<typeof buildR2ThumbnailIndex>,
  index: number,
  enrichedMetadata?: EnrichedR2TrackMetadata | null,
): MusicCatalogTrack {
  const parsed = parseR2AssetKey(object.key, R2_MUSIC_AUDIO_PREFIX)
  if (!parsed) {
    throw new Error(`Unable to parse R2 music object key: ${object.key}`)
  }

  const metadata = resolveTrackMetadata(parseR2TrackFilename(parsed.filename), enrichedMetadata)
  const title = metadata.title
  const artist = metadata.artist
  const profile = inferR2TrackProfile(parsed.category, `${artist} ${title}`)
  const categoryLabel = formatR2DisplayText(parsed.category)
  const thumbnailKey = resolveR2ThumbnailKey(parsed, thumbnailIndex)
  const durationSec = estimateR2DurationSec(object.size)
  const bpm = inferR2Bpm(profile.energy, profile.mood, `${artist} ${title}`)

  return {
    id: buildR2TrackId(parsed.category, parsed.baseName),
    title,
    subtitle: categoryLabel,
    description: `${title} by ${artist} is served from the Prometheus Cloudflare R2 music library.`,
    artist,
    producer: 'Prometheus',
    genre: profile.genre,
    subgenre: categoryLabel,
    bpm,
    mood: profile.mood,
    energy: profile.energy,
    vibeTags: uniqueTokens([categoryLabel, profile.genre, profile.mood, profile.energy, artist, title, parsed.baseName]),
    moodTags: uniqueTokens([profile.mood, categoryLabel, profile.energy]),
    rankingKeywords: uniqueTokens([title, artist, categoryLabel, parsed.baseName, parsed.category, profile.genre, 'cloudflare', 'r2', 'owned music']),
    energyScore: profile.energy === 'high' ? 84 : profile.energy === 'low' ? 30 : 58,
    tempoRange: buildR2TempoRange(bpm, profile.energy),
    instrumentation: profile.instrumentation,
    cinematicTags: uniqueTokens([categoryLabel, profile.mood, 'editorial', 'owned']),
    tensionLevel: profile.mood === 'dark' ? 76 : profile.energy === 'high' ? 62 : profile.energy === 'low' ? 18 : 44,
    emotionalTone: profile.tone,
    idealUseCases: profile.useCases,
    avoidContexts: profile.energy === 'high' ? ['quiet documentary beds', 'soft dialogue'] : ['aggressive trailer pacing'],
    coverArtUrl: thumbnailKey ? resolveR2AssetUrl(thumbnailKey) : '/style-previews/dark-cinematic-1.jpg',
    coverArtPosition: 'center',
    releaseYear: 2026,
    durationSec,
    sourcePlatform: 'local',
    storageKey: object.key,
    sourceUrl: resolveR2AssetUrl(object.key),
    license: 'owned',
    qualityScore: 96,
    usageCount: index % 5,
    freshnessScore: 94 - (index % 6),
    previewTone: buildR2PreviewTone(profile.mood, bpm),
  }
}

function resolveR2ThumbnailKey(
  audioKey: ParsedR2AssetKey,
  thumbnailIndex: ReturnType<typeof buildR2ThumbnailIndex>,
) {
  const exactMatch = thumbnailIndex.exactByCategoryAndBaseName.get(`${audioKey.category}/${audioKey.baseName}`)
  if (exactMatch) return exactMatch

  const categoryThumbnails = thumbnailIndex.byCategory.get(audioKey.category) ?? []
  return (
    categoryThumbnails.find((key) => /(?:^|-)me\.(?:jpe?g|png|webp)$/i.test(key.split('/').pop() ?? '')) ??
    categoryThumbnails[0] ??
    null
  )
}

function resolveTrackMetadata(
  parsedMetadata: ReturnType<typeof parseR2TrackFilename>,
  enrichedMetadata?: EnrichedR2TrackMetadata | null,
) {
  if (enrichedMetadata?.artist && enrichedMetadata.artist !== 'Unknown Artist') {
    return {
      ...parsedMetadata,
      artist: enrichedMetadata.artist,
      title: enrichedMetadata.title || parsedMetadata.title,
    }
  }

  return parsedMetadata
}

function parseR2AssetKey(key: string, prefix: string): ParsedR2AssetKey | null {
  if (!key.startsWith(prefix)) return null

  const relativePath = key.slice(prefix.length)
  const [category, ...filenameParts] = relativePath.split('/').filter(Boolean)
  const filename = filenameParts.join('/')
  if (!category || !filename) return null

  const extensionMatch = filename.match(/(\.[^.]+)$/)
  const extension = extensionMatch?.[1]?.toLowerCase() ?? ''
  const baseName = filename.replace(/\.[^.]+$/, '').split('/').pop() ?? ''
  if (!baseName || !extension) return null

  return {
    category,
    filename,
    baseName,
    extension,
  }
}

function inferR2TrackProfile(category: string, baseName: string): {
  genre: string
  mood: MusicCatalogTrack['mood']
  energy: MusicCatalogTrack['energy']
  instrumentation: string[]
  tone: string
  useCases: string[]
} {
  const text = normalizeDriveText(`${category} ${baseName}`)

  if (text.includes('classical') || text.includes('orchestral') || text.includes('concerto') || text.includes('vivaldi') || text.includes('bach')) {
    return {
      genre: 'Classical / Orchestral',
      mood: 'cinematic',
      energy: text.includes('presto') || text.includes('summer') ? 'medium' : 'low',
      instrumentation: ['strings', 'piano', 'orchestral room', 'bowed texture'],
      tone: 'elegant and cinematic',
      useCases: ['brand film', 'premium montage', 'documentary sequence'],
    }
  }

  if (text.includes('lo-fi') || text.includes('chill') || text.includes('soft') || text.includes('relaxing') || text.includes('ambient')) {
    return {
      genre: 'Lo-Fi / Chill',
      mood: 'minimal',
      energy: 'low',
      instrumentation: ['soft keys', 'warm bass', 'light drums', 'ambient texture'],
      tone: 'quiet and editorial',
      useCases: ['under-dialogue bed', 'reflective edit', 'soft founder story'],
    }
  }

  if (text.includes('hip-hop') || text.includes('trap') || text.includes('urban') || text.includes('beats')) {
    return {
      genre: 'Hip-Hop / Trap',
      mood: 'playful',
      energy: 'high',
      instrumentation: ['808', 'trap hats', 'sub bass', 'snare'],
      tone: 'social and kinetic',
      useCases: ['social hook', 'fast product reel', 'creator clip'],
    }
  }

  if (text.includes('motivational') || text.includes('uplift') || text.includes('triumph')) {
    return {
      genre: 'Motivational',
      mood: 'uplifting',
      energy: 'high',
      instrumentation: ['clean drums', 'uplift synth', 'pulse bass', 'bright keys'],
      tone: 'bright and propulsive',
      useCases: ['launch trailer', 'founder story', 'high-impact reel'],
    }
  }

  if (hasR2Token(text, 'tech') || hasR2Token(text, 'futuristic') || hasR2Token(text, 'ai')) {
    return {
      genre: 'Tech / Futuristic',
      mood: 'cinematic',
      energy: 'medium',
      instrumentation: ['synth arps', 'digital pulse', 'sub bass', 'glitch percussion'],
      tone: 'clean and futuristic',
      useCases: ['AI product edit', 'SaaS walkthrough', 'futuristic montage'],
    }
  }

  if (text.includes('pop') || text.includes('indie') || text.includes('lifestyle')) {
    return {
      genre: 'Pop / Indie',
      mood: 'uplifting',
      energy: 'medium',
      instrumentation: ['guitar', 'indie drums', 'warm synth', 'hand percussion'],
      tone: 'optimistic and clean',
      useCases: ['brand film', 'editorial montage', 'promo cut'],
    }
  }

  if (text.includes('dark') || text.includes('fear') || text.includes('vengeance') || text.includes('combat') || text.includes('sub-zero')) {
    return {
      genre: 'Cinematic',
      mood: 'dark',
      energy: text.includes('combat') || text.includes('vengeance') ? 'high' : 'medium',
      instrumentation: ['low pulse', 'dark percussion', 'sub bass', 'tension hits'],
      tone: 'controlled and shadowed',
      useCases: ['dramatic reveal', 'tense montage', 'high-contrast edit'],
    }
  }

  if (text.includes('cinematic') || text.includes('trailer') || text.includes('epic') || text.includes('dramatic') || text.includes('intense')) {
    return {
      genre: 'Cinematic Trailer',
      mood: 'cinematic',
      energy: 'high',
      instrumentation: ['trailer drums', 'hybrid strings', 'risers', 'impacts'],
      tone: 'cinematic and polished',
      useCases: ['hero reveal', 'launch trailer', 'high-impact reel'],
    }
  }

  return {
    genre: 'Soundtrack',
    mood: 'cinematic',
    energy: 'medium',
    instrumentation: ['pulse', 'texture', 'drums', 'bass'],
    tone: 'polished and editorial',
    useCases: ['brand film', 'editorial montage', 'promo cut'],
  }
}

function estimateR2DurationSec(size: number) {
  if (!Number.isFinite(size) || size <= 0) return 90
  return Math.max(15, Math.min(360, Math.round(size / 16000)))
}

function inferR2Bpm(
  energy: MusicCatalogTrack['energy'],
  mood: MusicCatalogTrack['mood'],
  baseName: string,
) {
  const text = normalizeDriveText(baseName)
  if (text.includes('slowed') || mood === 'minimal') return 86
  if (energy === 'high') return 128
  if (energy === 'low') return 88
  return 108
}

function buildR2TempoRange(bpm: number, energy: MusicCatalogTrack['energy']): [number, number] {
  const spread = energy === 'high' ? 12 : energy === 'low' ? 8 : 10
  return [Math.max(60, bpm - spread), Math.min(160, bpm + spread)]
}

function buildR2PreviewTone(mood: MusicCatalogTrack['mood'], bpm: number) {
  const rootHz = mood === 'dark' ? 98 : mood === 'uplifting' ? 146.83 : mood === 'minimal' ? 88 : 110

  return {
    rootHz,
    harmonyHz: rootHz * 2,
    bassHz: rootHz / 2,
    pulseHz: Math.max(2.2, bpm / 36),
  }
}

function buildR2TrackId(category: string, baseName: string) {
  return `r2-${category}-${baseName}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function hasR2Token(value: string, token: string) {
  return value.split(/[^a-z0-9]+/g).includes(token)
}

function formatR2DisplayText(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => capitalizeWord(word.toLowerCase()))
    .join(' ')
    .replace(/\bAin T\b/g, "Ain't")
    .replace(/\bCan T\b/g, "Can't")
    .replace(/\bDon T\b/g, "Don't")
    .replace(/\bI M\b/g, "I'm")
}

function normalizeR2Prefix(value: string) {
  return `${value.replace(/^\/+|\/+$/g, '')}/`
}

export async function findDriveMusicTrackById(trackId: string) {
  const normalizedTrackId = normalizeDriveText(trackId)
  if (!normalizedTrackId) return null

  let tracks: MusicCatalogTrack[] = []
  try {
    tracks = await fetchDriveMusicCatalog()
  } catch (error) {
    console.warn('[music-drive] Unable to refresh Drive music catalog for track lookup.', error)
    return null
  }

  return (
    tracks.find(
      (track) =>
        normalizeDriveText(track.id) === normalizedTrackId ||
        normalizeDriveText(track.storageKey ?? '') === normalizedTrackId,
    ) ?? null
  )
}

async function loadDriveMusicCatalog(folderId: string) {
  const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`, {
    cache: 'no-store',
    headers: DRIVE_SCRAPE_HEADERS,
    signal: AbortSignal.timeout(MUSIC_CATALOG_SOURCE_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Unable to read the Google Drive music folder (${response.status}).`)
  }

  const html = await response.text()
  const parsedEntries = parseDriveFolderEntries(html)

  return parsedEntries.map((entry, index) => mapDriveEntryToMusicTrack(entry, index))
}

function parseDriveFolderEntries(html: string) {
  const matches = html.matchAll(
    /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/gi,
  )

  const entries: ParsedDriveEntry[] = []

  for (const match of matches) {
    const fileId = match[1]?.trim() ?? ''
    const viewUrl = decodeHtmlEntities(match[2] ?? '').trim()
    const rawFileName = decodeHtmlEntities(match[3] ?? '').trim()
    const lowerFileName = rawFileName.toLowerCase()

    if (!fileId || !viewUrl || !rawFileName) continue
    if (!lowerFileName.endsWith('.mp3') && !lowerFileName.endsWith('.wav') && !lowerFileName.endsWith('.m4a')) {
      continue
    }

    entries.push({
      fileId,
      fileName: rawFileName,
      viewUrl,
    })
  }

  return entries
}

function mapDriveEntryToMusicTrack(entry: ParsedDriveEntry, index: number): MusicCatalogTrack {
  const metadataOverride = driveMusicSnapshotByFileId.get(entry.fileId)
  const cleaned = cleanDriveTrackName(entry.fileName)
  const resolvedTitle = metadataOverride?.title || cleaned.title
  const resolvedArtist = metadataOverride?.artist || cleaned.artist
  const resolvedProducer = resolveProducer(metadataOverride, resolvedArtist)
  const resolvedAlbum = metadataOverride?.album?.trim() || undefined
  const resolvedGenre = metadataOverride?.genre?.trim() || undefined
  const preference = normalizeMusicPreference(null, [resolvedArtist, resolvedTitle, resolvedGenre, resolvedAlbum].filter(Boolean).join(' '))
  const inferredGenre = inferGenreFromPreference(preference.mood)
  const normalizedContextText = normalizeDriveText(
    [resolvedTitle, resolvedArtist, resolvedProducer, resolvedGenre, cleaned.subtitle, resolvedAlbum].filter(Boolean).join(' '),
  )
  const inferredBpm = inferBpmFromPreference(preference.energy, normalizedContextText)
  const inferredTags = inferVibeTags(normalizedContextText, preference.mood, preference.energy)
  const coverArt = DRIVE_COVER_ART_BY_MOOD[preference.mood]

  return {
    id: `gdrive-${entry.fileId}`,
    title: resolvedTitle,
    subtitle: cleaned.subtitle,
    description: buildDriveTrackDescription(resolvedTitle, resolvedArtist, preference.mood, preference.energy),
    artist: resolvedArtist,
    producer: resolvedProducer,
    album: resolvedAlbum,
    genre: resolvedGenre || inferredGenre,
    subgenre: resolvedGenre || inferredGenre,
    bpm: inferredBpm,
    mood: preference.mood,
    energy: preference.energy,
    vibeTags: inferredTags,
    moodTags: uniqueTokens([preference.mood, resolvedGenre || inferredGenre, ...inferredTags]),
    rankingKeywords: uniqueTokens([
      resolvedTitle,
      resolvedArtist,
      resolvedProducer,
      cleaned.subtitle,
      resolvedGenre || inferredGenre,
      resolvedAlbum ?? '',
      ...inferredTags,
      normalizedContextText,
    ]),
    energyScore: inferDriveEnergyScore(preference.energy, normalizedContextText),
    tempoRange: inferDriveTempoRange(inferredBpm, preference.energy),
    instrumentation: inferDriveInstrumentation(normalizedContextText, preference.mood, preference.energy),
    cinematicTags: inferDriveCinematicTags(normalizedContextText, preference.mood, resolvedGenre || inferredGenre),
    tensionLevel: inferDriveTensionLevel(normalizedContextText, preference.mood, preference.energy),
    emotionalTone: inferDriveEmotionalTone(normalizedContextText, preference.mood, preference.energy),
    idealUseCases: inferDriveUseCases(normalizedContextText, preference.mood, preference.energy),
    avoidContexts: inferDriveAvoidContexts(normalizedContextText, preference.mood, preference.energy),
    coverArtUrl: coverArt.coverArtUrl,
    coverArtPosition: coverArt.coverArtPosition,
    releaseYear: inferReleaseYear(normalizedContextText),
    durationSec: normalizeDurationSec(metadataOverride?.durationSec),
    sourcePlatform: 'local',
    storageKey: entry.fileId,
    sourceUrl: entry.viewUrl,
    license: 'owned',
    qualityScore: inferDriveQualityScore(metadataOverride, normalizedContextText, index),
    usageCount: inferDriveUsageCount(index),
    freshnessScore: inferDriveFreshnessScore(metadataOverride, normalizedContextText, index),
    previewTone: buildPreviewTone(preference.mood, preference.energy, index),
  }
}

function cleanDriveTrackName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  let cleaned = decodeHtmlEntities(withoutExtension)

  for (const prefix of KNOWN_DRIVE_FILE_PREFIXES) {
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length)
      break
    }
  }

  for (const pattern of KNOWN_DRIVE_FILE_NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  cleaned = cleaned
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+-\s+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()

  const segments = cleaned
    .split(' - ')
    .map((segment) => segment.trim())
    .filter(Boolean)

  const hasKnownPrefix = KNOWN_DRIVE_FILE_PREFIXES.some((prefix) => fileName.toLowerCase().startsWith(prefix))
  let title = cleaned
  let artist = 'Drive Library'

  if (segments.length >= 2) {
    if (hasKnownPrefix) {
      title = segments.slice(0, -1).join(' - ')
      artist = segments[segments.length - 1] ?? artist
    } else {
      artist = segments[0] ?? artist
      title = segments.slice(1).join(' - ')
    }
  }

  title = normalizeDisplayText(title || cleaned)
  artist = normalizeDisplayText(artist)

  const subtitle = buildSubtitle(title, artist)

  return {
    title,
    artist,
    subtitle,
    normalizedText: normalizeDriveText([title, artist, subtitle].join(' ')),
  }
}

function buildSubtitle(title: string, artist: string) {
  const lowerTitle = normalizeDriveText(title)
  if (lowerTitle.includes('slowed')) return 'Slowed cut'
  if (lowerTitle.includes('remix')) return 'Remix'
  if (lowerTitle.includes('feat')) return `Feat. ${artist}`
  if (lowerTitle.includes('lullaby') || lowerTitle.includes('ambient')) return 'Ambient bed'
  if (lowerTitle.includes('batman') || lowerTitle.includes('zimmer')) return 'Score cue'
  return 'Drive import'
}

function buildDriveTrackDescription(
  title: string,
  artist: string,
  mood: MusicCatalogTrack['mood'],
  energy: MusicCatalogTrack['energy'],
) {
  const energyLine =
    energy === 'low'
      ? 'stays soft under dialogue and slower spoken sections'
      : energy === 'high'
        ? 'adds more lift for hookier, higher-motion edits'
        : 'holds a steady pulse without pushing too hard'

  return `${title} by ${artist} from the Drive music folder. ${capitalizeWord(mood)} tone that ${energyLine}.`
}

function inferGenreFromPreference(mood: MusicCatalogTrack['mood']) {
  if (mood === 'minimal') return 'Ambient'
  if (mood === 'uplifting') return 'Pop'
  if (mood === 'dark') return 'Cinematic'
  if (mood === 'playful') return 'Indie Pop'
  return 'Electronic'
}

function inferBpmFromPreference(energy: MusicCatalogTrack['energy'], text: string) {
  if (text.includes('slowed')) return 82
  if (text.includes('remix')) return energy === 'high' ? 128 : 118
  if (energy === 'low') return 90
  if (energy === 'high') return 128
  return 108
}

function inferVibeTags(
  text: string,
  mood: MusicCatalogTrack['mood'],
  energy: MusicCatalogTrack['energy'],
) {
  const tags = new Set<string>([mood, energy === 'high' ? 'driving' : energy === 'low' ? 'under-dialogue' : 'steady'])

  if (text.includes('founder')) tags.add('founder')
  if (text.includes('documentary') || text.includes('zimmer')) tags.add('documentary')
  if (text.includes('slowed')) tags.add('slowed')
  if (text.includes('remix')) tags.add('remix')
  if (text.includes('ambient') || text.includes('lullaby')) tags.add('ambient')
  if (text.includes('kygo') || text.includes('lost frequencies')) tags.add('uplift')
  if (text.includes('score') || text.includes('batman')) tags.add('score')

  return [...tags]
}

function inferReleaseYear(text: string) {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  return yearMatch ? Number(yearMatch[0]) : new Date().getFullYear()
}

function resolveProducer(metadataOverride: DriveMusicMetadataOverride | undefined, artist: string) {
  const producerCandidate = metadataOverride?.producer?.trim() || ''
  if (!producerCandidate) return ''
  return normalizeDriveText(producerCandidate) === normalizeDriveText(artist) ? '' : producerCandidate
}

function normalizeDurationSec(value: number | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) return 12
  return Math.max(6, Math.round(value))
}

function buildPreviewTone(
  mood: MusicCatalogTrack['mood'],
  energy: MusicCatalogTrack['energy'],
  index: number,
) {
  const rootBase =
    mood === 'uplifting'
      ? 146.83
      : mood === 'dark'
        ? 98
        : mood === 'minimal'
          ? 88
          : mood === 'playful'
            ? 132
            : 110

  const rootHz = rootBase + (index % 7) - 3
  const pulseBase = energy === 'high' ? 4.4 : energy === 'low' ? 2.6 : 3.4

  return {
    rootHz,
    harmonyHz: rootHz * 2,
    bassHz: rootHz / 2,
    pulseHz: pulseBase,
  }
}

function inferDriveEnergyScore(energy: MusicCatalogTrack['energy'], text: string) {
  const base = energy === 'high' ? 84 : energy === 'low' ? 28 : 58
  if (text.includes('trailer') || text.includes('hero') || text.includes('launch')) return Math.min(100, base + 8)
  if (text.includes('ambient') || text.includes('documentary') || text.includes('under dialogue')) return Math.max(0, base - 10)
  return base
}

function inferDriveTempoRange(bpm: number, energy: MusicCatalogTrack['energy']): [number, number] {
  const spread = energy === 'high' ? 14 : energy === 'low' ? 8 : 10
  return [Math.max(60, bpm - spread), Math.min(180, bpm + spread)]
}

function inferDriveInstrumentation(text: string, mood: MusicCatalogTrack['mood'], energy: MusicCatalogTrack['energy']) {
  const hints = new Set<string>()
  if (mood === 'minimal') hints.add('piano')
  if (mood === 'cinematic') hints.add('strings')
  if (mood === 'dark') hints.add('low strings')
  if (mood === 'playful') hints.add('light percussion')
  if (energy === 'high') hints.add('drums')
  if (energy === 'low') hints.add('pads')
  if (text.includes('luxury')) hints.add('synth pulse')
  if (text.includes('documentary')) hints.add('textural bed')
  if (text.includes('trailer') || text.includes('hero')) hints.add('braams')
  return [...hints].slice(0, 5)
}

function inferDriveCinematicTags(text: string, mood: MusicCatalogTrack['mood'], genre: string) {
  const tags = new Set<string>()
  if (mood === 'cinematic') tags.add('cinematic')
  if (mood === 'minimal') tags.add('editorial')
  if (mood === 'dark') tags.add('tension')
  if (text.includes('luxury')) tags.add('luxury')
  if (text.includes('documentary')) tags.add('documentary')
  if (text.includes('trailer') || genre.toLowerCase().includes('trailer')) tags.add('trailer')
  if (text.includes('product') || text.includes('ad') || text.includes('launch')) tags.add('commercial')
  return [...tags].slice(0, 5)
}

function inferDriveTensionLevel(text: string, mood: MusicCatalogTrack['mood'], energy: MusicCatalogTrack['energy']) {
  const base = mood === 'dark' ? 72 : mood === 'cinematic' ? 56 : mood === 'minimal' ? 22 : 40
  const energyBoost = energy === 'high' ? 12 : energy === 'low' ? -10 : 0
  const contextBoost = text.includes('trailer') || text.includes('impact') ? 14 : text.includes('documentary') ? -8 : 0
  return Math.max(0, Math.min(100, base + energyBoost + contextBoost))
}

function inferDriveEmotionalTone(text: string, mood: MusicCatalogTrack['mood'], energy: MusicCatalogTrack['energy']) {
  if (text.includes('luxury')) return 'sleek and premium'
  if (text.includes('documentary')) return 'warm and reflective'
  if (text.includes('trailer')) return 'urgent and expansive'
  if (mood === 'minimal') return energy === 'low' ? 'soft and intimate' : 'calm and thoughtful'
  if (mood === 'dark') return 'tense and controlled'
  if (mood === 'uplifting') return 'bright and forward'
  return 'balanced and polished'
}

function inferDriveUseCases(text: string, mood: MusicCatalogTrack['mood'], energy: MusicCatalogTrack['energy']) {
  const uses = new Set<string>()
  if (text.includes('launch') || energy === 'high') uses.add('launch cut')
  if (text.includes('documentary') || mood === 'minimal') uses.add('founder story')
  if (text.includes('luxury') || mood === 'cinematic') uses.add('premium product visuals')
  if (text.includes('trailer') || mood === 'dark') uses.add('hero reveal')
  if (energy === 'low') uses.add('under dialogue bed')
  if (text.includes('reel') || text.includes('tiktok')) uses.add('social hook')
  return [...uses].slice(0, 5)
}

function inferDriveAvoidContexts(text: string, mood: MusicCatalogTrack['mood'], energy: MusicCatalogTrack['energy']) {
  const avoid = new Set<string>()
  if (energy === 'high') avoid.add('quiet interview bed')
  if (energy === 'low') avoid.add('aggressive trailer cut')
  if (mood === 'minimal') avoid.add('busy vocals')
  if (mood === 'dark') avoid.add('playful montage')
  if (text.includes('luxury')) avoid.add('cheap-sounding drops')
  if (text.includes('documentary')) avoid.add('overly hype commercials')
  return [...avoid].slice(0, 5)
}

function inferDriveQualityScore(metadataOverride: DriveMusicMetadataOverride | undefined, text: string, index: number) {
  const fromMetadata = metadataOverride?.genre?.trim() ? 88 : 72
  const contextBoost = text.includes('luxury') || text.includes('documentary') ? 4 : 0
  return Math.max(0, Math.min(100, fromMetadata + contextBoost - (index % 5)))
}

function inferDriveUsageCount(index: number) {
  return 1 + (index % 4)
}

function inferDriveFreshnessScore(metadataOverride: DriveMusicMetadataOverride | undefined, text: string, index: number) {
  const base = metadataOverride?.genre?.trim() ? 84 : 76
  const boost = text.includes('trailer') || text.includes('luxury') ? 4 : 0
  return Math.max(0, Math.min(100, base + boost - (index % 3)))
}

function normalizeDisplayText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\bfeat\.\b/gi, 'feat.')
    .trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function normalizeDriveText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function uniqueTokens(values: string[]) {
  return [...new Set(values.flatMap((value) => normalizeDriveText(value).split(/[^a-z0-9]+/g)).filter((token) => token.length >= 3))]
}

function capitalizeWord(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
