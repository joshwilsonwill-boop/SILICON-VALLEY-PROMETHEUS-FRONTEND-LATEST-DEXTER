/** Keep the JSON upload below common serverless request body limits. */
export const MAX_THUMBNAIL_REQUEST_BYTES = 3_800_000

export function getThumbnailRequestByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

export function isThumbnailRequestWithinBudget(value: unknown): boolean {
  return getThumbnailRequestByteLength(value) <= MAX_THUMBNAIL_REQUEST_BYTES
}
