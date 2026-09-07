import { unsealToken, burnToken } from "@/lib/crypto/token-vault";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * Chunk size for resumable uploads. Must be a multiple of 256 KB per YouTube
 * requirements. 8 MB balances throughput vs. retry cost on flaky links.
 */
const RESUMABLE_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_STATUS_RETRIES = 3;

export type YouTubeUploadProgress = {
  uploadedBytes: number
  totalBytes: number | null
  fraction: number | null
}

type YouTubeMetadata = { title: string; description: string; tags: string[] };

export async function uploadToYouTube(
  userId: string,
  videoUrl: string,
  metadata: YouTubeMetadata,
  onProgress?: (progress: YouTubeUploadProgress) => void,
) {
  const provider = "youtube";
  const supabase = await createClient();
  const { data: connection } = await supabase.from("user_connections")
    .select("*").eq("user_id", userId).eq("provider", provider).single();

  if (!connection) throw new Error("YouTube not connected");

  await logAudit(userId, "token_decrypted", provider, true);
  const accessToken = await unsealToken({
    ciphertext: connection.encrypted_access_token,
    iv: connection.iv,
    keyVersion: connection.key_version
  });

  try {
    // Step 1: Initiate a resumable upload session with the video metadata.
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags,
            categoryId: "22"
          },
          status: {
            privacyStatus: "private",
            selfDeclaredMadeForKids: false
          },
        }),
      },
    );

    if (!initRes.ok) {
      const errorData = await initRes.json().catch(() => null);
      throw new Error(errorData?.error?.message || "Failed to open YouTube resumable upload session");
    }

    const sessionUrl = initRes.headers.get("location");
    if (!sessionUrl) {
      throw new Error("YouTube resumable upload session did not return a session URL");
    }

    // Step 2: Stream the source bytes through the resumable session in chunks,
    // so exports larger than available memory or the single-request timeout
    // window complete reliably.
    const videoRes = await fetch(videoUrl, { cache: "no-store" });
    if (!videoRes.ok || !videoRes.body) {
      throw new Error("Could not read the rendered export for upload");
    }

    const contentLengthHeader = videoRes.headers.get("content-length");
    const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : null;

    const videoId = await streamResumableUpload({
      sessionUrl,
      body: videoRes.body,
      totalBytes,
      contentType: videoRes.headers.get("content-type") || "video/mp4",
      onProgress,
    });

    await logAudit(userId, "export_completed", provider, true);
    return { success: true, videoId };
  } catch (err: any) {
    await logAudit(userId, "export_completed", provider, false, err.message);
    throw err;
  } finally {
    burnToken(accessToken);
  }
}

