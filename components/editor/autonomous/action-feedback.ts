import type { ActionReceipt, GhostCursorState } from '@/lib/autonomous-ui/types'

export const ACTION_STATUS_LABELS = {
  running: 'In progress', succeeded: 'Completed', failed: 'Could not complete',
  partial: 'Partly completed', cancelled: 'Stopped',
} as const

/** Never use a viewport frame or a stale invisible target as action feedback. */
export function getActionTargetBox(
  state: GhostCursorState | null,
  activeAction: ActionReceipt | undefined,
  viewport: { width: number; height: number },
) {
  const engaged = Boolean(activeAction || (state?.visible && state.pillMode !== 'idle'))
  if (!engaged) return null
  const rect = activeAction?.targetRect ?? state?.activeTargetRect ?? state?.anticipatedTargetRect
  if (!rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)) return null
  if (rect.width <= 0 || rect.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return null
  if (rect.width >= viewport.width * 0.9 && rect.height >= viewport.height * 0.8) return null
  const left = Math.max(2, rect.left - 3)
  const top = Math.max(2, rect.top - 3)
  const right = Math.min(viewport.width - 2, rect.left + rect.width + 3)
  const bottom = Math.min(viewport.height - 2, rect.top + rect.height + 3)
  if (right <= left || bottom <= top) return null
  return { left, top, width: right - left, height: bottom - top }
}

export function getReceiptMetrics(action: ActionReceipt) {
  const metrics: string[] = []
  if (action.affectedCount !== undefined) metrics.push(`${action.affectedCount} affected`)
  if (action.durationRemovedSec !== undefined) metrics.push(`${action.durationRemovedSec.toFixed(2)}s removed`)
  return metrics.join(' · ')
}
