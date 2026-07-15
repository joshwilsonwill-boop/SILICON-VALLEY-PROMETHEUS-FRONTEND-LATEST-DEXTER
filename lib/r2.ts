import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type AvatarKeyOptions = {
  now?: number
  randomToken?: string
}

type AvatarUploadUrlOptions = {
  key: string
  contentType: string
  contentLength: number
}

let hasWarnedAboutAvatarR2Config = false

function warnAvatarR2Config(message: string) {
  if (hasWarnedAboutAvatarR2Config) return
  hasWarnedAboutAvatarR2Config = true
  console.warn(message)
}

function getAvatarR2Config() {
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_AVATAR_BUCKET
  const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL

  const missing: string[] = []
  if (!endpoint) missing.push('R2_ENDPOINT')
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!publicBaseUrl) missing.push('R2_PUBLIC_URL')

  if (missing.length > 0) {
    warnAvatarR2Config(
      `[avatar-r2] Missing environment variables: ${missing.join(', ')}. Avatar uploads will fail until they are configured.`,
    )
  }

  return {
    endpoint,
    accessKeyId: accessKeyId || 'missing',
    secretAccessKey: secretAccessKey || 'missing',
    bucketName,
    publicBaseUrl: publicBaseUrl || '',
    missing,
  }
}

function createAvatarR2Client() {
  const config = getAvatarR2Config()
  if (!config.endpoint) throw new Error('R2_ENDPOINT not set')
  if (!config.bucketName) throw new Error('R2_AVATAR_BUCKET not set')

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

const avatarR2Client = createAvatarR2Client()

export function getAvatarR2ConfigError() {
  const config = getAvatarR2Config()
  if (config.missing.length === 0) return null

  return `Avatar upload storage is not configured: ${config.missing.join(', ')}`
}

export function buildAvatarObjectKey(userId: string, options: AvatarKeyOptions = {}) {
  const now = options.now ?? Date.now()
  const randomToken =
    options.randomToken ?? crypto.randomUUID().replaceAll('-', '').slice(0, 10)

  return `avatars/${userId}/${now}-${randomToken}.webp`
}

export async function getAvatarUploadUrl({
  key,
  contentType,
  contentLength,
}: AvatarUploadUrlOptions) {
  const config = getAvatarR2Config()

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })

  return getSignedUrl(avatarR2Client as any, command, { expiresIn: 300 })
}

export function getAvatarPublicUrl(key: string) {
  const config = getAvatarR2Config()
  const base = config.publicBaseUrl.replace(/\/+$/, '')
  return `${base}/${key}`
}

export async function uploadAvatarObject({
  body,
  contentType,
  key,
}: {
  body: Uint8Array
  contentType: string
  key: string
}) {
  const config = getAvatarR2Config()
  if (config.missing.length > 0) throw new Error(`Avatar upload storage is not configured: ${config.missing.join(', ')}`)

  try {
    const result = await avatarR2Client.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }))
    console.log('[R2] Upload success:', config.bucketName, key, {
      etag: result.ETag ?? null,
      versionId: result.VersionId ?? null,
    })
    return result
  } catch (error) {
    console.error('[R2] Upload FAILED:', config.bucketName, key, error)
    throw error
  }
}
