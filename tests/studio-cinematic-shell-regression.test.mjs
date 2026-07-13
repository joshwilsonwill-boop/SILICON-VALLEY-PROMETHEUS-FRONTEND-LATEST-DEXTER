import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

function run() {
  const studioPage = read('app/studio/page.tsx')
  const landingHeader = read('components/LandingHeader.tsx')
  assert.match(studioPage, /<LandingHeader mobileNavControl=\{hamburger\} showPricing=\{false\} \/>/)
  assert.match(landingHeader, /showPricing\?: boolean/)
  assert.match(landingHeader, /showPricing && \(/)

  const sidebar = read('components/editor/sidebar/editor-sidebar-v2.tsx')
  assert.match(sidebar, /from 'next\/image'/)
  assert.match(sidebar, /src="\/branding\/prometheus-logo-no-bg\.png"/)
  assert.match(sidebar, /editor-sidebar-brand__shader/)
  assert.equal(sidebar.includes('>Prometheus</p>'), false)
  assert.equal(sidebar.includes('>Editor</p>'), false)

  const globals = read('app/globals.css')
  assert.match(globals, /\.editor-sidebar-brand__shader/)
  assert.match(globals, /@keyframes editor-sidebar-logo-shader/)
  assert.match(globals, /prefers-reduced-motion: reduce/)

  const chamber = read('app/editor/[id]/page.tsx')
  assert.match(chamber, /editorial-chamber-shell/)
  assert.equal(chamber.includes('premium-ambient-panel premium-vignette-surface editorial-light-effect'), false)
  assert.equal(chamber.includes("<LuxuryVignette tone={activeWorkspaceTab === 'Music' ? 'music' : 'cool'} />"), false)

  const styles = read('app/premium-vignette.css')
  assert.match(styles, /\.editorial-chamber-shell/)
  assert.match(styles, /background:\s*radial-gradient\(ellipse at 50% 42%, #080808 0%, #000 68%\)/)
  assert.match(styles, /radial-gradient\(ellipse at 50% 42%/)
}

run()
