import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const canvas = read('components/assets/brand-canvas.tsx')
assert.match(canvas, /Growth strategy/)
assert.match(canvas, /Type & motion/)
assert.match(canvas, /Brand palette/)
assert.match(canvas, /Brand assets/)
assert.match(canvas, /contentEditable/)
assert.match(canvas, /Brand voice/)
assert.match(canvas, /Voice choices/)
assert.match(canvas, /bg-\[linear-gradient\(135deg,#1b123b_0%,#33206f_48%,#202f89_100%\)\]/)
assert.doesNotMatch(canvas, /mailto:hello@prometheus\.studio/)

const assetsPage = read('app/assets/page.tsx')
assert.match(assetsPage, /snap-y snap-mandatory/)

const library = read('components/assets/library-collection.tsx')
assert.match(library, /snap-start snap-always/)

console.log('brand canvas interaction regression checks passed')
