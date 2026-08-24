import "server-only";
import { assemblyTranscriptToSegments } from "@/lib/r2/assembly-transcript";

export const runtime = "nodejs";

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";
const GROQ_AUDIO_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const OPENAI_AUDIO_URL = "https://api.openai.com/v1/audio/transcriptions";

function getAssemblyAiKey() {
  const key = process.env.ASSEMBLYAI_API_KEY?.trim();
  return key || null;
}

function getGroqKey() {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || null;
}

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

async function transcribeWithGroq(audioFile: File, apiKey: string): Promise<{ text: string; segments?: any[] }> {
  const formData = new FormData();
  formData.append("file", audioFile, audioFile.name || "voice.webm");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");

  const res = await fetch(GROQ_AUDIO_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq Whisper error: ${errorText}`);
  }

  const data = (await res.json()) as { text?: string; segments?: Array<{ id?: number | string; start: number; end: number; text: string }> };
  const rawSegments = data.segments || [];
  const segments = rawSegments.map((s, idx) => ({
    id: String(s.id ?? `seg-${idx + 1}`),
    startMs: Math.round(s.start * 1000),
    endMs: Math.round(s.end * 1000),
    text: s.text.trim(),
  }));

  return {
    text: (data.text || "").trim(),
    segments,
  };
}

async function transcribeWithOpenAI(audioFile: File, apiKey: string): Promise<{ text: string; segments?: any[] }> {
  const formData = new FormData();
  formData.append("file", audioFile, audioFile.name || "voice.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const res = await fetch(OPENAI_AUDIO_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI Whisper error: ${errorText}`);
  }

  const data = (await res.json()) as { text?: string; segments?: Array<{ id?: number | string; start: number; end: number; text: string }> };
  const rawSegments = data.segments || [];
  const segments = rawSegments.map((s, idx) => ({
    id: String(s.id ?? `seg-${idx + 1}`),
    startMs: Math.round(s.start * 1000),
    endMs: Math.round(s.end * 1000),
    text: s.text.trim(),
  }));

  return {
    text: (data.text || "").trim(),
    segments,
  };
}

async function transcribeWithAssemblyAI(audioFile: File, apiKey: string): Promise<{ text?: string; transcriptId?: string; segments?: any[] }> {
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
    throw new Error(`AssemblyAI upload error: ${errorText}`);
  }

  const { upload_url } = (await uploadResponse.json()) as { upload_url: string };

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
    throw new Error(`AssemblyAI transcript start error: ${errorText}`);
  }

  const { id } = (await transcriptResponse.json()) as { id: string };

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const pollResponse = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${id}`, {
      headers: { "Authorization": apiKey },
      signal: AbortSignal.timeout(8_000),
    });
    if (!pollResponse.ok) break;
    const transcript = (await pollResponse.json()) as Record<string, unknown> & { status: string; text?: string; error?: string };
    if (transcript.status === "completed") {
      const segments = assemblyTranscriptToSegments(transcript);
      return { text: transcript.text ?? "", segments };
    }
    if (transcript.status === "error") {
      throw new Error(transcript.error ?? "AssemblyAI transcription failed.");
    }
  }

  return { transcriptId: id };
}

export async function POST(request: Request) {
  const assemblyKey = getAssemblyAiKey();
  const groqKey = getGroqKey();
  const openAiKey = getOpenAiKey();

  if (!assemblyKey && !groqKey && !openAiKey) {
    return Response.json(
      { error: "No transcription API key (AssemblyAI, Groq, or OpenAI) is configured on the server." },
      { status: 503 }
    );
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

    // 1. Groq Whisper (lightning-fast, ~300ms)
    if (groqKey) {
      try {
        const groqResult = await transcribeWithGroq(audioFile, groqKey);
        if (groqResult.text) {
          return Response.json({ text: groqResult.text, segments: groqResult.segments ?? [] });
        }
      } catch (groqErr) {
        console.warn("[transcribe] Groq Whisper failed, falling back:", groqErr);
      }
    }

    // 2. AssemblyAI
    if (assemblyKey) {
      try {
        const result = await transcribeWithAssemblyAI(audioFile, assemblyKey);
        if (result.text !== undefined) {
          return Response.json({ text: result.text, segments: result.segments ?? [] });
        }
        if (result.transcriptId) {
          return Response.json({ status: "processing", transcriptId: result.transcriptId });
        }
      } catch (assemblyErr) {
        console.warn("[transcribe] AssemblyAI failed, falling back:", assemblyErr);
      }
    }

    // 3. OpenAI Whisper
    if (openAiKey) {
      try {
        const openAiResult = await transcribeWithOpenAI(audioFile, openAiKey);
        if (openAiResult.text) {
          return Response.json({ text: openAiResult.text, segments: openAiResult.segments ?? [] });
        }
      } catch (openAiErr) {
        console.warn("[transcribe] OpenAI Whisper failed:", openAiErr);
      }
    }

    return Response.json({ error: "Transcription failed across configured providers." }, { status: 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcription error.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const apiKey = getAssemblyAiKey();
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
    const transcript = (await pollResponse.json()) as Record<string, unknown> & { status: string; text?: string; error?: string };
    if (transcript.status === "completed") {
      const segments = assemblyTranscriptToSegments(transcript);
      return Response.json({ text: transcript.text ?? "", segments });
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