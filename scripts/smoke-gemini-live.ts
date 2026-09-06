import { GeminiLiveClient } from '../lib/voice-companion/gemini-live-client'

type SessionResponse = {
  wsUrl: string
  wsUrls?: string[]
  model?: string
  voiceName?: string
}

async function main() {
  const sessionEndpoint = process.argv[2] || 'http://localhost:3100/api/voice-companion/session'
  const response = await fetch(sessionEndpoint, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Voice session endpoint returned HTTP ${response.status}.`)

  const session = await response.json() as SessionResponse
  let audioChunks = 0
  let audioBytes = 0
  let completed = false
  let resolveResult: () => void = () => {}
  let rejectResult: (error: Error) => void = () => {}
  const result = new Promise<void>((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
  })
  let timeout: ReturnType<typeof setTimeout>
  const finish = (callback: () => void) => {
    if (completed) return
    completed = true
    clearTimeout(timeout)
    callback()
  }
  timeout = setTimeout(
    () => finish(() => rejectResult(new Error('Gemini Live returned no completed audio turn within 30 seconds.'))),
    30_000,
  )

  const client = new GeminiLiveClient(session, {
    onAudio: (base64Pcm) => {
      audioChunks += 1
      audioBytes += Math.floor((base64Pcm.length * 3) / 4)
    },
    onTurnComplete: () => finish(() => {
      if (audioChunks === 0) {
        rejectResult(new Error('Gemini Live completed the turn without native audio.'))
        return
      }
      resolveResult()
    }),
    onError: (error) => finish(() => rejectResult(error)),
    onClose: (code, reason) => {
      if (!completed) finish(() => rejectResult(new Error(`Gemini Live closed before audio completion (${code}: ${reason || 'no reason'}).`)))
    },
  })

  void client.connect()
    .then(() => client.sendContextText('Reply with one short spoken sentence confirming that Jarvis voice output works.'))
    .catch((error) => finish(() => rejectResult(error)))

  try {
    await result
  } finally {
    client.disconnect()
  }
  console.info(JSON.stringify({ event: 'gemini-live-audio-received', audioChunks, audioBytes }))
}

void main()
