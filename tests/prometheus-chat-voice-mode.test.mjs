import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/editor/PrometheusChat.tsx', import.meta.url), 'utf8')

assert.match(source, /speechSynthesis/)
assert.match(source, /data-chat-voice-mode/)
assert.match(source, /aria-label=\{voiceMode \? 'Disable spoken replies' : 'Enable spoken replies'\}/)
assert.match(source, /speechSynthesis\.cancel\(\)/)

console.log('prometheus-chat-voice-mode: all checks passed.')
