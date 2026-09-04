'use client'

import { get, set, del } from 'idb-keyval'

export const R2_MULTIPART_CLIENT_MAX_BYTES = 10 * 1024 * 1024 * 1024
export const R2_MULTIPART_CLIENT_PART_SIZE = 50 * 1024 * 1024
export const R2_MULTIPART_MAX_RETRIES = 3

export type MultipartSourceAsset = {
  bucket: string
  id: string
  mimeType: string
  objectKey: string
  projectId: string
  sizeBytes: number
  storageProvider: 'r2'
  uploadSessionId: string
}

export type MultipartUploadProgress = {
  bytesUploaded: number
  currentPart: number
  partProgressBytes: number
  percentage: number
  phase: 'initiating' | 'uploading' | 'retrying' | 'completing' | 'aborting' | 'paused' | 'done'
  totalBytes: number
  totalParts: number
  isResumed?: boolean
  resumedFromPart?: number
}

type MultipartInitiateResponse = {
  asset: MultipartSourceAsset
  upload: {
    sessionId: string
    key: string
    partSize: number
    uploadId: string
    status: 'reserved' | 'uploading' | 'verified' | 'committed'
  }
}

export type UploadedPart = {
  ETag: string
  PartNumber: number
}

export type StoredMultipartSession = {
  assetId: string
  bucket: string
  completedBytes: number
  createdAt: number
  fileFingerprint: string
  fileLastModified: number
  fileName: string
  fileSize: number
  fileType: string
  key: string
  partSize: number
  projectId: string
  sessionId: string
  totalParts: number
  updatedAt: number
  uploadId: string
  uploadedParts: UploadedPart[]
}

export type UploadProjectSourceMultipartOptions = {
  abortRemoteOnCancel?: boolean
  assetId?: string | null
  file: File
  onProgress?: (progress: MultipartUploadProgress) => void
  partSize?: number
  projectId: string
  resumable?: boolean
  signal?: AbortSignal
}

export type UploadProjectSourceMultipartResult = {
  asset: MultipartSourceAsset
  bucket: string
  key: string
  location?: string
  url?: string
}

export class MultipartUploadError extends Error {
  cause?: unknown
  partNumber?: number
  responseBody?: string
  status?: number

  constructor(
    message: string,
    options: {
      cause?: unknown
      partNumber?: number
      responseBody?: string
      status?: number
    } = {},
  ) {
    super(message)
    this.name = 'MultipartUploadError'
    this.cause = options.cause
    this.partNumber = options.partNumber
    this.responseBody = options.responseBody
    this.status = options.status
  }
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Upload cancelled by user.', 'AbortError')
  }
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text().catch(() => '')
  const data = text ? tryParseJson(text) : null

  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : `${fallbackMessage} (${response.status} ${response.statusText})`

    console.error('[R2_MULTIPART_HTTP_ERROR]', {
      body: text,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    })

    throw new MultipartUploadError(message, {
      responseBody: text,
      status: response.status,
    })
  }

  return data as T
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function getRetryDelayMs(attempt: number) {
  return Math.min(8000, 750 * 2 ** Math.max(0, attempt - 1))
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, ms)
    const abort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('Upload cancelled by user.', 'AbortError'))
    }

    if (signal?.aborted) {
      abort()
      return
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

function describeUploadUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return 'unparseable upload URL'
  }
}

