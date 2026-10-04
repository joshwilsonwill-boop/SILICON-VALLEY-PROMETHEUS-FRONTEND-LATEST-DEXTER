import type { VoiceCompanionBridgeHandlers } from './bridge'
import type { VoiceActionResult } from './music-controls'
import type { EditorialTimelinePatch, EditorialTimelineState } from '../editor/editorial-timeline-state'

export type VoiceMusicMixArgs = { command?: string; volume?: number; enabled?: boolean }

/** The voice tool always expresses volume as percent, including 1 = one percent. */
export async function performVoiceMusicMix(args: VoiceMusicMixArgs, getHandlers: () => VoiceCompanionBridgeHandlers): Promise<VoiceActionResult> {
  const handlers = getHandlers()
  try {
    if (args.command === 'set_volume') {
      if (typeof args.volume !== 'number' || !Number.isFinite(args.volume) || args.volume < 0 || args.volume > 100) return { success: false, summary: 'Choose a music volume from 0 to 100 percent.' }
      if (!handlers.onSetMusicVolume) return { success: false, summary: 'The editor has no soundtrack volume control.' }
      return await handlers.onSetMusicVolume(args.volume / 100)
    }
    if (args.command === 'set_ducking') {
      if (typeof args.enabled !== 'boolean') return { success: false, summary: 'Specify whether dialogue ducking should be enabled.' }
      if (!handlers.onSetMusicDucking) return { success: false, summary: 'The editor has no soundtrack ducking control.' }
      return await handlers.onSetMusicDucking(args.enabled)
    }
    if (args.command === 'remove') {
      if (!handlers.onRemoveMusicTrack) return { success: false, summary: 'The editor has no soundtrack removal control.' }
      return await handlers.onRemoveMusicTrack()
    }
    return { success: false, summary: 'Unsupported soundtrack command.' }
  } catch (error) {
    return { success: false, summary: error instanceof Error ? error.message : 'The soundtrack change failed.' }
  }
}

type MixPatch = { volume?: number; muted?: boolean; ducking?: boolean }
type Controller = {
  getSnapshot: () => { timeline: EditorialTimelineState | null; status: string; error: string | null }
  patch: (patch: EditorialTimelinePatch) => void
}

/** Confirm the persisted mix, rather than confirming a React slider request. */
export async function saveVoiceMusicMix(controller: Controller, sourceAssetId: string | null | undefined, mix: MixPatch, timeoutMs = 15000): Promise<VoiceActionResult> {
  if (mix.volume !== undefined && (!Number.isFinite(mix.volume) || mix.volume < 0 || mix.volume > 1)) return { success: false, summary: 'Invalid soundtrack level.' }
  const before = controller.getSnapshot()
  if (!sourceAssetId || before.timeline?.sourceAssetId !== sourceAssetId || !before.timeline.music) return { success: false, summary: 'Select a soundtrack on the current source timeline first.' }
  if (before.status === 'error' || before.status === 'loading') return { success: false, summary: before.error || 'The soundtrack timeline is not ready.' }
  const trackId = before.timeline.music.track.id
  controller.patch({ type: 'mix', ...mix })
  const deadline = Date.now() + timeoutMs
  do {
    const current = controller.getSnapshot()
    if (current.timeline?.sourceAssetId !== sourceAssetId || current.timeline.music?.track.id !== trackId) return { success: false, summary: 'The source or soundtrack changed before the mix was confirmed.' }
    if (current.status === 'error') return { success: false, summary: `The mix may be visible locally, but saving failed: ${current.error || 'connection unavailable'}.` }
    if (current.status === 'saved' && Object.entries(mix).every(([key, value]) => current.timeline!.music![key as keyof MixPatch] === value)) {
      return { success: true, summary: `Soundtrack mix saved${mix.volume !== undefined ? ` at ${Math.round(mix.volume * 100)}% volume` : ''}${mix.ducking !== undefined ? `; dialogue ducking ${mix.ducking ? 'enabled' : 'disabled'}` : ''}.` }
    }
    if (Date.now() >= deadline) break
    await new Promise(resolve => setTimeout(resolve, 50))
  } while (true)
  return { success: false, summary: 'The soundtrack mix changed locally, but its save was not confirmed. Retry timeline sync.' }
}
