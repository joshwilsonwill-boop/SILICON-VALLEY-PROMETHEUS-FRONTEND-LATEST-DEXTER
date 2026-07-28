/**
 * Live editor state the client can hand to the chat routes so the assistant
 * knows where the playhead is, which workspace is active, and which timeline
 * thumbnails exist. Shared between the browser hook and the API routes, so
 * this module must stay environment-neutral.
 */

export interface ChatEditorContext {
  playheadSec?: number
  durationSec?: number
  workspaceTab?: string
  fitMode?: string
  muted?: boolean
}

export interface ChatFrameThumb {
  timeSec: number
  url: string
  label?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

export function formatSecondsAsTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function normalizeChatEditorContext(value: unknown): ChatEditorContext | null {
  const record = asRecord(value)
  if (!record) return null

  const playheadSec = asFiniteNumber(record.playheadSec)
  const durationSec = asFiniteNumber(record.durationSec)
  const workspaceTab = cleanText(record.workspaceTab)
  const fitMode = cleanText(record.fitMode)
  const muted = typeof record.muted === 'boolean' ? record.muted : undefined

  if (playheadSec === null && durationSec === null && !workspaceTab && !fitMode && muted === undefined) {
    return null
  }

  return {
    ...(playheadSec !== null && playheadSec >= 0 ? { playheadSec: Math.round(playheadSec * 100) / 100 } : {}),
    ...(durationSec !== null && durationSec > 0 ? { durationSec: Math.round(durationSec * 100) / 100 } : {}),
    ...(workspaceTab ? { workspaceTab: workspaceTab.slice(0, 24) } : {}),
    ...(fitMode ? { fitMode: fitMode.slice(0, 16) } : {}),
    ...(muted !== undefined ? { muted } : {}),
  }
}

export function normalizeChatFrameThumbs(value: unknown, max = 12): ChatFrameThumb[] {
  if (!Array.isArray(value)) return []

  const thumbs: ChatFrameThumb[] = []
  for (const entry of value) {
    const record = asRecord(entry)
    if (!record) continue
    const timeSec = asFiniteNumber(record.timeSec ?? record.seconds ?? record.time)
    const url = cleanText(record.url ?? record.thumbnailUrl ?? record.thumbnail)
    if (timeSec === null || timeSec < 0 || !url) continue
    const time = Math.round(timeSec * 100) / 100
    thumbs.push({ timeSec: time, url: url.slice(0, 2048), label: cleanText(record.label) || formatSecondsAsTimecode(time) })
    if (thumbs.length >= max) break
  }

  return thumbs.sort((a, b) => a.timeSec - b.timeSec)
}
