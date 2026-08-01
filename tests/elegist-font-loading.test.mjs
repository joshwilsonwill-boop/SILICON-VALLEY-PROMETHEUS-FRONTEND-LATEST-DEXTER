import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const layout = read('app/layout.tsx')
const globals = read('app/globals.css')
const desktopChat = read('components/editor/PrometheusChat.tsx')
const mobileChat = read('components/editor/prometheus-chat-mobile.tsx')
const thinkingProcess = read('components/editor/prometheus-chat-thinking-process.tsx')
const greetingPath = join(root, 'components/editor/elegist-chat-greeting.tsx')

assert.ok(existsSync(greetingPath), 'shared Elegist chat greeting component should exist')

const greeting = read('components/editor/elegist-chat-greeting.tsx')

assert.match(layout, /src:\s*'\.\.\/elegist\/Elegist\.otf'/)
assert.match(layout, /display:\s*'block'/)
assert.match(layout, /preload:\s*true/)
assert.match(layout, /adjustFontFallback:\s*false/)
assert.match(layout, /fallback:\s*\[\]/)
assert.match(globals, /\.font-elegist\s*\{\s*font-family:\s*var\(--font-elegist\);/)
assert.match(desktopChat, /font-elegist text-sm text-white\/38/)
assert.match(greeting, /document\.fonts\.load/)
assert.match(greeting, /document\.fonts\.check/)
assert.match(greeting, /faces\.length\s*>\s*0/)
assert.match(greeting, /font-elegist/)
assert.match(greeting, /font-vogue/)
assert.match(greeting, /CinematicTextReveal/)
assert.match(greeting, /renderGrapheme/)
assert.match(greeting, /What would you like\\n/)
assert.match(desktopChat, /<ElegistChatGreeting/)
assert.doesNotMatch(desktopChat, /style=\{\{ fontFamily: 'var\(--font-elegist\)' \}\}/)
assert.doesNotMatch(desktopChat, /function EmptyChatGreeting/)
assert.match(mobileChat, /<ElegistChatGreeting/)
assert.match(thinkingProcess, /font-elegist text-xs text-white\/40/)
