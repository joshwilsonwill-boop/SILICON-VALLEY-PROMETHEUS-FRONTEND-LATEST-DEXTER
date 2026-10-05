import assert from 'node:assert/strict'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const baseUrl = process.env.STUDIO_URL ?? 'http://localhost:3000/'

try {
  for (const [name, width, height] of [['desktop', 1100, 720], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    const heading = page.locator('h1[aria-label="Ready to Create Something New?"]')
    await heading.waitFor({ timeout: 90_000 })
    await page.locator('header.prometheus-masthead a[aria-label="Prometheus Studio home"] img').waitFor()

    assert.equal(await page.locator('header.prometheus-masthead').count(), 1, `${name}: one Studio masthead`)
    const metrics = await heading.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, font: style.fontFamily, fontSize: style.fontSize }
    })
    assert.ok(metrics.left >= -1 && metrics.right <= width + 1, `${name}: heading fits viewport: ${JSON.stringify(metrics)}`)
    assert.ok(!metrics.font.includes('var('), `${name}: Studio display font resolves: ${metrics.font}`)
    assert.equal(await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth), true, `${name}: no horizontal page overflow`)

    const consent = page.locator('section[aria-label="Cookie consent"]')
    if (await consent.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) {
      await consent.getByRole('button', { name: 'Reject Non-Essential' }).click()
      await consent.waitFor({ state: 'hidden' })
    }
    await page.screenshot({ path: join(tmpdir(), `prometheus-studio-restored-${name}.png`), fullPage: false })

    const help = page.getByRole('button', { name: 'Open Prometheus help' })
    await help.click()
    await page.getByRole('dialog', { name: 'Prometheus help' }).waitFor()
    assert.equal(await page.getByRole('button', { name: /Production guides/ }).count(), 1, `${name}: help destinations remain available`)
    console.log(`${name}: one masthead, resolved ${metrics.font}, heading within viewport, help opens`)
    await page.close()
  }
  console.log('studio visual runtime verification passed')
} finally {
  await browser.close()
}
