import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const { chromium } = require('@playwright/test')
const root = process.cwd()
mkdirSync(resolve('.tmp'), { recursive: true })
const dir = mkdtempSync(resolve('.tmp/preview-contrast-'))
let browser, server

try {
  // Render the real preview and transport; only unrelated preview services are isolated.
  await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {PreviewCanvas} from './components/editor/PreviewCanvas';
      import {TimelinePanel} from './components/editor/TimelinePanel';
      import {ViralClipTrigger} from './components/editor/viral-clip-trigger';
      import {EditorialDeliveryStudio} from './components/editor/editorial-delivery-studio';
      import {themeCssVariables} from './lib/theme/theme-tokens';
      window.setMode = mode => {
        document.documentElement.dataset.colorMode = mode;
        document.documentElement.classList.toggle('dark', mode === 'dark');
        Object.entries(themeCssVariables('obsidian', mode)).forEach(([key,value]) => document.documentElement.style.setProperty(key,value));
      };
      window.setMode('light');
      function Review() {
        const [playing,setPlaying] = React.useState(false);
        const video = React.useRef(null);
        const toggle = () => setPlaying(value => !value);
        const noop = () => {};
        return <main style={{padding:32,maxWidth:1200,margin:'auto'}}>
          <div style={{display:'flex',justifyContent:'end',marginBottom:24}}><ViralClipTrigger onActivate={() => window.clipClicked = true}/></div>
          <PreviewCanvas activeWorkspaceTab="Editor" projectId="contrast-fixture" project={null} job={null}
            hasSourceAsset hasPreviewMedia clipModeActive sourceAssetLabel="Preview" previewOverlayPlan={null}
            previewCurrentTimeSec={1} transportCurrentTime="0:01" transportTime="0:33" showViralClipSplitPreview={false}
            previewUrl="/fixture.svg" previewKind="image" previewPlaying={playing} fitMode="fit" currentSplitPreviewAssets={{}}
            previewVideoRef={video} visiblePreviewAspectRatio={16/9} previewFrameWidth="100%"
            onTogglePreviewPlayback={toggle} onPreviewImageLoaded={noop}
            comparisonControl={<EditorialDeliveryStudio presentation="preview" projectId="contrast-fixture" sourceAssetId="source" sourceUrl="/fixture.svg" projectTitle="Preview" currentTimeSec={1} durationSec={33}/>}/>
          <div style={{marginTop:32}}><TimelinePanel activeWorkspaceTab="Editor" previewKind="video" previewUrl="/fixture.svg"
            previewPlaying={playing} transportCurrentTime="0:01" transportTime="0:33" transportProgress={3}
            isPreviewMuted={false} durationSec={33} onTogglePlayback={toggle} onSeek={noop} onToggleMute={noop}/></div>
        </main>;
      }
      createRoot(document.getElementById('root')).render(<Review/>);
    `, resolveDir: root, loader: 'tsx' },
    outfile: `${dir}/bundle.js`, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolate-preview-services', setup(bundler) {
      const mocks = {
        '@/components/loading-animation': 'export const InlineLoadingAnimation=()=>null;',
        '@/components/editor/cinematic-preview-runtime': 'export const CinematicPreviewRuntime=({children,className})=><div className={className}>{children}</div>;',
        '@/components/editor/viral-clip-split-preview': 'export const ViralClipSplitPreview=()=>null;',
        '@/components/editor/preview-generation-state': 'export const PreviewGenerationState=()=>null;',
        '@/components/editor/preview-feedback-shell': 'export const PreviewFeedbackShell=()=>null;',
        '@/components/editor/source-stage-placeholder': 'export const SourceStagePlaceholder=()=>null;',
        '@/components/editor/mini-run-live-overlay': 'export const MiniRunLiveOverlay=()=>null;',
        '@/hooks/use-editorial-timeline': 'export const useEditorialTimeline=()=>({timeline:null,status:"idle"});',
      }
      bundler.onResolve({ filter: /^@\// }, args => args.path in mocks ? { path: args.path, namespace: 'preview-service' } : undefined)
      bundler.onLoad({ filter: /.*/, namespace: 'preview-service' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }))
    } }],
  })
  const cssPath = file => resolve(file).replaceAll('\\', '/')
  const sources = ['components/editor/PreviewCanvas.tsx', 'components/editor/TimelinePanel.tsx', 'components/editor/viral-clip-trigger.tsx', 'components/editor/editorial-delivery-studio.tsx']
  const css = readFileSync('app/globals.css', 'utf8')
    .replace("@import 'tailwindcss';", `@import '${cssPath('node_modules/tailwindcss/index.css')}' source(none);`)
    .replace("@import 'tw-animate-css';", `@import '${cssPath('node_modules/tw-animate-css/dist/tw-animate.css')}';`)
    .replace("@import './light-mode.css';", `@import '${cssPath('app/light-mode.css')}';`)
    + sources.map(file => `\n@source '${cssPath(file)}';`).join('')
  writeFileSync(`${dir}/input.css`, css)
  const compiled = spawnSync(process.execPath, [resolve('node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', `${dir}/input.css`, '-o', `${dir}/style.css`], { encoding: 'utf8', timeout: 60000 })
  assert.equal(compiled.status, 0, compiled.stderr)
  server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(readFileSync(`${dir}/bundle.js`)); return }
    if (req.url === '/fixture.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><path fill="#fff" d="M0 0h320v360H0z"/><path fill="#111" d="M320 0h320v360H320z"/></svg>'); return }
    if (req.url.includes('/exports/history')) { res.setHeader('Content-Type', 'application/json'); res.end('{"exports":[]}'); return }
    res.setHeader('Content-Type', 'text/html')
    res.end(`<html><head><style>${readFileSync(`${dir}/style.css`, 'utf8')}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`)
  })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const play = () => page.getByRole('button', { name: 'Play preview', exact: true }).first()
  const panel = page.locator('.glass-panel').first()
  await play().waitFor()
  await page.locator('img').first().hover()
  await page.waitForTimeout(350)

  // Composite real computed colors through translucent ancestors, then use WCAG luminance.
  async function contrast(locator) {
    return locator.evaluate(element => {
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
      canvas.width = canvas.height = 1;
      const rgba = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle=color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v); };
      const over = (a,b) => a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])).concat(1);
      const chain=[]; for(let node=element;node;node=node.parentElement) chain.unshift(node);
      let background=[255,255,255,1];
      for(const node of chain) background=over(rgba(getComputedStyle(node).backgroundColor),background);
      const foreground=over(rgba(getComputedStyle(element).color),background);
      const luminance = color => color.slice(0,3).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[0.2126,0.7152,0.0722][i],0);
      const a=luminance(foreground),b=luminance(background);
      return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    })
  }
  const expand = page.getByRole('button', { name: 'Expand preview', exact: true })
  const time = panel.locator('span.font-mono')
  const measurements = {
    play: await contrast(play()),
    expand: await contrast(expand),
    currentTime: await contrast(time.first()),
    duration: await contrast(time.last()),
  }
  console.log('Light preview contrast:', measurements)
  if (process.env.PREVIEW_CONTRAST_SCREENSHOTS) await page.screenshot({ path: resolve('.tmp/preview-controls-light.png') })
  assert.ok(measurements.play >= 3, 'Play icon must contrast with its button by at least 3:1')
  assert.ok(measurements.expand >= 3, 'Expand icon must contrast with the floating panel by at least 3:1')
  assert.ok(measurements.currentTime >= 4.5 && measurements.duration >= 4.5, 'Both preview time labels must reach 4.5:1 contrast')
  assert.equal(await play().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(3, 105, 161)', 'Play needs a visible filled accent button')
  await play().click()
  const pause = page.getByRole('button', { name: 'Pause preview', exact: true }).first()
  assert.ok(await contrast(pause) >= 3)
  await pause.focus()
  await page.keyboard.press('Space')
  assert.equal(await play().count(), 1)
  assert.equal(await play().evaluate(el => getComputedStyle(el).outlineStyle), 'solid', 'Keyboard focus must remain visible')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Pause preview', exact: true }).first().click()
  await expand.hover()
  assert.ok(await contrast(expand) >= 3, 'Expand hover must remain readable')
  await expand.click()
  const fullscreen = page.getByRole('dialog', { name: 'Expanded preview' })
  await fullscreen.waitFor()
  assert.ok(await fullscreen.getAttribute('data-theme-independent'))
  await page.keyboard.press('Escape')
  assert.equal(await fullscreen.count(), 0)
  // Footage keeps the original black backing independently of the light control panel.
  assert.equal(await page.locator('img').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)')
  for (const label of ['Play preview', 'Mute preview', 'Step one frame back', 'Step one frame forward', 'Split clip at playhead']) {
    assert.ok(await contrast(page.getByRole('button', { name: label, exact: true }).last()) >= 3, `${label}: timeline icon contrast`)
  }
  const clip = page.getByRole('button', { name: 'Clip long-form content into viral cuts' })
  await clip.hover()
  await page.waitForTimeout(350)
  assert.ok(await contrast(clip.locator('svg')) >= 3, 'Quick Clip scissors must remain readable')
  await clip.click()
  assert.equal(await page.evaluate(() => window.clipClicked), true)
  await page.evaluate(() => window.setMode('dark'))
  await page.locator('img').first().hover()
  await page.waitForTimeout(350)
  if (process.env.PREVIEW_CONTRAST_SCREENSHOTS) await page.screenshot({ path: resolve('.tmp/preview-controls-dark.png') })
  assert.ok(await contrast(play()) >= 3, 'Dark preview play icon remains readable')
  await page.evaluate(() => window.setMode('light'))
  await page.setViewportSize({ width: 1024, height: 768 })
  await play().focus()
  const bounds = await play().boundingBox()
  assert.equal(bounds.width, 48)
  assert.equal(bounds.height, 48)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  assert.deepEqual(errors, [])
  console.log('Preview controls passed: contrast, playback, keyboard focus, fullscreen, media preservation, timeline, Quick Clip, both themes and tablet width.')
} finally {
  if (browser) await browser.close()
  if (server) await new Promise(done => server.close(done))
  rmSync(dir, { recursive: true, force: true })
}
