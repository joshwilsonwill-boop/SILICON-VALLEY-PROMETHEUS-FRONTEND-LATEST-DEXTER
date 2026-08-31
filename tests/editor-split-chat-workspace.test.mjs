import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../app/editor/[id]/page.tsx', import.meta.url), 'utf8')

assert.match(source, /previewUrl=\{previewUrl\}/)
assert.match(source, /data-editorial-chat-workspace="split"/)
assert.match(source, /data-editorial-chat-video-toggle/)
assert.match(source, /Show source video alongside chat/)

console.log('editor-split-chat-workspace: all checks passed.')
