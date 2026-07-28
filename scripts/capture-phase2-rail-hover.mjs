/**
 * One-off throwaway: captures the NEW editor rail in its hover-EXPANDED state
 * (the static capture script only shows the collapsed rail; expansion is
 * hover/focus-within driven by a spring animation).
 *
 * Run:
 *   node.exe "C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS\scripts\capture-phase2-rail-hover.mjs"
 *
 * Prereqs identical to capture-phase2-chamber.mjs (dev server :3001 w/ DEV_AUTH_BYPASS).
 * Outputs: docs/audit-screenshots/phase2-chamber-rail-expanded.png
 *          docs/audit-screenshots/phase2-chamber-desktop.png (full viewport, rail expanded)
 */
import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const CHROME =
  'C:\\Users\\HomePC\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe'
const BASE = 'http://localhost:3001'
const ROUTE = '/editor/visual-audit-project?devAuthBypass=1'
const OUT_DIR = path.join(process.cwd(), 'docs', 'audit-screenshots')

fs.mkdirSync(OUT_DIR, { recursive: true })

async function shot(page, opts) {
  try {
    await page.screenshot({ ...opts, timeout: 90000 })
  } catch (err) {
    console.log(`screenshot timeout, CDP fallback for ${path.basename(opts.path)}: ${err.message.split('\n')[0]}`)
    const session = await page.context().newCDPSession(page)
    try {
      const params = { format: 'png' }
      if (opts.clip) params.clip = { ...opts.clip, scale: 1 }
      const { data } = await session.send('Page.captureScreenshot', params)
      fs.writeFileSync(opts.path, Buffer.from(data, 'base64'))
    } finally {
      await session.detach()
    }
  }
  console.log(`saved ${path.basename(opts.path)}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addCookies([
    { name: 'prometheus-dev-auth-bypass', value: '1', domain: 'localhost', path: '/' },
  ])
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'prometheus_cookie_consent',
        JSON.stringify({
          essential: true,
          analytics: false,
          preferences: false,
          marketing: false,
          timestamp: new Date().toISOString(),
          version: '1.0',
        }),
      )
    } catch {}
  })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`))
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('aside[aria-label="Premium editor navigation"]', {
    state: 'visible',
    timeout: 30000,
  })
  await page.waitForTimeout(2500) // settle chrome / fonts / editor boot

  const rail = page.locator('aside[aria-label="Premium editor navigation"]')
  await rail.hover({ position: { x: 36, y: 200 } })
  await page.waitForTimeout(900) // let the width spring finish

  const box = await rail.boundingBox()
  console.log(`expanded rail bbox: ${JSON.stringify(box)}`)
  await shot(page, {
    path: path.join(OUT_DIR, 'phase2-chamber-rail-expanded.png'),
    clip: { x: 0, y: 0, width: 320, height: 900 },
  })

  // Full viewport with the rail still expanded (hover persists on the virtual mouse).
  await shot(page, { path: path.join(OUT_DIR, 'phase2-chamber-desktop.png') })
  await ctx.close()
} finally {
  await browser.close()
}
console.log('DONE')
