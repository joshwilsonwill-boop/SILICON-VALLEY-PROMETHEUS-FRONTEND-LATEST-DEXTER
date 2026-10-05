import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium, expect } from '@playwright/test'

const root = process.cwd()
const tempDir = await mkdtemp(join(tmpdir(), 'motion-timeline-header-'))
const entry = resolve('tests/fixtures/motion-timeline-header-entry.tsx')
const bundlePath = join(tempDir, 'bundle.js')
const cssPath = join(tempDir, 'style.css')
const inputPath = join(tempDir, 'input.css')
const empty = 'export const StyleCloneCard=()=>null; export const ReferenceCaptionOverlay=()=>null; export const EditorialAudioPreview=()=>null; export const EditorialSyncStatus=()=>null;'
let server
let browser

try {
  await build({
    entryPoints: [entry], bundle: true, outfile: bundlePath, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'isolate-editor-services', setup(build) {
      build.onResolve({ filter: /use-editorial-timeline$/ }, args => ({ path: args.path, namespace: 'timeline-mock' }))
      build.onLoad({ filter: /.*/, namespace: 'timeline-mock' }, () => ({ contents: `import React from 'react'; export function useEditorialTimeline(){const [timeline,setTimeline]=React.useState({cues:[],effects:[]}); return {timeline, projectId:'preview', patch:patch=>setTimeline(current=>({...current,...(patch.type==='cues'?{cues:patch.cues}:{})}))}}`, loader: 'js', resolveDir: root }))
      build.onResolve({ filter: /\/(style-clone-card|reference-caption-overlay|editorial-audio-preview|editorial-sync-status)$/ }, args => ({ path: args.path, namespace: 'empty' }))
      build.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: empty, loader: 'js', resolveDir: root }))
      build.onResolve({ filter: /\/(editorial-timeline-client|reference-controls|autonomous-store)$/ }, args => ({ path: args.path, namespace: 'unused' }))
      build.onLoad({ filter: /.*/, namespace: 'unused' }, () => ({ contents: 'export const getEditorialTimelineController=()=>({}); export const applyReferenceStyleToController=()=>({}); export const useAutonomousStore={getState:()=>({})};', loader: 'js' }))
    } }],
  })
  await writeFile(inputPath, `@import "${resolve('node_modules/tailwindcss/index.css').replaceAll('\\', '/')}" source(none);\n@source "${resolve('components/editor').replaceAll('\\', '/')}";\n`)
  const tailwind = spawnSync(process.execPath, [resolve('node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', inputPath, '-o', cssPath], { cwd: root, encoding: 'utf8' })
  assert.equal(tailwind.status, 0, `Tailwind build failed: ${tailwind.error?.message ?? tailwind.stderr}`)
  const [bundle, css] = await Promise.all([readFile(bundlePath), readFile(cssPath, 'utf8')])
  server = createServer((request, response) => {
    if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle); return }
    response.setHeader('Content-Type', 'text/html')
    response.end(`<html><head><style>${css}body{margin:0}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const installedChromium = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1223', 'chrome-win64', 'chrome.exe')
  browser = await chromium.launch({ headless: true, ...(existsSync(installedChromium) ? { executablePath: installedChromium } : {}) })
  const page = await browser.newPage({ viewport: { width: 1440, height: 680 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const headerDetails = page.locator('[data-motion-header-details]')
  const framingControls = page.locator('[data-motion-framing-controls]')
  const previewStage = page.locator('[data-motion-preview-stage]')
  const previewFrame = page.locator('[style*="--motion-preview-aspect"]')
  const exportButton = page.getByRole('button', { name: 'Export', exact: true })
  const mediaTool = page.getByRole('button', { name: 'Media', exact: true })
  const separator = page.getByRole('separator', { name: 'Resize timeline panel' })
  await expect(headerDetails).toBeVisible()
  await expect(framingControls).toBeVisible()
  const initial = await previewStage.boundingBox()
  const initialFrame = await previewFrame.boundingBox()
  const initialControls = await framingControls.boundingBox()
  const handle = await separator.boundingBox()
  assert.ok(initial && initialFrame && initialControls && handle)
  const x = handle.x + handle.width / 2
  const y = handle.y + handle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y - 36, { steps: 6 })
  const partialOpacity = await headerDetails.evaluate(element => Number(getComputedStyle(element).opacity))
  assert.ok(partialOpacity > 0 && partialOpacity < 1, `expected progressive fade, got ${partialOpacity}`)
  await page.mouse.move(x, y - 80, { steps: 7 })
  await page.mouse.up()
  const expanded = await previewStage.boundingBox()
  const expandedFrame = await previewFrame.boundingBox()
  const collapsedControls = await framingControls.boundingBox()
  assert.ok(expanded && expandedFrame && collapsedControls)
  assert.ok(expanded.y < initial.y - 25, `preview did not move up: ${initial.y} -> ${expanded.y}`)
  assert.ok(expanded.height > initial.height + 25, `preview did not grow: ${initial.height} -> ${expanded.height}`)
  assert.ok(expandedFrame.height > initialFrame.height + 25, `portrait video frame did not grow: ${initialFrame.height} -> ${expandedFrame.height}`)
  assert.ok(collapsedControls.height < initialControls.height / 4, `framing controls still occupy header space: ${collapsedControls.height}`)
  assert.equal(await headerDetails.evaluate(element => getComputedStyle(element).opacity), '0')
  assert.equal(await framingControls.evaluate(element => getComputedStyle(element).opacity), '0')
  await expect(headerDetails).toHaveAttribute('inert', '')
  await expect(framingControls).toHaveAttribute('inert', '')
  await expect(exportButton).toBeVisible()
  await expect(mediaTool).toBeVisible()
  await separator.focus()
  await page.keyboard.press('PageUp')
  const covered = await previewStage.boundingBox()
  assert.ok(covered && Math.abs(covered.height - expanded.height) < 1, 'preview should stop growing after header controls collapse')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('PageDown')
  await page.keyboard.press('PageDown')
  const restored = await framingControls.boundingBox()
  assert.ok(restored && restored.height > initialControls.height * 0.8, 'framing controls did not return after reducing timeline height')
  await expect(headerDetails).toBeVisible()
  await mediaTool.click()
  await expect(page.getByRole('button', { name: 'Replace source media' })).toBeVisible()
  await expect(exportButton).toBeVisible()
  assert.deepEqual(errors, [])
  console.log('motion timeline header collapse: browser checks passed')
} finally {
  if (browser) await browser.close()
  if (server) await new Promise(resolve => server.close(resolve))
  await rm(tempDir, { recursive: true, force: true })
}
