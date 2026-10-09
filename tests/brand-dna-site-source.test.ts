import assert from 'node:assert/strict'
import test from 'node:test'

import { extractSiteStyleSignals, inspectPublicBrandSite, normalizeWebsiteUrl, parsePageMarkup } from '../lib/brand-dna/site-source'

test('website input is normalized and limited to standard public web protocols', () => {
  assert.equal(normalizeWebsiteUrl('danmartell.com').href, 'https://danmartell.com/')
  assert.equal(normalizeWebsiteUrl('https://danmartell.com/about#story').href, 'https://danmartell.com/about')
  assert.throws(() => normalizeWebsiteUrl('file:///etc/passwd'), /HTTP or HTTPS/)
  assert.throws(() => normalizeWebsiteUrl('https://localhost'), /publicly reachable/)
  assert.throws(() => normalizeWebsiteUrl('https://user:pass@example.com'), /login credentials/)
  assert.throws(() => normalizeWebsiteUrl('https://example.com:8443'), /standard HTTP or HTTPS port/)
})

test('site retrieval refuses loopback and private address targets before making a request', async () => {
  await assert.rejects(inspectPublicBrandSite('http://127.0.0.1'), /public website/)
  await assert.rejects(inspectPublicBrandSite('http://192.168.1.1'), /public website/)
  await assert.rejects(inspectPublicBrandSite('http://[::1]'), /public website/)
})

test('page parsing keeps page evidence, removes scripts, and only follows same-origin stylesheets', () => {
  const page = parsePageMarkup(`
    <html><head><title>Northstar Studio</title>
      <meta name="description" content="Independent coaching for founders">
      <style>:root { --brand: #174d7a; font-family: "Aptos", sans-serif; }</style>
      <link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="https://other.example/theme.css">
    </head><body><header><a class="logo">Northstar</a></header>
      <main><h1>Build a company with room to think</h1><p>We help founders buy back time.</p><img alt="Founder workshop"></main>
      <script>do not include this content</script></body></html>`, new URL('https://northstar.example/'))

  assert.equal(page.title, 'Northstar Studio')
  assert.match(page.description, /Independent coaching/)
  assert.deepEqual(page.headings, ['Build a company with room to think'])
  assert.match(page.text, /buy back time/)
  assert.doesNotMatch(page.text, /do not include this content/)
  assert.deepEqual(page.imageDescriptions, ['Founder workshop'])
  assert.equal(page.logoText, 'Northstar')
  assert.deepEqual(page.stylesheets.map((url) => url.href), ['https://northstar.example/assets/site.css'])
  assert.match(page.styleText, /#174d7a/)
})

test('style signals normalize observed hex, RGB, and HSL colors and collect declared fonts', () => {
  const signals = extractSiteStyleSignals(`
    :root { --brand-primary: #174; color: rgb(16 24 39); background: hsl(174, 50%, 40%); }
    body { font-family: "Aptos", sans-serif; }
    h1 { font-family: 'Bebas Neue', sans-serif; }
  `)
  assert.ok(signals.colors.includes('#117744'))
  assert.ok(signals.colors.includes('#101827'))
  assert.ok(signals.colors.includes('#33998f'))
  assert.deepEqual(signals.fonts.slice(0, 2), ['Aptos', 'Bebas Neue'])
})
