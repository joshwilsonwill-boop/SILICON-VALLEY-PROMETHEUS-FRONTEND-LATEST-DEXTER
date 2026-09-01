/**
 * AssemblyAI Server-side Utility
 * Handles transcription job initiation and status checks.
 * NEVER use this in client-side code.
 */

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2'
const ASSEMBLYAI_START_TIMEOUT_MS = 30_000
const ASSEMBLYAI_STATUS_TIMEOUT_MS = 20_000

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

export function getAssemblyAiApiKeys(): string[] {
  const keys = [
    process.env.ASSEMBLYAI_API_KEY,
    process.env.ASSEMBLYAI_API_KEY_3,
    process.env.ASSEMBLYAI_API_KEY_2,
    process.env.ASSEMBLYAI_API_KEY_1,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k))

  return Array.from(new Set(keys))
}

/**
 * Initiates a transcription job with AssemblyAI.
 */
export async function startAssemblyAITranscription(options: AssemblyAITranscriptionOptions): Promise<AssemblyAITranscriptionResponse> {
  const apiKeys = getAssemblyAiApiKeys()
  if (apiKeys.length === 0) {
    throw new Error('ASSEMBLYAI_API_KEY is missing in environment variables.')
  }

  let lastError: Error | null = null

  for (const apiKey of apiKeys) {
    try {
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

      if (response.ok) {
        return response.json()
      }

      const errorBody = await response.text()
      lastError = new Error(`AssemblyAI API Error (${response.status}): ${errorBody}`)
      // If 401/403 (invalid key), try the next key in the list
      if (response.status === 401 || response.status === 403) {
        continue
      }
      throw lastError
    } catch (err) {
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('Failed to dispatch AssemblyAI transcription with available keys.')
}

/**
 * Checks the status of an existing transcription job.
 */
export async function getAssemblyAITranscriptionStatus(jobId: string): Promise<AssemblyAITranscriptionResponse> {
  const apiKeys = getAssemblyAiApiKeys()
  if (apiKeys.length === 0) {
    throw new Error('ASSEMBLYAI_API_KEY is missing in environment variables.')
  }

  let lastError: Error | null = null

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': apiKey,
        },
        signal: AbortSignal.timeout(ASSEMBLYAI_STATUS_TIMEOUT_MS),
      })

      if (response.ok) {
        return response.json()
      }

      const errorBody = await response.text()
      lastError = new Error(`AssemblyAI API Error (${response.status}): ${errorBody}`)
      if (response.status === 401 || response.status === 403) {
        continue
      }
      throw lastError
    } catch (err) {
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError ?? new Error('Failed to fetch AssemblyAI transcription status.')
}
