import type { VoiceCompanionBridgeHandlers } from './bridge'

type Workspace = 'Editor' | 'Music' | 'Motion'
type GetHandlers = () => VoiceCompanionBridgeHandlers
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function readFrameBeforeDeadline(read: () => Promise<string | null> | undefined, deadline: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      read(),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), Math.max(0, deadline - Date.now())) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Confirm the committed editor state instead of treating a requested tab as success. */
export async function switchVoiceWorkspace(
  tab: unknown,
  getHandlers: GetHandlers,
  confirmationTimeoutMs = 1000,
): Promise<Record<string, unknown>> {
  if (tab !== 'Editor' && tab !== 'Music' && tab !== 'Motion') {
    return { success: false, error: 'That workspace is not supported.' }
  }
  const handlers = getHandlers()
  if (handlers.onTabChange) await handlers.onTabChange(tab)
  else if (handlers.onApplyActions) {
    await handlers.onApplyActions([{ kind: 'switch_tab', tab, summary: `Switch to ${tab}` }])
  } else {
    return { success: false, error: 'The editor is not linked, so I cannot switch workspaces.' }
  }

  const deadline = Date.now() + confirmationTimeoutMs
  let activeTab: string | undefined
  do {
    const current = getHandlers()
    activeTab = current.contextProvider?.()?.workspaceTab ?? current.getActiveWorkspaceTab?.()
    if (activeTab === tab) return { success: true, activeTab }
    if (Date.now() >= deadline) break
    await delay(25)
  } while (true)

  return {
    success: false,
    requestedTab: tab,
    activeTab: activeTab ?? null,
    error: `The editor did not confirm opening ${tab}. The requested workspace may not be visible yet.`,
  }
}

export interface InspectVoiceVideoOptions {
  isSessionActive?: () => boolean
  frameTimeoutMs?: number
  timestamps?: number[]
  timeSec?: number
  startSec?: number
  endSec?: number
  frameCount?: number
  intent?: string
  keepPosition?: boolean
  onProgress?: (step: { timeSec: number; fraction: number; index: number; total: number; label: string }) => void
}

