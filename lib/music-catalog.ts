import type {
  MusicEnergy,
  MusicMood,
  MusicPreference,
  MusicRecommendation,
  MusicSourcePlatform,
  MusicVideoContext,
} from '@/lib/types'

export type MusicCatalogTrack = {
  id: string
  title: string
  subtitle: string
  description: string
  album?: string
  artist: string
  producer: string
  genre: string
  subgenre?: string
  bpm: number
  mood: MusicMood
  energy: MusicEnergy
  vibeTags: string[]
  moodTags?: string[]
  rankingKeywords: string[]
  energyScore?: number
  tempoRange?: [number, number]
  instrumentation?: string[]
  cinematicTags?: string[]
  tensionLevel?: number
  emotionalTone?: string
  idealUseCases?: string[]
  avoidContexts?: string[]
  coverArtUrl: string
  coverArtPosition?: string
  releaseYear: number
  durationSec: number
  sourcePlatform: MusicSourcePlatform
  storageKey?: string
  sourceUrl?: string
  license?: 'owned' | 'licensed' | 'public-domain' | 'internal' | 'online-preview'
  qualityScore?: number
  usageCount?: number
  freshnessScore?: number
  previewTone: {
    rootHz: number
    harmonyHz: number
    bassHz: number
    pulseHz: number
  }
}

export const MUSIC_MOOD_OPTIONS: MusicMood[] = ['cinematic', 'uplifting', 'dark', 'minimal', 'playful']
export const MUSIC_ENERGY_OPTIONS: MusicEnergy[] = ['low', 'medium', 'high']
export const MUSIC_SOURCE_OPTIONS: MusicSourcePlatform[] = ['online', 'local']

