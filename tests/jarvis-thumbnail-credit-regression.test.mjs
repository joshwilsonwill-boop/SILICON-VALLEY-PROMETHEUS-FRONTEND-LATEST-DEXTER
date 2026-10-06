import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../lib/voice-companion/gemini-live-client.ts', import.meta.url), 'utf8')
const thumbnailTool = source.match(/name: 'create_video_thumbnail',[\s\S]*?\n  },/)?.[0]
const thumbnailInstruction = source.match(/When the user asks you to create, suggest, propose, or brainstorm a thumbnail,[^\n]*/)?.[0]

test('thumbnail generation does not require or start paid transcription', () => {
  assert.ok(thumbnailTool, 'thumbnail tool declaration exists')
  assert.match(thumbnailTool, /inspect_video/)
  assert.match(thumbnailTool, /transcript evidence only if it is already available/)
  assert.match(thumbnailTool, /Never start or require transcription for a thumbnail/)
  assert.match(thumbnailInstruction, /An existing transcript is optional context/)
  assert.match(thumbnailInstruction, /NEVER call transcribe_video or otherwise start paid transcription solely for thumbnail work/)
  assert.match(thumbnailInstruction, /A thumbnail must proceed from inspected frames and the user's brief when no transcript exists/)
  assert.doesNotMatch(thumbnailTool, /relevant transcript evidence to choose/)
})

test('explicit transcription remains a separate capability', () => {
  assert.match(source, /name: 'transcribe_video'/)
  assert.match(source, /Call transcribe_video for an explicit transcript request/)
})
