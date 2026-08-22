import "server-only";

export const runtime = "nodejs";

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";

function getApiKey() {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return null;
  return key;
}

/**
 * POST: upload audio → start transcription → return immediately.
 * If the transcript finishes within a short sync budget the text is returned
 * inline; otherwise the caller polls GET ?transcriptId=... for the result.
 * This avoids holding a serverless function open for the entire poll loop.
 */
export async function POST(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json({ error: "ASSEMBLYAI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return Response.json({ error: "No audio file provided." }, { status: 400 });
    }

    if (audioFile.size < 256) {
      return Response.json({ error: "Audio is too short to transcribe." }, { status: 400 });
    }

    // 1. Upload audio to AssemblyAI
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(20_000),
    });
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return Response.json({ error: `Upload failed: ${errorText}` }, { status: 502 });
    }
    const { upload_url } = await uploadResponse.json() as { upload_url: string };

    // 2. Start transcription with the correct model params:
    //    speech_models (array, NOT the deprecated singular speech_model).
    //    The default ["universal-3-5-pro", "universal-2"] is the documented
    //    default — universal-3-5-pro handles 18 languages with language_detection,
    //    falling back to universal-2 for the rest.
    const transcriptResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: false,
        punctuate: true,
        format_text: true,
        speech_models: ["universal-3-5-pro", "universal-2"],
        language_detection: true,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      return Response.json({ error: `Transcription start failed: ${errorText}` }, { status: 502 });
    }
    const { id } = await transcriptResponse.json() as { id: string };

    // 3. Quick sync poll (5s budget = fits within Vercel hobby 10s limit).
    //    Short voice clips typically complete within 2–4s. If not, we return
    //    the transcriptId and the caller polls GET ?transcriptId=... instead.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${id}`, {
        headers: { "Authorization": apiKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!pollResponse.ok) break;
      const transcript = await pollResponse.json() as { status: string; text?: string; error?: string };
      if (transcript.status === "completed") {
        return Response.json({ text: transcript.text ?? "" });
      }
      if (transcript.status === "error") {
        return Response.json({ error: transcript.error ?? "Transcription failed." }, { status: 502 });
      }
    }

    // Still processing — hand off to the caller for async polling.
    return Response.json({ status: "processing", transcriptId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcription error.";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * GET: poll the status of an in-flight AssemblyAI transcription.
 * Called by the client when POST returned {status:"processing", transcriptId}.
 * Returns the same shape as POST on completion.
 */
export async function GET(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json({ error: "ASSEMBLYAI_API_KEY is not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const transcriptId = searchParams.get("transcriptId");
  if (!transcriptId) {
    return Response.json({ error: "transcriptId query parameter is required." }, { status: 400 });
  }

  try {
    const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
      headers: { "Authorization": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!pollResponse.ok) {
      return Response.json({ error: "Polling failed." }, { status: 502 });
    }
    const transcript = await pollResponse.json() as { status: string; text?: string; error?: string };
    if (transcript.status === "completed") {
      return Response.json({ text: transcript.text ?? "" });
    }
    if (transcript.status === "error") {
      return Response.json({ error: transcript.error ?? "Transcription failed." }, { status: 502 });
    }
    return Response.json({ status: "processing", transcriptId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcription error.";
    return Response.json({ error: message }, { status: 500 });
  }
}