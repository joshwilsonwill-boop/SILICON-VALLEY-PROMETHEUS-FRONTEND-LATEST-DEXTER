import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { searchTranscriptText } from '../lib/voice-companion/transcript-search.ts'
import { isGeminiCredentialFailure } from '../lib/voice-companion/live-errors.ts'

const read = (file) => readFileSync(join(process.cwd(), file), 'utf8')
const client = read('lib/voice-companion/gemini-live-client.ts')
const hook = read('hooks/use-voice-companion.ts')
const audio = read('lib/voice-companion/audio-streamer.ts')

assert.doesNotMatch(client, /videoTranscript\?: string/)
assert.match(client, /name: 'search_video_transcript'/)
assert.match(hook, /case 'search_video_transcript'/)
assert.doesNotMatch(hook, /suppressTransmission\(2500\)/)
assert.match(client, /incomingMessageQueue = this\.incomingMessageQueue\.then/)
assert.match(client, /setup timed out after 8s/)
assert.match(client, /connection closed before setup completed/)
assert.match(client, /connection failed\. Verify the network connection and server credentials\.'\), false\)/)
assert.doesNotMatch(audio, /suppressUntil|suppressTransmission/)
assert.match(client, /projectContext\?: string/)
assert.doesNotMatch(hook, /PRE-BRIEFING CONTEXT/)
assert.match(hook, /onClose:\s*\(\)\s*=>\s*\{[\s\S]*?setConnectionNotice\('The voice stream ended\.[\s\S]*?setUserStatus\('error'\)/)

const transcript = 'The opening shows a quiet harbor. The speaker says the launch moved to Friday after the weather cleared. Later, the crew returns to the harbor at sunset.'
assert.match(searchTranscriptText(transcript, 'launch Friday').join('\n'), /launch moved to Friday/)
assert.equal(searchTranscriptText(transcript, 'unrelated words').length, 0)
assert.equal(searchTranscriptText('', 'launch').length, 0)
assert.equal(isGeminiCredentialFailure(401, '', 'bad key'), true)
assert.equal(isGeminiCredentialFailure(429, '', ''), true)
assert.equal(isGeminiCredentialFailure(1006, '', 'network connection reset'), false)

console.log('jarvis-live-latency-regression: all assertions passed')