async function streamResumableUpload({
  sessionUrl,
  body,
  totalBytes,
  contentType,
  onProgress,
}: {
  sessionUrl: string;
  body: ReadableStream<Uint8Array>;
  totalBytes: number | null;
  contentType: string;
  onProgress?: (progress: YouTubeUploadProgress) => void;
}): Promise<string> {
  const reader = body.getReader();
  let uploadedBytes = 0;
  let videoId: string | null = null;

  const report = () => {
    onProgress?.({
      uploadedBytes,
      totalBytes,
      fraction: totalBytes ? Math.min(1, uploadedBytes / totalBytes) : null,
    });
  };

  const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    if (a.length === 0) return b;
    if (b.length === 0) return a;
    const merged = new Uint8Array(a.length + b.length);
    merged.set(a, 0);
    merged.set(b, a.length);
    return merged;
  };

  /**
   * Sends one chunk (the final chunk of the file when `isFinalChunk`).
   * Returns true when the session confirmed completion, false when part of
   * the chunk remains unconfirmed (caller re-queues it).
   */
  const flushChunk = async (chunk: Uint8Array, isFinalChunk: boolean): Promise<{ complete: boolean; unconfirmed: Uint8Array }> => {
    let offset = 0;
    for (let attempt = 0; attempt <= MAX_STATUS_RETRIES; attempt += 1) {
      const slice = chunk.subarray(offset);
      if (slice.length === 0) return { complete: false, unconfirmed: chunk.subarray(offset) };

      const rangeEnd = uploadedBytes + slice.length - 1;
      const declaredTotal = isFinalChunk && totalBytes !== null ? String(totalBytes) : "*";
      const res = await fetch(sessionUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(slice.length),
          "Content-Range": `bytes ${uploadedBytes}-${rangeEnd}/${declaredTotal}`,
          "Content-Type": contentType,
        },
        body: slice as unknown as BodyInit,
        cache: "no-store",
      });

      if (res.status === 308) {
        // Partial acceptance: Google reports how many bytes it actually has.
        const rangeHeader = res.headers.get("range");
        const receivedEnd = rangeHeader ? Number(rangeHeader.split("-")[1]) + 1 : rangeEnd + 1;
        offset = receivedEnd - uploadedBytes;
        uploadedBytes = receivedEnd;
        report();
        continue;
      }

      if (res.ok) {
        const payload = await res.json().catch(() => null) as { id?: unknown } | null;
        videoId = typeof payload?.id === "string" ? payload.id : null;
        uploadedBytes = totalBytes ?? rangeEnd + 1;
        report();
        return { complete: true, unconfirmed: new Uint8Array(0) };
      }

      if ((res.status >= 500 || res.status === 429) && attempt < MAX_STATUS_RETRIES) {
        // Transient failure: query the session for its authoritative offset,
        // then resume from there after a short backoff.
        await sleep(attempt * 800 + 400);
        const confirmedOffset = await queryUploadOffset(sessionUrl, totalBytes);
        if (confirmedOffset !== null && confirmedOffset > uploadedBytes - offset) {
          offset = confirmedOffset - (uploadedBytes - offset);
          uploadedBytes = confirmedOffset;
        }
        report();
        continue;
      }

      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error?.message || `YouTube resumable upload failed (HTTP ${res.status})`);
    }

    return { complete: false, unconfirmed: chunk.subarray(offset) };
  };

  let pending: Uint8Array = new Uint8Array(0);
  let reachedSourceEnd = false;

  while (!reachedSourceEnd) {
    const { value, done: sourceDone } = await reader.read();
    if (value?.length) pending = concat(pending, value);
    if (sourceDone) reachedSourceEnd = true;

    if (!reachedSourceEnd && pending.length >= RESUMABLE_CHUNK_SIZE) {
      const chunk = pending.subarray(0, RESUMABLE_CHUNK_SIZE);
      const rest = pending.subarray(RESUMABLE_CHUNK_SIZE);
      const result = await flushChunk(chunk, false);
      if (result.complete) {
        await reader.cancel().catch(() => {});
        return videoId ?? "";
      }
      pending = concat(result.unconfirmed, rest);
    }
  }

  // Source exhausted: flush whatever remains as the final chunk.
  while (true) {
    if (pending.length === 0) break;
    const result = await flushChunk(pending, true);
    if (result.complete) break;
    if (result.unconfirmed.length === pending.length) {
      // Google confirmed no progress; avoid an infinite loop.
      break;
    }
    pending = result.unconfirmed;
  }

  if (!videoId) {
    // Session never confirmed completion — ask for the final status.
    videoId = await confirmUploadComplete(sessionUrl, totalBytes);
  }

  return videoId ?? "";
}

async function queryUploadOffset(sessionUrl: string, totalBytes: number | null): Promise<number | null> {
  try {
    const res = await fetch(sessionUrl, {
      method: "PUT",
      headers: {
        "Content-Length": "0",
        "Content-Range": `bytes */${totalBytes ?? "*"}`,
      },
      cache: "no-store",
    });
    if (res.status === 308) {
      const rangeHeader = res.headers.get("range");
      return rangeHeader ? Number(rangeHeader.split("-")[1]) + 1 : 0;
    }
    if (res.ok) return null;
    return null;
  } catch {
    return null;
  }
}

async function confirmUploadComplete(sessionUrl: string, totalBytes: number | null): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_STATUS_RETRIES; attempt += 1) {
    try {
      const res = await fetch(sessionUrl, {
        method: "PUT",
        headers: {
          "Content-Length": "0",
          "Content-Range": `bytes */${totalBytes ?? "*"}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const payload = await res.json().catch(() => null) as { id?: unknown } | null;
        return typeof payload?.id === "string" ? payload.id : null;
      }
      if (res.status < 500) return null;
    } catch {
      // Retry below.
    }
    await sleep(600 * (attempt + 1));
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
