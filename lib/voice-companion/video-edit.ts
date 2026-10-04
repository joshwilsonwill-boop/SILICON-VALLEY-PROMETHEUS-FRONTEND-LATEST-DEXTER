import type { VoiceCompanionBridgeHandlers } from './bridge'
import { performVoiceMusicAction, type VoiceActionResult, type VoiceMusicActionResult } from './music-controls'
import { performVoiceMusicMix } from './music-mix'
import type { EditorialTimelinePatch, EditorialTimelineState } from '../editor/editorial-timeline-state'

type CaptionStyle = 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third'
export type TranscriptResult = VoiceActionResult & { pending?: boolean }
export type VoiceVideoEditArgs = {
  removePauses?: boolean; captions?: boolean; transcription?: boolean; broll?: boolean; music?: boolean
  captionStyle?: string; musicQuery?: string; musicVolumePercent?: number; minDurationSec?: number
}
type GetHandlers = () => VoiceCompanionBridgeHandlers

function hasTimedTranscript(handlers: VoiceCompanionBridgeHandlers) {
  return Array.isArray(handlers.transcriptSegments) && handlers.transcriptSegments.some(segment => segment &&
    Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs) && segment.endMs > segment.startMs && typeof segment.text === 'string' && segment.text.trim())
}

export async function ensureVoiceTranscript(getHandlers: GetHandlers): Promise<TranscriptResult> {
  const handlers = getHandlers()
  if (!handlers.hasVideo) return { success: false, summary: 'No playable source video is attached.' }
  if (hasTimedTranscript(handlers)) return { success: true, summary: 'The timed video transcript is available.' }
  if (!handlers.onRequestTranscription) return { success: false, summary: 'Video transcription is not connected to this editor.' }
  const result = await handlers.onRequestTranscription()
  if (hasTimedTranscript(getHandlers())) return { success: true, summary: 'The timed video transcript is available.' }
  return { ...result, success: false, pending: result.success || result.pending === true,
    summary: result.success ? 'Video transcription is processing. Captions and pause cuts are pending until word timings arrive; they have not been applied.' : result.summary }
}

export async function applyVoiceCaptions(style: string, getHandlers: GetHandlers): Promise<VoiceActionResult> {
  if (!['clean_bold', 'karaoke_pop', 'typewriter', 'lower_third'].includes(style)) return { success: false, summary: 'Choose a supported caption style.' }
  const transcript = await ensureVoiceTranscript(getHandlers)
  if (!transcript.success) return transcript
  const apply = getHandlers().onApplyCaptionStyle
  if (!apply) return { success: false, summary: 'Confirmed caption editing is not connected to this editor.' }
  return apply(style as CaptionStyle)
}

/** A caption request changes only captions; keep existing camera and B-roll cues. */
export async function saveVoiceCaptionStyle(controller: {
  getSnapshot: () => { timeline: EditorialTimelineState | null; status: string; error: string | null }
  patch: (patch: EditorialTimelinePatch) => void
}, sourceAssetId: string | null | undefined, style: CaptionStyle, timeoutMs = 15000): Promise<VoiceActionResult> {
  const before = controller.getSnapshot()
  if (!sourceAssetId || before.timeline?.sourceAssetId !== sourceAssetId || before.status !== 'saved') return { success: false, summary: before.error || 'The current source timeline is not ready for captions.' }
  controller.patch({ type: 'caption_style', style })
  const deadline = Date.now() + timeoutMs
  do {
    const current = controller.getSnapshot()
    if (current.timeline?.sourceAssetId !== sourceAssetId) return { success: false, summary: 'The source changed before captions were saved.' }
    if (current.status === 'error') return { success: false, summary: current.error || 'Caption saving failed.' }
    if (current.status === 'saved' && current.timeline.captionStyle === style) return { success: true, summary: `Saved ${style.replaceAll('_', ' ')} captions to the source timeline.` }
    if (Date.now() >= deadline) break
    await new Promise(resolve => setTimeout(resolve, 50))
  } while (true)
  return { success: false, summary: 'Captions changed locally, but their save was not confirmed.' }
}

/** Keep a result for every requested step, including unsupported and pending work. */
export async function performVoiceVideoEdit(args: VoiceVideoEditArgs, getHandlers: GetHandlers) {
  const initial = getHandlers()
  const projectId = initial.projectId
  const sourceAssetId = initial.sourceAssetId
  const outcomes: Record<string, TranscriptResult & Partial<VoiceMusicActionResult>> = {}
  const unchanged = () => getHandlers().hasVideo && getHandlers().projectId === projectId && getHandlers().sourceAssetId === sourceAssetId
  const run = async (name: string, work: () => Promise<VoiceActionResult> | VoiceActionResult) => {
    if (!unchanged()) { outcomes[name] = { success: false, summary: 'The voice session or source changed. This step was cancelled.' }; return }
    try { outcomes[name] = await work() } catch (error) { outcomes[name] = { success: false, summary: error instanceof Error ? error.message : 'This editing step failed.' } }
  }
  if (args.transcription || args.captions || args.removePauses) await run('transcription', () => ensureVoiceTranscript(getHandlers))
  if (args.removePauses) await run('pauses', () => {
    if (!outcomes.transcription?.success) return { success: false, pending: outcomes.transcription?.pending, summary: 'Pause cuts are pending a verified timed transcript.' }
    const cut = getHandlers().onCutSilence
    return cut ? cut(args.minDurationSec ?? .4) : { success: false, summary: 'Confirmed silence editing is unavailable.' }
  })
  if (args.captions) await run('captions', () => outcomes.transcription?.success
    ? applyVoiceCaptions(args.captionStyle || 'clean_bold', getHandlers)
    : { success: false, pending: outcomes.transcription?.pending, summary: 'Captions are pending a verified timed transcript.' })
  if (args.broll) outcomes.broll = { success: false, summary: 'B-roll insertion is unavailable: this editor has no connected footage insertion and rendering tool. No B-roll was added.' }
  if (args.music) {
    await run('music', () => performVoiceMusicAction({ action: 'select', recommendation: true, query: args.musicQuery || 'instrumental background', excludeTrackId: getHandlers().getMusicState?.().trackId ?? undefined }, getHandlers))
    if (outcomes.music?.staged) {
      await run('musicVolume', () => performVoiceMusicMix({ command: 'set_volume', volume: args.musicVolumePercent ?? 20 }, getHandlers))
      await run('musicDucking', () => performVoiceMusicMix({ command: 'set_ducking', enabled: true }, getHandlers))
    }
  }
  const entries = Object.entries(outcomes)
  const success = entries.length > 0 && entries.every(([, outcome]) => outcome.success)
  return { success, partial: !success && entries.some(([, outcome]) => outcome.success), outcomes,
    summary: entries.length ? entries.map(([step, outcome]) => `${step}: ${outcome.summary}`).join(' ') : 'Specify which video edits to apply.' }
}