async function uploadPartWithProgress(input: {
  body: Blob
  contentType: string
  onLoaded: (loaded: number) => void
  partNumber: number
  signal?: AbortSignal
  totalParts: number
  url: string
}) {
  return new Promise<UploadedPart>((resolve, reject) => {
    assertNotAborted(input.signal)

    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    const startedAt = Date.now()
    const uploadUrl = describeUploadUrl(input.url)

    console.log(
      `[MULTIPART] Uploading part ${input.partNumber}/${input.totalParts}, size: ${input.body.size} bytes`,
    )

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onLoaded(event.loaded)
      }
    }

    xhr.onload = () => {
      input.signal?.removeEventListener('abort', abort)
      const duration = Date.now() - startedAt
      const responseHeaders = xhr.getAllResponseHeaders()
      const eTag = xhr.getResponseHeader('ETag')

      console.log(`[MULTIPART] Part ${input.partNumber} result: ${xhr.status} in ${duration}ms`)

      if (xhr.status >= 200 && xhr.status < 300 && eTag) {
        input.onLoaded(input.body.size)
        resolve({
          ETag: eTag,
          PartNumber: input.partNumber,
        })
        return
      }

      const failureBody = xhr.responseText || 'No body'
      const failureReason =
        xhr.status >= 200 && xhr.status < 300 && !eTag
          ? 'Missing readable ETag. Check R2 CORS ExposeHeaders includes ETag.'
          : failureBody

      console.error(`[MULTIPART] Part ${input.partNumber} failed: ${xhr.status} ${failureReason}`)
      console.error('[R2_MULTIPART_PART_ERROR]', {
        partNumber: input.partNumber,
        requestHeaders: {
          'Content-Type': input.contentType,
        },
        response: failureBody,
        responseHeaders,
        status: xhr.status,
        uploadUrl,
      })

      reject(
        new MultipartUploadError(
          xhr.status >= 200 && xhr.status < 300 && !eTag
            ? `Part ${input.partNumber} uploaded but R2 did not expose ETag. Check R2 bucket CORS ExposeHeaders.`
            : `Part ${input.partNumber} failed with HTTP ${xhr.status || 'network error'}.`,
          {
            partNumber: input.partNumber,
            responseBody: failureBody,
            status: xhr.status,
          },
        ),
      )
    }

    xhr.onerror = () => {
      input.signal?.removeEventListener('abort', abort)
      const duration = Date.now() - startedAt
      console.error(`[MULTIPART] Part ${input.partNumber} failed: network error in ${duration}ms`)
      reject(
        new MultipartUploadError(`Network error while uploading part ${input.partNumber}.`, {
          partNumber: input.partNumber,
        }),
      )
    }

    xhr.onabort = () => {
      input.signal?.removeEventListener('abort', abort)
      const duration = Date.now() - startedAt
      console.warn(`[MULTIPART] Part ${input.partNumber} aborted after ${duration}ms`)
      reject(new DOMException('Upload cancelled by user.', 'AbortError'))
    }

    input.signal?.addEventListener('abort', abort, { once: true })

    xhr.open('PUT', input.url)
    // The part presign does not require app credentials in the browser, but
    // setting the MIME type keeps R2 object metadata consistent for downstream processors.
    xhr.setRequestHeader('Content-Type', input.contentType)
    xhr.send(input.body)
  })
}

