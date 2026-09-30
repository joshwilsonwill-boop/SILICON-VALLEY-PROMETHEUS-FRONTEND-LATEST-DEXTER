import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')
const runNode = (script) => execFileSync(process.execPath, [script], { cwd: root, stdio: 'inherit' })

function verifyStyles() {
  runNode('tests/front-surface-sync-regression.test.mjs')
  console.log('style preview verification passed')
}

function verifyLibrary() {
  runNode('tests/front-surface-sync-regression.test.mjs')
  console.log('creator library verification passed')
}

function verifyScroll() {
  runNode('tests/front-surface-sync-regression.test.mjs')
  console.log('scroll synchronization verification passed')
}

function verifyColor() {
  runNode('tests/front-surface-sync-regression.test.mjs')
  const vignette = read('app/premium-vignette.css')
  if (/rgba\(255, 86, 86|rgba\(255, 210, 92/.test(vignette)) {
    throw new Error('Music vignette still contains the old red and yellow accent system')
  }
  if (!/rgba\(77, 157, 255/.test(vignette)) {
    throw new Error('Music vignette is not synchronized to the editorial-blue interaction accent')
  }
  console.log('editor color synchronization verification passed')
}

function verifyRegressions() {
  for (const script of [
    'tests/front-surface-sync-regression.test.mjs',
    'tests/brand-canvas-interaction-regression.test.mjs',
    'tests/music-chat-interaction-regression.test.mjs',
    'tests/music-chat-motion-regression.test.mjs',
    'tests/motion-workspace-layout-regression.test.mjs',
  ]) runNode(script)
  execFileSync(process.execPath, [
    '--max-old-space-size=4096',
    'node_modules/typescript/bin/tsc',
    '--noEmit',
  ], { cwd: root, stdio: 'inherit' })
  console.log('front surface regressions passed')
}

async function verifyRuntime() {
  const baseUrl = process.env.PROMETHEUS_VERIFY_BASE_URL || 'http://localhost:3015'
  const boundary = await fetch(`${baseUrl}/assets`, { redirect: 'manual' })
  if (boundary.status >= 500 || ![200, 307, 308].includes(boundary.status)) {
    throw new Error(`Unexpected Brand Center status: ${boundary.status}`)
  }

  const styleSource = read('lib/styles/style-templates.ts')
  const previewPaths = [...styleSource.matchAll(/previewImages:\s*\['([^']+)'/g)].map((match) => match[1])
  const creatorPaths = [
    '/library/alex-hormozi/hero.jpg',
    '/library/alex-hormozi/behind-scenes.jpg',
    '/library/alex-hormozi/offers.jpg',
    '/library/alex-hormozi/sales.jpg',
    '/library/alex-hormozi/consistency.jpg',
    '/library/alex-hormozi/keynote.jpg',
    '/library/alex-hormozi/business-2026.jpg',
  ]

  for (const assetPath of [...new Set([...previewPaths, ...creatorPaths])]) {
    const response = await fetch(`${baseUrl}${assetPath}`)
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      throw new Error(`Local image failed at runtime: ${assetPath} (${response.status})`)
    }
  }

  console.log('local runtime verification passed')
}

const mode = process.argv[2]
if (mode === '--styles') verifyStyles()
else if (mode === '--library') verifyLibrary()
else if (mode === '--scroll') verifyScroll()
else if (mode === '--color') verifyColor()
else if (mode === '--regressions') verifyRegressions()
else if (mode === '--runtime') await verifyRuntime()
else throw new Error('Expected --styles, --library, --scroll, --color, --regressions, or --runtime')
