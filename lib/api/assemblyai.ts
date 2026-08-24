/**
 * AssemblyAI Server-side Utility
 * Handles transcription job initiation and status checks.
 * NEVER use this in client-side code.
 */

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2'
const ASSEMBLYAI_START_TIMEOUT_MS = 25_000
const ASSEMBLYAI_STATUS_TIMEOUT_MS = 10_000

export interface AssemblyAITranscriptionOptions {
  audio_url: string
  speaker_labels?: boolean
  punctuate?: boolean
  format_text?: boolean
  speech_models?: string[]
}

export interface AssemblyAITranscriptionResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  text?: string
  error?: string
}

/**
 * Initiates a transcription job with AssemblyAI.
 */
export async function startAssemblyAITranscription(options: AssemblyAITranscriptionOptions): Promise<AssemblyAITranscriptionResponse> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is missing in environment variables.')
  }

  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: options.audio_url,
      speaker_labels: options.speaker_labels ?? false,
      punctuate: options.punctuate ?? true,
      format_text: options.format_text ?? true,
      ...(options.speech_models ? { speech_models: options.speech_models } : {}),
    }),
    signal: AbortSignal.timeout(ASSEMBLYAI_START_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`AssemblyAI API Error (${response.status}): ${errorBody}`)
  }

  return response.json()
}

/**
 * Checks the status of an existing transcription job.
 */
export async function getAssemblyAITranscriptionStatus(jobId: string): Promise<AssemblyAITranscriptionResponse> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is missing in environment variables.')
  }

  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': apiKey,
    },
    signal: AbortSignal.timeout(ASSEMBLYAI_STATUS_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`AssemblyAI API Error (${response.status}): ${errorBody}`)
  }

  return response.json()
}
