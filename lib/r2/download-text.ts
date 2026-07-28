import { GetObjectCommand } from "@aws-sdk/client-s3";

import { r2Client } from "./client";

/**
 * Reads a UTF-8 text object from R2. Returns null instead of throwing so
 * callers (chat context, previews) can silently degrade when storage or
 * credentials are unavailable. Server-side only.
 */
export async function downloadTextFromR2(bucket: string, key: string, maxChars = 64_000): Promise<string | null> {
  if (!bucket || !key) return null;

  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const body = response.Body;
    if (!body) return null;
    const text = await body.transformToString("utf-8");
    if (text.length > maxChars) {
      return text.slice(0, maxChars);
    }
    return text;
  } catch (error) {
    console.warn("[lib/r2/download-text] failed to read object", { key, error });
    return null;
  }
}
