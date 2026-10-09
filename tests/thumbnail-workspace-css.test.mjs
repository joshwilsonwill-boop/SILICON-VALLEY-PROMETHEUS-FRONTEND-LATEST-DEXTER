import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import postcss from 'postcss'
import { thumbnailWorkspaceClasses as classes, thumbnailWorkspaceCss as css } from '../components/editor/thumbnail-studio/ThumbnailWorkspace.styles.ts'

const source = readFileSync('components/editor/thumbnail-studio/ThumbnailWorkspace.tsx', 'utf8')
const usedClasses = [...new Set([...source.matchAll(/styles\.([A-Za-z][A-Za-z0-9]*)/g)].map(match => match[1]))]

function assertStyleContract(stylesheet) {
  const selectors = new Set()
  postcss.parse(stylesheet).walkRules(rule => {
    for (const match of rule.selector.matchAll(/\.([A-Za-z][A-Za-z0-9-]*)/g)) selectors.add(match[1])
  })
  assert.ok(usedClasses.length > 0, 'The component must use its style contract')
  for (const name of usedClasses) {
    assert.equal(typeof classes[name], 'string', `Studio class ${name} is missing`)
    assert.ok(selectors.has(classes[name]), `Studio CSS selector ${name} is missing`)
  }
}

test('every class used by the Studio has a selector in its component-owned stylesheet', () => {
  assertStyleContract(css)
  assert.match(source, /<style data-thumbnail-studio-styles>\{thumbnailWorkspaceCss\}<\/style>/)
  assert.doesNotMatch(source, /import.*\.module\.css/)
})

test('Studio styles and animations are namespaced and responsive rules remain present', () => {
  const tree = postcss.parse(css)
  tree.walkRules(rule => {
    for (const match of rule.selector.matchAll(/\.([A-Za-z][A-Za-z0-9-]*)/g)) assert.ok(match[1].startsWith('prom-thumbnail-'))
  })
  tree.walkAtRules('keyframes', rule => assert.ok(rule.params.startsWith('prom-thumbnail-')))
  const queries = []
  tree.walkAtRules('media', rule => queries.push(rule.params))
  assert.ok(queries.includes('(max-width:800px)'), 'Mobile layout must remain available')
  assert.ok(queries.includes('(prefers-reduced-motion:reduce)'), 'Reduced motion must remain available')
  assert.ok(Object.values(classes).every(name => name.startsWith('prom-thumbnail-')))
  assert.ok(!css.includes('</style'), 'The static stylesheet must be safe to embed')
})

test('a removed Studio shell selector fails the same contract check', () => {
  assert.throws(() => assertStyleContract(css.replaceAll('.prom-thumbnail-studio', '.missingShellControl')), /Studio CSS selector studio is missing/)
})
