import type { VoiceCompanionBridgeHandlers } from './bridge'

/** Start the existing takeover session for an explicitly requested editor mutation. */
export async function ensureVoiceEditingAccess(
  getHandlers: () => VoiceCompanionBridgeHandlers,
  timeoutMs = 2500,
): Promise<{ success: true } | { success: false; error: string }> {
  let handlers = getHandlers()
  if (handlers.isTakeoverEnabled) return { success: true }
  if (!handlers.onToggleTakeover) {
    return { success: false, error: 'The editor is not linked, so Jarvis cannot start an editing session.' }
  }

  handlers.onToggleTakeover()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    handlers = getHandlers()
    if (handlers.isTakeoverEnabled) return { success: true }
  }

  return { success: false, error: 'The editor did not confirm editing access. No edit was started.' }
}
