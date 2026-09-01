'use client'

/**
 * Web Audio API helpers for Gemini Multimodal Live API.
 * - Input: Microphone captured, resampled to 16kHz 16-bit mono PCM, base64 encoded.
 * - Output: 24kHz 16-bit mono PCM decoded, scheduled seamlessly with instant barge-in flush.
 */

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
    return buffer // Cannot upsample meaningfully here
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
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
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
 * Manages microphone capture, resampling to 16kHz PCM, and audio emission.
 */
export class AudioRecorder {
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private analyser: AnalyserNode | null = null
  private onAudioChunk: ((base64Chunk: string) => void) | null = null
  private isRecording = false

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

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioContext = new AudioContextClass()

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 512
    this.analyser.smoothingTimeConstant = 0.5

    // Buffer size 4096 gives ~85ms chunks at 48kHz, optimal for streaming
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

    const inputSampleRate = this.audioContext.sampleRate
    const targetSampleRate = 16000

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isRecording) return
      const inputData = e.inputBuffer.getChannelData(0)
      const downsampled = downsampleBuffer(inputData, inputSampleRate, targetSampleRate)
      const pcmBuffer = floatTo16BitPCM(downsampled)
      const base64 = arrayBufferToBase64(pcmBuffer)
      this.onAudioChunk?.(base64)
    }

    this.source.connect(this.analyser)
    this.analyser.connect(this.processor)
    // Connect processor to destination to keep scriptProcessor alive
    this.processor.connect(this.audioContext.destination)
    this.isRecording = true
  }

  stop(): void {
    this.isRecording = false
    this.processor?.disconnect()
    this.analyser?.disconnect()
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    if (this.audioContext?.state !== 'closed') {
      this.audioContext?.close().catch(() => {})
    }
    this.processor = null
    this.analyser = null
    this.source = null
    this.stream = null
    this.audioContext = null
    this.onAudioChunk = null
  }

  getVolume(): number {
    if (!this.analyser || !this.isRecording) return 0
    const buffer = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(buffer)
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128
      sum += v * v
    }
    return Math.min(1, Math.sqrt(sum / buffer.length) * 4)
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
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioContextClass({ sampleRate: 24000 })
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.4
      this.analyser.connect(this.audioContext.destination)
    }
    return this.audioContext
  }

  async playChunk(base64Audio: string): Promise<void> {
    const ctx = this.initContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const rawBuffer = base64ToArrayBuffer(base64Audio)
    const int16Array = new Int16Array(rawBuffer)
    const float32Array = pcm16ToFloat32(int16Array)

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
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {})
    }
    this.audioContext = null
    this.analyser = null
  }
}
