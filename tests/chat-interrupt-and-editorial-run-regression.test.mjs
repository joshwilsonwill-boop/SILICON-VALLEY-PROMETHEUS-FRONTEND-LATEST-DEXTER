import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const chat = read('components/editor/PrometheusChat.tsx')
const hook = read('hooks/use-ai-chat.ts')

assert.match(chat, /StreamingControls/)
assert.match(chat, /onStop=\{persistentChat\.stopStreaming\}/)
assert.match(chat, /persistentChat\.stopStreaming\(\)[\s\S]*sendMessage\(message, \{interrupt: true\}\)/)
assert.match(hook, /interrupt\?: boolean/)
assert.match(hook, /isSending && !options\?\.interrupt/)

console.log('chat-interrupt-and-editorial-run: all assertions passed')
