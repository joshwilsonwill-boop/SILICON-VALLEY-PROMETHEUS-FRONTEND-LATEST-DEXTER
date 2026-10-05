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

export type VoiceMusicTrack = { id: string; title: string; artist?: string; previewUrl?: string; genre?: string; vibeTags?: string[]; mood?: string }
export type VoiceMusicActionArgs = {
  action?: 'browse' | 'search' | 'preview' | 'select' | 'select_and_preview' | 'stop' | 'mute' | 'unmute'
  query?: string
  trackName?: string
  trackId?: string
  recommendation?: boolean
  context?: unknown
  excludeTrackId?: string
  excludeTrackIds?: string[]
  limit?: number
  offset?: number
}

const sessionRejectedTrackIds = new Set<string>()

export function clearVoiceMusicRejectionHistory(): void {
  sessionRejectedTrackIds.clear()
}

export function getVoiceMusicRejectionHistory(): string[] {
  return Array.from(sessionRejectedTrackIds)
}

export function recordVoiceMusicRejection(trackId: string): void {
  if (trackId && typeof trackId === 'string') {
    sessionRejectedTrackIds.add(trackId)
  }
}
export type VoiceMusicActionResult = VoiceActionResult & {
  action: string
  title?: string
  staged: boolean
  previewStarted: boolean
  tab?: 'Music' | 'Motion'
  results?: VoiceMusicTrack[]
  alternatives?: VoiceMusicTrack[]
  total?: number
  matched?: boolean
  warning?: string
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
  let warning: string | undefined
  const result = (success: boolean, summary: string): VoiceMusicActionResult => ({
    success, summary, action, staged, previewStarted,
    ...(track ? { trackId: track.id, title: track.title } : {}),
    ...(warning ? { warning } : {}),
  })
  try {
    if (!['browse', 'search', 'preview', 'select', 'select_and_preview', 'stop', 'mute', 'unmute'].includes(action)) return result(false, 'Unsupported music action.')
    if (action === 'stop') {
      const handlers = getHandlers()
      const setMuted = handlers.onSetMusicMuted
      if (!handlers.onStopMusicPlayback) return result(false, 'The editor has no music stop control.')
      const stopped = await handlers.onStopMusicPlayback()
      if (!stopped?.success) return result(false, stopped?.summary || 'Music playback did not stop.')
      // Auditions can be stopped even when no soundtrack has been selected.
      if (!setMuted || handlers.getMusicState?.().trackId === null) return result(true, stopped.summary)
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
    if (!args.trackId && !requestedTitle && !['search', 'browse'].includes(action) && !args.recommendation) return result(false, 'Provide a song title or a music search query.')
    let handlers = getHandlers()
    const excludedIds = new Set<string>([
      ...sessionRejectedTrackIds,
      ...(args.excludeTrackId ? [args.excludeTrackId] : []),
      ...(args.excludeTrackIds ?? []),
    ])
    if (args.excludeTrackId) recordVoiceMusicRejection(args.excludeTrackId)
    if (args.excludeTrackIds) {
      for (const id of args.excludeTrackIds) recordVoiceMusicRejection(id)
    }

    const currentActiveTrackId = handlers.getMusicState?.().trackId
    const isExplicitUserSelection = Boolean(args.trackId || (requestedTitle && !args.recommendation))
    const isCandidateAllowed = (candidate: VoiceMusicTrack) => {
      if (isExplicitUserSelection) {
        if (args.trackId && candidate.id === args.trackId) return true
        if (requestedTitle && normalizeTitle(candidate.title) === normalizeTitle(requestedTitle)) return true
      }
      return !excludedIds.has(candidate.id)
    }

    let catalog = (handlers.getMusicCatalog?.() ?? []).filter(isCandidateAllowed)
    if (catalog.length === 0 && Array.isArray(MUSIC_CATALOG)) {
      catalog = (MUSIC_CATALOG as any[]).map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        previewUrl: t.sourceUrl,
        genre: t.genre,
        mood: t.mood,
        vibeTags: t.vibeTags ?? [],
      })).filter(isCandidateAllowed)
    }
    const matchesQuery = (candidate: VoiceMusicTrack) => normalizeTitle([candidate.title, candidate.artist, candidate.genre, candidate.mood, ...(candidate.vibeTags ?? [])].filter(Boolean).join(' ')).includes(normalizeTitle(requestedTitle))
    if (action === 'browse' || (action === 'search' && !requestedTitle)) {
      if (handlers.searchMusicTracks) {
        try { catalog = [...catalog, ...(await handlers.searchMusicTracks('')).filter(isCandidateAllowed)] }
        catch (error) { warning = `Catalog refresh failed: ${error instanceof Error ? error.message : 'service unavailable'}. Showing cached tracks.` }
      }
      catalog = [...new Map(catalog.filter(isCandidateAllowed).map(candidate => [candidate.id, candidate])).values()]
      if (!catalog.length) return { ...result(false, 'No music catalog tracks are available yet.'), results: [], total: 0 }
      const opened = await switchVoiceWorkspace('Music', getHandlers)
      if (!opened.success) return result(false, 'The editor did not confirm Music is open.')
      const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(50, Math.floor(args.limit!))) : 20
      const offset = Number.isFinite(args.offset) ? Math.max(0, Math.floor(args.offset!)) : 0
      return { ...result(true, `${catalog.length} catalog tracks are available. Showing ${Math.min(limit, Math.max(0, catalog.length - offset))} tracks in Music.`), results: catalog.slice(offset, offset + limit), total: catalog.length, tab: 'Music' }
    }
    const findExact = () => {
      const match = args.trackId
        ? catalog.find((candidate) => candidate.id === args.trackId)
        : catalog.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(requestedTitle))
      if (match && isExplicitUserSelection) {
        sessionRejectedTrackIds.delete(match.id)
        excludedIds.delete(match.id)
        return match
      }
      return match && !excludedIds.has(match.id) ? match : undefined
    }
    track = findExact()
    let searched: VoiceMusicTrack[] = []
    if (handlers.searchMusicTracks && (action === 'search' || !track || args.recommendation)) {
      try {
        searched = (await handlers.searchMusicTracks(requestedTitle || args.trackId || '', { recommendation: args.recommendation === true })).filter(isCandidateAllowed)
      } catch (error) {
        warning = `Recommendation search failed: ${error instanceof Error ? error.message : 'service unavailable'}. Using the available catalog.`
        searched = catalog.filter(matchesQuery)
        if (args.recommendation && !args.trackName && !args.trackId && !searched.length) searched = catalog
      }
      catalog = [...catalog, ...searched]
      track = findExact()
    } else if (action === 'search' || !track || args.recommendation) {
      searched = catalog.filter(matchesQuery)
      if (args.recommendation && !args.trackName && !args.trackId && !searched.length) searched = catalog
    }
    if (args.recommendation && !args.trackName && !args.trackId && searched.length > 0) {
      // The search endpoint returns ranked, video-aware recommendations. When
      // asked to choose the best fit, stage its first result instead of demanding
      // a literal song-title match against the visual description.
      track = searched[0]
    }
    if (action === 'search') {
      const literalMatches = catalog.filter(matchesQuery)
      // Keep the recommendation service's ranked semantic results when their titles
      // do not repeat the visual/mood description. Exact user title searches remain literal.
      const matches = literalMatches.length ? literalMatches : searched
      const results = [...new Map(matches.map((candidate) => [candidate.id, candidate])).values()]
      if (!results.length) return { ...result(catalog.length > 0, `No catalog tracks matched "${requestedTitle}".${catalog.length ? ' Other catalog tracks are available; choose one of the alternatives.' : ''}`), results: [], matched: false, alternatives: catalog.slice(0, 20) }
      return { ...result(true, `Found ${results.length} matching track${results.length === 1 ? '' : 's'}.`), results, matched: true }
    }
    if (!track) return result(false, `No exact catalog match for "${requestedTitle || args.trackId}". No soundtrack was changed.`)
    handlers = getHandlers()
    if (!handlers.onTabChange) return result(false, 'The music workspace is unavailable. Open the editor first.')
    if ((action === 'select' || action === 'select_and_preview') && !handlers.onSelectMusicTrack) return result(false, 'The editor cannot stage this soundtrack.')
    if ((action === 'preview' || action === 'select_and_preview') && !handlers.onPlayMusicPreview) return result(false, 'The editor has no music preview playback control.')
    const openedMusic = await switchVoiceWorkspace('Music', getHandlers)
    if (!openedMusic.success) return result(false, 'The editor did not confirm that Music is open. No soundtrack action was started.')
    if (action === 'select' || action === 'select_and_preview') {
      const outcome = await getHandlers().onSelectMusicTrack?.(track.id)
      if (!outcome?.success) {
        staged = outcome?.staged === true
        return result(false, outcome?.summary || 'The editor did not confirm soundtrack staging.')
      }
      staged = true
      if (currentActiveTrackId && currentActiveTrackId !== track.id) {
        recordVoiceMusicRejection(currentActiveTrackId)
      }
    }
    if (action === 'preview' || action === 'select_and_preview') {
      const outcome = await getHandlers().onPlayMusicPreview?.(track.id)
      if (!outcome?.success) return result(false, outcome?.summary || 'Playback did not start. The song has not been auditioned.')
      previewStarted = true
    }
    if (staged) {
      const latest = getHandlers()
      if (!latest.onTabChange) return result(false, `"${track.title}" is staged, but Motion could not be opened.`)
      const openedMotion = await switchVoiceWorkspace('Motion', getHandlers)
      if (!openedMotion.success) return result(false, `"${track.title}" is staged, but the editor did not confirm Motion is open.`)
      return { ...result(true, `"${track.title}" is staged as the soundtrack in Motion${previewStarted ? '; preview playback started' : ''}.`), tab: 'Motion' }
    }
    return { ...result(true, `Preview playback started for "${track.title}" in Music.`), tab: 'Music' }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The editor could not complete the music action.'
    return result(false, `${staged ? 'The soundtrack is staged. ' : ''}${detail}`)
  }
}
