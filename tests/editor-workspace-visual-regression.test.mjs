import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../app/editor/[id]/page.tsx', import.meta.url), 'utf8')
const preview = readFileSync(new URL('../components/editor/PreviewCanvas.tsx', import.meta.url), 'utf8')
const delivery = readFileSync(new URL('../components/editor/editorial-delivery-studio.tsx', import.meta.url), 'utf8')
const chat = readFileSync(new URL('../components/editor/PrometheusChat.tsx', import.meta.url), 'utf8')
const mobileChat = readFileSync(new URL('../components/editor/prometheus-chat-mobile.tsx', import.meta.url), 'utf8')
const greeting = readFileSync(new URL('../lib/user/display-name.ts', import.meta.url), 'utf8')

test('transcript editing stays in Motion instead of appearing in the Editor chamber', () => {
  const editorStart = page.indexOf("{activeWorkspaceTab === 'Editor' && (")
  const editorEnd = page.indexOf('</>', editorStart)
  assert.ok(editorStart >= 0 && editorEnd > editorStart, 'Editor chamber JSX is present')
  const editor = page.slice(editorStart, editorEnd)
  assert.doesNotMatch(editor, /<EditorialTranscript\b/)
  assert.match(page, /<MotionEditWorkspace\b/)
  assert.match(page, /transcriptSegments=\{motionTranscriptSegments\}/)
})

test('render comparison is composed into the PreviewCanvas controls', () => {
  const editorStart = page.indexOf("{activeWorkspaceTab === 'Editor' && (")
  const editorEnd = page.indexOf('</>', editorStart)
  const editor = page.slice(editorStart, editorEnd)
  assert.ok(/comparisonControl=\{\s*\(?\s*<EditorialDeliveryStudio[\s\S]*?presentation="preview"[\s\S]*?\/>\s*\)?\s*\}/.test(editor), 'comparison lives in the preview control row')
  assert.equal((editor.match(/<EditorialDeliveryStudio\b/g) ?? []).length, 1)
  assert.match(delivery, /aria-label="Compare original and rendered video"/)
  assert.doesNotMatch(delivery, /This creates a 9:16 Mini-Run/)
  const compareSurface = delivery.slice(delivery.indexOf("if (presentation === 'preview')"), delivery.indexOf('\n  return (\n    <section aria-label="Final render studio"'))
  assert.doesNotMatch(compareSurface, /startRender\(\)|mini-run-maul-portrait|outputKind: 'mini-run'/)
  assert.match(delivery, /metadata\.outputKind !== 'mini-run'/)
})

test('PreviewCanvas does not add a visible black card around the source video', () => {
  assert.doesNotMatch(preview, /rounded-\[24px\] bg-black shadow-\[0_32px_64px/)
})

test('empty Chat keeps its personalized editing prompt when video context is loaded', () => {
  const emptyStateStart = chat.indexOf('{renderedMessages.length === 0 && !showingThinking ? (')
  const emptyStateEnd = chat.indexOf('{showJumpToLatest ?', emptyStateStart)
  const emptyState = chat.slice(emptyStateStart, emptyStateEnd)
  assert.ok(emptyState.includes('greeting={getChatGreeting(session?.user, profile)}'))
  assert.ok(!/videoPresent\s*\?\s*\([\s\S]*?<PrometheusChatContextBrief/.test(emptyState))
  assert.ok(greeting.includes('`What would you like to edit, ${displayName}?`'))
  assert.match(mobileChat, /greeting=\{getChatGreeting\(session\?\.user, profile\)\}/)
  assert.doesNotMatch(mobileChat, /<PrometheusChatContextBrief/)
})
