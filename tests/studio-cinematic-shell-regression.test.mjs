import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

function run() {
  const studioPage = read('app/studio/page.tsx')
  const landingHeader = read('components/LandingHeader.tsx')
  assert.match(studioPage, /<LandingHeader mobileNavControl=\{hamburger\} showBrandName=\{false\} \/>/)
  assert.match(landingHeader, /showBrandName\?: boolean/)
  assert.doesNotMatch(landingHeader, /showPricing|href="\/pricing"|>\s*Pricing\s*</)

  const mobileDrawerHeader = read('app/components/mobile/NavDrawerHeader.tsx')
  assert.match(mobileDrawerHeader, /rometheus/)

  const chamber = read('app/editor/[id]/page.tsx')
  assert.match(chamber, /editorial-chamber-shell/)
}

run()