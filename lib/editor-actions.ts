/**
 * Editor action drafts produced by the Prometheus chat assistant.
 *
 * The model may *propose* anything, but only actions from this closed enum are
 * machine-readable. Two execution tiers exist:
 *
 * 1. Ambient tier — non-destructive and reversible (transport + view state).
 *    Always executable when a handler is registered.
 * 2. Takeover tier — mutates editor state (splits, typography, caption styling,
 *    render dispatch). These are only executed when the editor explicitly
 *    enables takeover via `EditorActionContext.allowMutations`; otherwise they
 *    degrade to a plan message instead of silently mutating media.
 */

export type PreviewControlCommand = 'play' | 'pause' | 'mute' | 'unmute'
export type EditorFitMode = 'fill' | 'fit'
export type EditorWorkspaceTab = 'Editor' | 'Music' | 'Motion'
export type EditorCaptionStyle = 'clean_bold' | 'karaoke_pop' | 'typewriter' | 'lower_third'
export type EditorRenderMode = 'preview' | 'final'

export type EditorActionDraft =
  | { kind: 'seek'; timeSec: number; summary: string }
  | { kind: 'preview_control'; command: PreviewControlCommand; summary: string }
  | { kind: 'set_fit_mode'; mode: EditorFitMode; summary: string }
  | { kind: 'switch_tab'; tab: EditorWorkspaceTab; summary: string }
  | { kind: 'open_thumbnail_studio'; summary: string }
  | { kind: 'open_master_review'; summary: string }
  | { kind: 'set_playback_rate'; rate: number; summary: string }
  | { kind: 'step_frames'; frames: number; summary: string }
  | { kind: 'split_at_playhead'; timeSec: number; summary: string }
  | { kind: 'cut_silence'; minDurationSec?: number; summary: string }
  | { kind: 'set_typography'; preset: string; summary: string }
  | { kind: 'set_caption_style'; style: EditorCaptionStyle; summary: string }
  | { kind: 'start_render'; mode: EditorRenderMode; summary: string }
  | { kind: 'propose'; description: string; summary: string }

export type EditorActionKind = EditorActionDraft['kind']

export const EDITOR_ACTION_KINDS: readonly EditorActionKind[] = [
  'seek',
  'preview_control',
  'set_fit_mode',
  'switch_tab',
  'open_thumbnail_studio',
  'open_master_review',
  'set_playback_rate',
  'step_frames',
  'split_at_playhead',
  'cut_silence',
  'set_typography',
  'set_caption_style',
  'start_render',
  'propose',
]

const PREVIEW_COMMANDS: readonly PreviewControlCommand[] = ['play', 'pause', 'mute', 'unmute']
const FIT_MODES: readonly EditorFitMode[] = ['fill', 'fit']
const WORKSPACE_TABS: readonly EditorWorkspaceTab[] = ['Editor', 'Music', 'Motion']
const CAPTION_STYLES: readonly EditorCaptionStyle[] = ['clean_bold', 'karaoke_pop', 'typewriter', 'lower_third']
const RENDER_MODES: readonly EditorRenderMode[] = ['preview', 'final']

/** Takeover-tier kinds: only executable when the editor enables mutations. */
export const MUTATING_ACTION_KINDS: readonly EditorActionKind[] = [
  'split_at_playhead',
  'cut_silence',
  'set_typography',
  'set_caption_style',
  'start_render',
]

