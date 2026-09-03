'use client'

/**
 * Web Audio API helpers for Gemini Multimodal Live API.
 * - Input: Microphone captured, resampled to 16kHz 16-bit mono PCM, base64 encoded.
 * - Output: 24kHz 16-bit mono PCM decoded, scheduled seamlessly with intelligent barge-in gating.
 * - Acoustic Echo & Ducking: Prevents speaker output from falsely triggering Gemini server interruptions.
 */

let sharedAudioContext: AudioContext | null = null

/**
 * Synchronously prime/unlock the Web Audio context on a user click gesture.
 * MUST be called inside the synchronous event turn (before any async fetch/await).
 */
export function primeAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('Web Audio is only available in the browser.')
  }
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedAudioContext = new AudioContextClass()
  }
  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume()
  }
  return sharedAudioContext
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Downsamples audio buffer to target sample rate (e.g. 16kHz)
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) {
    return buffer
  }
  if (inputRate < outputRate) {
    return buffer
  }
  const sampleRateRatio = inputRate / outputRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
    }
    result[offsetResult] = accum / sampleRateRatio
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

/**
 * Converts Float32 [-1.0, 1.0] samples to 16-bit linear PCM little-endian
 */
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  let offset = 0
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

/**
 * Converts 16-bit linear PCM little-endian to Float32 [-1.0, 1.0]
 */
export function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const float32 = new Float32Array(pcmData.length)
  for (let i = 0; i < pcmData.length; i++) {
    float32[i] = pcmData[i] / (pcmData[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}

/**
 * Calculates RMS volume of Float32 audio chunk.
 */
function calculateRMS(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

export interface AudioRecorderOptions {
  getIsSpeaking?: () => boolean
}

// Barge-in tuning: echo bleed from speakers rarely exceeds these levels while a
// genuine user interruption sustains much louder energy across multiple frames.
const BARGE_IN_RMS_THRESHOLD = 0.085
const BARGE_IN_SUSTAINED_FRAMES = 3
const SILENCE_CHUNK_SAMPLES = 1600 // 100ms at 16kHz keeps server VAD stream continuous

/**
 * Manages microphone capture, resampling to 16kHz PCM, and audio emission.
 * Incorporates acoustic ducking to prevent speaker feedback from triggering false barge-ins.
 */
export class AudioRecorder {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private analyser: AnalyserNode | null = null
  private silentGain: GainNode | null = null
  private onAudioChunk: ((base64Chunk: string) => void) | null = null
  private isRecording = false
  private getIsSpeaking?: () => boolean
  private currentVolume = 0
  private bargeFrames = 0
  private silenceChunkBase64: string | null = null

  constructor(options?: AudioRecorderOptions) {
    this.getIsSpeaking = options?.getIsSpeaking
  }

  async start(onAudioChunk: (base64Chunk: string) => void): Promise<void> {
    if (this.isRecording) return
    this.onAudioChunk = onAudioChunk

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    })

    this.audioContext = primeAudioContext()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {})
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.5

    // Buffer size 4096 gives ~85ms chunks at 48kHz
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

    // Silent gain node to prevent mic loopback to speakers while keeping processor alive
    this.silentGain = this.audioContext.createGain()
    this.silentGain.gain.value = 0

    const inputSampleRate = this.audioContext.sampleRate
    const targetSampleRate = 16000

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isRecording) return
      const inputData = e.inputBuffer.getChannelData(0)
      const rms = calculateRMS(inputData)
      this.currentVolume = Math.min(1, rms * 4)

      // ACOUSTIC ECHO GATING (turn-aware, with silence-fill):
      // Browser echo cancellation does NOT cancel our own Web Audio speaker
      // output, so while the assistant turn is active we only transmit after
      // the user sustains clearly speech-level volume (deliberate barge-in).
      // Gated frames are replaced with digital silence instead of being
      // dropped, keeping the server VAD stream continuous and stable.
      const isAssistantSpeaking = this.getIsSpeaking?.() ?? false
      if (isAssistantSpeaking) {
        if (rms > BARGE_IN_RMS_THRESHOLD) {
          this.bargeFrames += 1
        } else {
          this.bargeFrames = 0
        }
        if (this.bargeFrames < BARGE_IN_SUSTAINED_FRAMES) {
          if (!this.silenceChunkBase64) {
            this.silenceChunkBase64 = arrayBufferToBase64(
              floatTo16BitPCM(new Float32Array(SILENCE_CHUNK_SAMPLES)),
            )
          }
          this.onAudioChunk?.(this.silenceChunkBase64)
          return
        }
      } else {
        this.bargeFrames = 0
      }

      const downsampled = downsampleBuffer(inputData, inputSampleRate, targetSampleRate)
      const pcmBuffer = floatTo16BitPCM(downsampled)
      const base64 = arrayBufferToBase64(pcmBuffer)
      this.onAudioChunk?.(base64)
    }

    this.source.connect(this.analyser)
    this.analyser.connect(this.processor)
    this.processor.connect(this.silentGain)
    this.silentGain.connect(this.audioContext.destination)
    this.isRecording = true
  }

  stop(): void {
    this.isRecording = false
    this.bargeFrames = 0
    this.silenceChunkBase64 = null
    this.processor?.disconnect()
    this.analyser?.disconnect()
    this.silentGain?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.processor = null
    this.analyser = null
    this.silentGain = null
    this.source = null
    this.stream = null
    this.audioContext = null
    this.onAudioChunk = null
    this.currentVolume = 0
  }

  getVolume(): number {
    return this.isRecording ? this.currentVolume : 0
  }
}