/** Sample decoded frames with intentional beat/section targeting without driving a decorative cursor across the timeline. */
export async function inspectVoiceVideo(
  getHandlers: GetHandlers,
  sendFrame: (base64Jpeg: string) => void,
  options: InspectVoiceVideoOptions = {},
): Promise<Record<string, unknown>> {
  const initial = getHandlers()
  if (!initial.hasVideo) return { success: false, error: 'There is no playable source video to inspect.' }
  if (!initial.captureVideoFrame) return { success: false, error: 'The editor cannot capture a decoded frame from this source.' }
  const durationSec = initial.videoDurationSec || initial.timelineDurationSec || 0
  if (durationSec <= 0) return { success: false, error: 'The video duration is not available yet.' }
  const originalContext = initial.contextProvider?.()
  const originalTab = originalContext?.workspaceTab
  const originalTimeSec = originalContext?.playheadSec
  const sampledAtSec: number[] = []
  let movedPlayhead = false
  let movedWorkspace = false
  const restorationErrors: string[] = []
  const isActive = () => (options.isSessionActive?.() ?? true) &&
    getHandlers().captureVideoFrame === initial.captureVideoFrame

  const seek = async (timeSec: number) => {
    const current = getHandlers()
    if (current.onSeek) await current.onSeek(timeSec)
    else if (current.onApplyActions) {
      await current.onApplyActions([{ kind: 'seek', timeSec, summary: `Inspect frame at ${timeSec.toFixed(1)}s` }])
    } else throw new Error('The editor is not linked, so I cannot inspect other video frames.')
  }

  try {
    // Music unmounts the source video element. Temporarily open a video workspace.
    if (originalTab === 'Music') {
      movedWorkspace = true
      const switched = await switchVoiceWorkspace('Editor', getHandlers)
      if (!switched.success) return switched
    }

    // Resolve intentional targets: specific timestamps, range, single timestamp, or default beats
    let targetTimes: number[] = []
    if (Array.isArray(options.timestamps) && options.timestamps.length > 0) {
      targetTimes = Array.from(
        new Set(
          options.timestamps
            .filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
            .map((t) => Number(Math.max(0, Math.min(durationSec, t)).toFixed(1)))
        )
      )
    } else if (typeof options.timeSec === 'number' && Number.isFinite(options.timeSec)) {
      targetTimes = [Number(Math.max(0, Math.min(durationSec, options.timeSec)).toFixed(1))]
    } else if (
      typeof options.startSec === 'number' &&
      typeof options.endSec === 'number' &&
      Number.isFinite(options.startSec) &&
      Number.isFinite(options.endSec)
    ) {
      const count = Math.max(1, Math.min(5, options.frameCount ?? 3))
      const start = Math.max(0, Math.min(durationSec, options.startSec))
      const end = Math.max(0, Math.min(durationSec, options.endSec))
      if (count === 1) {
        targetTimes = [Number(((start + end) / 2).toFixed(1))]
      } else {
        targetTimes = []
        for (let i = 0; i < count; i++) {
          targetTimes.push(Number((start + (i / (count - 1)) * (end - start)).toFixed(1)))
        }
      }
    } else if (typeof options.startSec === 'number' && Number.isFinite(options.startSec)) {
      targetTimes = [Number(Math.max(0, Math.min(durationSec, options.startSec)).toFixed(1))]
    } else {
      // Default to 5 well-distributed fractions across the video duration
      targetTimes = [0.08, 0.28, 0.5, 0.72, 0.92].map((f) => Number((durationSec * f).toFixed(1)))
    }

    for (let index = 0; index < targetTimes.length; index++) {
      if (!isActive()) return { success: false, error: 'Video inspection was cancelled because the voice session or source changed.' }
      const timeSec = targetTimes[index]
      movedPlayhead = true

      const label = targetTimes.length === 1
        ? (options.intent ? `${options.intent} (${timeSec.toFixed(1)}s)` : `Inspecting part at ${timeSec.toFixed(1)}s`)
        : options.intent
          ? `${options.intent} [${index + 1}/${targetTimes.length}] (${timeSec.toFixed(1)}s)`
          : `Inspecting part ${index + 1}/${targetTimes.length} (${timeSec.toFixed(1)}s)`

      options.onProgress?.({
        timeSec,
        fraction: durationSec > 0 ? timeSec / durationSec : 0,
        index,
        total: targetTimes.length,
        label,
      })

      await seek(timeSec)
      const deadline = Date.now() + (options.frameTimeoutMs ?? 2000)
      let frameBase64: string | undefined
      do {
        if (!isActive()) break
        // A completed seek handler can still precede decoding of its video frame.
        const frame = await readFrameBeforeDeadline(() => getHandlers().captureVideoFrame?.(timeSec), deadline)
        frameBase64 = frame?.startsWith('data:image/jpeg;base64,') ? frame.split(',')[1] : undefined
        if (frameBase64 || Date.now() >= deadline) break
        await delay(40)
      } while (true)
      if (!isActive()) return { success: false, error: 'Video inspection was cancelled because the voice session or source changed.' }
      if (!frameBase64) break
      sendFrame(frameBase64)
      sampledAtSec.push(Number(timeSec.toFixed(1)))
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Video inspection failed.' }
  } finally {
    // Restore only this source, never navigate a new project/session backwards.
    if (isActive()) {
      if (movedPlayhead && typeof originalTimeSec === 'number' && !options.keepPosition) {
        try { await seek(originalTimeSec) } catch { restorationErrors.push('The original playhead position could not be restored.') }
      }
      if (movedWorkspace && originalTab) {
        try {
          const restored = await switchVoiceWorkspace(originalTab as Workspace, getHandlers)
          if (!restored.success) restorationErrors.push('The original workspace could not be confirmed.')
        } catch { restorationErrors.push('The original workspace could not be restored.') }
      }
    }
  }

  return sampledAtSec.length > 0
    ? {
        success: true,
        frameCount: sampledAtSec.length,
        sampledAtSec,
        ...(restorationErrors.length ? { restorationErrors } : {}),
        note: 'Only the listed video frames were sent to the live session for visual inspection.',
      }
    : { success: false, error: 'No readable video frames arrived before the inspection timeout. The source may still be buffering or may not allow frame capture.', restorationErrors }
}
