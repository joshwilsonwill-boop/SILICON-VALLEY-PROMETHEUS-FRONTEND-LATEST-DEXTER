import type { VoiceCompanionBridgeHandlers } from './bridge'
import { switchVoiceWorkspace } from './session-controls'

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
  action?: 'search' | 'preview' | 'select' | 'select_and_preview'
  query?: string
  trackName?: string
  trackId?: string
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
    if (!['search', 'preview', 'select', 'select_and_preview'].includes(action)) return result(false, 'Unsupported music action.')
    const requestedTitle = (args.trackName || args.query || '').trim()
    if (!args.trackId && !requestedTitle) return result(false, 'Provide a song title or a music search query.')
    let handlers = getHandlers()
    let catalog = handlers.getMusicCatalog?.() ?? []
    const findExact = () => args.trackId
      ? catalog.find((candidate) => candidate.id === args.trackId)
      : catalog.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(requestedTitle))
    track = findExact()
    if (handlers.searchMusicTracks && (action === 'search' || !track)) {
      const searched = await handlers.searchMusicTracks(requestedTitle || args.trackId!)
      catalog = [...catalog, ...searched]
      track = findExact()
    }
    if (action === 'search') {
      const query = normalizeTitle(requestedTitle)
      const results = [...new Map(catalog.filter((candidate) => normalizeTitle(`${candidate.title} ${candidate.artist ?? ''}`).includes(query)).map((candidate) => [candidate.id, candidate])).values()]
      // Remote recommendations may be semantic matches. Return them as search results,
      // but never substitute one for a specifically requested title during selection.
      if (!results.length) return { ...result(false, `No catalog tracks matched "${requestedTitle}".`), results: [] }
      return { ...result(true, `Found ${results.length} matching track${results.length === 1 ? '' : 's'}.`), results }
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
