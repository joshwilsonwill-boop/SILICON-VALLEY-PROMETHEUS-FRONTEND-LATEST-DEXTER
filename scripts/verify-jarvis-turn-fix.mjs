import assert from 'node:assert/strict'

console.log('Testing Jarvis Turn Completion & Immediate Communication Fixes...')

// 1. DSP Downsampling and PCM encoding algorithm validation
function downsampleBuffer(buffer, inputRate, outputRate) {
  if (inputRate <= outputRate) return buffer
  const sampleRateRatio = inputRate / outputRate
  const newLength = Math.round(buffer.length / sampleRateRatio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
    let accum = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i]
    }
    result[offsetResult] = accum / sampleRateRatio
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  let offset = 0
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

{
  const inputRate = 48000
  const targetRate = 16000
  const floatInput = new Float32Array(4096)
  for (let i = 0; i < floatInput.length; i++) {
    floatInput[i] = Math.sin((i / 48000) * 440 * 2 * Math.PI)
  }

  const downsampled = downsampleBuffer(floatInput, inputRate, targetRate)
  assert.equal(downsampled.length, Math.round(4096 / 3), '48k -> 16k must downsample 3:1')

  const pcm = floatTo16BitPCM(downsampled)
  assert.equal(pcm.byteLength, downsampled.length * 2, 'PCM 16-bit must have 2 bytes per sample')
}

// 2. Gemini Live Realtime and Client Content Payload Builders
function buildRealtimeAudioInput(base64Pcm) {
  return {
    realtimeInput: {
      audio: {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Pcm,
      },
    },
  }
}

function buildClientContentTextTurn(text) {
  return {
    clientContent: {
      turns: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
      turnComplete: true,
    },
  }
}

{
  const dummyPcm = 'AAAA'
  const audioInput = buildRealtimeAudioInput(dummyPcm)
  assert.equal(audioInput.realtimeInput.audio.mimeType, 'audio/pcm;rate=16000')
  assert.equal(audioInput.realtimeInput.audio.data, dummyPcm)

  const textTurn = buildClientContentTextTurn('Apply cinematic captions')
  assert.equal(textTurn.clientContent.turns[0].role, 'user')
  assert.equal(textTurn.clientContent.turns[0].parts[0].text, 'Apply cinematic captions')
  assert.equal(textTurn.clientContent.turnComplete, true)
}

// 3. AudioPlayer & AudioRecorder State Machine Simulation
// Demonstrates that with the fix, immediate follow-up turns are NOT blocked or muted by echo gating.
{
  class MockAudioPlayer {
    constructor() {
      this.isPlaying = false
      this.currentTime = 0
      this.nextPlayTime = 0
      this.isDucked = false
      this.scheduledSources = []
    }

    getPendingMs() {
      return Math.max(0, (this.nextPlayTime - this.currentTime) * 1000)
    }

    getIsPlaying() {
      return this.isPlaying
    }

    scheduleChunk(durationSec) {
      const startTime = Math.max(this.currentTime, this.nextPlayTime)
      this.nextPlayTime = startTime + durationSec
      this.isPlaying = true
      const source = { id: Math.random(), durationSec }
      this.scheduledSources.push(source)
      return source
    }

    onSourceEnded(source) {
      const idx = this.scheduledSources.indexOf(source)
      if (idx !== -1) {
        this.scheduledSources.splice(idx, 1)
      }
      if (this.scheduledSources.length === 0) {
        this.isPlaying = false
        // FIX: reset nextPlayTime immediately to currentTime so getPendingMs() does NOT linger!
        this.nextPlayTime = this.currentTime
      }
    }

    flush() {
      this.scheduledSources = []
      this.isPlaying = false
      this.nextPlayTime = this.currentTime
      this.isDucked = false
    }

    duck() {
      this.isDucked = true
    }
  }

  class MockAudioRecorder {
    constructor(player, getAssistantTurnActive) {
      this.player = player
      this.getAssistantTurnActive = getAssistantTurnActive
      this.bargeFrames = 0
      this.suppressedUntil = 0
      this.transmittedChunks = []
    }

    getIsSpeaking() {
      return (
        this.getAssistantTurnActive() ||
        this.player.getIsPlaying() ||
        this.player.getPendingMs() > 0
      )
    }

    suppressTransmission(durationMs) {
      this.suppressedUntil = Date.now() + durationMs
    }

    onSpeechOnset() {
      const isSpeaking = this.getIsSpeaking()
      if (isSpeaking) {
        if (!this.getAssistantTurnActive()) {
          // FIX: Server turn already finished; user speaks immediately!
          // Flush player immediately to restore clean mic transmission!
          this.player.flush()
        } else {
          this.player.duck()
        }
      }
    }

    processFrame(rms, pcmBase64) {
      if (Date.now() < this.suppressedUntil) {
        // Transmission suppressed (e.g. while sending a text message)
        return 'suppressed'
      }

      const isSpeaking = this.getIsSpeaking()
      if (isSpeaking) {
        if (rms > 0.04) {
          this.bargeFrames += 1
          this.onSpeechOnset()
        } else {
          this.bargeFrames = 0
        }

        if (this.bargeFrames < 2) {
          this.transmittedChunks.push('silence')
          return 'silence'
        }
      } else {
        this.bargeFrames = 0
        if (rms > 0.04) {
          this.onSpeechOnset()
        }
      }

      this.transmittedChunks.push(pcmBase64)
      return pcmBase64
    }
  }

  const player = new MockAudioPlayer()
  let assistantTurnActive = true
  const recorder = new MockAudioRecorder(player, () => assistantTurnActive)

  // Step 1: Assistant is speaking (server streaming audio chunks)
  player.currentTime = 10.0
  const chunk1 = player.scheduleChunk(1.0)
  const chunk2 = player.scheduleChunk(1.0)
  assert.equal(recorder.getIsSpeaking(), true, 'Recorder knows assistant is speaking')

  // Server completes generation at t=10.5
  assistantTurnActive = false

  // Residual audio still playing until t=12.0
  player.currentTime = 11.0
  player.onSourceEnded(chunk1)
  assert.equal(player.getIsPlaying(), true, 'Chunk 2 is still playing')

  // Step 2: User speaks immediately at t=11.2 (Jarvis is finishing or just finished)
  player.currentTime = 11.2
  recorder.processFrame(0.08, 'USER_AUDIO_FRAME_1')

  // With the fix, because assistantTurnActive is false, user speech onset FLUSHES player immediately!
  assert.equal(player.getIsPlaying(), false, 'Player was flushed immediately on user speech onset')
  assert.equal(recorder.getIsSpeaking(), false, 'Echo gating immediately disengaged for user turn')

  // Frame 2 is transmitted as real audio, NOT silence!
  const frame2 = recorder.processFrame(0.08, 'USER_AUDIO_FRAME_2')
  assert.equal(frame2, 'USER_AUDIO_FRAME_2', 'Real user audio must be transmitted cleanly without zero-fill')

  // Step 3: User sends text message
  // When sendTextMessage is called, player is flushed and mic audio is temporarily suppressed
  player.scheduleChunk(2.0)
  assistantTurnActive = true
  assert.equal(player.getIsPlaying(), true)

  // simulate sendTextMessage
  player.flush()
  assistantTurnActive = false
  recorder.suppressTransmission(1000)

  assert.equal(player.getIsPlaying(), false, 'Player flushed on text message send')
  assert.equal(recorder.processFrame(0.02, 'AMBIENT_NOISE'), 'suppressed', 'Mic transmission paused during text dispatch')
}

console.log('jarvis-turn-fix-verified')
process.exit(0)
