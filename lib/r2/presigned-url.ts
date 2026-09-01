import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "./client";
import { r2SigningClockOffset } from './signing-clock';

const EXPIRE_IN_SECONDS = 3600; // 1 hour
const CLOCK_OFFSET_CACHE_MS = 5 * 60 * 1000
let cachedClockOffset: { value: number | null; checkedAt: number } | null = null

async function r2SigningDate() {
  const now = Date.now()
  if (cachedClockOffset && now - cachedClockOffset.checkedAt < CLOCK_OFFSET_CACHE_MS) {
    return cachedClockOffset.value === null ? undefined : new Date(now + cachedClockOffset.value)
  }

  const accountId = (process.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID_3 || process.env.R2_ACCOUNT_ID_2)?.trim()
  if (!accountId) return undefined

  try {
    // R2 returns a Date header even for this unauthenticated request. It lets
    // presigning remain valid when a local development machine has clock drift.
    const response = await fetch(`https://${accountId}.r2.cloudflarestorage.com`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3_000),
    })
    const offset = r2SigningClockOffset(response.headers.get('date'), now)
    cachedClockOffset = { value: offset, checkedAt: now }
    if (offset !== null) {
      console.warn(`[r2] Local clock differs from R2 by ${Math.round(offset / 1000)} seconds; compensating signed URLs.`)
      return new Date(Date.now() + offset)
    }
  } catch {
    // Fall back to the system clock. Production hosts should already be NTP-synchronized.
  }

  cachedClockOffset = { value: null, checkedAt: now }
  return undefined
}

export async function getPresignedPutUrl(bucket: string, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const signingDate = await r2SigningDate()
  const url = await getSignedUrl(r2Client as any, command, { expiresIn: EXPIRE_IN_SECONDS, ...(signingDate ? { signingDate } : {}) });
  return url;
}

export async function getPresignedGetUrl(bucket: string, key: string, dispositionOrFilename?: string) {
  const responseContentDisposition = dispositionOrFilename && !dispositionOrFilename.includes('attachment')
    ? `attachment; filename="${dispositionOrFilename}"`
    : dispositionOrFilename;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: responseContentDisposition,
  });

  const signingDate = await r2SigningDate()
  const url = await getSignedUrl(r2Client as any, command, { expiresIn: EXPIRE_IN_SECONDS, ...(signingDate ? { signingDate } : {}) });
  return url;
}