export const MUSIC_CATALOG: MusicCatalogTrack[] = [
  {
    id: 'aurora-skies',
    title: 'Aurora Skies',
    subtitle: 'Cinematic / Uplifting',
    description: 'Sweeping orchestral swells and ethereal melodies creating a triumphant, emotional lift.',
    album: 'Skyline Horizons',
    artist: 'Helio Waves',
    producer: 'Helio Waves',
    genre: 'Cinematic',
    bpm: 112,
    mood: 'uplifting',
    energy: 'medium',
    vibeTags: ['Cinematic', 'Uplifting', 'Atmospheric', 'Peaceful'],
    moodTags: ['Uplifting', 'Inspirational'],
    rankingKeywords: ['aurora', 'skies', 'helio', 'waves', 'cinematic', 'uplifting'],
    coverArtUrl: '/music-covers/aurora-skies.png',
    releaseYear: 2026,
    durationSec: 208,
    sourcePlatform: 'local',
    qualityScore: 98,
    freshnessScore: 96,
    previewTone: { rootHz: 130, harmonyHz: 260, bassHz: 65, pulseHz: 3.2 },
  },
  {
    id: 'amelie-adventures',
    title: 'Amelie Adventures',
    subtitle: 'Cinematic / Peaceful',
    description: 'Gentle piano melodies intertwined with warm acoustic strings evoking tranquility and wonder.',
    album: 'Quiet Expeditions',
    artist: 'James Malikey',
    producer: 'James Malikey',
    genre: 'Cinematic',
    bpm: 96,
    mood: 'cinematic',
    energy: 'low',
    vibeTags: ['Cinematic', 'Piano', 'Peaceful', 'Inspirational'],
    moodTags: ['Peaceful', 'Inspirational', 'Piano'],
    rankingKeywords: ['amelie', 'adventures', 'james', 'malikey', 'piano', 'peaceful', 'inspirational', 'cinematic'],
    coverArtUrl: '/music-covers/amelie-adventures-art.png',
    releaseYear: 2026,
    durationSec: 293,
    sourcePlatform: 'local',
    qualityScore: 99,
    freshnessScore: 98,
    previewTone: { rootHz: 110, harmonyHz: 220, bassHz: 55, pulseHz: 2.8 },
  },
  {
    id: 'midnight-drive',
    title: 'Midnight Drive',
    subtitle: 'Electronic / Energetic',
    description: 'Pulsing synthwave basslines and driving arpeggios crafted for night cityscapes and high-energy motion.',
    album: 'Neon Horizon',
    artist: 'Luna Keys',
    producer: 'Luna Keys',
    genre: 'Electronic',
    bpm: 124,
    mood: 'dark',
    energy: 'high',
    vibeTags: ['Electronic', 'Energetic', 'Night', 'Synthwave'],
    moodTags: ['Energetic', 'Driving'],
    rankingKeywords: ['midnight', 'drive', 'luna', 'keys', 'electronic', 'energetic'],
    coverArtUrl: '/music-covers/midnight-drive.png',
    releaseYear: 2026,
    durationSec: 192,
    sourcePlatform: 'local',
    qualityScore: 95,
    freshnessScore: 94,
    previewTone: { rootHz: 120, harmonyHz: 240, bassHz: 60, pulseHz: 4.0 },
  },
  {
    id: 'ocean-memories',
    title: 'Ocean Memories',
    subtitle: 'Ambient / Chill',
    description: 'Drifting atmospheric textures and distant coastal echoes designed for calming reflection.',
    album: 'Tides of Serenity',
    artist: 'The Ambient Co.',
    producer: 'The Ambient Co.',
    genre: 'Ambient',
    bpm: 82,
    mood: 'minimal',
    energy: 'low',
    vibeTags: ['Ambient', 'Chill', 'Calm', 'Relaxing'],
    moodTags: ['Chill', 'Meditative'],
    rankingKeywords: ['ocean', 'memories', 'ambient', 'chill', 'water'],
    coverArtUrl: '/music-covers/ocean-memories.png',
    releaseYear: 2026,
    durationSec: 335,
    sourcePlatform: 'local',
    qualityScore: 94,
    freshnessScore: 92,
    previewTone: { rootHz: 95, harmonyHz: 190, bassHz: 48, pulseHz: 2.0 },
  },
  {
    id: 'golden-hours',
    title: 'Golden Hours',
    subtitle: 'Acoustic / Happy',
    description: 'Sun-drenched acoustic guitar picking with joyful rhythms and light percussion.',
    album: 'Sunny Days',
    artist: 'Eastwood',
    producer: 'Eastwood',
    genre: 'Acoustic',
    bpm: 104,
    mood: 'playful',
    energy: 'medium',
    vibeTags: ['Acoustic', 'Happy', 'Warm', 'Folk'],
    moodTags: ['Happy', 'Uplifting'],
    rankingKeywords: ['golden', 'hours', 'eastwood', 'acoustic', 'happy'],
    coverArtUrl: '/music-covers/golden-hours.png',
    releaseYear: 2026,
    durationSec: 228,
    sourcePlatform: 'local',
    qualityScore: 93,
    freshnessScore: 91,
    previewTone: { rootHz: 140, harmonyHz: 280, bassHz: 70, pulseHz: 3.5 },
  },
  {
    id: 'city-lights',
    title: 'City Lights',
    subtitle: 'Pop / Dreamy',
    description: 'Catchy melodic hooks with lush dream-pop reverb and shimmering nocturnal pads.',
    album: 'Urban Dreams',
    artist: 'Nico Rivers',
    producer: 'Nico Rivers',
    genre: 'Pop',
    bpm: 116,
    mood: 'cinematic',
    energy: 'medium',
    vibeTags: ['Pop', 'Dreamy', 'Shimmer', 'Urban'],
    moodTags: ['Dreamy', 'Atmospheric'],
    rankingKeywords: ['city', 'lights', 'nico', 'rivers', 'pop', 'dreamy'],
    coverArtUrl: '/music-covers/city-lights.png',
    releaseYear: 2026,
    durationSec: 201,
    sourcePlatform: 'local',
    qualityScore: 92,
    freshnessScore: 90,
    previewTone: { rootHz: 115, harmonyHz: 230, bassHz: 58, pulseHz: 3.6 },
  },
  {
    id: 'velvet-pulse',
    title: 'Velvet Pulse',
    subtitle: 'Night score',
    description: 'Moody synth textures and low-end movement for premium edits that need a polished pulse.',
    artist: 'Prometheus Audio',
    producer: 'North Lane',
    genre: 'Electronic',
    subgenre: 'Luxury synth score',
    bpm: 108,
    mood: 'cinematic',
    energy: 'medium',
    vibeTags: ['moody', 'luxury', 'pulse', 'supportive'],
    moodTags: ['moody', 'luxury', 'polished', 'night'],
    rankingKeywords: ['night', 'luxury', 'founder', 'premium', 'cinematic', 'pulse'],
    energyScore: 64,
    tempoRange: [100, 116],
    instrumentation: ['synth pad', 'sub bass', 'soft pulse', 'airy percussion'],
    cinematicTags: ['cinematic', 'editorial', 'luxury'],
    tensionLevel: 58,
    emotionalTone: 'sleek and controlled',
    idealUseCases: ['premium product visuals', 'founder brand film', 'night reel'],
    avoidContexts: ['overly playful', 'comedic edits', 'busy dialogue'],
    coverArtUrl: '/style-previews/dark-cinematic-1.jpg',
    coverArtPosition: '62% 32%',
    releaseYear: 2026,
    durationSec: 10,
    sourcePlatform: 'local',
    qualityScore: 92,
    usageCount: 5,
    freshnessScore: 88,
    previewTone: {
      rootHz: 110,
      harmonyHz: 220,
      bassHz: 55,
      pulseHz: 3.4,
    },
  },
  {
    id: 'current-state',
    title: 'Current State',
    subtitle: 'Ad tempo',
    description: 'Snappy percussion and a bright lift for promo builds, launch cuts, and faster edits.',
    artist: 'Prometheus Audio',
    producer: 'Signal Room',
    genre: 'Pop',
    subgenre: 'Promo pop',
    bpm: 124,
    mood: 'uplifting',
    energy: 'high',
    vibeTags: ['driving', 'clean', 'snappy', 'launch'],
    moodTags: ['driving', 'clean', 'launch', 'bright'],
    rankingKeywords: ['ad', 'promo', 'launch', 'momentum', 'reel', 'uplift'],
    energyScore: 84,
    tempoRange: [118, 132],
    instrumentation: ['tight percussion', 'bright synth', 'handclap', 'bass hit'],
    cinematicTags: ['commercial', 'launch', 'social'],
    tensionLevel: 38,
    emotionalTone: 'optimistic and direct',
    idealUseCases: ['product launch', 'ad cut', 'social hook'],
    avoidContexts: ['slow documentary', 'soft reflection'],
    coverArtUrl: '/style-previews/reels-heat-1.webp',
    coverArtPosition: '50% 36%',
    releaseYear: 2025,
    durationSec: 8,
    sourcePlatform: 'local',
    qualityScore: 89,
    usageCount: 8,
    freshnessScore: 84,
    previewTone: {
      rootHz: 146.83,
      harmonyHz: 293.66,
      bassHz: 73.42,
      pulseHz: 4.2,
    },
  },
  {
    id: 'soft-landing',
    title: 'Soft Landing',
    subtitle: 'Ambient bed',
    description: 'Quiet emotional support for documentary cuts, founder stories, and reflective moments.',
    artist: 'Prometheus Audio',
    producer: 'Quiet Signal',
    genre: 'Ambient',
    subgenre: 'Ambient bed',
    bpm: 86,
    mood: 'minimal',
    energy: 'low',
    vibeTags: ['calm', 'airy', 'documentary', 'under-dialogue'],
    moodTags: ['calm', 'airy', 'reflective', 'under-dialogue'],
    rankingKeywords: ['soft', 'ambient', 'documentary', 'voice', 'bed', 'subtle'],
    energyScore: 28,
    tempoRange: [78, 92],
    instrumentation: ['soft piano', 'textural pads', 'room tone', 'subtle pulse'],
    cinematicTags: ['documentary', 'editorial', 'supportive'],
    tensionLevel: 14,
    emotionalTone: 'gentle and introspective',
    idealUseCases: ['founder story', 'testimonial', 'explainer'],
    avoidContexts: ['aggressive sales', 'fast-cut trailer'],
    coverArtUrl: '/style-previews/docs-story-1.jpg',
    coverArtPosition: '52% 28%',
    releaseYear: 2026,
    durationSec: 12,
    sourcePlatform: 'local',
    qualityScore: 90,
    usageCount: 4,
    freshnessScore: 86,
    previewTone: {
      rootHz: 98,
      harmonyHz: 196,
      bassHz: 49,
      pulseHz: 2.6,
    },
  },
  {
    id: 'night-current',
    title: 'Night Current',
    subtitle: 'Loop pack',
    description: 'Tension loops that stay elegant under dialogue and build a clean line of forward motion.',
    artist: 'Prometheus Audio',
    producer: 'Circuit Vale',
    genre: 'Cinematic',
    subgenre: 'Tension loop',
    bpm: 96,
    mood: 'dark',
    energy: 'medium',
    vibeTags: ['tension', 'dialogue-safe', 'elegant', 'night'],
    moodTags: ['tension', 'elegant', 'night', 'dialogue-safe'],
    rankingKeywords: ['tension', 'dialogue', 'podcast', 'score', 'moody', 'cinematic'],
    energyScore: 58,
    tempoRange: [90, 102],
    instrumentation: ['low strings', 'pulse synth', 'soft toms', 'dark drone'],
    cinematicTags: ['cinematic', 'podcast', 'underscore'],
    tensionLevel: 72,
    emotionalTone: 'focused suspense',
    idealUseCases: ['dialogue bed', 'investigative cut', 'night sequence'],
    avoidContexts: ['bouncy product hype'],
    coverArtUrl: '/style-previews/podcast-1.jpg',
    coverArtPosition: '50% 22%',
    releaseYear: 2025,
    durationSec: 10,
    sourcePlatform: 'local',
    qualityScore: 86,
    usageCount: 6,
    freshnessScore: 80,
    previewTone: {
      rootHz: 123.47,
      harmonyHz: 246.94,
      bassHz: 61.74,
      pulseHz: 3,
    },
  },
  {
    id: 'static-hearts',
    title: 'Static Hearts',
    subtitle: 'Trailer bed',
    description: 'High-gloss transition energy for bold hero moments, reveal beats, and sharper trailer cuts.',
    artist: 'Prometheus Audio',
    producer: 'Afterglow Assembly',
    genre: 'Trailer',
    subgenre: 'Trailer hybrid',
    bpm: 138,
    mood: 'dark',
    energy: 'high',
    vibeTags: ['impact', 'heroic', 'riser', 'trailer'],
    moodTags: ['heroic', 'impact', 'trailer', 'reveal'],
    rankingKeywords: ['trailer', 'impact', 'hero', 'reveal', 'intense', 'driving'],
    energyScore: 92,
    tempoRange: [128, 144],
    instrumentation: ['big drums', 'braams', 'riser', 'orchestral hit'],
    cinematicTags: ['trailer', 'hero', 'impact'],
    tensionLevel: 86,
    emotionalTone: 'massive and urgent',
    idealUseCases: ['hero reveal', 'trailer cut', 'bold campaign'],
    avoidContexts: ['voice-led interview', 'minimal editorial bed'],
    coverArtUrl: '/style-previews/red-statue-1.jpg',
    coverArtPosition: '50% 34%',
    releaseYear: 2026,
    durationSec: 9,
    sourcePlatform: 'local',
    qualityScore: 94,
    usageCount: 3,
    freshnessScore: 90,
    previewTone: {
      rootHz: 164.81,
      harmonyHz: 329.63,
      bassHz: 82.41,
      pulseHz: 5.4,
    },
  },
  {
    id: 'echo-bloom',
    title: 'Echo Bloom',
    subtitle: 'Texture kit',
    description: 'Light melodic phrases and soft motion for reflective pieces that still need some lift.',
    artist: 'Prometheus Audio',
    producer: 'Sunline Studio',
    genre: 'Ambient',
    subgenre: 'Textural ambient',
    bpm: 102,
    mood: 'minimal',
    energy: 'medium',
    vibeTags: ['melodic', 'reflective', 'texture', 'soft lift'],
    moodTags: ['melodic', 'reflective', 'soft lift', 'glassy'],
    rankingKeywords: ['texture', 'reflective', 'soft', 'light', 'underscore', 'breathe'],
    energyScore: 48,
    tempoRange: [96, 110],
    instrumentation: ['warm pad', 'soft motif', 'light percussion', 'piano swell'],
    cinematicTags: ['ambient', 'editorial', 'reflective'],
    tensionLevel: 28,
    emotionalTone: 'softly hopeful',
    idealUseCases: ['thoughtful montage', 'brand story', 'subtle lift'],
    avoidContexts: ['high-impact trailer'],
    coverArtUrl: '/style-previews/iman-1.jpg',
    coverArtPosition: '50% 26%',
    releaseYear: 2026,
    durationSec: 11,
    sourcePlatform: 'local',
    qualityScore: 87,
    usageCount: 4,
    freshnessScore: 89,
    previewTone: {
      rootHz: 130.81,
      harmonyHz: 261.63,
      bassHz: 65.41,
      pulseHz: 3.8,
    },
  },
]

