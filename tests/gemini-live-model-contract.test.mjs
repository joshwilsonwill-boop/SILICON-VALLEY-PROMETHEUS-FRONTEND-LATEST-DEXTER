import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sessionRoute = readFileSync('app/api/voice-companion/session/route.ts', 'utf8')
const liveClient = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')

const sources = `${sessionRoute}\n${liveClient}`

assert.doesNotMatch(sources, /gemini-2\.0-flash-live-001/)
assert.match(sources, /models\/gemini-3\.1-flash-live-preview/)
assert.match(sessionRoute, /candidateModels/)
assert.match(sessionRoute, /models\/gemini-2\.5-flash-native-audio-preview-12-2025/)
assert.match(sources, /BidiGenerateContent/)

console.log('Gemini Live model contract checks passed')
