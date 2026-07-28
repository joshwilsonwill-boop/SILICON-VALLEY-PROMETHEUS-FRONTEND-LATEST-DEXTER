/**
 * One-off capture: screenshots of the Prometheus editor ("editorial chamber")
 * against the local dev server on :3001 with DEV_AUTH_BYPASS.
 *
 * Run (from repo root, under WSL interop):
 *   node.exe "C:\Users\HomePC\Documents\THE FRONT END, PROMETHEUS\scripts\capture-phase2-chamber.mjs"
 *
 * Prereqs:
 *   - dev server running with env reaching the Windows process, e.g.
 *       DEV_AUTH_BYPASS=true WSLENV=DEV_AUTH_BYPASS node.exe node_modules/next/dist/bin/next dev -p 3001
 *     (without WSLENV the proxy sees no bypass and 307s to /signup)
 *   - playwright-core in repo node_modules + Windows chromium at the path below.
 *
 * Outputs (docs/audit-screenshots/):
 *   phase2-chamber-desktop.png      1440x900 full viewport
 *   phase2-chamber-rail-left.png    left icon/section sidebar
 *   phase2-chamber-rail-top.png     top chrome (utility bar + Editor/Music/Motion/Export tabs)
 *   phase2-chamber-rail.png         copy of the left rail (required-name convenience)
 *   phase2-chamber-mobile.png       390x844 mobile viewport
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

const consoleErrors = []
const pageErrors = []

function wireErrorCollection(page, tag) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${tag}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => pageErrors.push(`[${tag}] ${err.message}`))
}

/** Screenshot with a long font timeout, falling back to CDP (skips font wait). */
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

async function newAuditedContext(browser, viewport, mobile) {
  const ctx = await browser.newContext(
    mobile
      ? {
          viewport,
          isMobile: true,
          hasTouch: true,
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        }
      : { viewport },
  )
  await ctx.addCookies([
    { name: 'prometheus-dev-auth-bypass', value: '1', domain: 'localhost', path: '/' },
  ])
  // Pre-seed cookie consent so the banner doesn't cover the chrome under audit.
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
  return ctx
}

async function loadEditor(page, tag) {
  let lastErr
  for (let i = 1; i <= 3; i++) {
    try {
      // DO NOT use networkidle — realtime/websockets keep it from settling.
      await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      console.log(`[${tag}] nav attempt ${i} failed: ${err.message.split('\n')[0]}`)
      await page.waitForTimeout(5000)
    }
  }
  if (lastErr) throw lastErr

  const probes = ['canvas', '[aria-label="Editor navigation"]', 'header', 'button[aria-label="Open editor menu"]']
  let hit = null
  for (const sel of probes) {
    try {
      await page.waitForSelector(sel, { state: 'visible', timeout: 15000 })
      hit = sel
      break
    } catch {}
  }
  console.log(`[${tag}] hydration probe hit: ${hit ?? 'none'}; final URL: ${page.url()}`)
  await page.waitForTimeout(8000) // let the huge client component settle
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
try {
  // ---------- Desktop 1440x900 ----------
  const VW = 1440
  const VH = 900
  const ctx = await newAuditedContext(browser, { width: VW, height: VH }, false)
  const page = await ctx.newPage()
  wireErrorCollection(page, 'desktop')
  await loadEditor(page, 'desktop')
  console.log(`desktop title: ${await page.title()}`)

  await shot(page, { path: path.join(OUT_DIR, 'phase2-chamber-desktop.png') })

  // Left tool rail: the outer Editor navigation aside.
  const leftRail = page.locator('aside[aria-label="Editor navigation"]').first()
  if (await leftRail.isVisible().catch(() => false)) {
    const box = await leftRail.boundingBox()
    if (box) {
      await shot(page, {
        path: path.join(OUT_DIR, 'phase2-chamber-rail-left.png'),
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, VW),
          height: Math.min(box.height, VH),
        },
      })
    }
  } else {
    console.log('WARN: left rail aside not visible')
  }

  // Top chrome: union of both stacked headers (utility bar + tabs bar).
  const headerBoxes = await page
    .locator('header')
    .evaluateAll((els) =>
      els
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return r.width > 10 && r.height > 10 && cs.display !== 'none' && cs.visibility !== 'hidden'
        })
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }
        }),
    )
  if (headerBoxes.length > 0) {
    const u = {
      x: Math.min(...headerBoxes.map((b) => b.x)),
      y: Math.min(...headerBoxes.map((b) => b.y)),
      right: Math.max(...headerBoxes.map((b) => b.right)),
      bottom: Math.max(...headerBoxes.map((b) => b.bottom)),
    }
    await shot(page, {
      path: path.join(OUT_DIR, 'phase2-chamber-rail-top.png'),
      clip: {
        x: Math.max(0, u.x),
        y: Math.max(0, u.y),
        width: Math.min(u.right - u.x, VW),
        height: Math.min(u.bottom - u.y, VH),
      },
    })
  } else {
    console.log('WARN: no header elements found')
  }

  // Required-name convenience copy.
  const railLeft = path.join(OUT_DIR, 'phase2-chamber-rail-left.png')
  if (fs.existsSync(railLeft)) {
    fs.copyFileSync(railLeft, path.join(OUT_DIR, 'phase2-chamber-rail.png'))
    console.log('phase2-chamber-rail.png = copy of phase2-chamber-rail-left.png')
  }
  await ctx.close()

  // ---------- Mobile 390x844 ----------
  const mctx = await newAuditedContext(browser, { width: 390, height: 844 }, true)
  const mpage = await mctx.newPage()
  wireErrorCollection(mpage, 'mobile')
  await loadEditor(mpage, 'mobile')
  await shot(mpage, { path: path.join(OUT_DIR, 'phase2-chamber-mobile.png') })
  await mctx.close()
} finally {
  await browser.close()
}

console.log('\n--- console errors (unique, first 20) ---')
;[...new Set(consoleErrors)].slice(0, 20).forEach((e) => console.log(e))
console.log('--- page errors (first 10) ---')
pageErrors.slice(0, 10).forEach((e) => console.log(e))
console.log('DONE')
