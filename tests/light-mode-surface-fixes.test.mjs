import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const css = require('postcss').parse(readFileSync('app/light-mode.css', 'utf8'))
function declarations(fragment) {
  const found = {}
  css.walkRules(rule => {
    if (rule.selector.includes(fragment)) rule.walkDecls(decl => { found[decl.prop] = decl.value })
  })
  return found
}
css.walkRules(rule => {
  for (const selector of rule.selectors) assert.ok(selector.startsWith("html[data-color-mode='light']"), `Rule must preserve dark mode: ${selector}`)
})
for (const edge of ['left-0', 'right-0']) {
  const fade = declarations(`.studio-cinematic-rails > .${edge}`)
  assert.match(fade.background ?? '', /linear-gradient\(.+var\(--theme-background\).+transparent/)
}
const separator = declarations('[data-workspace-sidebar]::after')
assert.equal(separator.width, '1px')
assert.equal(separator.background, 'var(--theme-border)')
assert.equal(separator['pointer-events'], 'none')
assert.match(readFileSync('components/dashboard-sidebar.tsx', 'utf8'), /data-workspace-sidebar/)
assert.equal(declarations('.prom-cine-overlay').background, 'var(--theme-background)')
assert.equal(declarations('.prom-cine-backdrop').background, 'none')
assert.equal(declarations('.prom-cine-logo video').filter, 'brightness(0)')
assert.equal(declarations('[data-editor-backdrop]').background, 'none')
assert.match(readFileSync('app/editor/[id]/page.tsx', 'utf8'), /data-editor-backdrop/)
const motionRoot = css.nodes.find(rule => rule.type === 'rule' && rule.selector === "html[data-color-mode='light'] [data-motion-chamber]")
assert.ok(motionRoot, 'Motion must opt its own radial canvas into the theme')
const motion = Object.fromEntries(motionRoot.nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]))
assert.equal(motion.background, 'var(--theme-background)')
assert.equal(declarations('[data-motion-panel="transcript"]').background, 'var(--theme-surface)')
assert.match(readFileSync('components/editor/motion-edit-workspace.tsx', 'utf8'), /data-motion-panel="transcript"/)
assert.equal(declarations('[data-motion-preview-stage] [data-theme-independent="media"]')['box-shadow'], 'none', 'The video frame is not an elevated panel')

function luminance(hex) {
  const c = hex.match(/[\da-f]{2}/gi).map(n => parseInt(n, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
for (const surface of ['#FFFFFF', '#F6F7FB', '#EDF0F5']) {
  assert.ok(contrast(motion['--motion-accent-ink'], surface) >= 4.5, `Motion green text contrast on ${surface}`)
  assert.ok(contrast(motion['--motion-accent-line'], surface) >= 3, `Motion active edge contrast on ${surface}`)
}
// A positive control ensures the contrast oracle rejects the original neon.
assert.ok(contrast('#b4fb60', '#EDF0F5') < 4.5)
console.log('light mode surface fixes checks passed')
