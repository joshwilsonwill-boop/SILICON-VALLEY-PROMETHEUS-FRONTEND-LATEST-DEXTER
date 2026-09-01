import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const streamRoute = read('app/api/prometheus-chat/stream/route.ts')
const geminiStream = read('lib/prometheus-assistant/gemini-stream.ts')

// Gemini integration checks
assert.match(streamRoute, /resolveGeminiApiKey/)
assert.match(streamRoute, /streamWithGemini/)
assert.match(streamRoute, /geminiFrameRefs/)
assert.match(streamRoute, /gemini-2\.5-flash/)
assert.match(streamRoute, /inlineData/)

// Gemini multimodal stream module checks
assert.match(geminiStream, /export async function streamWithGemini/)
assert.match(geminiStream, /export function resolveGeminiApiKey/)
assert.match(geminiStream, /GoogleGenerativeAI/)
assert.match(geminiStream, /GEMINI_PREFERRED_MODELS/)
assert.match(geminiStream, /gemini-2\.5-flash/)
assert.match(geminiStream, /inlineData/)
assert.match(geminiStream, /fetchImageAsBase64/)
assert.match(geminiStream, /parseDataUrl/)

console.log('Gemini multimodal chat integration checks passed!')
