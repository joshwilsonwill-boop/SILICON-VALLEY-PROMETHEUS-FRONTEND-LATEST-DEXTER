// lib/upload/resumable-upload.ts
import {
  uploadProjectSourceMultipart,
  type MultipartUploadProgress,
  type StoredMultipartSession,
} from '@/lib/r2/multipart-client'

export interface UploadSession {
  uploadId: string
  key: string
  parts: { ETag: string; PartNumber: number }[]
  fileId: string
  sessionId?: string
}

export type { StoredMultipartSession }

/**
 * Resumable chunked upload for long videos up to 4GB (and up to 10GB).
 * Backed by R2 multipart upload with persistent session caching in IndexedDB.
 */
export async function uploadFileResumable(
  file: File,
  projectId: string,
  onProgress?: (progress: number, detail?: MultipartUploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const result = await uploadProjectSourceMultipart({
    file,
    projectId,
    signal,
    onProgress: (progress) => {
      onProgress?.(progress.percentage, progress)
    },
  })

  return result.url || result.location || `/api/projects/${projectId}/assets/${result.asset.id}`
}
