const DEFAULT_TIMEOUT_MS = 8_000

/**
 * Keep route bootstrap requests from holding a loading boundary forever when
 * an upstream API or local backend is unavailable.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      const error = new Error('Request timed out')
      error.name = 'AbortError'
      reject(error)
    }, timeoutMs)
  })

  try {
    return await Promise.race([
      fetch(input, { ...init, signal: init.signal ?? controller.signal }),
      timeout,
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
