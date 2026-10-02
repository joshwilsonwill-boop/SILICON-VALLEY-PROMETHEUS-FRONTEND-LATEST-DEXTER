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

/** Sample decoded frames without driving a decorative cursor across the timeline. */
export async function inspectVoiceVideo(
  getHandlers: GetHandlers,
  sendFrame: (base64Jpeg: string) => void,
  options: { isSessionActive?: () => boolean; frameTimeoutMs?: number } = {},
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
    for (const fraction of [0.08, 0.28, 0.5, 0.72, 0.92]) {
      if (!isActive()) return { success: false, error: 'Video inspection was cancelled because the voice session or source changed.' }
      const timeSec = Math.max(0, Math.min(durationSec, durationSec * fraction))
      movedPlayhead = true
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
      if (movedPlayhead && typeof originalTimeSec === 'number') {
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
