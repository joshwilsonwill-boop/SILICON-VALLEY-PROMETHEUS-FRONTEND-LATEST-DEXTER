import "server-only";

export const runtime = "nodejs";

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";

export async function POST(request: Request) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ASSEMBLYAI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return Response.json({ error: "No audio file provided." }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const uploadResponse = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return Response.json({ error: `Upload failed: ${errorText}` }, { status: 502 });
    }

    const { upload_url } = await uploadResponse.json() as { upload_url: string };

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
        speech_models: ["universal-3-pro", "universal-2"],
        language_detection: true,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      return Response.json({ error: `Transcription failed: ${errorText}` }, { status: 502 });
    }

    const { id } = await transcriptResponse.json() as { id: string };

    let transcript: { status: string; text?: string; error?: string } | null = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${id}`, {
        headers: { "Authorization": apiKey },
      });
      if (!pollResponse.ok) {
        return Response.json({ error: "Polling failed." }, { status: 502 });
      }
      transcript = await pollResponse.json() as { status: string; text?: string; error?: string };
      if (transcript.status === "completed" || transcript.status === "error") break;
    }

    if (!transcript) {
      return Response.json({ error: "Transcription timed out." }, { status: 502 });
    }
    if (transcript.status === "error") {
      return Response.json({ error: transcript.error ?? "Transcription failed." }, { status: 502 });
    }

    return Response.json({ text: transcript.text ?? "" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcription error.";
    return Response.json({ error: message }, { status: 500 });
  }
}