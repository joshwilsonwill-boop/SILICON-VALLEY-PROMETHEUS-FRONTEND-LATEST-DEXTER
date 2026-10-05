import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')
const layout = read('app/layout.tsx')
const globals = read('app/globals.css')
const rootFrame = read('components/root-layout-frame.tsx')
const home = read('app/page.tsx')
const studio = read('components/video-upload-interface.tsx')
const wordmark = read('components/brand-wordmark.tsx')
const help = read('components/global-help-launcher.tsx')

for (const face of ['migra', 'elegist', 'vogue-display', 'black-delights', 'zt-otez']) {
  assert.match(layout, new RegExp(`variable: ['"]--font-${face}['"]`), `${face} must be available to existing Studio surfaces`)
}
assert.match(globals, /\.font-elegist\s*\{\s*font-family:\s*var\(--font-elegist\)/)
assert.doesNotMatch(globals, /h1, h2, h3, h4, \.font-heading, \.font-display/)

assert.match(rootFrame, /isPublic && pathname !== '\/' \? <LandingHeader \/>/, 'home has its own masthead')
assert.doesNotMatch(home, /pt-20/, 'sticky masthead must not leave a second header-sized gap')
assert.match(studio, /<span>Ready to Create<\/span>[\s\S]*?<span>Something<\/span>/)
const studioHeading = studio.match(/<motion\.h1\s+aria-label="Ready to Create Something New\?"[\s\S]*?<\/motion\.h1>/)?.[0]
assert.ok(studioHeading, 'Studio heading should be present')
assert.match(studioHeading, /className="[^"]*flex-nowrap[^"]*whitespace-nowrap/, 'Studio title should remain on one line')

assert.ok(existsSync(join(process.cwd(), 'public/branding/prometheus-logo-no-bg.png')))
assert.match(wordmark, /src="\/branding\/prometheus-logo-no-bg\.png"/)
assert.doesNotMatch(wordmark, />P<\/span>/, 'generic tile must not replace the Prometheus mark')
assert.match(help, /rounded-full border border-white\/25 bg-white text-black/)
for (const destination of ['/docs#assistant', '/docs#editing', '/docs#getting-started', '/contact', '/docs']) {
  assert.ok(help.includes(destination), `${destination} remains reachable from help`)
}

console.log('studio visual restoration: all assertions passed')
