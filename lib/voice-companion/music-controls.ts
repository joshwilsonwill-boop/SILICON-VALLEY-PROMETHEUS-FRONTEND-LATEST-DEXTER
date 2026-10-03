import type { VoiceCompanionBridgeHandlers } from './bridge'
import { switchVoiceWorkspace } from './session-controls'
import { MUSIC_CATALOG } from '@/lib/music-catalog'

export type VoiceActionResult = {
  success: boolean
  summary: string
  staged?: boolean
  count?: number
  totalRemovedSec?: number
  trackId?: string
}

export type VoiceMusicTrack = { id: string; title: string; artist?: string; previewUrl?: string }
export type VoiceMusicActionArgs = {
  action?: 'search' | 'preview' | 'select' | 'select_and_preview' | 'stop' | 'mute' | 'unmute'
  query?: string
  trackName?: string
  trackId?: string
  recommendation?: boolean
  context?: unknown
}
export type VoiceMusicActionResult = VoiceActionResult & {
  action: string
  title?: string
  staged: boolean
  previewStarted: boolean
  tab?: 'Music' | 'Motion'
  results?: VoiceMusicTrack[]
}

function normalizeTitle(value: string) {
  return value.normalize('NFKC').trim().replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').toLocaleLowerCase()
}

/** Use only live catalog data and awaited editor handlers to claim an outcome. */
export async function performVoiceMusicAction(
  args: VoiceMusicActionArgs,
  getHandlers: () => VoiceCompanionBridgeHandlers,
): Promise<VoiceMusicActionResult> {
  const action = args.action ?? (args.trackId || args.trackName ? 'select' : 'search')
  let staged = false
  let previewStarted = false
  let track: VoiceMusicTrack | undefined
  const result = (success: boolean, summary: string): VoiceMusicActionResult => ({
    success, summary, action, staged, previewStarted,
    ...(track ? { trackId: track.id, title: track.title } : {}),
  })
  try {
    if (!['search', 'preview', 'select', 'select_and_preview', 'stop', 'mute', 'unmute'].includes(action)) return result(false, 'Unsupported music action.')
    if (action === 'stop') {
      const handlers = getHandlers()
      const setMuted = handlers.onSetMusicMuted
      if (!handlers.onStopMusicPlayback || !setMuted) return result(false, 'The editor has no music stop control.')
      const stopped = await handlers.onStopMusicPlayback()
      if (!stopped?.success) return result(false, stopped?.summary || 'Music playback did not stop.')
      const muted = await setMuted(true)
      if (!muted?.success) return result(false, `Music playback stopped, but the soundtrack could not be muted: ${muted?.summary || 'editor did not confirm the change'}`)
      return result(true, 'Music playback stopped and the soundtrack was muted.')
    }
    if (action === 'mute' || action === 'unmute') {
      const setMuted = getHandlers().onSetMusicMuted
      if (!setMuted) return result(false, 'The editor has no soundtrack mute control.')
      const muted = await setMuted(action === 'mute')
      if (!muted?.success) return result(false, muted?.summary || 'The soundtrack mute state did not change.')
      return result(true, action === 'mute' ? 'The soundtrack was muted.' : 'The soundtrack was unmuted.')
    }
    const requestedTitle = (args.trackName || args.query || '').trim()
    if (!args.trackId && !requestedTitle) return result(false, 'Provide a song title or a music search query.')
    let handlers = getHandlers()
    let catalog = handlers.getMusicCatalog?.() ?? []
    if (catalog.length === 0) {
      catalog = (MUSIC_CATALOG as any[]).map((t) => ({ id: t.id, title: t.title, artist: t.artist, previewUrl: t.sourceUrl }))
    }
    const isRandomQuery = /random|any|whatever|pick|choose/i.test(requestedTitle)
    const findExact = () => args.trackId
      ? catalog.find((candidate) => candidate.id === args.trackId)
      : !isRandomQuery
        ? catalog.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(requestedTitle))
        : undefined
    track = findExact()
    let searched: VoiceMusicTrack[] = []
    if (handlers.searchMusicTracks && (action === 'search' || !track || args.recommendation)) {
      try {
        searched = await handlers.searchMusicTracks(requestedTitle || args.trackId!)
        catalog = [...catalog, ...searched]
        track = findExact()
      } catch (err) {
        console.warn('[performVoiceMusicAction] Remote music search error, using local catalog:', err)
      }
    }
    if (args.recommendation && !args.trackName && !args.trackId && searched.length > 0) {
      // The search endpoint returns ranked, video-aware recommendations. When
      // asked to choose the best fit, stage its first result instead of demanding
      // a literal song-title match against the visual description.
      track = searched[0]
    }
    if (action === 'search') {
      const query = normalizeTitle(requestedTitle)
      const literalMatches = catalog.filter((candidate) =>
        isRandomQuery || normalizeTitle(`${candidate.title} ${candidate.artist ?? ''}`).includes(query)
      )
      // Keep the recommendation service's ranked semantic results when their titles
      // do not repeat the visual/mood description. Exact user title searches remain literal.
      const matches = literalMatches.length ? literalMatches : searched.length ? searched : catalog
      const results = [...new Map(matches.map((candidate) => [candidate.id, candidate])).values()]
      if (!results.length) return { ...result(false, `No catalog tracks matched "${requestedTitle}".`), results: [] }
      return { ...result(true, `Found ${results.length} matching track${results.length === 1 ? '' : 's'}.`), results }
    }
    if (!track) {
      // Mood or random fallback from available catalog
      const queryLower = requestedTitle.toLowerCase()
      const moodCandidates = catalog.filter((candidate) => {
        const full = `${candidate.title} ${candidate.artist ?? ''}`.toLowerCase()
        if (queryLower.includes('solemn') || queryLower.includes('sad') || queryLower.includes('reflective')) {
          return /solemn|dark|minimal|ambient|reflective|calm/i.test(full)
        }
        if (queryLower.includes('cinematic') || queryLower.includes('dramatic')) {
          return /cinematic|dramatic|trailer|epic/i.test(full)
        }
        if (queryLower.includes('upbeat') || queryLower.includes('hype')) {
          return /upbeat|fast|reels|heat/i.test(full)
        }
        return false
      })
      if (moodCandidates.length > 0) {
        track = moodCandidates[0]
      } else if (isRandomQuery || ['select', 'select_and_preview'].includes(action)) {
        track = catalog.length > 0 ? catalog[Math.floor(Math.random() * catalog.length)] : undefined
      }
    }
    if (!track) return result(false, `No exact catalog match for "${requestedTitle || args.trackId}". No soundtrack was changed.`)
    handlers = getHandlers()
    if (!handlers.onTabChange) return result(false, 'The music workspace is unavailable. Open the editor first.')
    if ((action === 'select' || action === 'select_and_preview') && !handlers.onSelectMusicTrack) return result(false, 'The editor cannot stage this soundtrack.')
    if ((action === 'preview' || action === 'select_and_preview') && !handlers.onPlayMusicPreview) return result(false, 'The editor has no music preview playback control.')
    await switchVoiceWorkspace('Music', getHandlers, 300).catch(() => {})
    if (action === 'select' || action === 'select_and_preview') {
      const outcome = await getHandlers().onSelectMusicTrack?.(track.id)
      if (!outcome?.success) {
        staged = outcome?.staged === true
        return result(false, outcome?.summary || 'The editor did not confirm soundtrack staging.')
      }
      staged = true
    }
    if (action === 'preview' || action === 'select_and_preview') {
      const outcome = await getHandlers().onPlayMusicPreview?.(track.id)
      if (!outcome?.success) return result(false, outcome?.summary || 'Playback did not start. The song has not been auditioned.')
      previewStarted = true
    }
    if (staged) {
      const latest = getHandlers()
      if (latest.onTabChange) {
        await switchVoiceWorkspace('Motion', getHandlers, 300).catch(() => {})
      }
      return { ...result(true, `"${track.title}" is staged as the soundtrack in Motion${previewStarted ? '; preview playback started' : ''}.`), tab: 'Motion', staged: true }
    }
    return { ...result(true, `Preview playback started for "${track.title}" in Music.`), tab: 'Music' }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The editor could not complete the music action.'
    return result(false, `${staged ? 'The soundtrack is staged. ' : ''}${detail}`)
  }
}
