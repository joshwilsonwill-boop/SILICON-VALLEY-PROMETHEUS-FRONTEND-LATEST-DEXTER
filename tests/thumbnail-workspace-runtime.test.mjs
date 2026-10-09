import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import * as React from 'react'

const require = createRequire(import.meta.url)
const compiled = await build({
  stdin: {
    contents: `export { ThumbnailWorkspace } from './components/editor/thumbnail-studio/ThumbnailWorkspace'; export { default as ThumbnailWorkspaceFixture, THUMBNAIL_FIXTURE_GENERATION_DELAY_MS } from './tests/fixtures/thumbnail-workspace-page'; export { DEFAULT_STUDIO_DESIGN } from './lib/thumbnails/studio-art-direction'; export { STUDIO_REFERENCES } from './lib/thumbnails/studio-references';`,
    resolveDir: resolve('.'), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external',
  write: false, logLevel: 'silent',
  plugins: [{
    name: 'missing-external-stylesheet',
    setup(builder) {
      // Deliver class exports but deliberately omit the separate CSS asset.
      // This is the actual failure pattern: the component loads while its styles do not.
      builder.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
        const { readFile } = await import('node:fs/promises')
        const css = await readFile(path, 'utf8')
        const names = [...new Set([...css.matchAll(/\.([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]))]
        return { contents: `export default ${JSON.stringify(Object.fromEntries(names.map(name => [name, `missing-css-${name}`])))}`, loader: 'js' }
      })
    },
  }],
})
const bundledModule = { exports: {} }
new Function('module', 'exports', 'require', compiled.outputFiles[0].text)(bundledModule, bundledModule.exports, require)
const { ThumbnailWorkspace, ThumbnailWorkspaceFixture, THUMBNAIL_FIXTURE_GENERATION_DELAY_MS, DEFAULT_STUDIO_DESIGN, STUDIO_REFERENCES } = bundledModule.exports

async function mountStudio(options = {}) {
  const dom = new JSDOM('<!doctype html><html><body><button id="opener">Open Studio</button><div id="app"></div></body></html>', { pretendToBeVisual: true })
  const originalGlobals = new Map()
  const install = (name, value) => {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  }
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'FileReader', 'File']) install(name, dom.window[name])
  install('IS_REACT_ACT_ENVIRONMENT', true)
  install('ResizeObserver', class { observe() {} disconnect() {} })
  dom.window.matchMedia = () => ({ matches: true })
  const { createRoot } = await import('react-dom/client')
  const root = createRoot(dom.window.document.querySelector('#app'))
  const calls = { generate: 0, cancel: 0, save: 0, download: 0, close: 0, iterate: [] }
  const candidates = STUDIO_REFERENCES.slice(0, 3).map((reference, index) => ({ dataUrl: reference.src, timeSec: index, timecode: `00:0${index}`, width: 1280, height: 720 }))
  function Controller() {
    const [open, setOpen] = React.useState(true)
    const [ratio, setRatio] = React.useState('16:9')
    const [referenceId, setReferenceId] = React.useState(STUDIO_REFERENCES[0].id)
    const [frameIndex, setFrameIndex] = React.useState(0)
    const [design, setDesign] = React.useState(DEFAULT_STUDIO_DESIGN)
    const [headline, setHeadline] = React.useState('A BETTER FIRST LOOK')
    return React.createElement(React.Fragment, null,
      React.createElement('button', { onClick: () => setOpen(true) }, 'Reopen Studio'),
      open && React.createElement(ThumbnailWorkspace, {
        projectTitle: 'Runtime regression fixture', aspectRatio: ratio, onAspectRatio: setRatio,
        design, onDesign: update => setDesign(previous => ({ ...previous, ...update })),
        headline, onHeadline: setHeadline, emphasis: '', onEmphasis() {},
        creativeDirection: '', onCreativeDirection() {}, recipeId: 'impact', onRecipe() {},
        candidates, selectedFrameIndex: frameIndex, onFrame: setFrameIndex,
        isExtracting: false, isCurating: false, hookTitles: [], onUploadFrame() {},
        generatedUrl: null, referenceId, onReference: setReferenceId,
        references: [], onReferences() {}, onRemoveReference() {}, variants: [], selectedVariantId: null, onVariant() {},
        isGenerating: false, onGenerate() { calls.generate++ }, onCancel() { calls.cancel++ },
        error: null, success: null, onDownload() { calls.download++ }, onSave() { calls.save++ },
        isSaving: false, saved: false, onClose() { calls.close++; setOpen(false) },
        onIterateThumbnail(prompt) { calls.iterate.push(prompt) }, ...options,
      }),
    )
  }
  dom.window.document.querySelector('#opener').focus()
  await React.act(async () => { root.render(React.createElement(options.fixture ? ThumbnailWorkspaceFixture : Controller)) })
  const document = dom.window.document
  const button = name => [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === name || node.textContent.trim() === name)
  const click = async node => {
    assert.ok(node, 'The expected control must exist')
    await React.act(async () => { node.click() })
  }
  return { document, window: dom.window, calls, button, click, async cleanup() {
    await React.act(async () => { root.unmount() })
    dom.window.close()
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  } }
}

