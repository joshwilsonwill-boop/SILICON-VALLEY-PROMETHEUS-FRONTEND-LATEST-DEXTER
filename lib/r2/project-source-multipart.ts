import { ProjectService } from '@/lib/projects/service'
import { R2Keys } from '@/lib/r2/keys'
import { formatStorage, getStorageLimit, getStorageTierFromPlan } from '@/lib/storage-limits'
import { createClient } from '@/lib/supabase/server'

export const PROJECT_SOURCE_MULTIPART_MAX_BYTES = 10 * 1024 * 1024 * 1024
export const PROJECT_SOURCE_MULTIPART_PART_SIZE = 50 * 1024 * 1024
export const PROJECT_SOURCE_MULTIPART_URL_TTL_SECONDS = 15 * 60

const SUPPORTED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/x-matroska',
])

const SUPPORTED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v', 'mkv'])
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/avif'])
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif'])

export type ProjectSourceUploadContext = {
  assetId: string
  bucket: string
  contentType: string
  filename: string
  key: string
  projectId: string
  sizeBytes: number
  userId: string
}

export function normalizeSourceFilename(filename: unknown) {
  return typeof filename === 'string' ? filename.trim() : ''
}

export function normalizeSourceContentType(contentType: unknown, filename = '') {
  const normalized = typeof contentType === 'string' ? contentType.trim().toLowerCase() : ''
  if (normalized && normalized !== 'application/octet-stream') return normalized
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  const inferred: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', mkv: 'video/x-matroska',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif',
  }
  return inferred[extension] ?? 'application/octet-stream'
}

export function normalizeSourceSizeBytes(sizeBytes: unknown) {
  if (typeof sizeBytes === 'number' && Number.isFinite(sizeBytes)) return Math.max(0, Math.floor(sizeBytes))
  if (typeof sizeBytes === 'string' && sizeBytes.trim()) {
    const parsed = Number(sizeBytes)
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed))
  }
  return 0
}

export function isSupportedProjectSourceVideo(filename: string, contentType: string) {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  const normalizedContentType = contentType.toLowerCase()
  return SUPPORTED_VIDEO_MIME_TYPES.has(normalizedContentType)
    || SUPPORTED_VIDEO_EXTENSIONS.has(extension)
    || SUPPORTED_IMAGE_MIME_TYPES.has(normalizedContentType)
    || SUPPORTED_IMAGE_EXTENSIONS.has(extension)
}

export function validateProjectSourceUploadInput(input: {
  contentType: string
  filename: string
  sizeBytes: number
}) {
  if (!input.filename) {
    return 'Missing filename.'
  }

  if (!isSupportedProjectSourceVideo(input.filename, input.contentType)) {
    return 'Unsupported format. Upload an image or an MP4, MOV, M4V, WEBM, or MKV video.'
  }

  if (!input.sizeBytes || input.sizeBytes <= 0) {
    return 'Missing or invalid file size.'
  }

  if (input.sizeBytes > PROJECT_SOURCE_MULTIPART_MAX_BYTES) {
    return 'File too large. Prometheus supports source media up to 10GB.'
  }

  return null
}

async function getUserStorageQuota(userId: string) {
  const supabase = await createClient()

  const { data: subscription, error: subscriptionError } = await supabase
    .from('dodo_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subscriptionError) {
    throw subscriptionError
  }

  const hasPaidAccess = subscription?.status === 'active'
  const tier = getStorageTierFromPlan(hasPaidAccess ? subscription?.tier ?? 'free' : 'free')

  const { data: assets, error: assetsError } = await supabase
    .from('source_assets')
    .select('size_bytes')
    .eq('user_id', userId)

  if (assetsError) {
    throw assetsError
  }

  const usedBytes = (assets ?? []).reduce((total, asset) => total + (Number(asset.size_bytes) || 0), 0)

  return {
    tier,
    usedBytes,
    limitBytes: getStorageLimit(tier),
  }
}

export async function requireProjectSourceUploadContext(
  projectId: string,
  input: {
    assetId?: unknown
    contentType?: unknown
    filename?: unknown
    sizeBytes?: unknown
  },
): Promise<ProjectSourceUploadContext | { error: string; status: number }> {
  const filename = normalizeSourceFilename(input.filename)
  const contentType = normalizeSourceContentType(input.contentType, filename)
  const sizeBytes = normalizeSourceSizeBytes(input.sizeBytes)
  const validationError = validateProjectSourceUploadInput({ contentType, filename, sizeBytes })

  if (validationError) {
    return { error: validationError, status: 400 }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const project = await ProjectService.getProject(projectId)
  if (!project) {
    return { error: 'Project not found', status: 404 }
  }

  const quota = await getUserStorageQuota(user.id)
  if (quota.usedBytes + sizeBytes > quota.limitBytes) {
    return {
      error: `Storage limit exceeded. Your ${quota.tier} plan includes ${formatStorage(quota.limitBytes)}. You are using ${formatStorage(quota.usedBytes)}, and this upload is ${formatStorage(sizeBytes)}.`,
      status: 413,
    }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const providedAssetId = typeof input.assetId === 'string' ? input.assetId : ''
  const assetId = uuidRegex.test(providedAssetId) ? providedAssetId : crypto.randomUUID()
  const bucket = (process.env.R2_BUCKET_SOURCES || process.env.R2_BUCKET_SOURCES_3 || process.env.R2_BUCKET_SOURCES_2 || 'prometheus-sources').trim()
  const key = R2Keys.sourceAsset(user.id, projectId, assetId, filename)

  return {
    assetId,
    bucket,
    contentType,
    filename,
    key,
    projectId,
    sizeBytes,
    userId: user.id,
  }
}

export async function requireOwnedProjectSourceKey(projectId: string, key: unknown) {
  if (typeof key !== 'string' || !key.trim()) {
    return { error: 'Missing object key.', status: 400 } as const
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized', status: 401 } as const
  }

  const project = await ProjectService.getProject(projectId)
  if (!project) {
    return { error: 'Project not found', status: 404 } as const
  }

  const allowedPrefix = `users/${user.id}/projects/${projectId}/sources/`
  if (!key.startsWith(allowedPrefix)) {
    return { error: 'Forbidden', status: 403 } as const
  }

  return {
    bucket: (process.env.R2_BUCKET_SOURCES || process.env.R2_BUCKET_SOURCES_3 || process.env.R2_BUCKET_SOURCES_2 || 'prometheus-sources').trim(),
    key,
    projectId,
    userId: user.id,
  }
}
