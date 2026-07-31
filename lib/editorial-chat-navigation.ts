export const EDITORIAL_CHAT_OPEN_EVENT = 'prometheus:editorial-chat-open'

const LAST_EDITORIAL_CHAMBER_PATH_KEY = 'prometheus.editorial-chamber.last-path.v1'
const PENDING_EDITORIAL_CHAT_OPEN_KEY = 'prometheus.editorial-chamber.pending-chat-open.v1'

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizeEditorPath(path: string | null | undefined) {
  if (!path || !path.startsWith('/editor/')) return null
  return path
}

export function rememberEditorialChamberPath(path: string | null | undefined) {
  if (!isBrowser()) return

  const normalizedPath = normalizeEditorPath(path)
  if (normalizedPath) window.sessionStorage.setItem(LAST_EDITORIAL_CHAMBER_PATH_KEY, normalizedPath)
}

export function getLastEditorialChamberPath() {
  if (!isBrowser()) return null
  return normalizeEditorPath(window.sessionStorage.getItem(LAST_EDITORIAL_CHAMBER_PATH_KEY))
}

export function requestEditorialChatOpen() {
  if (!isBrowser()) return

  window.sessionStorage.setItem(PENDING_EDITORIAL_CHAT_OPEN_KEY, 'true')
  window.dispatchEvent(new Event(EDITORIAL_CHAT_OPEN_EVENT))
}

export function consumePendingEditorialChatOpen() {
  if (!isBrowser()) return false
  if (window.sessionStorage.getItem(PENDING_EDITORIAL_CHAT_OPEN_KEY) !== 'true') return false

  window.sessionStorage.removeItem(PENDING_EDITORIAL_CHAT_OPEN_KEY)
  return true
}
