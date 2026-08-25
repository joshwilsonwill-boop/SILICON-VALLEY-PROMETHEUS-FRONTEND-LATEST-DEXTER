import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sourceTranscription = readFileSync(join(process.cwd(), 'lib/server/source-transcript.ts'), 'utf8')

assert.match(sourceTranscription, /speech_models: \['universal-3-5-pro'\]/)

console.log('source transcription uses AssemblyAI universal-3-5-pro')