export const TAKEOVER_REQUIRED_MESSAGE =
  'Takeover mode is off — enable agent takeover to let me apply editing changes.'

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
    case 'set_playback_rate': {
      const rate = asFiniteNumber(record.rate ?? record.playbackRate ?? record.value)
      if (rate === null) return null
      const clamped = Math.min(4, Math.max(0.25, Math.round(rate * 100) / 100))
      return {
        kind: 'set_playback_rate',
        rate: clamped,
        summary: cleanSummary(record.summary, `Set playback speed to ${clamped}x`),
      }
    }
    case 'step_frames': {
      const frames = asFiniteNumber(record.frames ?? record.count)
      if (frames === null || frames === 0) return null
      const clamped = Math.round(Math.min(90, Math.max(-90, frames)))
      return {
        kind: 'step_frames',
        frames: clamped,
        summary: cleanSummary(record.summary, `Step ${clamped > 0 ? 'forward' : 'back'} ${Math.abs(clamped)} frame${Math.abs(clamped) === 1 ? '' : 's'}`),
      }
    }
    case 'split_at_playhead': {
      const timeSec = asFiniteNumber(record.timeSec ?? record.time_sec ?? record.seconds ?? record.time)
      if (timeSec === null || timeSec < 0) return null
      const time = Math.round(timeSec * 100) / 100
      return {
        kind: 'split_at_playhead',
        timeSec: time,
        summary: cleanSummary(record.summary, `Split clip at ${time.toFixed(2)}s`),
      }
    }
    case 'cut_silence': {
      const minDuration = asFiniteNumber(record.minDurationSec ?? record.min_duration_sec ?? record.duration ?? record.threshold)
      const clamped = minDuration !== null ? Math.max(0.1, Math.min(5, minDuration)) : 0.4
      return {
        kind: 'cut_silence',
        minDurationSec: clamped,
        summary: cleanSummary(record.summary, `Ripple-cut pauses and silences (> ${clamped}s)`),
      }
    }
    case 'set_typography': {
      const preset = typeof record.preset === 'string' ? record.preset.trim().slice(0, 60) : null
      if (!preset) return null
      return {
        kind: 'set_typography',
        preset,
        summary: cleanSummary(record.summary, `Apply "${preset}" typography`),
      }
    }
    case 'set_caption_style': {
      const style = typeof record.style === 'string' ? record.style.toLowerCase().trim() : null
      if (!style || !CAPTION_STYLES.includes(style as EditorCaptionStyle)) return null
      return {
        kind: 'set_caption_style',
        style: style as EditorCaptionStyle,
        summary: cleanSummary(record.summary, `Switch captions to ${style.replace(/_/g, ' ')}`),
      }
    }
    case 'start_render': {
      const mode = typeof record.mode === 'string' ? record.mode.toLowerCase().trim() : null
      if (!mode || !RENDER_MODES.includes(mode as EditorRenderMode)) return null
      return {
        kind: 'start_render',
        mode: mode as EditorRenderMode,
        summary: cleanSummary(record.summary, `Start ${mode} render`),
      }
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
  setPlaybackRate?: (rate: number) => void
  stepFrames?: (frames: number) => void
  splitAtPlayhead?: (timeSec: number) => void
  cutSilence?: (minDurationSec?: number) => void
  setTypography?: (preset: string) => void
  setCaptionStyle?: (style: EditorCaptionStyle) => void
  startRender?: (mode: EditorRenderMode) => void
  /** Used to clamp seek targets when known. */
  durationSec?: number
  /**
   * Takeover gate for mutating actions. When false/undefined, mutating kinds
   * degrade to a plan message instead of executing.
   */
  allowMutations?: boolean
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
      if (!handler) return { applied: false, message: 'Playback control is unavailable right now.' }
      handler()
      return { applied: true, message: action.summary }
    }
    case 'set_fit_mode': {
      if (!ctx.setFitMode) return { applied: false, message: 'Fit mode control is unavailable right now.' }
      ctx.setFitMode(action.mode)
      return { applied: true, message: action.summary }
    }
    case 'switch_tab': {
      if (!ctx.setWorkspaceTab) return { applied: false, message: 'Workspace tabs are unavailable right now.' }
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
    case 'set_playback_rate': {
      if (!ctx.setPlaybackRate) return { applied: false, message: 'Playback speed is unavailable right now.' }
      ctx.setPlaybackRate(action.rate)
      return { applied: true, message: action.summary }
    }
    case 'step_frames': {
      if (!ctx.stepFrames) return { applied: false, message: 'Frame stepping is unavailable right now.' }
      ctx.stepFrames(action.frames)
      return { applied: true, message: action.summary }
    }
    case 'split_at_playhead':
    case 'cut_silence':
    case 'set_typography':
    case 'set_caption_style':
    case 'start_render': {
      if (!ctx.allowMutations) return { applied: false, message: TAKEOVER_REQUIRED_MESSAGE }
      if (action.kind === 'split_at_playhead') {
        if (!ctx.splitAtPlayhead) return { applied: false, message: 'Timeline splitting is unavailable right now.' }
        const max = typeof ctx.durationSec === 'number' && Number.isFinite(ctx.durationSec) ? ctx.durationSec : null
        const target = max === null ? Math.max(0, action.timeSec) : Math.min(Math.max(0, action.timeSec), max)
        ctx.splitAtPlayhead(target)
        return { applied: true, message: action.summary }
      }
      if (action.kind === 'cut_silence') {
        if (!ctx.cutSilence) return { applied: false, message: 'Silence removal is unavailable right now.' }
        ctx.cutSilence(action.minDurationSec)
        return { applied: true, message: action.summary }
      }
      if (action.kind === 'set_typography') {
        if (!ctx.setTypography) return { applied: false, message: 'Typography control is unavailable right now.' }
        ctx.setTypography(action.preset)
        return { applied: true, message: action.summary }
      }
      if (action.kind === 'set_caption_style') {
        if (!ctx.setCaptionStyle) return { applied: false, message: 'Caption styling is unavailable right now.' }
        ctx.setCaptionStyle(action.style)
        return { applied: true, message: action.summary }
      }
      if (!ctx.startRender) return { applied: false, message: 'Rendering is unavailable right now.' }
      ctx.startRender(action.mode)
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