export function createDefaultMusicPreference(now = new Date()): MusicPreference {
  return {
    mood: 'cinematic',
    energy: 'medium',
    sourcePlatform: 'online',
    updatedAt: now.toISOString(),
  }
}

export function buildMusicPreviewUrl(trackId: string) {
  return `/api/music/preview?trackId=${encodeURIComponent(trackId)}`
}

export function findMusicTrack(trackId: string) {
  return MUSIC_CATALOG.find((track) => track.id === trackId) ?? null
}

export function getMusicShowcaseSeeds() {
  return MUSIC_CATALOG.map((track) => ({
    title: track.title,
    subtitle: track.subtitle,
    description: track.description,
    year: String(track.releaseYear),
    runtime: `${track.durationSec}s cue`,
    genre: track.genre,
    badge: 'Music',
    image: track.coverArtUrl,
    imagePosition: track.coverArtPosition,
  }))
}

export function inferMusicPreferenceFromPrompt(prompt: string, videoContext?: MusicVideoContext | null): MusicPreference {
  const text = normalizeText([prompt, buildVideoContextText(videoContext)].filter(Boolean).join(' '))
  const strongSelectionCue = hasAny(text, [
    'strong',
    'knockout',
    'anthem',
    'banger',
    'impact',
    'punchy',
    'power',
    'driving',
    'hero',
    'headline',
    'statement',
    'viral',
    'trending',
    'spotify',
  ])
  const matches = {
    cinematic:
      hasAny(text, ['cinematic', 'trailer', 'luxury', 'founder', 'premium', 'hero', 'dramatic']) ||
      hasAny(text, ['brand', 'launch', 'sales']) && !hasAny(text, ['playful']),
    uplifting: hasAny(text, ['uplifting', 'coach', 'motivation', 'launch', 'sales', 'reel', 'promo', 'positive', 'anthem', 'banger', 'knockout', 'impact', 'strong', 'viral', 'tiktok', 'instagram']),
    dark: hasAny(text, ['dark', 'moody', 'night', 'tension', 'powerful', 'bold']),
    minimal: hasAny(text, ['minimal', 'soft', 'ambient', 'subtle', 'bed', 'under voice', 'voice over', 'documentary']),
    playful: hasAny(text, ['playful', 'bouncy', 'light', 'warm', 'friendly']),
  }

  let mood: MusicMood = 'cinematic'
  if (matches.playful) {
    mood = 'playful'
  } else if (matches.minimal) {
    mood = 'minimal'
  } else if (matches.dark) {
    mood = 'dark'
  } else if (matches.uplifting) {
    mood = 'uplifting'
  } else if (matches.cinematic) {
    mood = 'cinematic'
  }

  let energy: MusicEnergy = 'medium'
  if (hasAny(text, ['quiet', 'soft', 'ambient', 'breathing', 'subtle', 'under dialogue'])) {
    energy = 'low'
  } else if (strongSelectionCue || hasAny(text, ['upbeat', 'drive', 'driving', 'fast', 'high energy', 'push', 'lift', 'intense', 'knockout', 'anthem', 'banger', 'impact', 'punchy'])) {
    energy = 'high'
  } else if (videoContext?.pace === 'fast') {
    energy = 'high'
  } else if (videoContext?.pace === 'slow') {
    energy = 'low'
  }

  let sourcePlatform: MusicSourcePlatform = 'online'
  if (hasAny(text, ['local', 'uploaded', 'library', 'staged'])) {
    sourcePlatform = 'local'
  }

  return {
    mood,
    energy,
    sourcePlatform,
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeMusicPreference(
  preference: Partial<MusicPreference> | null | undefined,
  prompt = '',
  videoContext?: MusicVideoContext | null,
): MusicPreference {
  const fallback = inferMusicPreferenceFromPrompt(prompt, videoContext)
  const sourcePlatform =
    preference?.sourcePlatform === 'local'
      ? 'local'
      : preference?.sourcePlatform === 'online' || preference?.sourcePlatform === 'catalog'
        ? 'online'
        : fallback.sourcePlatform
  return {
    mood: preference?.mood ?? fallback.mood,
    energy: preference?.energy ?? fallback.energy,
    sourcePlatform,
    updatedAt: preference?.updatedAt ?? new Date().toISOString(),
  }
}

export function buildMusicRecommendationSet({
  query,
  projectTitle,
  initialPrompt,
  preference,
  videoContext,
  limit = 4,
}: {
  query: string
  projectTitle?: string
  initialPrompt?: string
  preference?: Partial<MusicPreference> | null
  videoContext?: MusicVideoContext | null
  limit?: number
}): {
  recommendations: MusicRecommendation[]
  preference: MusicPreference
  fallback: boolean
} {
  const queryText = normalizeText(query)
  const contextText = [queryText, projectTitle, initialPrompt, buildVideoContextText(videoContext)].filter(Boolean).join(' ')
  const resolvedPreference = normalizeMusicPreference(preference, contextText, videoContext)
  const tokens = tokenize(contextText)
  const fallback = queryText.length === 0
  const promptSignals = inferPromptSignals(contextText, videoContext)
  const strongSelectionCue = hasAny(contextText, [
    'strong',
    'knockout',
    'anthem',
    'banger',
    'impact',
    'punchy',
    'power',
    'driving',
    'hero',
    'headline',
    'statement',
    'viral',
    'trending',
    'spotify',
  ])
  const wantsAmbient =
    resolvedPreference.mood === 'minimal' ||
    hasAny(contextText, ['ambient', 'soft', 'subtle', 'under dialogue', 'documentary', 'reflective'])

  const scored = MUSIC_CATALOG.map((track, index) => {
    const trackText = normalizeText(
      [
        track.title,
        track.subtitle,
        track.description,
        track.artist,
        track.producer,
        track.genre,
        track.vibeTags.join(' '),
        track.rankingKeywords.join(' '),
      ].join(' '),
    )

    let score = 0
    const matchedTerms: string[] = []

    if (track.mood === resolvedPreference.mood) score += 8
    if (track.energy === resolvedPreference.energy) score += 5
    if (track.sourcePlatform === resolvedPreference.sourcePlatform) score += 2

    const bpmTarget =
      resolvedPreference.energy === 'low' ? 92 : resolvedPreference.energy === 'high' ? 128 : 110
    score += Math.max(0, 8 - Math.abs(track.bpm - bpmTarget) / 10)

    for (const token of tokens) {
      if (token.length < 3) continue
      if (trackText.includes(token)) {
        score += 2.5
        if (matchedTerms.length < 3 && !matchedTerms.includes(token)) {
          matchedTerms.push(token)
        }
      }
    }

    for (const signal of promptSignals) {
      if (trackText.includes(signal)) {
        score += 4
        if (matchedTerms.length < 3 && !matchedTerms.includes(signal)) {
          matchedTerms.push(signal)
        }
      }
    }

    if (resolvedPreference.mood === 'minimal' && track.energy !== 'high') score += 1.5
    if (resolvedPreference.mood === 'uplifting' && track.energy === 'high') score += 2
    if (resolvedPreference.mood === 'dark' && track.mood === 'dark') score += 2
    if (resolvedPreference.mood === 'playful' && track.vibeTags.some((tag) => tag.includes('light'))) score += 1.5
    if (resolvedPreference.mood === 'cinematic' && track.vibeTags.some((tag) => tag.includes('cinematic') || tag.includes('luxury'))) {
      score += 2
    }
    if (!wantsAmbient && track.energy === 'low') score -= 2.5
    if (!wantsAmbient && track.mood === 'minimal') score -= 1.75
    if (strongSelectionCue && track.energy === 'high') score += 2.5
    if (strongSelectionCue && track.vibeTags.some((tag) => hasAny(tag, ['driving', 'impact', 'launch', 'pulse', 'snappy', 'anthem', 'hero']))) score += 2
    if (videoContext?.pace === 'fast' && track.energy === 'high') score += 2.5
    if (videoContext?.pace === 'fast' && track.vibeTags.some((tag) => hasAny(tag, ['driving', 'launch', 'pulse', 'lift', 'snappy', 'impact']))) score += 2
    if (videoContext?.pace === 'slow' && track.energy === 'low') score += 2.5
    if (videoContext?.pace === 'slow' && track.vibeTags.some((tag) => hasAny(tag, ['calm', 'airy', 'soft', 'subtle', 'documentary']))) score += 2

    return {
      track,
      score,
      matchedTerms,
      index,
    }
  })

  const recommendations = scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(({ track, matchedTerms, score }) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      producer: track.producer,
      genre: track.genre,
      bpm: track.bpm,
      vibeTags: track.vibeTags,
      coverArtUrl: track.coverArtUrl,
      coverArtPosition: track.coverArtPosition,
      previewUrl: buildMusicPreviewUrl(track.id),
      reason: buildReason(track, matchedTerms, resolvedPreference, promptSignals),
      mood: track.mood,
      energy: track.energy,
      sourcePlatform: track.sourcePlatform,
      durationSec: track.durationSec,
      subtitle: track.subtitle,
      description: track.description,
      album: track.album,
      releaseYear: track.releaseYear,
      storageKey: track.storageKey,
      sourceUrl: track.sourceUrl,
      license: track.license,
      matchedTerms,
      matchScore: score,
    }))

  return {
    recommendations,
    preference: resolvedPreference,
    fallback,
  }
}

