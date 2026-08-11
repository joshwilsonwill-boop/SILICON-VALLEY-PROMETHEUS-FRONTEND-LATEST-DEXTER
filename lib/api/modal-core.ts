const proxyRoot = '/api/modal-backend'
const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type ModalRenderSubmission = {
  jobId: string
  callId: string
  status: 'queued'
  statusUrl: string
}

export type ModalRenderStatus = {
  jobId: string
  callId: string
  status: string
  outputFile?: string
  outputUrl?: string
  error?: string
}

export type ModalSourceAnalysisSubmission = {
  jobId: string
  sourceAssetId: string
  callId: string
  status: 'queued'
  statusUrl: string
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & {error?: string}
  if (!response.ok) {
    throw new Error(body?.error || `Backend request failed with status ${response.status}.`)
  }
  return body
}

function identifier(value: string, label: string) {
  if (!safeIdentifierPattern.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${label}.`)
  }
  return encodeURIComponent(value)
}

export function createModalCoreClient(fetchImpl: FetchLike = fetch) {
  const jsonRequest = async <T>(path: string, init?: RequestInit) => {
    const response = await fetchImpl(`${proxyRoot}${path}`, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: init?.body ? {'Content-Type': 'application/json', ...init.headers} : init?.headers,
    })
    return responseJson<T>(response)
  }

  const getMediaUrl = (filename: string) =>
    `${proxyRoot}/media/${identifier(filename, 'media filename')}`

  const proxiedOutputUrl = (status: ModalRenderStatus) => {
    if (status.outputFile) return getMediaUrl(status.outputFile)
    if (!status.outputUrl?.startsWith('/media/')) return undefined
    return getMediaUrl(decodeURIComponent(status.outputUrl.slice('/media/'.length)))
  }

  return {
    health: () => jsonRequest<{ok: boolean}>('/health'),
    previewTextChunks: <TResponse = unknown>(payload: unknown) =>
      jsonRequest<TResponse>('/api/maul/text-chunks/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    dispatchRender: async (manifest: unknown) => {
      const submission = await jsonRequest<ModalRenderSubmission>('/api/render/jobs', {
        method: 'POST',
        body: JSON.stringify({manifest}),
      })
      return {
        ...submission,
        statusUrl: `${proxyRoot}/api/render/jobs/${identifier(submission.jobId, 'job ID')}/calls/${identifier(submission.callId, 'call ID')}`,
      }
    },
    getRenderStatus: async (jobId: string, callId: string) => {
      const status = await jsonRequest<ModalRenderStatus>(
        `/api/render/jobs/${identifier(jobId, 'job ID')}/calls/${identifier(callId, 'call ID')}`,
      )
      return {
        ...status,
        ...(proxiedOutputUrl(status) ? {outputUrl: proxiedOutputUrl(status)} : {}),
      }
    },
    dispatchSourceAnalysis: async (request: {jobId: string; sourceAssetId: string}) => {
      const submission = await jsonRequest<ModalSourceAnalysisSubmission>('/api/source-analysis/jobs', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      return {
        ...submission,
        statusUrl: `${proxyRoot}/api/source-analysis/jobs/${identifier(submission.jobId, 'job ID')}/calls/${identifier(submission.callId, 'call ID')}`,
      }
    },
    getMediaUrl,
  }
}

export const modalCore = createModalCoreClient()
