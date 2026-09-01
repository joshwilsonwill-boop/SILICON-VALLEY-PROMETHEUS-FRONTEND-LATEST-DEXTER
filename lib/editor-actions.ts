/**
 * Editor action drafts produced by the Prometheus chat assistant.
 *
 * The model may *propose* anything, but only actions from this closed enum are
 * machine-readable. Everything executable here is non-destructive and reversible
 * (transport + view state). Anything that mutates media (trim, captions,
 * typography, renders) is forced through the `propose` kind, which is displayed
 * as a plan and never fakes execution.
 */

export type PreviewControlCommand = 'play' | 'pause' | 'mute' | 'unmute'
export type EditorFitMode = 'fill' | 'fit'
export type EditorWorkspaceTab = 'Editor' | 'Music' | 'Motion'

export type EditorActionDraft =
  | { kind: 'seek'; timeSec: number; summary: string }
  | { kind: 'preview_control'; command: PreviewControlCommand; summary: string }
  | { kind: 'set_fit_mode'; mode: EditorFitMode; summary: string }
  | { kind: 'switch_tab'; tab: EditorWorkspaceTab; summary: string }
  | { kind: 'open_thumbnail_studio'; summary: string }
  | { kind: 'open_master_review'; summary: string }
  | { kind: 'propose'; description: string; summary: string }

export type EditorActionKind = EditorActionDraft['kind']

export const EDITOR_ACTION_KINDS: readonly EditorActionKind[] = [
  'seek',
  'preview_control',
  'set_fit_mode',
  'switch_tab',
  'open_thumbnail_studio',
  'open_master_review',
  'propose',
]

const PREVIEW_COMMANDS: readonly PreviewControlCommand[] = ['play', 'pause', 'mute', 'unmute']
const FIT_MODES: readonly EditorFitMode[] = ['fill', 'fit']
const WORKSPACE_TABS: readonly EditorWorkspaceTab[] = ['Editor', 'Music', 'Motion']

