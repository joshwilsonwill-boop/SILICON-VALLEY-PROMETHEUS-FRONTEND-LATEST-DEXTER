import assert from 'node:assert/strict'

import { downloadMedia, isCrossOriginHttpUrl } from '@/lib/editor/browser-download'

const editorOrigin = 'https://app.prometheus.example/editor/123'

assert.equal(isCrossOriginHttpUrl('/api/exports/123', editorOrigin), false)
assert.equal(isCrossOriginHttpUrl('https://app.prometheus.example/media/final.mp4', editorOrigin), false)
assert.equal(isCrossOriginHttpUrl('https://delivery.prometheus.example/final.mp4', editorOrigin), true)
assert.equal(isCrossOriginHttpUrl('blob:https://app.prometheus.example/source-id', editorOrigin), false)
assert.equal(isCrossOriginHttpUrl('not a valid absolute url', editorOrigin), false)

let clicked = false
let openedInNewTab = false
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { location: { href: editorOrigin } },
})
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    body: { appendChild() {} },
    createElement: () => ({
      click() { clicked = true },
      download: '',
      href: '',
      rel: '',
      remove() {},
      set target(value: string) { openedInNewTab = value === '_blank' },
    }),
  },
})

async function run() {
  await downloadMedia(
    'https://delivery.prometheus.example/final.mp4',
    'final.mp4',
    async () => { throw new TypeError('Failed to fetch') },
  )

  assert.equal(clicked, true)
  assert.equal(openedInNewTab, true)
}

void run()
