import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const audioStreamer = read('lib/voice-companion/audio-streamer.ts')
const geminiLiveClient = read('lib/voice-companion/gemini-live-client.ts')
const useVoiceCompanion = read('hooks/use-voice-companion.ts')
const sessionRoute = read('app/api/voice-companion/session/route.ts')
const prometheusChat = read('components/editor/PrometheusChat.tsx')

// 1. AudioStreamer: Prime Audio Context & Acoustic Echo Ducking
assert.match(audioStreamer, /export function primeAudioContext\(\)/, 'primeAudioContext export must exist')
assert.match(audioStreamer, /getIsSpeaking/, 'AudioRecorder must support getIsSpeaking ducking callback')
assert.match(audioStreamer, /BARGE_IN_RMS_THRESHOLD/, 'AudioRecorder must gate mic transmission with a barge-in threshold during model speech')
assert.match(audioStreamer, /BARGE_IN_SUSTAINED_FRAMES/, 'AudioRecorder must require sustained user energy for deliberate barge-in')
assert.match(audioStreamer, /silenceChunkBase64/, 'AudioRecorder must silence-fill gated frames instead of dropping them')
assert.match(audioStreamer, /getIsPlaying\(\)/, 'AudioPlayer must expose getIsPlaying()')
assert.match(audioStreamer, /getPendingMs\(\)/, 'AudioPlayer must expose getPendingMs() for turn-aware gating')

// 2. GeminiLiveClient: Model & Response Modalities
assert.match(geminiLiveClient, /models\/gemini-3\.1-flash-live-preview/, 'Live client must default to a supported Gemini Live model')
assert.match(geminiLiveClient, /responseModalities:\s*\[['"]AUDIO['"]\]/, 'Live client must request AUDIO response modality')

// 3. useVoiceCompanion: Synchronous Priming & Error Preservation
assert.match(useVoiceCompanion, /primeAudioContext\(\)/, 'useVoiceCompanion must synchronously prime Web Audio on connect gesture')
assert.match(useVoiceCompanion, /getIsSpeaking:\s*\(\)\s*=>\s*\n?\s*assistantTurnActiveRef\.current/, 'useVoiceCompanion must gate the recorder on the assistant turn flag, not just playback state')
assert.match(useVoiceCompanion, /setUserStatus\(\(prev\) => \(prev === 'error' \? 'error' : 'disconnected'\)\)/, 'useVoiceCompanion must preserve error state on socket close')
assert.match(useVoiceCompanion, /userVol > 0\.34/, 'useVoiceCompanion must only honor server interruptions backed by real user speech level')

// 4. Session Route: Models & Candidate Keys
assert.match(sessionRoute, /models\/gemini-3\.1-flash-live-preview/, 'Session route must provide a supported Gemini Live model')
assert.match(sessionRoute, /candidateModels/, 'Session route must return candidate model list')

// 5. PrometheusChat: Speech Sanitization & GC Pinning
assert.match(prometheusChat, /activeUtterancesRef/, 'PrometheusChat must pin active utterances to prevent GC dropped voice')
assert.match(prometheusChat, /cleanText/, 'PrometheusChat must sanitize raw markdown before SpeechSynthesis')
assert.match(prometheusChat, /setVoiceMode\(true\)/, 'PrometheusChat must auto-enable voiceMode when microphone input is used')

console.log('Voice Companion & Chat Spoken Reply regression checks passed!')
