import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const audioStreamer = read('lib/voice-companion/audio-streamer.ts')
const useVoiceCompanion = read('hooks/use-voice-companion.ts')
const prometheusChat = read('components/editor/PrometheusChat.tsx')
const useAIChat = read('hooks/use-ai-chat.ts')

// 1. AudioRecorder must support speech energy memory and conversational barge-in thresholds
assert.match(
  audioStreamer,
  /hasRecentSpeech/,
  'AudioRecorder must provide hasRecentSpeech() so barge-in energy is not lost across millisecond gaps',
)
assert.match(
  audioStreamer,
  /BARGE_IN_RMS_THRESHOLD\s*=\s*0\.04/,
  'AudioRecorder must calibrate barge-in RMS threshold to normal conversational speech (0.040)',
)
assert.match(
  audioStreamer,
  /BARGE_IN_SUSTAINED_FRAMES\s*=\s*2/,
  'AudioRecorder must require at most 2 sustained frames (~170ms) to capture fast words like "stop"',
)
assert.match(
  audioStreamer,
  /resetBargeFrames/,
  'AudioRecorder must provide resetBargeFrames() to cleanly reset barge-in state after an interruption',
)

// 2. useVoiceCompanion must never block legitimate interrupts behind an unreachable > 0.34 volume gate
assert.doesNotMatch(
  useVoiceCompanion,
  /userVol\s*>\s*0\.34/,
  'useVoiceCompanion must NOT gate server interruption behind unreachable 0.34 volume',
)
assert.match(
  useVoiceCompanion,
  /hasRecentSpeech/,
  'useVoiceCompanion must honor interruption when recent user speech was detected',
)
assert.match(
  useVoiceCompanion,
  /player\.flush\(\)/,
  'useVoiceCompanion must flush the audio player on interruption',
)

// 3. PrometheusChat must recognize stop/cease intents and immediately silence speech without LLM re-prompting
assert.match(
  prometheusChat,
  /isVoiceCeaseOrStopIntent/,
  'PrometheusChat must define isVoiceCeaseOrStopIntent to detect user requests to cease speech',
)
assert.match(
  prometheusChat,
  /submitVoiceTurn[\s\S]*?isVoiceCeaseOrStopIntent[\s\S]*?stopSpokenReply\(\)/,
  'submitVoiceTurn must immediately call stopSpokenReply() and cease when stop intent is detected',
)
assert.match(
  prometheusChat,
  /latestSpeakableMessage[\s\S]*?!message\.content\.includes\('\[Stopped\]'\)[\s\S]*?!message\.content\.includes\('\[Interrupted\]'\)/,
  'latestSpeakableMessage must exclude stopped or interrupted assistant turns from speech synthesis',
)
assert.match(
  prometheusChat,
  /stopSpokenReply[\s\S]*?activeUtterancesRef\.current\s*=\s*\[\]/,
  'stopSpokenReply must drain active utterances to prevent queued speech resumes',
)

// 4. useAIChat must finalize aborted assistant turns cleanly on interruption
assert.match(
  useAIChat,
  /requestError instanceof DOMException && requestError\.name === "AbortError"[\s\S]*?\[Interrupted\]/,
  'useAIChat must cleanly finalize partial content with [Interrupted] when an active stream is aborted',
)

// 5. Natural Speech Pause & Acoustic Ducking on Speaker Voice Onset
assert.match(
  audioStreamer,
  /duck\(/,
  'AudioPlayer must provide duck() to pause/duck assistant output when speaker begins talking',
)
assert.match(
  audioStreamer,
  /onSpeechOnset/,
  'AudioRecorder must support onSpeechOnset callback to notify when speaker voice begins',
)
assert.match(
  useVoiceCompanion,
  /onSpeechOnset[\s\S]*?playerRef\.current\?\.duck/,
  'useVoiceCompanion must duck assistant audio playback on speech onset to let speaker words go through',
)
assert.match(
  prometheusChat,
  /onSpeechOnset[\s\S]*?stopSpokenReply/,
  'PrometheusChat must pause spoken reply on speech onset',
)

console.log('jarvis-voice-interruption-regression: all assertions passed successfully!')
