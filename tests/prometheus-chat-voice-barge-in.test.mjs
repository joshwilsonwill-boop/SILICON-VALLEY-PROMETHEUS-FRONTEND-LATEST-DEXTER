import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../components/editor/PrometheusChat.tsx', import.meta.url), 'utf8')

assert.match(source, /const submitVoiceTurn = React\.useCallback/)
assert.match(source, /persistentChat\.sendMessage\(message, \{ interrupt: true \}\)/)
assert.match(
  source,
  /const startVoiceBargeIn = React\.useCallback\(\(\) => \{[\s\S]*?stopSpokenReply\(\)[\s\S]*?persistentChat\.stopStreaming\(\)[\s\S]*?void voice\.start\(\)/,
)
assert.doesNotMatch(
  source,
  /disabled=\{persistentChat\.isSending \|\| persistentChat\.isAwaitingResponse\}/,
)

console.log('prometheus-chat-voice-barge-in: all assertions passed')
