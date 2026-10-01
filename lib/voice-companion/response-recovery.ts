import { appendTranscriptText } from './transcription'

export type ResponseStatus = 'streaming' | 'complete' | 'interrupted' | 'partial'
export interface RetainedTranscript {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
  status?: ResponseStatus
}

/** Turn boundaries and received PCM are retained independently of the socket. */
export class ResponseRecovery {
  private transcripts: RetainedTranscript[] = []
  private active: Partial<Record<'user' | 'assistant', string>> = {}
  private sequence = 0
  private audio: string[] = []
  private audioBytes = 0
  private audioTurnId: string | null = null
  private audioTruncated = false

  private begin(role: 'user' | 'assistant'): string {
    const existing = this.active[role]
    if (existing) return existing
    if (role === 'assistant') this.finishRole('user', 'complete')
    const id = `voice-${Date.now()}-${++this.sequence}`
    this.active[role] = id
    this.transcripts.push({ id, role, text: '', timestamp: Date.now(), status: 'streaming' })
    return id
  }

  append(text: string, isUser: boolean, finished = false): RetainedTranscript[] {
    const role = isUser ? 'user' : 'assistant'
    const id = this.begin(role)
    this.transcripts = this.transcripts.map((turn) => turn.id === id
      ? { ...turn, text: appendTranscriptText(turn.text, text) } : turn)
    if (finished && isUser) this.finishRole(role, 'complete')
    return this.snapshot()
  }

  addAudio(chunk: string): void {
    const id = this.begin('assistant')
    if (this.audioTurnId !== id) {
      this.audioTurnId = id
      this.audio = []
      this.audioBytes = 0
      this.audioTruncated = false
    }
    // Bound retained PCM to three minutes; keep a truthful partial replay.
    const bytes = Math.floor(chunk.length * 3 / 4)
    if (this.audioBytes + bytes > 24000 * 2 * 180) {
      this.audioTruncated = true
      return
    }
    this.audio.push(chunk)
    this.audioBytes += bytes
  }

  finishRole(role: 'user' | 'assistant', status: ResponseStatus): void {
    const id = this.active[role]
    if (!id) return
    this.transcripts = this.transcripts.map((turn) => turn.id === id ? { ...turn, status } : turn)
    delete this.active[role]
  }

  markRole(role: 'user' | 'assistant', status: ResponseStatus): void {
    const id = this.active[role]
    this.transcripts = this.transcripts.map((turn) => turn.id === id ? { ...turn, status } : turn)
  }

  finish(status: ResponseStatus = 'complete'): RetainedTranscript[] {
    this.finishRole('assistant', status)
    this.finishRole('user', status === 'complete' ? 'complete' : 'partial')
    return this.snapshot()
  }

  addUserMessage(text: string): RetainedTranscript[] {
    this.finish('interrupted')
    return this.append(text, true, true)
  }

  snapshot(): RetainedTranscript[] {
    return this.transcripts.filter((turn) => turn.text.length > 0).map((turn) => ({ ...turn }))
  }

  get replayAudio(): readonly string[] { return this.audio.slice() }
  get replayIsPartial(): boolean {
    const turn = this.transcripts.find((item) => item.id === this.audioTurnId)
    return this.audioTruncated || turn?.status !== 'complete'
  }
  get lastResponseText(): string {
    return [...this.transcripts].reverse().find((turn) => turn.role === 'assistant')?.text ?? ''
  }

  clear(): void {
    this.transcripts = []; this.active = {}; this.audio = []; this.audioTurnId = null
    this.audioBytes = 0; this.audioTruncated = false
  }
}
