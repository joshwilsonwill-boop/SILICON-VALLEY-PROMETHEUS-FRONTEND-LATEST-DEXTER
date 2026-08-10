import type {
  BackendHealthSnapshot,
  ViralClipJobCreationResponse,
  ViralClipJobRequest,
  ViralClipJobResultResponse,
  ViralClipJobStatusResponse,
} from '@/lib/types'
import {normalizeViralClipTargetPlatform} from '@/lib/editor/modal-viral-clip-workflow'

const DEFAULT_BACKEND_API_BASE_URL = 'http://localhost:8000'

type ViralClipSubmissionOptions = {
  sourceVideoFile?: File | null
  assetFiles?: File[]
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_BACKEND_API_BASE_URL

  try {
    return new URL(trimmed).toString().replace(/\/+$/, '')
  } catch {
    throw new Error(
      `Invalid backend API base URL "${trimmed}". Set VITE_API_BASE_URL to a valid URL such as http://localhost:8000.`,
    )
  }
}

export function getBackendApiBaseUrl() {
  const configuredBaseUrl =
    process.env.VITE_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    DEFAULT_BACKEND_API_BASE_URL

  return normalizeBaseUrl(configuredBaseUrl)
}

function buildBackendUrl(path: string) {
  const baseUrl = getBackendApiBaseUrl()
  if (typeof window !== 'undefined') {
    const backendHostname = new URL(baseUrl).hostname
    const pageHostname = window.location.hostname
    const backendIsLoopback = backendHostname === 'localhost' || backendHostname === '127.0.0.1'
    const pageIsLoopback = pageHostname === 'localhost' || pageHostname === '127.0.0.1'
    if (backendIsLoopback && !pageIsLoopback) {
      throw new Error('Primary clip selection is not publicly configured; switching to the Modal resilience path.')
    }
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extractMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim()
  }

  if (isPlainObject(payload)) {
    const candidates = ['error_message', 'error', 'message', 'detail', 'description'] as const
    for (const key of candidates) {
      const value = payload[key]
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
      }
      if (Array.isArray(value)) {
        const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        if (items.length > 0) {
          return items.join(', ')
        }
      }
    }
  }

  return fallbackMessage
}

async function readBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null)
  }

  const text = await response.text().catch(() => '')
  if (!text.trim()) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await readBody(response)

  if (!response.ok) {
    throw new Error(extractMessage(payload, fallbackMessage))
  }

  return payload as T
}

async function backendFetch(path: string, init: RequestInit = {}) {
  return await fetch(buildBackendUrl(path), {
    cache: 'no-store',
    ...init,
  })
}

function createMultipartViralClipBody(
  request: object,
  options: ViralClipSubmissionOptions,
) {
  const formData = new FormData()
  formData.append('request_json', JSON.stringify(request))

  if (options.sourceVideoFile) {
    formData.append(
      'source_video',
      options.sourceVideoFile,
      options.sourceVideoFile.name?.trim() || 'source_video',
    )
  }

  for (const [index, assetFile] of (options.assetFiles ?? []).entries()) {
    formData.append('assets[]', assetFile, assetFile.name?.trim() || `asset_${index + 1}`)
  }

  return formData
}

export async function checkBackendHealth(): Promise<BackendHealthSnapshot> {
  try {
    const response = await backendFetch('/health', { method: 'GET' })
    const payload = await readBody(response)

    if (!response.ok) {
      return {
        reachable: false,
        status: response.status,
        message: extractMessage(payload, `Backend health check failed with status ${response.status}`),
        payload,
      }
    }

    return {
      reachable: true,
      status: response.status,
      message: null,
      payload,
    }
  } catch (error) {
    return {
      reachable: false,
      status: null,
      message: error instanceof Error ? error.message : 'Unable to reach the backend health endpoint.',
    }
  }
}

export async function createViralClipJob(
  request: ViralClipJobRequest,
  options: ViralClipSubmissionOptions = {},
): Promise<ViralClipJobCreationResponse> {
  const backendRequest = {
    ...request,
    targetPlatform: normalizeViralClipTargetPlatform(request.targetPlatform),
  }
  const hasFiles = Boolean(options.sourceVideoFile || (options.assetFiles?.length ?? 0) > 0)
  const init: RequestInit = {
    method: 'POST',
  }

  if (hasFiles) {
    init.body = createMultipartViralClipBody(backendRequest, options)
  } else {
    init.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    init.body = JSON.stringify(backendRequest)
  }

  const response = await backendFetch('/api/generate-viral-clips', init)
  return await readJsonResponse<ViralClipJobCreationResponse>(
    response,
    'Failed to create the viral clip job.',
  )
}

export async function getViralClipJobStatus(jobId: string): Promise<ViralClipJobStatusResponse> {
  const response = await backendFetch(`/api/jobs/${encodeURIComponent(jobId)}`, { method: 'GET' })
  return await readJsonResponse<ViralClipJobStatusResponse>(
    response,
    'Failed to fetch the viral clip job status.',
  )
}

async function getViralClipJobResultAtPath(jobId: string, suffix: '/result' | '/clips') {
  const response = await backendFetch(`/api/jobs/${encodeURIComponent(jobId)}${suffix}`, { method: 'GET' })
  return await readJsonResponse<ViralClipJobResultResponse>(
    response,
    `Failed to fetch the viral clip job ${suffix === '/result' ? 'result' : 'clips'} payload.`,
  )
}

export async function getViralClipJobResult(jobId: string): Promise<ViralClipJobResultResponse> {
  try {
    return await getViralClipJobResultAtPath(jobId, '/result')
  } catch (primaryError) {
    try {
      return await getViralClipJobResultAtPath(jobId, '/clips')
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : 'Primary result route failed.'
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Fallback clips route failed.'
      throw new Error(`${primaryMessage} ${fallbackMessage}`.trim())
    }
  }
}
