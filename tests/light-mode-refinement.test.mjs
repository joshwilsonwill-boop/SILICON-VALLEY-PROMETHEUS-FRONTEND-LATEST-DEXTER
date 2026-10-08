import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const postcss = require('postcss')
const { compile } = require('@tailwindcss/node')
const lightCss = postcss.parse(readFileSync('app/light-mode.css', 'utf8'))
const projects = readFileSync('components/projects/projects-page-editorial.tsx', 'utf8')
assert.ok(projects.includes('bg-[var(--project-canvas)]'), 'Projects canvas must consume the mode-specific semantic color')
assert.ok(projects.includes('bg-[var(--project-card)]'), 'Nested project tiles must consume semantic surfaces')
assert.ok(projects.includes('text-[var(--project-ink)]'), 'Project text must follow the same palette as its surfaces')
assert.ok(projects.includes('data-ui-elevation="menu"'), 'Project action menu must retain semantically justified depth')
assert.ok(projects.includes('data-ui-surface="project-card"'), 'Project content cards must be identifiable independently from menus')
const rules = [...lightCss.nodes].filter(n => n.type === 'rule')
function declarations(selectorFragment) {
  const result = {}
  lightCss.walkRules(rule => {
    if (rule.selector.includes(selectorFragment)) for (const declaration of rule.nodes ?? []) {
      if (declaration.type === 'decl') result[declaration.prop] = declaration.value
    }
  })
  return result
}
for (const rule of rules) for (const selector of rule.selectors) {
  assert.ok(selector.startsWith("html[data-color-mode='light']"), 'Shared adapters must never affect dark mode')
}
const palette = {}
lightCss.walkRules(rule => { if (rule.selector === "html[data-color-mode='light']") for (const n of rule.nodes) if (n.type === 'decl') palette[n.prop] = n.value })
assert.equal(palette['--light-ui-panel-shadow'], 'none', 'Static chrome has no decorative elevation')
assert.ok(palette['--light-ui-menu-shadow']?.includes('rgba'), 'Menus need a small separation shadow')
assert.ok(palette['--light-ui-dialog-shadow']?.includes('rgba'), 'Dialogs need a distinct overlay elevation')
assert.ok(declarations('[data-ui-elevation="menu"]')['box-shadow']?.includes('--light-ui-menu-shadow'))
assert.ok(declarations('[data-ui-elevation="dialog"]')['box-shadow']?.includes('--light-ui-dialog-shadow'))
assert.ok(declarations('[data-ui-surface="project-card"]')['box-shadow'] === 'none')
assert.ok(declarations(':focus-visible')['outline-color']?.includes('--theme-accent'), 'Keyboard focus uses the actual chosen accent')
assert.ok(readFileSync('components/editor/PreviewCanvas.tsx', 'utf8').includes('data-theme-independent="media"'), 'The video stage is intentional dark media, not a light-mode omission')
assert.ok(readFileSync('components/ui/dialog.tsx', 'utf8').includes('data-ui-elevation="dialog"'), 'Shared dialog primitives opt into overlay depth')
// Compile real Tailwind utilities: arbitrary CSS variables must emit colors,
// including alpha modifiers and hover states, rather than typography rules.
const utilityNames = [
  'bg-[var(--project-canvas)]', 'bg-[var(--project-card)]/78',
  'text-[var(--project-ink)]', 'text-[color:var(--light-ui-muted,rgba(255,255,255,0.7))]',
  'border-[var(--project-line)]/45', 'hover:bg-[var(--project-inverse)]',
]
const compiler = await compile('@import "tailwindcss";', {base:process.cwd(), onDependency:()=>{}})
const utilities = postcss.parse(compiler.build(utilityNames))
for (const [name,property,variable] of [
  [utilityNames[0],'background-color','--project-canvas'],
  [utilityNames[1],'background-color','--project-card'],
  [utilityNames[2],'color','--project-ink'],
  [utilityNames[3],'color','--light-ui-muted'],
  [utilityNames[4],'border-color','--project-line'],
  [utilityNames[5],'background-color','--project-inverse'],
]) {
  let emitted=false
  utilities.walkDecls(property,d=>{ if(d.value.includes(variable)) emitted=true })
  assert.ok(emitted, `${name} must produce ${property} using the semantic variable`)
}
const source = ts.transpileModule(readFileSync('lib/theme/theme-tokens.ts', 'utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText
const compiledModule = {exports:{}}
runInNewContext(source,{module:compiledModule,exports:compiledModule.exports})
function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(s => parseInt(s,16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4)
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722
}
function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
for (const preset of compiledModule.exports.THEME_PRESETS) {
  const dark = compiledModule.exports.themeCssVariables(preset.id,'dark')
  assert.equal(dark['--theme-background'],preset.background)
  assert.equal(dark['--theme-surface'],preset.surface)
  assert.equal(dark['--theme-accent'],preset.accent)
  const light = compiledModule.exports.themeCssVariables(preset.id,'light')
  for (const background of ['--theme-background','--theme-surface','--theme-surface-elevated']) {
    assert.ok(contrast(light[background],light['--theme-foreground']) >= 4.5)
    assert.ok(contrast(light[background],'#526174') >= 4.5, `${preset.id}: secondary text contrast`)
  }
  assert.ok(contrast(light['--theme-accent'],'#FFFFFF') >= 4.5, `${preset.id}: filled action contrast`)
}
console.log('light mode refinement checks passed')