const MAX_ACTIONS_PER_DRAFT = 6

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function cleanSummary(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const summary = value.replace(/\s+/g, ' ').trim()
  return summary.length > 0 ? summary.slice(0, 140) : fallback
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function parseEditorActionDraft(input: unknown): EditorActionDraft | null {
  const record = asRecord(input)
  if (!record) return null
  const kind = typeof record.kind === 'string' ? record.kind : null
  if (!kind || !EDITOR_ACTION_KINDS.includes(kind as EditorActionKind)) return null

  switch (kind) {
    case 'seek': {
      const timeSec = asFiniteNumber(record.timeSec ?? record.time_sec ?? record.seconds ?? record.time)
      if (timeSec === null || timeSec < 0) return null
      const time = Math.round(timeSec * 100) / 100
      return { kind: 'seek', timeSec: time, summary: cleanSummary(record.summary, `Jump to ${time.toFixed(2)}s`) }
    }
    case 'preview_control': {
      const command = typeof record.command === 'string' ? record.command.toLowerCase().trim() : null
      if (!command || !PREVIEW_COMMANDS.includes(command as PreviewControlCommand)) return null
      return {
        kind: 'preview_control',
        command: command as PreviewControlCommand,
        summary: cleanSummary(record.summary, `${command} preview`),
      }
    }
    case 'set_fit_mode': {
      const mode = typeof record.mode === 'string' ? record.mode.toLowerCase().trim() : null
      if (!mode || !FIT_MODES.includes(mode as EditorFitMode)) return null
      return {
        kind: 'set_fit_mode',
        mode: mode as EditorFitMode,
        summary: cleanSummary(record.summary, `Set preview fit to ${mode}`),
      }
    }
    case 'switch_tab': {
      const raw = typeof record.tab === 'string' ? record.tab.trim().toLowerCase() : null
      if (!raw) return null
      const tab = WORKSPACE_TABS.find((candidate) => candidate.toLowerCase() === raw)
      if (!tab) return null
      return { kind: 'switch_tab', tab, summary: cleanSummary(record.summary, `Open the ${tab} workspace`) }
    }
    case 'open_thumbnail_studio':
      return {
        kind: 'open_thumbnail_studio',
        summary: cleanSummary(record.summary, 'Open Thumbnail Studio'),
      }
    case 'open_master_review':
      return {
        kind: 'open_master_review',
        summary: cleanSummary(record.summary, 'Open Master Video Review'),
      }
    case 'propose': {
      const description =
        typeof record.description === 'string' && record.description.trim().length > 0
          ? record.description.trim().slice(0, 500)
          : null
      if (!description) return null
      return {
        kind: 'propose',
        description,
        summary: cleanSummary(record.summary, 'Proposed edit (requires render processing)'),
      }
    }
    default:
      return null
  }
}

/**
 * Validates a (possibly foreign) list of action drafts, dropping anything
 * malformed instead of failing the whole draft.
 */
export function parseEditorActionDrafts(input: unknown, max = MAX_ACTIONS_PER_DRAFT): EditorActionDraft[] {
  const list = Array.isArray(input) ? input : asRecord(input)?.actions
  if (!Array.isArray(list)) return []
  const drafts: EditorActionDraft[] = []
  for (const candidate of list) {
    const draft = parseEditorActionDraft(candidate)
    if (draft) drafts.push(draft)
    if (drafts.length >= max) break
  }
  return drafts
}

export interface EditorActionContext {
  seek?: (timeSec: number) => void
  play?: () => void
  pause?: () => void
  mute?: () => void
  unmute?: () => void
  setFitMode?: (mode: EditorFitMode) => void
  setWorkspaceTab?: (tab: EditorWorkspaceTab) => void
  openThumbnailStudio?: () => void
  openMasterReview?: () => void
  /** Used to clamp seek targets when known. */
  durationSec?: number
}

export interface EditorActionResult {
  applied: boolean
  message: string
}

export const PROPOSE_NOT_APPLIED_MESSAGE = 'Requires render processing — not applied here.'

/**
 * Executes a validated draft against whitelisted, reversible editor handlers.
 * Never throws; unknown handlers fail soft so the chat can report honestly.
 */
export function applyEditorAction(action: EditorActionDraft, ctx: EditorActionContext): EditorActionResult {
  switch (action.kind) {
    case 'seek': {
      if (!ctx.seek) return { applied: false, message: 'Seek is unavailable right now.' }
      const max = typeof ctx.durationSec === 'number' && Number.isFinite(ctx.durationSec) ? ctx.durationSec : null
      const target = max === null ? Math.max(0, action.timeSec) : Math.min(Math.max(0, action.timeSec), max)
      ctx.seek(target)
      return { applied: true, message: action.summary }
    }
    case 'preview_control': {
      const handler =
        action.command === 'play'
          ? ctx.play
          : action.command === 'pause'
            ? ctx.pause
            : action.command === 'mute'
              ? ctx.mute
              : ctx.unmute
      if (!handler) return { applied: false, message: `Preview "${action.command}" is unavailable right now.` }
      handler()
      return { applied: true, message: action.summary }
    }
    case 'set_fit_mode': {
      if (!ctx.setFitMode) return { applied: false, message: 'Fit mode control is unavailable right now.' }
      ctx.setFitMode(action.mode)
      return { applied: true, message: action.summary }
    }
    case 'switch_tab': {
      if (!ctx.setWorkspaceTab) return { applied: false, message: 'Workspace switching is unavailable right now.' }
      ctx.setWorkspaceTab(action.tab)
      return { applied: true, message: action.summary }
    }
    case 'open_thumbnail_studio': {
      if (!ctx.openThumbnailStudio) return { applied: false, message: 'Thumbnail Studio is unavailable right now.' }
      ctx.openThumbnailStudio()
      return { applied: true, message: action.summary }
    }
    case 'open_master_review': {
      if (!ctx.openMasterReview) return { applied: false, message: 'Master Video Review is unavailable right now.' }
      ctx.openMasterReview()
      return { applied: true, message: action.summary }
    }
    case 'propose':
      return { applied: false, message: PROPOSE_NOT_APPLIED_MESSAGE }
  }
}

/** Applies a full draft; individual failures never abort the rest. */
export function applyEditorActionDrafts(actions: EditorActionDraft[], ctx: EditorActionContext): EditorActionResult[] {
  return actions.map((action) => {
    try {
      return applyEditorAction(action, ctx)
    } catch (error) {
      console.warn('[editor-actions] apply failed', { kind: action.kind, error })
      return { applied: false, message: 'That change could not be applied right now.' }
    }
  })
}
