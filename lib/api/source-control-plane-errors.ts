import { NextResponse } from 'next/server'

type SupabaseLikeError = {
  code?: string | null
  details?: string | null
  message?: string | null
}

const KNOWN_CODES = [
  'UNAUTHORIZED',
  'PROJECT_NOT_OWNED',
  'INVALID_SOURCE_SIZE',
  'INVALID_SOURCE_METADATA',
  'INVALID_UPLOAD_EXPIRY',
  'INVALID_SOURCE_OBJECT_KEY',
  'STORAGE_QUOTA_EXCEEDED',
  'UPLOAD_IDEMPOTENCY_CONFLICT',
  'UPLOAD_SESSION_NOT_FOUND',
  'UPLOAD_SESSION_NOT_ATTACHABLE',
  'UPLOAD_SESSION_NOT_VERIFIABLE',
  'UPLOAD_SESSION_NOT_COMMITTABLE',
  'MULTIPART_ALREADY_ATTACHED',
  'UPLOAD_SIZE_MISMATCH',
  'SOURCE_ASSET_IDENTITY_CONFLICT',
  'SOURCE_INGESTION_NOT_FOUND',
  'SOURCE_INGESTION_NOT_RETRYABLE',
  'SOURCE_INGESTION_ATTEMPTS_EXHAUSTED',
  'SOURCE_SUPERSEDED_OR_NOT_FOUND',
  'SOURCE_ASSET_NOT_FOUND',
] as const

function codeFrom(error: SupabaseLikeError, fallbackCode: string) {
  const message = error.message ?? ''
  return KNOWN_CODES.find((code) => message.includes(code)) ?? fallbackCode
}

function statusFor(code: string) {
  if (code === 'UNAUTHORIZED') return 401
  if (code.includes('SUPERSEDED')) return 409
  if (code === 'PROJECT_NOT_OWNED' || code.endsWith('_NOT_FOUND')) return 404
  if (code === 'STORAGE_QUOTA_EXCEEDED') return 413
  if (code.startsWith('INVALID_')) return 400
  if (
    code.includes('CONFLICT')
    || code.includes('ALREADY')
    || code.includes('NOT_ATTACHABLE')
    || code.includes('NOT_VERIFIABLE')
    || code.includes('NOT_COMMITTABLE')
    || code.includes('NOT_RETRYABLE')
    || code.includes('SUPERSEDED')
    || code.includes('ATTEMPTS_EXHAUSTED')
    || code === 'UPLOAD_SIZE_MISMATCH'
  ) return 409
  return 500
}

function messageFor(code: string, fallbackMessage: string) {
  switch (code) {
    case 'STORAGE_QUOTA_EXCEEDED': return 'Storage quota exceeded by active assets and upload reservations.'
    case 'UPLOAD_IDEMPOTENCY_CONFLICT': return 'This upload request ID was already used with different file metadata.'
    case 'MULTIPART_ALREADY_ATTACHED': return 'Another request already created the multipart upload.'
    case 'UPLOAD_SIZE_MISMATCH': return 'The completed R2 object size does not match the upload reservation.'
    case 'SOURCE_SUPERSEDED_OR_NOT_FOUND': return 'This job belongs to a superseded source revision.'
    case 'SOURCE_INGESTION_ATTEMPTS_EXHAUSTED': return 'This source exhausted its processing attempts.'
    default: return fallbackMessage
  }
}

export function sourceControlPlaneErrorResponse(
  error: SupabaseLikeError,
  fallbackCode: string,
  fallbackMessage: string,
) {
  const code = codeFrom(error, fallbackCode)
  const status = statusFor(code)
  return NextResponse.json({
    error: messageFor(code, fallbackMessage),
    code,
    retryable: status >= 500 || code === 'MULTIPART_ALREADY_ATTACHED',
    ...(error.details ? { details: error.details } : {}),
  }, { status })
}
