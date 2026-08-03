'use client'

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
  phase: 'initiating' | 'uploading' | 'retrying' | 'completing' | 'aborting' | 'done'
  totalBytes: number
  totalParts: number
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

type UploadedPart = {
  ETag: string
  PartNumber: number
}

export type UploadProjectSourceMultipartOptions = {
  assetId?: string | null
  file: File
  onProgress?: (progress: MultipartUploadProgress) => void
  projectId: string
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

export async function uploadProjectSourceMultipart({
  assetId,
  file,
  onProgress,
  projectId,
  signal,
}: UploadProjectSourceMultipartOptions): Promise<UploadProjectSourceMultipartResult> {
  if (file.size > R2_MULTIPART_CLIENT_MAX_BYTES) {
    throw new MultipartUploadError('File too large. Prometheus supports source videos up to 10GB.')
  }
  const stableAssetId = assetId || crypto.randomUUID()

  const totalParts = Math.ceil(file.size / R2_MULTIPART_CLIENT_PART_SIZE)
  const baseProgress = {
    bytesUploaded: 0,
    currentPart: 0,
    partProgressBytes: 0,
    percentage: 0,
    totalBytes: file.size,
    totalParts,
  }

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

  const { asset, upload } = initiate
  if (upload.status === 'verified' || upload.status === 'committed') {
    onProgress?.({ ...baseProgress, bytesUploaded: file.size, percentage: 100, phase: 'done' })
    return { asset, bucket: asset.bucket, key: asset.objectKey }
  }
  const uploadedParts: UploadedPart[] = []
  let completedBytes = 0

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      assertNotAborted(signal)

      const start = (partNumber - 1) * R2_MULTIPART_CLIENT_PART_SIZE
      const end = Math.min(start + R2_MULTIPART_CLIENT_PART_SIZE, file.size)
      const body = file.slice(start, end)
      let lastPartProgressBytes = 0

      for (let attempt = 1; attempt <= R2_MULTIPART_MAX_RETRIES; attempt += 1) {
        assertNotAborted(signal)
        const phase = attempt > 1 ? 'retrying' : 'uploading'
        onProgress?.({
          bytesUploaded: completedBytes,
          currentPart: partNumber,
          partProgressBytes: 0,
          percentage: Math.round((completedBytes / file.size) * 100),
          phase,
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
                partProgressBytes: loaded,
                percentage: Math.round((bytesUploaded / file.size) * 100),
                phase,
                totalBytes: file.size,
                totalParts,
              })
            },
          })

          uploadedParts.push(uploadedPart)
          completedBytes += body.size
          lastPartProgressBytes = body.size
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
      partProgressBytes: 0,
      percentage: 100,
      phase: 'completing',
      totalBytes: file.size,
      totalParts,
    })

    let completed: { bucket: string; etag?: string; key: string; location?: string; sizeBytes: number; url?: string; verified: boolean } | null = null
    let completionError: unknown
    for (let attempt = 1; attempt <= 2 && !completed; attempt += 1) {
      try {
        const completeResponse = await fetch(`/api/projects/${projectId}/upload-multipart/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            sessionId: upload.sessionId,
            key: upload.key,
            parts: uploadedParts,
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

    onProgress?.({
      bytesUploaded: file.size,
      currentPart: totalParts,
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
      // The registration endpoint repeats HEAD verification before committing metadata.
      // Returning only after verified=true prevents optimistic client-side commits.
      url: completed.url,
    }
  } catch (error) {
    onProgress?.({
      bytesUploaded: completedBytes,
      currentPart: Math.min(totalParts, uploadedParts.length + 1),
      partProgressBytes: 0,
      percentage: Math.round((completedBytes / file.size) * 100),
      phase: 'aborting',
      totalBytes: file.size,
      totalParts,
    })

    // Multipart uploads bill for orphaned parts until lifecycle cleanup runs.
    // Explicit abort keeps failed/cancelled uploads from accumulating storage charges.
    await abortProjectSourceMultipartUpload({
      projectId,
      sessionId: upload.sessionId,
    }).catch(() => undefined)

    throw error
  }
}