/**
 * Manages seamless playback of 24kHz PCM audio chunks with instant barge-in flush.
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private scheduledSources: AudioBufferSourceNode[] = []
  private nextPlayTime = 0
  private isPlaying = false
  private onPlaybackStateChange?: (playing: boolean) => void

  constructor(options?: { onPlaybackStateChange?: (playing: boolean) => void }) {
    this.onPlaybackStateChange = options?.onPlaybackStateChange
  }

  private initContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = primeAudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.4
      this.analyser.connect(this.audioContext.destination)
    }
    return this.audioContext
  }

  async resume(): Promise<void> {
    const ctx = this.initContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Remaining scheduled playback in milliseconds. Survives a barge-in flush so
   * echo gating can stay engaged for the rest of the assistant turn.
   */
  getPendingMs(): number {
    if (!this.audioContext) return 0
    return Math.max(0, (this.nextPlayTime - this.audioContext.currentTime) * 1000)
  }

  async playChunk(base64Audio: string): Promise<void> {
    const ctx = this.initContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const rawBuffer = base64ToArrayBuffer(base64Audio)
    const int16Length = Math.floor(rawBuffer.byteLength / 2)
    if (int16Length === 0) return

    const int16Array = new Int16Array(rawBuffer, 0, int16Length)
    const float32Array = pcm16ToFloat32(int16Array)

    // The AudioBuffer is 24kHz PCM from Gemini; AudioContext automatically resamples it to output rate
    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000)
    audioBuffer.getChannelData(0).set(float32Array)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer

    if (this.analyser) {
      source.connect(this.analyser)
    } else {
      source.connect(ctx.destination)
    }

    const currentTime = ctx.currentTime
    const startTime = Math.max(currentTime, this.nextPlayTime)
    source.start(startTime)
    this.nextPlayTime = startTime + audioBuffer.duration

    this.scheduledSources.push(source)
    if (!this.isPlaying) {
      this.isPlaying = true
      this.onPlaybackStateChange?.(true)
    }

    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source)
      if (idx !== -1) {
        this.scheduledSources.splice(idx, 1)
      }
      if (this.scheduledSources.length === 0) {
        this.isPlaying = false
        this.onPlaybackStateChange?.(false)
      }
    }
  }

  /**
   * INSTANT BARGE-IN: Immediately halts all queued and playing audio
   * when the user interrupts or starts speaking.
   */
  flush(): void {
    for (const source of this.scheduledSources) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Source might have already finished
      }
    }
    this.scheduledSources = []
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime
    }
    this.isPlaying = false
    this.onPlaybackStateChange?.(false)
  }

  getVolume(): number {
    if (!this.analyser || !this.isPlaying) return 0
    const buffer = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(buffer)
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128
      sum += v * v
    }
    return Math.min(1, Math.sqrt(sum / buffer.length) * 3.5)
  }

  stop(): void {
    this.flush()
    this.audioContext = null
    this.analyser = null
  }
}
