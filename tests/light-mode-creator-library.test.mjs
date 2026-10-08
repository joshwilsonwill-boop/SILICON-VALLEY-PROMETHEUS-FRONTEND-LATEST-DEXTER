import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve, sep, extname } from 'node:path'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const { chromium } = require('@playwright/test')
const sharp = require('sharp')
const root = process.cwd()
mkdirSync(resolve('.tmp'), { recursive: true })
const dir = mkdtempSync(resolve('.tmp/library-contrast-'))
const creatorSource = readFileSync('components/assets/cinematic-library.tsx', 'utf8').match(/const FOUNDER_STRIP = (\[[\s\S]*?\]) as const/)
assert.ok(creatorSource, 'Use the actual creator data from the library')
let browser, server
try {
  await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {LibraryCollection} from './components/assets/library-collection';
      import {themeCssVariables} from './lib/theme/theme-tokens';
      window.setMode = (mode,theme='obsidian') => {
        document.documentElement.dataset.colorMode=mode;
        document.documentElement.classList.toggle('dark',mode==='dark');
        Object.entries(themeCssVariables(theme,mode)).forEach(([key,value])=>document.documentElement.style.setProperty(key,value));
      };
      window.setMode('dark');
      createRoot(document.getElementById('root')).render(<LibraryCollection onSelect={id=>window.selectedCreator=id}/>);
    `, resolveDir: root, loader: 'tsx' },
    outfile: `${dir}/bundle.js`, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolate-next-image-and-creator-data', setup(bundler) {
      const mocks = {
        'next/image': 'export default function Image({fill,sizes,...props}){return <img {...props}/>}',
        '@/components/assets/cinematic-library': `export const LIBRARY_CREATOR_CARDS=${creatorSource[1]};`,
      }
      bundler.onResolve({ filter: /^(next\/image|@\/components\/assets\/cinematic-library)$/ }, args => ({ path: args.path, namespace: 'library-fixture' }))
      bundler.onLoad({ filter: /.*/, namespace: 'library-fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: root }))
    } }],
  })
  const cssPath = file => resolve(file).replaceAll('\\', '/')
  const css = readFileSync('app/globals.css', 'utf8')
    .replace("@import 'tailwindcss';", `@import '${cssPath('node_modules/tailwindcss/index.css')}' source(none);`)
    .replace("@import 'tw-animate-css';", `@import '${cssPath('node_modules/tw-animate-css/dist/tw-animate.css')}';`)
    .replace("@import './light-mode.css';", `@import '${cssPath('app/light-mode.css')}';`)
    + `\n@source '${cssPath('components/assets/library-collection.tsx')}';`
  writeFileSync(`${dir}/input.css`, css)
  const compiled = spawnSync(process.execPath, [resolve('node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', `${dir}/input.css`, '-o', `${dir}/style.css`], { encoding: 'utf8', timeout: 60000 })
  assert.equal(compiled.status, 0, compiled.stderr)
  const publicRoot = resolve('public') + sep
  server = createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(readFileSync(`${dir}/bundle.js`)); return }
    if (req.url.startsWith('/library/')) {
      const file = resolve('public', '.' + decodeURIComponent(req.url))
      assert.ok(file.startsWith(publicRoot), 'Serve only local public artwork')
      if (!existsSync(file)) {
        // Asset-light checkouts use the brightest possible portrait backing.
        // Passing against white proves the caption scrim works for any photo.
        res.setHeader('Content-Type','image/svg+xml')
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><path fill="white" d="M0 0h600v800H0z"/></svg>'); return
      }
      res.setHeader('Content-Type', extname(file) === '.png' ? 'image/png' : 'image/jpeg')
      res.end(readFileSync(file)); return
    }
    res.setHeader('Content-Type', 'text/html')
    res.end(`<html><head><style>${readFileSync(`${dir}/style.css`, 'utf8')}html,body,#root{min-height:100vh}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`)
  })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.getByRole('heading', { name: 'Creator library' }).waitFor()
  await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())))
  await page.mouse.move(1400, 850)
  const darkBaseline = await page.screenshot({ animations: 'disabled' })
  if (process.env.LIBRARY_CONTRAST_DARK_REFERENCE) {
    const reference = resolve('.tmp/creator-library-dark-reference.png')
    if (existsSync(reference)) assert.deepEqual(darkBaseline,readFileSync(reference),'Dark-mode pixels must match the original component before the light-mode fix')
    else writeFileSync(reference,darkBaseline)
  }
  if (process.env.LIBRARY_CONTRAST_SCREENSHOTS) writeFileSync(resolve('.tmp/creator-library-dark.png'), darkBaseline)
  await page.evaluate(() => window.setMode('light'))
  await page.waitForTimeout(550)

  const probes = await page.evaluate(() => {
    const root = document.querySelector('section')
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d')
    canvas.width = canvas.height = 1
    const elements = [...root.querySelectorAll('header p, header .font-mono, header svg, button > div:last-child > div, button svg')]
    return elements.map((el, index) => {
      const bounds = el.getBoundingClientRect(), style = getComputedStyle(el)
      context.clearRect(0,0,1,1); context.fillStyle = style.color; context.fillRect(0,0,1,1)
      const rgba = [...context.getImageData(0,0,1,1).data].map((value,index)=>index===3?value/255:value)
      el.dataset.contrastProbe = index
      return { text: el.textContent || el.closest('button')?.getAttribute('aria-label') || 'Archive icon', rgba, bounds: { x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height }, icon: el.tagName.toLowerCase()==='svg' }
    })
  })
  // Read the pixels behind each glyph, including artwork and gradient scrims.
  const hide = await page.addStyleTag({ content: '[data-contrast-probe]{color:transparent!important}svg[data-contrast-probe]{visibility:hidden!important}' })
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))))
  const background = await sharp(await page.screenshot({ animations: 'disabled' })).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  await hide.evaluate(el => el.remove())
  function luminance(channels) { return channels.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0) }
  const measurements = probes.map(probe => {
    const rgba = probe.rgba, alpha = rgba[3]
    const { x,y,width,height } = probe.bounds
    let minimum = Infinity
    for (let row=Math.ceil(y);row<Math.floor(y+height);row++) for(let column=Math.ceil(x);column<Math.floor(x+width);column++) {
      const offset=(row*background.info.width+column)*4
      const pixel=[...background.data.subarray(offset,offset+3)]
      const foreground=pixel.map((channel,i)=>rgba[i]*alpha+channel*(1-alpha))
      const a=luminance(pixel),b=luminance(foreground)
      const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
      if (ratio<minimum) minimum=ratio
    }
    return { text:probe.text, contrast:Number(minimum.toFixed(2)), required:probe.icon?3:4.5 }
  })
  console.log('Light creator library contrast:', JSON.stringify(measurements))
  if (process.env.LIBRARY_CONTRAST_SCREENSHOTS) await page.screenshot({ path:resolve('.tmp/creator-library-light.png'), animations:'disabled' })
  for (const measurement of measurements) assert.ok(measurement.contrast >= measurement.required, `${measurement.text}: ${measurement.contrast}:1 is below ${measurement.required}:1`)
  await page.getByRole('button', { name:'Open Alex Hormozi archive',exact:true }).click()
  assert.equal(await page.evaluate(()=>window.selectedCreator),'uploads_0')
  const leila = page.getByRole('button', { name:'Open Leila Hormozi archive',exact:true })
  await leila.focus(); await page.keyboard.press('Enter')
  assert.equal(await page.evaluate(()=>window.selectedCreator),'uploads_1')
  const focus = await leila.evaluate(el=>({style:getComputedStyle(el).outlineStyle,color:getComputedStyle(el).outlineColor}))
  assert.equal(focus.style,'solid','Keyboard focus stays visible')
  await page.evaluate(()=>document.activeElement.blur())
  await page.mouse.move(1400,850)
  await page.evaluate(()=>window.setMode('dark'))
  await page.waitForTimeout(550)
  assert.deepEqual(await page.screenshot({animations:'disabled'}),darkBaseline,'Dark-mode pixels must remain exactly unchanged after switching back')
  await page.evaluate(()=>window.setMode('light'))
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.getByRole('button',{name:/^Open .+ archive$/}).count(),7)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Cards must fit the mobile viewport')
  if (process.env.LIBRARY_CONTRAST_SCREENSHOTS) await page.screenshot({path:resolve('.tmp/creator-library-light-mobile.png'),fullPage:true,animations:'disabled'})
  assert.deepEqual(errors,[])
  console.log('Creator library checks passed: rendered contrast, all seven creators, selection, keyboard focus, mobile width, and identical dark-mode pixels.')
} finally {
  if (browser) await browser.close()
  if (server) await new Promise(done=>server.close(done))
  assert.ok(dir.startsWith(resolve('.tmp')+sep))
  rmSync(dir,{recursive:true,force:true})
}
