import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { request as httpsRequest } from 'node:https'
import { r2Client } from "./client";
import { r2SigningClockOffset } from './signing-clock';

const EXPIRE_IN_SECONDS = 3600; // 1 hour
const CLOCK_OFFSET_CACHE_MS = 5 * 60 * 1000
let cachedClockOffset: { value: number | null; checkedAt: number } | null = null

async function r2ServerDateOverIpv4(accountId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = httpsRequest(
      `https://${accountId}.r2.cloudflarestorage.com`,
      { method: 'HEAD', family: 4, timeout: 3_000 },
      (response) => {
        response.resume()
        resolve(response.headers.date ?? null)
      },
    )
    request.once('timeout', () => request.destroy())
    request.once('error', () => resolve(null))
    request.end()
  })
}

async function r2SigningDate() {
  const now = Date.now()
  if (cachedClockOffset && now - cachedClockOffset.checkedAt < CLOCK_OFFSET_CACHE_MS) {
    return cachedClockOffset.value === null ? undefined : new Date(now + cachedClockOffset.value)
  }

  const accountId = (process.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID_3 || process.env.R2_ACCOUNT_ID_2)?.trim()
  if (!accountId) return undefined

  // R2 returns a Date header for unauthenticated requests. Pin this tiny
  // probe to IPv4 because the local development host can black-hole IPv6
  // requests before fetch's abort signal has a chance to fire.
  const serverDate = await r2ServerDateOverIpv4(accountId)
  const offset = r2SigningClockOffset(serverDate, now)
  cachedClockOffset = { value: offset, checkedAt: now }
  if (offset !== null) {
    console.warn(`[r2] Local clock differs from R2 by ${Math.round(offset / 1000)} seconds; compensating signed URLs.`)
    return new Date(Date.now() + offset)
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

export async function getPresignedGetUrl(
  bucket: string,
  key: string,
  dispositionOrFilename?: string,
  expiresIn: number = EXPIRE_IN_SECONDS,
) {
  const responseContentDisposition = dispositionOrFilename && !dispositionOrFilename.includes('attachment')
    ? `attachment; filename="${dispositionOrFilename}"`
    : dispositionOrFilename;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: responseContentDisposition,
  });

  const signingDate = await r2SigningDate()
  const url = await getSignedUrl(r2Client as any, command, { expiresIn, ...(signingDate ? { signingDate } : {}) });
  return url;
}