test('the actual Studio is styled and reference images are contained without external CSS', async () => {
  const studio = await mountStudio()
  try {
    assert.equal(studio.document.querySelectorAll('link[rel="stylesheet"]').length, 0)
    const dialog = studio.document.querySelector('[role="dialog"]')
    assert.ok(dialog)
    assert.equal(studio.window.getComputedStyle(dialog.parentElement).position, 'fixed', 'The missing external CSS must not leave the Studio in document flow')
    assert.equal(studio.window.getComputedStyle(dialog).display, 'flex')
    const reference = studio.document.querySelector('img[alt="Time is ticking thumbnail reference"]')
    assert.equal(studio.window.getComputedStyle(reference).width, '100%')
    assert.equal(studio.window.getComputedStyle(reference).height, '100%')
    assert.equal(studio.window.getComputedStyle(reference).objectFit, 'cover')
    assert.equal(studio.window.getComputedStyle(reference.parentElement).overflow, 'hidden')
    assert.ok(studio.document.querySelector('style[data-thumbnail-studio-styles]'))
  } finally { await studio.cleanup() }
})

test('aspect ratios, source frames, reference selection, tabs and generation work', async () => {
  const studio = await mountStudio()
  try {
    await studio.click(studio.button('9:16'))
    assert.equal(studio.document.querySelector('[data-ratio]').dataset.ratio, '9:16')
    assert.equal(studio.button('9:16').getAttribute('aria-pressed'), 'true')
    await studio.click(studio.button('Use frame at 00:01'))
    assert.equal(studio.button('Use frame at 00:01').getAttribute('aria-pressed'), 'true')
    await studio.click(studio.button('Use Time is ticking as thumbnail visual reference'))
    assert.equal(studio.button('Use Time is ticking as thumbnail visual reference').getAttribute('aria-pressed'), 'true')
    for (const tab of ['Chat', 'Styles', 'Brand', 'Create']) {
      await studio.click(studio.button(tab))
      assert.equal(studio.button(tab).getAttribute('aria-pressed'), 'true')
    }
    await studio.click(studio.button('Generate thumbnail'))
    assert.equal(studio.calls.generate, 1)
    await studio.click(studio.button('Chat'))
    await studio.click(studio.button('Darken background for high contrast'))
    assert.deepEqual(studio.calls.iterate, ['Darken background for high contrast'])
  } finally { await studio.cleanup() }
})

