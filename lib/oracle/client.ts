import { getOracleApiBaseUrl, resolveOracleUrl } from './config'
import type {
  MyVideoItem,
  OracleEvent,
  ProcessRequest,
  ProcessResponse,
  RenderRequest,
  RenderStatusResponse,
  SessionStatusResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from './types'

export interface OracleClientOptions {
  baseUrl?: string
  token?: string | null
  getAuthToken?: () => Promise<string | null | undefined> | string | null | undefined
}

export interface UploadProgressCallback {
  (percentage: number, loadedBytes: number, totalBytes: number): void
}

export interface EventSubscriptionOptions {
  token?: string | null
  pollIntervalMs?: number
  fallbackToPolling?: boolean
}

export interface EventCallbacks {
  onEvent: (event: OracleEvent) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

// Intake Law forbidden property keys (Repo AGENTS.md rule 13)
const FORBIDDEN_INTAKE_KEYS = [
  'transcript',
  'transcripts',
  'transcription',
  'word_timestamps',
  'timestamps',
  'chunks',
  'manifest',
  'manifests',
]

// Disallowed client identity keys (userId must never be sent as a trusted field; server derives it from Bearer token)
const FORBIDDEN_IDENTITY_KEYS = ['userid', 'user_id', 'uid', 'sub', 'owner_id', 'ownerid']

function validateIntakeLaw(request: ProcessRequest): void {
  const checkObject = (obj: Record<string, unknown> | undefined, path: string) => {
    if (!obj || typeof obj !== 'object') return
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase()
      if (FORBIDDEN_INTAKE_KEYS.includes(lower)) {
        throw new Error(
          `Intake law violation at ${path}.${key}: Client sends ONLY raw video + creative prompt. Transcripts, timestamps, chunks, and manifests are strictly forbidden.`,
        )
      }
      if (FORBIDDEN_IDENTITY_KEYS.includes(lower)) {
        throw new Error(
          `Untrusted identity field rejected at ${path}.${key}: userId must never be sent as a trusted client field. Server derives identity from the Bearer token.`,
        )
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkObject(obj[key] as Record<string, unknown>, `${path}.${key}`)
      }
    }
  }

  checkObject(request as unknown as Record<string, unknown>, 'request')
}

export class OracleClient {
  private baseUrl: string
  private token?: string | null
  private getAuthToken?: () => Promise<string | null | undefined> | string | null | undefined

  constructor(options: OracleClientOptions = {}) {
    this.baseUrl = (options.baseUrl || getOracleApiBaseUrl()).replace(/\/+$/, '')
    this.token = options.token
    this.getAuthToken = options.getAuthToken
  }

  public setToken(token: string | null): void {
    this.token = token
  }

  private async resolveToken(overrideToken?: string | null): Promise<string | null> {
    if (overrideToken !== undefined) return overrideToken
    if (this.token) return this.token
    if (this.getAuthToken) {
      const token = await this.getAuthToken()
      return token || null
    }
    return null
  }

  private async buildHeaders(overrideToken?: string | null, customHeaders?: Record<string, string>): Promise<Headers> {
    const headers = new Headers(customHeaders || {})
    const token = await this.resolveToken(overrideToken)
    if (token) {
      headers.set('Authorization', `Bearer ${token.trim()}`)
    }
    return headers
  }

  /**
   * POST /api/upload-url {filename, contentType}
   * Returns signed upload instructions
   */
  public async getUploadUrl(
    params: UploadUrlRequest,
    overrideToken?: string | null,
  ): Promise<UploadUrlResponse> {
    if (!params.filename) throw new Error('filename is required')
    if (!params.contentType) throw new Error('contentType is required')

    const headers = await this.buildHeaders(overrideToken, {
      'Content-Type': 'application/json',
    })

    const url = resolveOracleUrl('/api/upload-url', this.baseUrl)
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: params.filename,
        contentType: params.contentType,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to get upload URL (${res.status}): ${errorText}`)
    }

    const data = (await res.json()) as UploadUrlResponse
    return data
  }

  /**
   * Uploads file to signed URL with progress tracking.
   * Sends exactly the signed Content-Type.
   * NO file size cap.
   */
  public async uploadFileToSignedUrl(
    file: Blob | File,
    uploadInfo: UploadUrlResponse,
    onProgress?: UploadProgressCallback,
  ): Promise<void> {
    const uploadUrl = uploadInfo.uploadUrl
    if (!uploadUrl) {
      throw new Error('uploadInfo.uploadUrl is missing')
    }

    const requiredHeaders = uploadInfo.requiredHeaders || {}
    // Determine content type from requiredHeaders or file.type
    const contentType =
      requiredHeaders['Content-Type'] ||
      requiredHeaders['content-type'] ||
      (file as File).type ||
      'application/octet-stream'

    // Browser environment with XMLHttpRequest for upload progress
    if (typeof XMLHttpRequest !== 'undefined') {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(uploadInfo.method || 'PUT', uploadUrl)

        // Set signed content-type and any other required headers
        xhr.setRequestHeader('Content-Type', contentType)
        for (const [key, val] of Object.entries(requiredHeaders)) {
          if (key.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(key, val)
          }
        }

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100))
              onProgress(pct, evt.loaded, evt.total)
            } else if (onProgress) {
              onProgress(0, evt.loaded, evt.total || evt.loaded)
            }
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100, file.size, file.size)
            resolve()
          } else {
            reject(new Error(`Signed upload failed with HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error occurred during signed upload'))
        }

        xhr.ontimeout = () => {
          reject(new Error('Signed upload timed out'))
        }

        xhr.send(file)
      })
    }

    // Node or non-XHR fallback
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...requiredHeaders,
    }

    const res = await fetch(uploadUrl, {
      method: uploadInfo.method || 'PUT',
      headers,
      body: file as any,
    })

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      throw new Error(`Upload to signed URL failed (${res.status}): ${err}`)
    }

    if (onProgress) {
      onProgress(100, file.size, file.size)
    }
  }

  /**
   * POST /api/process {bucket, key, filename, contentType, mediaUrl?, metadata?}
   * Enforces Intake Law (Rule 13).
   * Returns {jobId, sessionId, status, urls:{status, preview, render, events}}
   */
  public async startProcess(
    request: ProcessRequest,
    overrideToken?: string | null,
  ): Promise<ProcessResponse> {
    // Validate Intake Law (Rule 13) and ensure no untrusted userId passed
    validateIntakeLaw(request)

    const headers = await this.buildHeaders(overrideToken, {
      'Content-Type': 'application/json',
    })

    const url = resolveOracleUrl('/api/process', this.baseUrl)
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to start process (${res.status}): ${errText}`)
    }

    const data = (await res.json()) as ProcessResponse
    return data
  }

  /**
   * GET session status
   */
  public async getSessionStatus(
    statusUrlOrSessionId: string,
    overrideToken?: string | null,
  ): Promise<SessionStatusResponse> {
    const url = statusUrlOrSessionId.startsWith('http')
      ? statusUrlOrSessionId
      : resolveOracleUrl(
          statusUrlOrSessionId.startsWith('/api')
            ? statusUrlOrSessionId
            : `/api/session/${statusUrlOrSessionId}/status`,
          this.baseUrl,
        )

    const headers = await this.buildHeaders(overrideToken)
    const res = await fetch(url, { method: 'GET', headers })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to fetch session status (${res.status}): ${errText}`)
    }

    const data = (await res.json()) as SessionStatusResponse
    return data
  }

  /**
   * SSE EventSource subscriber with automated polling fallback.
   * Tracks stages: queued -> transcribing -> segmenting -> scoring -> ranking -> completed / failed
   */
  public subscribeToEvents(
    eventsUrlOrSessionId: string,
    callbacks: EventCallbacks,
    options: EventSubscriptionOptions = {},
  ): () => void {
    const pollIntervalMs = options.pollIntervalMs || 3000
    let isCleanedUp = false
    let eventSource: any = null
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null

    const resolvedUrl = eventsUrlOrSessionId.startsWith('http')
      ? eventsUrlOrSessionId
      : resolveOracleUrl(
          eventsUrlOrSessionId.startsWith('/api')
            ? eventsUrlOrSessionId
            : `/api/session/${eventsUrlOrSessionId}/events`,
          this.baseUrl,
        )

    // Polling fallback loop
    const startPollingFallback = () => {
      if (isCleanedUp) return

      const doPoll = async () => {
        if (isCleanedUp) return
        try {
          // Poll status
          const status = await this.getSessionStatus(eventsUrlOrSessionId, options.token)
          if (isCleanedUp) return

          callbacks.onEvent({
            type: 'stage_change',
            stage: status.stage || status.status,
            progress: status.progress,
            message: status.error || undefined,
            data: status,
          })

          const currentStage = status.stage || status.status
          if (currentStage === 'completed') {
            callbacks.onComplete?.()
            return
          }
          if (currentStage === 'failed') {
            callbacks.onError?.(new Error(status.error || 'Process failed'))
            return
          }

          pollTimeoutId = setTimeout(doPoll, pollIntervalMs)
        } catch (err: any) {
          if (!isCleanedUp) {
            callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
            pollTimeoutId = setTimeout(doPoll, pollIntervalMs * 1.5)
          }
        }
      }

      doPoll()
    }

    // Try EventSource if available
    if (typeof EventSource !== 'undefined') {
      try {
        let finalUrl = resolvedUrl
        const token = options.token || this.token
        // If token present and URL doesn't have it, pass token query param for browser EventSource
        if (token && !finalUrl.includes('token=')) {
          const urlObj = new URL(finalUrl, 'http://localhost')
          urlObj.searchParams.set('token', token)
          finalUrl = urlObj.toString().replace('http://localhost', '')
          if (!finalUrl.startsWith('http') && resolvedUrl.startsWith('http')) {
            finalUrl = new URL(resolvedUrl).origin + finalUrl
          }
        }

        eventSource = new EventSource(finalUrl)

        eventSource.onmessage = (event: MessageEvent) => {
          if (isCleanedUp) return
          try {
            const parsed = JSON.parse(event.data) as OracleEvent
            callbacks.onEvent(parsed)
            if (parsed.stage === 'completed' || parsed.type === 'complete') {
              callbacks.onComplete?.()
              cleanup()
            } else if (parsed.stage === 'failed' || parsed.type === 'error') {
              callbacks.onError?.(new Error(parsed.message || 'Process failed'))
              cleanup()
            }
          } catch {
            callbacks.onEvent({ type: 'message', message: event.data })
          }
        }

        eventSource.onerror = (err: any) => {
          if (isCleanedUp) return
          // If EventSource fails, fallback to polling
          if (eventSource) {
            try {
              eventSource.close()
            } catch {}
            eventSource = null
          }
          if (options.fallbackToPolling !== false) {
            startPollingFallback()
          } else {
            callbacks.onError?.(new Error('EventSource failed connection'))
          }
        }
      } catch (err) {
        if (options.fallbackToPolling !== false) {
          startPollingFallback()
        } else {
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      }
    } else {
      // EventSource not available (e.g. Node)
      startPollingFallback()
    }

    const cleanup = () => {
      isCleanedUp = true
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId)
        pollTimeoutId = null
      }
      if (eventSource) {
        try {
          eventSource.close()
        } catch {}
        eventSource = null
      }
    }

    return cleanup
  }

  /**
   * POST render
   */
  public async triggerRender(
    renderUrlOrSessionId: string,
    renderOptions: RenderRequest = {},
    overrideToken?: string | null,
  ): Promise<{ renderJobId: string; status: string; downloadUrl?: string }> {
    const url = renderUrlOrSessionId.startsWith('http')
      ? renderUrlOrSessionId
      : resolveOracleUrl(
          renderUrlOrSessionId.startsWith('/api')
            ? renderUrlOrSessionId
            : `/api/session/${renderUrlOrSessionId}/render`,
          this.baseUrl,
        )

    const headers = await this.buildHeaders(overrideToken, {
      'Content-Type': 'application/json',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(renderOptions),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to trigger render (${res.status}): ${errText}`)
    }

    return res.json()
  }

  /**
   * GET render-status
   */
  public async getRenderStatus(
    renderStatusUrlOrJobId: string,
    overrideToken?: string | null,
  ): Promise<RenderStatusResponse> {
    const url = renderStatusUrlOrJobId.startsWith('http')
      ? renderStatusUrlOrJobId
      : resolveOracleUrl(
          renderStatusUrlOrJobId.startsWith('/api')
            ? renderStatusUrlOrJobId
            : `/api/render/${renderStatusUrlOrJobId}/status`,
          this.baseUrl,
        )

    const headers = await this.buildHeaders(overrideToken)
    const res = await fetch(url, { method: 'GET', headers })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to fetch render status (${res.status}): ${errText}`)
    }

    return res.json()
  }

  /**
   * GET /api/my-videos
   * List videos scoped to the authenticated user derived from Bearer token
   */
  public async listMyVideos(overrideToken?: string | null): Promise<MyVideoItem[]> {
    const url = resolveOracleUrl('/api/my-videos', this.baseUrl)
    const headers = await this.buildHeaders(overrideToken)

    const res = await fetch(url, { method: 'GET', headers })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Failed to list user videos (${res.status}): ${errText}`)
    }

    const data = await res.json()
    // Support array or { videos: [...] } or { items: [...] }
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.videos)) return data.videos
    if (Array.isArray(data?.items)) return data.items
    return []
  }
}
