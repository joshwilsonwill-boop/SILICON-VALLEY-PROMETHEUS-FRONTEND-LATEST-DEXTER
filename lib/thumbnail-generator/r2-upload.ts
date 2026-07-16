/**
 * R2 Storage Integration for Generated Thumbnails
 * Uploads thumbnails with automatic expiration
 */

import { PutObjectCommand, S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

type ThumbnailR2Config = {
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  bucketName?: string
  publicBaseUrl?: string
}

let thumbnailR2Client: S3Client | null = null
let cachedConfig: ThumbnailR2Config | null = null

/**
 * Get R2 configuration for thumbnail storage
 */
function getThumbnailR2Config(): ThumbnailR2Config {
  if (cachedConfig) return cachedConfig

  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined)
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_THUMBNAIL_BUCKET || process.env.R2_BUCKET
  const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL

  cachedConfig = {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  }

  return cachedConfig
}

/**
 * Create or get R2 client
 */
function getThumbnailR2Client(): S3Client {
  if (thumbnailR2Client) return thumbnailR2Client

  const config = getThumbnailR2Config()

  if (!config.endpoint) {
    throw new Error(
      "[thumbnail-r2] R2_ENDPOINT not configured. Thumbnail uploads will fail.",
    )
  }

  thumbnailR2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId || "missing",
      secretAccessKey: config.secretAccessKey || "missing",
    },
  })

  return thumbnailR2Client
}

/**
 * Build object key for thumbnail storage
 */
export function buildThumbnailObjectKey(
  projectId: string,
  thumbnailId: string,
): string {
  const timestamp = Date.now()
  return `thumbnails/${projectId}/${timestamp}-${thumbnailId}.png`
}

/**
 * Upload thumbnail to R2
 */
export async function uploadThumbnailToR2(
  projectId: string,
  thumbnailId: string,
  imageData: string, // base64 or buffer
  contentType: string = "image/png",
): Promise<{
  success: boolean
  key?: string
  publicUrl?: string
  signedUrl?: string
  error?: string
}> {
  try {
    const config = getThumbnailR2Config()

    if (!config.bucketName) {
      return {
        success: false,
        error: "R2_THUMBNAIL_BUCKET not configured",
      }
    }

    const client = getThumbnailR2Client()
    const key = buildThumbnailObjectKey(projectId, thumbnailId)

    // Convert base64 to buffer if needed
    let buffer: Buffer
    if (imageData.startsWith("data:")) {
      const base64String = imageData.split(",")[1]
      buffer = Buffer.from(base64String, "base64")
    } else {
      buffer = Buffer.from(imageData, "base64")
    }

    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Optional: Set cache control for CDN
      CacheControl: "public, max-age=86400", // 24 hours
    })

    await client.send(command)

    // Build public URL
    const publicUrl = config.publicBaseUrl
      ? `${config.publicBaseUrl}/${key}`
      : undefined

    // Generate signed URL (24-hour expiry)
    const getCommand = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })

    const signedUrl = await getSignedUrl(client as any, getCommand, {
      expiresIn: 86400, // 24 hours
    })

    return {
      success: true,
      key,
      publicUrl,
      signedUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

/**
 * Upload multiple thumbnails to R2
 */
export async function uploadThumbnailsToR2(
  projectId: string,
  thumbnails: Array<{
    id: string
    data: string
  }>,
): Promise<
  Array<{
    id: string
    success: boolean
    key?: string
    publicUrl?: string
    signedUrl?: string
    error?: string
  }>
> {
  return Promise.all(
    thumbnails.map(async (thumb) => {
      const result = await uploadThumbnailToR2(projectId, thumb.id, thumb.data)
      return {
        id: thumb.id,
        ...result,
      }
    }),
  )
}

/**
 * Get configuration validation error if any
 */
export function getThumbnailR2ConfigError(): string | null {
  const config = getThumbnailR2Config()
  const missing: string[] = []

  if (!config.endpoint) missing.push("R2_ENDPOINT")
  if (!config.accessKeyId) missing.push("R2_ACCESS_KEY_ID")
  if (!config.secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY")
  if (!config.bucketName) missing.push("R2_THUMBNAIL_BUCKET or R2_BUCKET")
  if (!config.publicBaseUrl) missing.push("R2_PUBLIC_URL or R2_PUBLIC_BASE_URL")

  if (missing.length === 0) return null

  return `Thumbnail R2 storage not configured: ${missing.join(", ")}`
}
