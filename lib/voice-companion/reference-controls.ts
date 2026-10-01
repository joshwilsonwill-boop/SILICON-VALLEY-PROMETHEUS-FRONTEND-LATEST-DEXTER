import type { VoiceCompanionBridgeHandlers } from './bridge'
import { switchVoiceWorkspace } from './session-controls'
import { mapReferenceStyle, normalizeReferenceUrl, referenceAnalysisSchema, appliedReferenceStyleSchema, type AppliedReferenceStyle } from '../editor/reference-style'
import type { EditorialTimelinePatch, EditorialTimelineState } from '../editor/editorial-timeline-state'

type ReferenceResult = { success: boolean; summary: string; affectedCount?: number; analysis?: unknown; previewOnly?: boolean }
type Controller = {
  getSnapshot: () => { timeline: EditorialTimelineState | null; status: string; error: string | null }
  patch: (patch: EditorialTimelinePatch) => void
}

export async function applyReferenceStyleToController(controller: Controller, style: AppliedReferenceStyle): Promise<ReferenceResult> {
  const valid = appliedReferenceStyleSchema.safeParse(style)
  if (!valid.success) return { success: false, summary: 'The reference returned an invalid editing plan.' }
  const before = controller.getSnapshot()
  if (!before.timeline || before.status === 'loading') return { success: false, summary: 'The source timeline is still loading. Try again when it is ready.' }
  if (!before.timeline.sourceAssetId) return { success: false, summary: 'Choose a source video before applying a reference look.' }
  controller.patch({ type: 'reference_style', style: valid.data })
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const current = controller.getSnapshot()
    if (current.timeline?.sourceAssetId !== before.timeline.sourceAssetId) return { success: false, summary: 'The source changed while applying the reference. Review the current video.' }
    if (current.status === 'error') return { success: false, summary: `The look is visible locally but could not be saved: ${current.error || 'connection unavailable'}. Retry timeline sync.`, previewOnly: true }
    if (JSON.stringify(current.timeline.referenceStyle) === JSON.stringify(valid.data) && current.status === 'saved') {
      return { success: true, summary: `Reference look saved to the Motion preview: ${valid.data.treatment} treatment, ${valid.data.captionStyle.replaceAll('_', ' ')} captions and ${valid.data.zooms.length} camera moves. This look is preview only; exact scene matching and rendering it are not supported yet.`, affectedCount: valid.data.zooms.length, previewOnly: true }
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return { success: false, summary: 'The look is visible locally but saving has not been confirmed. Check timeline sync before leaving.', previewOnly: true }
}

export async function performVoiceReferenceStyleAction(
  args: { url: string; styleHint?: string; apply?: boolean },
  getHandlers: () => VoiceCompanionBridgeHandlers,
  fetcher: typeof fetch = fetch,
): Promise<ReferenceResult> {
  try {
    const url = normalizeReferenceUrl(args.url)
    const origin = getHandlers()
    const response = await fetcher('/api/style-clone/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ url, styleHint: args.styleHint }), signal: AbortSignal.timeout(65000),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Reference analysis could not finish.')
    const parsed = referenceAnalysisSchema.safeParse(body.analysis)
    if (!parsed.success) return { success: false, summary: 'The reference could not be verified. No edits were applied.' }
    if (!args.apply) return { success: true, summary: `${parsed.data.style_reference} Analysis is ready; no video edits were applied. Supported preview changes are treatment, captions, and timed camera moves.`, analysis: parsed.data, previewOnly: true }
    const handlers = getHandlers()
    if (handlers.projectId !== origin.projectId || handlers.sourceAssetId !== origin.sourceAssetId) return { success: false, summary: 'The editor changed during reference analysis. No edits were applied.' }
    if (!handlers.hasVideo || !handlers.onApplyReferenceStyle) return { success: false, summary: 'Open a ready video in the editor before applying a reference look.', analysis: parsed.data }
    const style = mapReferenceStyle(parsed.data, url, handlers.videoDurationSec ?? handlers.contextProvider?.()?.durationSec ?? 0)
    const switched = await switchVoiceWorkspace('Motion', getHandlers)
    if (!switched.success) return { success: false, summary: String(switched.error || 'Motion could not be opened.') }
    if (getHandlers().projectId !== origin.projectId || getHandlers().sourceAssetId !== origin.sourceAssetId) return { success: false, summary: 'The source changed before applying the reference. No edits were applied.' }
    return { ...await handlers.onApplyReferenceStyle(style), analysis: parsed.data, previewOnly: true }
  } catch (error) {
    return { success: false, summary: error instanceof Error ? error.message : 'Reference analysis could not finish. No edits were applied.' }
  }
}
