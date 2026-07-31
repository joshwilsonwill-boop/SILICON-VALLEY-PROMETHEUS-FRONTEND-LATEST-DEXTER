import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const layout = read('app/layout.tsx')
const globals = read('app/globals.css')
const studio = read('components/video-upload-interface.tsx')
const desktopChat = read('components/editor/PrometheusChat.tsx')
const mobileChat = read('components/editor/prometheus-chat-mobile.tsx')
const thinkingProcess = read('components/editor/prometheus-chat-thinking-process.tsx')

assert.match(layout, /src:\s*'\.\.\/elegist\/Elegist\.otf'/)
assert.match(layout, /display:\s*'block'/)
assert.match(layout, /preload:\s*true/)
assert.match(globals, /\.font-elegist\s*\{\s*font-family:\s*var\(--font-elegist\);/)
assert.match(studio, /fontFamily:\s*'var\(--font-elegist\)'/)
assert.match(desktopChat, /font-elegist text-sm text-white\/38/)
assert.match(desktopChat, /CinematicTextReveal[\s\S]*font-display/)
assert.doesNotMatch(desktopChat, /style=\{\{ fontFamily: 'var\(--font-elegist\)' \}\}/)
assert.match(mobileChat, /font-display text-\[clamp\(2\.25rem,11vw,4\.5rem\)\]/)
assert.match(thinkingProcess, /font-elegist text-xs text-white\/40/)