function buildReason(
  track: MusicCatalogTrack,
  matchedTerms: string[],
  preference: MusicPreference,
  promptSignals: string[],
) {
  const energyLine =
    track.energy === 'low'
      ? 'stays tucked under the voice'
      : track.energy === 'high'
        ? 'adds a driving lift without getting clumsy'
        : 'keeps a steady pulse under the cut'

  const moodLine =
    preference.mood === track.mood
      ? `${track.mood} tone`
      : `${track.mood} ${track.genre.toLowerCase()} texture`

  const terms = [...matchedTerms, ...promptSignals].filter((term, index, all) => all.indexOf(term) === index)
  const termLine = terms.length > 0 ? `It lines up with ${terms.slice(0, 2).join(' and ')} cues.` : ''

  return `${moodLine} at ${track.bpm} BPM ${energyLine}. ${termLine}`.trim()
}

function inferPromptSignals(prompt: string, videoContext?: MusicVideoContext | null) {
  const text = normalizeText(prompt)
  const signals: string[] = []

  if (hasAny(text, ['voice', 'dialogue', 'talk', 'podcast', 'narration'])) signals.push('voice')
  if (hasAny(text, ['launch', 'promo', 'ad', 'sales', 'reel', 'tiktok', 'instagram', 'spotify'])) signals.push('launch')
  if (hasAny(text, ['luxury', 'premium', 'high taste', 'cinematic'])) signals.push('luxury')
  if (hasAny(text, ['documentary', 'interview', 'founder'])) signals.push('documentary')
  if (hasAny(text, ['tension', 'trailer', 'impact'])) signals.push('trailer')
  if (hasAny(text, ['strong', 'knockout', 'anthem', 'banger', 'impact', 'punchy', 'power', 'driving', 'hero', 'headline', 'statement'])) {
    signals.push('strong')
  }
  if (videoContext?.pace === 'fast') signals.push('fast')
  if (videoContext?.pace === 'slow') signals.push('slow')
  if (videoContext?.summary) signals.push(...extractKeywords(videoContext.summary).slice(0, 4))
  if (videoContext?.signals?.length) signals.push(...videoContext.signals.slice(0, 4))
  if (videoContext?.intent?.summary) signals.push(...extractKeywords(videoContext.intent.summary).slice(0, 4))
  if (videoContext?.intent?.searchTerms?.length) signals.push(...videoContext.intent.searchTerms.slice(0, 4))

  return signals
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractKeywords(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
}

function uniqueStrings(values: string[]) {
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
}

export function buildVideoContextText(videoContext?: MusicVideoContext | null) {
  if (!videoContext) return ''

  const pacePhrase =
    videoContext.pace === 'fast'
      ? 'fast paced upbeat driving short form coach led'
      : videoContext.pace === 'slow'
        ? 'slow reflective spacious emotional'
        : 'balanced editorial steady'

  return uniqueStrings([
    pacePhrase,
    videoContext.summary,
    ...(videoContext.signals ?? []),
    videoContext.intent?.summary ?? '',
    ...(videoContext.intent?.searchTerms ?? []),
    videoContext.intent?.sentiment.summary ?? '',
    ...(videoContext.intent?.sentiment.themeTags ?? []),
    ...(videoContext.intent?.trends?.flatMap((trend) => [trend.summary, ...trend.tags]) ?? []),
  ]).join(' ')
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle))
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'be',
  'by',
  'for',
  'from',
  'get',
  'go',
  'in',
  'into',
  'is',
  'it',
  'make',
  'music',
  'of',
  'on',
  'or',
  'please',
  'song',
  'songs',
  'sound',
  'soundtrack',
  'the',
  'this',
  'to',
  'track',
  'tracks',
  'use',
  'with',
  'your',
])
