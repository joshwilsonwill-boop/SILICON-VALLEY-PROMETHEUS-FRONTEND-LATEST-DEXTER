const INPUT_SAMPLE_RATE = 16_000
const OUTPUT_SAMPLE_RATE = 24_000
const CHUNK_SAMPLES = 960

function concatFloat32(first: Float32Array, second: Float32Array) {
  const combined = new Float32Array(first.length + second.length)
  combined.set(first)
  combined.set(second, first.length)
  return combined
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function float32ToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    pcm[index] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767)
  }
  return pcm
}

export function pcm16LeToFloat32(bytes: ArrayBufferLike): Float32Array {
  const view = new DataView(bytes)
  const samples = new Float32Array(Math.floor(view.byteLength / 2))
  for (let index = 0; index < samples.length; index += 1) samples[index] = view.getInt16(index * 2, true) / 32768
  return samples
}

export function encodePcmBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.byteLength)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < samples.length; index += 1) view.setInt16(index * 2, samples[index] ?? 0, true)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const captureProcessor = `
class MortyCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (input && input.length) {
      const copy = new Float32Array(input)
      this.port.postMessage(copy, [copy.buffer])
    }
    return true
  }
}
registerProcessor('morty-capture', MortyCaptureProcessor)
`

export class MortyAudioCapture {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private worklet: AudioWorkletNode | null = null
  private silentGain: GainNode | null = null
  private moduleUrl: string | null = null
  private pending = new Float32Array(0)
  private sourceOffset = 0

  async start(onChunk: (base64Pcm: string) => void, onLevel: (level: number) => void): Promise<void> {
    if (this.context) return
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) {
      throw new Error('Live microphone audio is not supported in this browser.')
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      this.context = new AudioContext()
      await this.context.resume()
      this.moduleUrl = URL.createObjectURL(new Blob([captureProcessor], { type: 'application/javascript' }))
      await this.context.audioWorklet.addModule(this.moduleUrl)

      this.source = this.context.createMediaStreamSource(this.stream)
      this.worklet = new AudioWorkletNode(this.context, 'morty-capture')
      this.silentGain = this.context.createGain()
      this.silentGain.gain.value = 0
      this.worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const chunk = new Float32Array(event.data)
        this.handleSamples(chunk, onChunk, onLevel)
      }
      this.source.connect(this.worklet).connect(this.silentGain).connect(this.context.destination)
    } catch (error) {
      await this.stop()
      throw error
    }
  }

  private handleSamples(samples: Float32Array, onChunk: (base64Pcm: string) => void, onLevel: (level: number) => void) {
    let sum = 0
    for (const sample of samples) sum += sample * sample
    onLevel(Math.min(1, Math.sqrt(sum / Math.max(1, samples.length)) * 6))

    const context = this.context
    if (!context) return
    const combined = concatFloat32(this.pending, samples)
    const ratio = context.sampleRate / INPUT_SAMPLE_RATE
    const resampled: number[] = []
    let position = this.sourceOffset
    while (position + 1 < combined.length) {
      const left = Math.floor(position)
      const fraction = position - left
      const first = combined[left] ?? 0
      const second = combined[left + 1] ?? first
      resampled.push(first + (second - first) * fraction)
      position += ratio
    }
    const consumed = Math.floor(position)
    this.sourceOffset = position - consumed
    this.pending = combined.slice(consumed)

    const output = concatFloat32(new Float32Array(0), new Float32Array(resampled))
    this.pendingOutput = concatFloat32(this.pendingOutput, output)
    while (this.pendingOutput.length >= CHUNK_SAMPLES) {
      const chunk = this.pendingOutput.slice(0, CHUNK_SAMPLES)
      this.pendingOutput = this.pendingOutput.slice(CHUNK_SAMPLES)
      onChunk(encodePcmBase64(float32ToPcm16(chunk)))
    }
  }

  private pendingOutput = new Float32Array(0)

  async stop(): Promise<void> {
    this.worklet?.disconnect()
    this.source?.disconnect()
    this.silentGain?.disconnect()
    this.worklet = null
    this.source = null
    this.silentGain = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    const context = this.context
    this.context = null
    this.pending = new Float32Array(0)
    this.pendingOutput = new Float32Array(0)
    this.sourceOffset = 0
    if (this.moduleUrl) URL.revokeObjectURL(this.moduleUrl)
    this.moduleUrl = null
    if (context && context.state !== 'closed') await context.close()
  }
}

export class MortyAudioPlayback {
  private context: AudioContext | null = null
  private nextStartAt = 0
  private sources = new Set<AudioBufferSourceNode>()

  async start(): Promise<void> {
    if (!this.context) this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
    await this.context.resume()
  }

  enqueue(base64Pcm: string): void {
    const context = this.context
    if (!context || !base64Pcm) return
    const samples = pcm16LeToFloat32(base64ToBytes(base64Pcm).buffer)
    if (!samples.length) return
    const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const startAt = Math.max(context.currentTime + 0.015, this.nextStartAt)
    this.nextStartAt = startAt + buffer.duration
    this.sources.add(source)
    source.onended = () => this.sources.delete(source)
    source.start(startAt)
  }

  clear(): void {
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // A source can already be ended when an interruption arrives.
      }
    }
    this.sources.clear()
    this.nextStartAt = this.context?.currentTime ?? 0
  }

  async close(): Promise<void> {
    this.clear()
    const context = this.context
    this.context = null
    if (context && context.state !== 'closed') await context.close()
  }
}