test('reference browsing is bounded, filters work, and close removes the portal and its styles', async () => {
  const studio = await mountStudio()
  try {
    await studio.click(studio.button(`Browse all ${STUDIO_REFERENCES.length}`))
    const library = studio.document.querySelector('#thumbnail-reference-library')
    assert.equal(studio.window.getComputedStyle(library).display, 'grid')
    const filter = studio.document.querySelector('select[aria-label="Filter thumbnail references by topic"]')
    await React.act(async () => { filter.value = 'Creator Business'; filter.dispatchEvent(new studio.window.Event('change', { bubbles: true })) })
    assert.equal(library.querySelectorAll('button').length, STUDIO_REFERENCES.filter(reference => reference.category === 'Creator Business').length)
    await React.act(async () => { filter.value = 'All looks'; filter.dispatchEvent(new studio.window.Event('change', { bubbles: true })) })
    const search = studio.document.querySelector('input[aria-label="Search thumbnail references"]')
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(studio.window.HTMLInputElement.prototype, 'value').set.call(search, 'Time is ticking')
      search.dispatchEvent(new studio.window.Event('input', { bubbles: true }))
    })
    assert.equal(library.querySelectorAll('button').length, 1)
    assert.ok(library.querySelector('img[alt="Time is ticking thumbnail reference"]'))
    assert.equal(studio.document.body.style.overflow, 'hidden')
    await studio.click(studio.button('Close Studio'))
    assert.equal(studio.document.querySelector('[role="dialog"]'), null)
    assert.equal(studio.document.querySelector('style[data-thumbnail-studio-styles]'), null)
    assert.equal(studio.document.body.style.overflow, '')
    assert.equal(studio.document.activeElement.id, 'opener')
    await studio.click(studio.button('Reopen Studio'))
    assert.equal(studio.document.querySelectorAll('[role="dialog"]').length, 1)
    assert.equal(studio.window.getComputedStyle(studio.document.querySelector('[role="dialog"]').parentElement).position, 'fixed')
    await React.act(async () => { studio.document.dispatchEvent(new studio.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    assert.equal(studio.calls.close, 2)
  } finally { await studio.cleanup() }
})

test('generated artwork retains download, cover save and cancellation callbacks', async () => {
  const studio = await mountStudio({ generatedUrl: STUDIO_REFERENCES[0].src })
  try {
    await studio.click(studio.button('Download image'))
    await studio.click(studio.button('Save Project Cover'))
    assert.equal(studio.calls.download, 1)
    assert.equal(studio.calls.save, 1)
  } finally { await studio.cleanup() }
  const generating = await mountStudio({ isGenerating: true })
  try {
    await generating.click(generating.button('Cancel generation'))
    assert.equal(generating.calls.cancel, 1)
  } finally { await generating.cleanup() }
})

test('the complete preview fixture supports cancellable generation, saving and version restore', async context => {
  const studio = await mountStudio({ fixture: true })
  try {
    context.mock.timers.enable({ apis: ['setTimeout'] })
    await studio.click(studio.button('Generate thumbnail'))
    assert.ok(studio.button('Cancel generation'))
    await studio.click(studio.button('Cancel generation'))
    await React.act(async () => { context.mock.timers.tick(THUMBNAIL_FIXTURE_GENERATION_DELAY_MS + 1) })
    assert.equal(studio.document.querySelector('[aria-label="Generated versions"]'), null)
    await studio.click(studio.button('Generate thumbnail'))
    await React.act(async () => { context.mock.timers.tick(THUMBNAIL_FIXTURE_GENERATION_DELAY_MS) })
    assert.ok(studio.button('Save Project Cover'))
    await studio.click(studio.button('Save Project Cover'))
    assert.ok(studio.button('Cover Saved'))
    await studio.click(studio.button('9:16'))
    await studio.click(studio.button('Use frame at 00:01'))
    const headline = studio.document.querySelector('#thumbnail-headline')
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(studio.window.HTMLInputElement.prototype, 'value').set.call(headline, 'SECOND LOOK')
      headline.dispatchEvent(new studio.window.Event('input', { bubbles: true }))
    })
    await studio.click(studio.button('Generate another version'))
    await React.act(async () => { context.mock.timers.tick(THUMBNAIL_FIXTURE_GENERATION_DELAY_MS) })
    assert.equal(studio.document.querySelector('[aria-label="Generated versions"]').querySelectorAll('button').length, 2)
    await studio.click(studio.button('Restore version 1: A BETTER FIRST LOOK'))
    assert.equal(studio.button('Restore version 1: A BETTER FIRST LOOK').getAttribute('aria-pressed'), 'true')
    assert.equal(studio.document.querySelector('#thumbnail-headline').value, 'A BETTER FIRST LOOK')
    assert.equal(studio.document.querySelector('[data-ratio]').dataset.ratio, '16:9')
    assert.equal(studio.button('Use frame at 00:00').getAttribute('aria-pressed'), 'true')
  } finally { context.mock.timers.reset(); await studio.cleanup() }
})

test('the preview fixture accepts a local source upload without network requests', async () => {
  const studio = await mountStudio({ fixture: true })
  try {
    await studio.click(studio.button('Close Studio'))
    await studio.click(studio.button('Start with an uploaded source'))
    const input = studio.document.querySelector('input[aria-label="Upload source image"]')
    const image = new studio.window.File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9kAAAAASUVORK5CYII=', 'base64')], 'source.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [image], configurable: true })
    await React.act(async () => { input.dispatchEvent(new studio.window.Event('change', { bubbles: true })) })
    const deadline = Date.now() + 2000
    // Flush React after each DOM task, then observe FileReader's actual completion.
    while (!studio.document.querySelector('button[aria-label="Use frame at Uploaded"]')) {
      if (Date.now() > deadline) throw new Error('The local source upload did not reach the Studio')
      await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
    }
    assert.equal(studio.button('Use frame at Uploaded').getAttribute('aria-pressed'), 'true')
    assert.equal(studio.document.querySelector('[data-testid="thumbnail-artboard"] img').src.startsWith('data:image/png;base64,'), true)
  } finally { await studio.cleanup() }
})
