/**
 * Prometheus Autonomous Song Intelligence Engine
 *
 * Provides semantic audio intent extraction, candidate scoring, and video-aware
 * soundtrack matching aligned with the Prometheus Vincere backend catalog.
 */

export interface MusicTrackMetadata {
  id: string
  title: string
  artist: string
  category: string
  genreTags: string[]
  moodTags: string[]
  useCaseTags: string[]
  intensity: 'soft' | 'medium' | 'hard'
  durationSec: number
  relativeSrc: string
}

export const SANCTIONED_MUSIC_CATALOG: MusicTrackMetadata[] = [
  {
    id: 'music-preview-cinematic-trailer-epic-intense-trailer',
    title: 'Intense Trailer',
    artist: 'Prometheus Original',
    category: 'cinematic-trailer-epic',
    genreTags: ['cinematic', 'trailer', 'epic', 'intense', 'tension', 'tech', 'blockbuster'],
    moodTags: ['intense', 'dramatic', 'epic', 'tension', 'action', 'high-stakes'],
    useCaseTags: ['hook', 'high-stakes', 'trailer', 'commercial', 'documentary'],
    intensity: 'hard',
    durationSec: 79.0,
    relativeSrc: 'audio/music/cinematic-trailer-epic--intense-trailer.mp3',
  },
  {
    id: 'music-preview-classical-orchestral-prestige-vivaldi-the-four-seasons-summer-violin-concerto-in-g-minor-op-8-2-rv-315-iii-presto',
    title: 'Vivaldi: The Four Seasons, Summer (Presto)',
    artist: 'Antonio Vivaldi',
    category: 'classical-orchestral-prestige',
    genreTags: ['classical', 'orchestral', 'prestige', 'baroque', 'violin', 'virtuosic'],
    moodTags: ['prestige', 'sophisticated', 'dramatic', 'virtuosic', 'elegant'],
    useCaseTags: ['prestige', 'luxury', 'intellectual', 'underscore', 'dramatic'],
    intensity: 'soft',
    durationSec: 163.47,
    relativeSrc: 'audio/music/classical-orchestral-prestige--vivaldi-the-four-seasons-summer.mp3',
  },
  {
    id: 'music-preview-classical-passacaglia-handel-halvorsen-relaxing-piano-music',
    title: 'Passacaglia - Handel / Halvorsen (Relaxing Piano)',
    artist: 'George Frideric Handel',
    category: 'classical',
    genreTags: ['classical', 'passacaglia', 'piano', 'solo', 'minimal', 'reflective'],
    moodTags: ['relaxing', 'calm', 'peaceful', 'reflective', 'contemplative', 'emotional'],
    useCaseTags: ['speech-friendly', 'focused', 'underscore', 'storytelling'],
    intensity: 'soft',
    durationSec: 169.76,
    relativeSrc: 'audio/music/classical--passacaglia-handel-halvorsen-relaxing-piano-music.mp3',
  },
  {
    id: 'music-preview-hip-hop-trap-urban-energy-beats-that',
    title: 'Beats That',
    artist: 'Prometheus Urban',
    category: 'hip-hop-trap-urban-energy',
    genreTags: ['hip-hop', 'trap', 'urban', 'energy', 'beats', 'drive', 'modern'],
    moodTags: ['energy', 'drive', 'confident', 'dynamic', 'punchy', 'hype'],
    useCaseTags: ['fast-paced', 'hype', 'rhythmic', 'speech-friendly'],
    intensity: 'hard',
    durationSec: 168.0,
    relativeSrc: 'audio/music/hip-hop-trap-urban-energy--beats-that.mp3',
  },
  {
    id: 'music-preview-ambient-documentary-curiosity-deep-focus',
    title: 'Deep Focus & Curiosity',
    artist: 'Prometheus Cinematic',
    category: 'ambient-documentary',
    genreTags: ['ambient', 'documentary', 'subtle', 'investigative', 'minimal', 'electronic'],
    moodTags: ['mysterious', 'curious', 'thoughtful', 'hypnotic', 'focused'],
    useCaseTags: ['voice-over', 'tech-explainer', 'narrative', 'background'],
    intensity: 'soft',
    durationSec: 142.0,
    relativeSrc: 'audio/music/ambient-documentary--deep-focus.mp3',
  },
]

export interface SongScoringContext {
  transcript?: string
  pace?: string
  mood?: string
  avoidIntensity?: 'soft' | 'hard'
}

export interface ScoredSongCandidate {
  track: MusicTrackMetadata
  score: number
  matchReasons: string[]
}

/**
 * Score candidate tracks by semantic relevance to query and video context
 */
export function scoreSongCandidates(
  query: string,
  context?: SongScoringContext
): ScoredSongCandidate[] {
  const normalizedQuery = (query || '').toLowerCase()
  const queryTokens = normalizedQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2)

  const transcriptTokens = (context?.transcript || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3)

  const results: ScoredSongCandidate[] = []

  for (const track of SANCTIONED_MUSIC_CATALOG) {
    let score = 0
    const reasons: string[] = []

    const searchableText = [
      track.title,
      track.artist,
      track.category,
      ...track.genreTags,
      ...track.moodTags,
      ...track.useCaseTags,
    ]
      .join(' ')
      .toLowerCase()

    // 1. Direct query matching
    for (const token of queryTokens) {
      if (searchableText.includes(token)) {
        score += 15
        reasons.push(`Matches search token "${token}"`)
      }
    }

    // 2. Keyword affinities
    if (normalizedQuery.includes('cinematic')) {
      if (track.genreTags.includes('cinematic') || track.category.includes('cinematic')) {
        score += 25
        reasons.push('High cinematic genre affinity')
      }
    }
    if (normalizedQuery.includes('intense') || normalizedQuery.includes('epic') || normalizedQuery.includes('trailer')) {
      if (track.moodTags.includes('intense') || track.moodTags.includes('epic')) {
        score += 20
        reasons.push('Matches high-energy trailer intensity')
      }
    }
    if (normalizedQuery.includes('calm') || normalizedQuery.includes('soft') || normalizedQuery.includes('relaxing')) {
      if (track.intensity === 'soft') {
        score += 20
        reasons.push('Matches soft/calm tone')
      }
    }

    // 3. Transcript contextual resonance
    for (const word of transcriptTokens) {
      if (['stakes', 'revolution', 'future', 'million', 'billion', 'danger', 'power', 'success'].includes(word)) {
        if (track.intensity === 'hard' || track.genreTags.includes('cinematic')) {
          score += 5
          reasons.push(`Transcript keyword "${word}" resonates with track dynamics`)
        }
      }
    }

    // 4. Default baseline for catalog validity
    score += 5

    results.push({
      track,
      score,
      matchReasons: reasons,
    })
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Return top scoring candidate
 */
export function getBestMatchingTrack(
  query: string,
  context?: SongScoringContext
): MusicTrackMetadata {
  const scored = scoreSongCandidates(query, context)
  return scored[0]?.track ?? SANCTIONED_MUSIC_CATALOG[0]!
}