export async function abortProjectSourceMultipartUpload(input: {
  projectId: string
  sessionId: string
}) {
  const response = await fetch(`/api/projects/${input.projectId}/upload-multipart/abort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: input.sessionId,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.warn('[R2_MULTIPART_ABORT_FAILED]', {
      body,
      status: response.status,
      statusText: response.statusText,
    })
  }
}

export function getMultipartFingerprint(file: File, projectId: string): string {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `prometheus_multipart_${projectId}_${safeName}_${file.size}_${file.lastModified}`
}

export async function getResumableSessionForFile(
  file: File,
  projectId: string,
): Promise<StoredMultipartSession | null> {
  if (typeof window === 'undefined') return null
  try {
    const fingerprint = getMultipartFingerprint(file, projectId)
    const session = await get<StoredMultipartSession>(fingerprint)
    if (!session) return null
    // Sessions older than 24 hours are expired on R2
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      await del(fingerprint).catch(() => undefined)
      return null
    }
    return session
  } catch (err) {
    console.warn('[MULTIPART_IDB_GET_ERROR]', err)
    return null
  }
}

export async function clearResumableSessionForFile(
  file: File,
  projectId: string,
): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const fingerprint = getMultipartFingerprint(file, projectId)
    await del(fingerprint)
  } catch (err) {
    console.warn('[MULTIPART_IDB_DEL_ERROR]', err)
  }
}

export async function cancelProjectSourceMultipartUpload(input: {
  file?: File
  fingerprint?: string
  projectId: string
  sessionId?: string
}) {
  if (input.sessionId) {
    await abortProjectSourceMultipartUpload({
      projectId: input.projectId,
      sessionId: input.sessionId,
    }).catch(() => undefined)
  }
  if (input.file) {
    await clearResumableSessionForFile(input.file, input.projectId).catch(() => undefined)
  } else if (input.fingerprint && typeof window !== 'undefined') {
    await del(input.fingerprint).catch(() => undefined)
  }
}

export async function uploadProjectSourceMultipart({
  abortRemoteOnCancel = false,
  assetId,
  file,
  onProgress,
  partSize: customPartSize,
  projectId,
  resumable = true,
  signal,
}: UploadProjectSourceMultipartOptions): Promise<UploadProjectSourceMultipartResult> {
  if (file.size > R2_MULTIPART_CLIENT_MAX_BYTES) {
    throw new MultipartUploadError('File too large. Prometheus supports source videos up to 10GB.')
  }
  const stableAssetId = assetId || crypto.randomUUID()
  const fingerprint = getMultipartFingerprint(file, projectId)

  let storedSession: StoredMultipartSession | null = null
  if (resumable) {
    storedSession = await getResumableSessionForFile(file, projectId)
  }

  const partSize = customPartSize || storedSession?.partSize || R2_MULTIPART_CLIENT_PART_SIZE
  const totalParts = Math.ceil(file.size / partSize)

  const baseProgress = {
    bytesUploaded: 0,
    currentPart: 0,
    partProgressBytes: 0,
    percentage: 0,
    totalBytes: file.size,
    totalParts,
  }

  let asset: MultipartSourceAsset
  let upload: {
    sessionId: string
    key: string
    partSize: number
    uploadId: string
    status: 'reserved' | 'uploading' | 'verified' | 'committed'
  }
  let uploadedParts: UploadedPart[] = []
  let completedBytes = 0
  let isResumed = false

  if (storedSession && storedSession.uploadId && storedSession.sessionId && storedSession.uploadedParts.length > 0) {
    asset = {
      bucket: storedSession.bucket,
      id: storedSession.assetId || stableAssetId,
      mimeType: storedSession.fileType || file.type || 'application/octet-stream',
      objectKey: storedSession.key,
      projectId,
      sizeBytes: file.size,
      storageProvider: 'r2',
      uploadSessionId: storedSession.sessionId,
    }
    upload = {
      sessionId: storedSession.sessionId,
      key: storedSession.key,
      partSize: storedSession.partSize,
      uploadId: storedSession.uploadId,
      status: 'uploading',
    }
    uploadedParts = [...storedSession.uploadedParts]
    const completedSet = new Set(uploadedParts.map((p) => p.PartNumber))
    completedBytes = Array.from(completedSet).reduce((sum, pNum) => {
      const isLastPart = pNum === totalParts
      const pSize = isLastPart ? file.size - (pNum - 1) * partSize : partSize
      return sum + pSize
    }, 0)
    isResumed = true

    onProgress?.({
      ...baseProgress,
      bytesUploaded: completedBytes,
      currentPart: uploadedParts.length,
      isResumed: true,
      percentage: Math.min(99, Math.round((completedBytes / file.size) * 100)),
      phase: 'uploading',
      resumedFromPart: uploadedParts.length,
    })
  } else {
    onProgress?.({ ...baseProgress, phase: 'initiating' })

    const initiateResponse = await fetch(`/api/projects/${projectId}/upload-multipart/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        assetId: stableAssetId,
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
        sizeBytes: file.size,
      }),
    })

    const initiate = await readJsonResponse<MultipartInitiateResponse>(
      initiateResponse,
      'Unable to start R2 multipart upload',
    )

    asset = initiate.asset
    upload = initiate.upload

    if (upload.status === 'verified' || upload.status === 'committed') {
      onProgress?.({ ...baseProgress, bytesUploaded: file.size, percentage: 100, phase: 'done' })
      return { asset, bucket: asset.bucket, key: asset.objectKey }
    }

    if (resumable) {
      storedSession = {
        assetId: asset.id,
        bucket: asset.bucket,
        completedBytes: 0,
        createdAt: Date.now(),
        fileFingerprint: fingerprint,
        fileLastModified: file.lastModified,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        key: upload.key,
        partSize,
        projectId,
        sessionId: upload.sessionId,
        totalParts,
        updatedAt: Date.now(),
        uploadId: upload.uploadId,
        uploadedParts: [],
      }
      await set(fingerprint, storedSession).catch(() => undefined)
    }
  }

  const completedPartNumbers = new Set(uploadedParts.map((p) => p.PartNumber))

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      assertNotAborted(signal)

      // If this part was already uploaded in an earlier session, skip it!
      if (completedPartNumbers.has(partNumber)) {
        continue
      }

      const start = (partNumber - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      const body = file.slice(start, end)
      let lastPartProgressBytes = 0

      for (let attempt = 1; attempt <= R2_MULTIPART_MAX_RETRIES; attempt += 1) {
        assertNotAborted(signal)
        const phase = attempt > 1 ? 'retrying' : 'uploading'
        onProgress?.({
          bytesUploaded: completedBytes,
          currentPart: partNumber,
          isResumed,
          partProgressBytes: 0,
          percentage: Math.round((completedBytes / file.size) * 100),
          phase,
          resumedFromPart: isResumed ? uploadedParts.length : undefined,
          totalBytes: file.size,
          totalParts,
        })

        try {
          const signResponse = await fetch(`/api/projects/${projectId}/upload-multipart/sign-part`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
              sessionId: upload.sessionId,
              key: upload.key,
              partNumber,
              uploadId: upload.uploadId,
            }),
          })

          const signedPart = await readJsonResponse<{ url: string }>(
            signResponse,
            `Unable to sign upload part ${partNumber}`,
          )

          const uploadedPart = await uploadPartWithProgress({
            body,
            contentType: file.type || 'application/octet-stream',
            partNumber,
            signal,
            totalParts,
            url: signedPart.url,
            onLoaded: (loaded) => {
              lastPartProgressBytes = loaded
              const bytesUploaded = Math.min(file.size, completedBytes + loaded)
              onProgress?.({
                bytesUploaded,
                currentPart: partNumber,
                isResumed,
                partProgressBytes: loaded,
                percentage: Math.round((bytesUploaded / file.size) * 100),
                phase,
                resumedFromPart: isResumed ? uploadedParts.length : undefined,
                totalBytes: file.size,
                totalParts,
              })
            },
          })

          uploadedParts.push(uploadedPart)
          completedPartNumbers.add(partNumber)
          completedBytes += body.size
          lastPartProgressBytes = body.size

          if (resumable && storedSession) {
            storedSession = {
              ...storedSession,
              completedBytes,
              updatedAt: Date.now(),
              uploadedParts: [...uploadedParts],
            }
            await set(fingerprint, storedSession).catch(() => undefined)
          }

          break
        } catch (error) {
          console.error('[R2_MULTIPART_PART_RETRY]', {
            attempt,
            error,
            partNumber,
            uploadedBytesBeforeFailure: completedBytes + lastPartProgressBytes,
          })

          if (attempt >= R2_MULTIPART_MAX_RETRIES) {
            throw error
          }

          await wait(getRetryDelayMs(attempt), signal)
        }
      }
    }

    onProgress?.({
      bytesUploaded: file.size,
      currentPart: totalParts,
      isResumed,
      partProgressBytes: 0,
      percentage: 100,
      phase: 'completing',
      totalBytes: file.size,
      totalParts,
    })

    let completed: { bucket: string; etag?: string; key: string; location?: string; sizeBytes: number; url?: string; verified: boolean } | null = null
    let completionError: unknown
    const sortedParts = [...uploadedParts].sort((a, b) => a.PartNumber - b.PartNumber)

    for (let attempt = 1; attempt <= 2 && !completed; attempt += 1) {
      try {
        const completeResponse = await fetch(`/api/projects/${projectId}/upload-multipart/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            sessionId: upload.sessionId,
            key: upload.key,
            parts: sortedParts,
            sizeBytes: file.size,
            uploadId: upload.uploadId,
          }),
        })

        completed = await readJsonResponse<{ bucket: string; etag?: string; key: string; location?: string; sizeBytes: number; url?: string; verified: boolean }>(
          completeResponse,
          'Unable to complete R2 multipart upload',
        )
      } catch (error) {
        completionError = error
        if (attempt < 2) await wait(getRetryDelayMs(attempt), signal)
      }
    }
    if (!completed) throw completionError

    // Completed successfully: remove from IndexedDB resumable cache
    if (resumable) {
      await del(fingerprint).catch(() => undefined)
    }

    onProgress?.({
      bytesUploaded: file.size,
      currentPart: totalParts,
      isResumed,
      partProgressBytes: 0,
      percentage: 100,
      phase: 'done',
      totalBytes: file.size,
      totalParts,
    })

    return {
      asset,
      bucket: completed.bucket,
      key: completed.key,
      location: completed.location,
      url: completed.url,
    }
  } catch (error) {
    const isAborted = signal?.aborted
    onProgress?.({
      bytesUploaded: completedBytes,
      currentPart: Math.min(totalParts, uploadedParts.length + 1),
      isResumed,
      partProgressBytes: 0,
      percentage: Math.round((completedBytes / file.size) * 100),
      phase: isAborted ? 'paused' : 'aborting',
      totalBytes: file.size,
      totalParts,
    })

    // ONLY abort remotely if abortRemoteOnCancel is true
    if (abortRemoteOnCancel && upload?.sessionId) {
      await abortProjectSourceMultipartUpload({
        projectId,
        sessionId: upload.sessionId,
      }).catch(() => undefined)

      if (resumable) {
        await del(fingerprint).catch(() => undefined)
      }
    }

    throw error
  }
}
