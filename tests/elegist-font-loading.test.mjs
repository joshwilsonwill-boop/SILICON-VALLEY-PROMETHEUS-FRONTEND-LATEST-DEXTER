import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const layout = read('app/layout.tsx')
const globals = read('app/globals.css')
const desktopChat = read('components/editor/PrometheusChat.tsx')
const mobileChat = read('components/editor/prometheus-chat-mobile.tsx')
const thinkingProcess = read('components/editor/prometheus-chat-thinking-process.tsx')

assert.match(layout, /src:\s*'\.\.\/elegist\/Elegist\.otf'/)
assert.match(layout, /display:\s*'block'/)
assert.match(layout, /preload:\s*true/)
assert.match(globals, /\.font-elegist\s*\{\s*font-family:\s*var\(--font-elegist\);/)
assert.match(desktopChat, /font-elegist text-sm text-white\/38/)
assert.match(mobileChat, /font-elegist text-sm text-white\/38/)
assert.match(thinkingProcess, /font-elegist text-xs text-white\/40/)
