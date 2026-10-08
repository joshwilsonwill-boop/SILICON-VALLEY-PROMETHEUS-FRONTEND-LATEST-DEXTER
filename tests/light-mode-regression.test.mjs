import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const { createStore } = require('zustand/vanilla')
const middleware = require('zustand/middleware')
const postcss = require('postcss')

function application({ consent = true, preferences, deniedStorage = false } = {}) {
  const saved = new Map()
  if (consent) saved.set('prometheus_cookie_consent', JSON.stringify({ essential: true, analytics: false, marketing: false, preferences: true, timestamp: new Date().toISOString(), version: '2.0' }))
  if (preferences) saved.set('prometheus.theme.preferences.v1', JSON.stringify({ state: preferences, version: 0 }))
  const storage = {
    getItem: key => saved.get(key) ?? null,
    setItem: (key, value) => { if (deniedStorage) throw new Error('Storage denied'); saved.set(key, value) },
    removeItem: key => saved.delete(key),
  }
  const rootVariables = new Map()
  const classes = new Set(['dark'])
  const root = {
    dataset: {},
    style: { setProperty: (key, value) => rootVariables.set(key, value) },
    classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
  }
  const body = { dataset: {}, style: { setProperty() {} } }
  const cache = new Map()
  const element = (type, props) => ({ type, props: props ?? {} })
  const mocks = {
    react: { __esModule: true, useEffect: fn => fn() },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'lucide-react': { Moon: 'moon', Sun: 'sun' },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    zustand: { create: () => initializer => {
      const store = createStore(initializer)
      return Object.assign(selector => selector(store.getState()), store)
    } },
    'zustand/middleware': middleware,
  }
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const compiledModule = { exports: {} }
    cache.set(file, compiledModule.exports)
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    assert.deepEqual(compiled.diagnostics, [])
    runInNewContext(compiled.outputText, {
      module: compiledModule, exports: compiledModule.exports,
      require: id => id in mocks ? mocks[id] : load(id.startsWith('@/') ? `${id.slice(2)}.ts${id.includes('components/') ? 'x' : ''}` : 'lib/theme/theme-tokens.ts'),
      localStorage: storage,
      window: { localStorage: storage },
      document: { documentElement: root, body },
      console,
    }, { filename: file })
    return compiledModule.exports
  }
  const store = load('lib/theme/theme-store.ts').useThemePreferenceStore
  return {
    store, saved, rootVariables, classes, root,
    inject: () => load('components/theme/theme-injector.tsx').ThemeInjector(),
    selector: () => load('components/theme/color-mode-selector.tsx').ColorModeSelector(),
    tokens: load('lib/theme/theme-tokens.ts'),
  }
}

const app = application()
assert.equal(app.store.getState().colorMode, 'dark', 'The existing dark mode must remain the default')
app.inject()
const originalDark = Object.fromEntries(app.rootVariables)
const theme = app.store.getState().themeId
const font = app.store.getState().fontId
const choices = app.selector().props.children.filter(child => child?.type === 'button')
assert.equal(choices.length, 2, 'Appearance must offer both Dark and Light')
assert.equal(choices[0].props['aria-pressed'], true)
choices[1].props.onClick()
app.inject()
assert.equal(app.store.getState().colorMode, 'light')
assert.equal(app.store.getState().themeId, theme, 'Changing mode must preserve the saved accent theme')
assert.equal(app.store.getState().fontId, font, 'Changing mode must preserve the saved font')
assert.equal(app.root.dataset.colorMode, 'light')
assert.equal(app.root.style.colorScheme, 'light')
assert.equal(app.classes.has('dark'), false)
assert.equal(app.rootVariables.get('--theme-surface'), '#FFFFFF')
const persisted = JSON.parse(app.saved.get('prometheus.theme.preferences.v1')).state
assert.equal(application({ preferences: persisted }).store.getState().colorMode, 'light', 'Light mode must survive reload with preference consent')
app.selector().props.children.find(child => child?.type === 'button').props.onClick()
app.inject()
assert.equal(app.root.style.colorScheme, 'dark')
assert.deepEqual(Object.fromEntries(app.rootVariables), originalDark, 'Switching back must restore the exact original dark theme tokens')
assert.equal(app.classes.has('dark'), true)

const migrated = application({ preferences: { themeId: 'midnight', fontId: 'geist' } })
assert.equal(migrated.store.getState().colorMode, 'dark', 'Older saved preferences must retain dark mode')
assert.equal(migrated.store.getState().themeId, 'midnight')
assert.equal(migrated.store.getState().fontId, 'geist')
assert.equal(application({ preferences: { colorMode: 'unknown', themeId: 'midnight' } }).store.getState().colorMode, 'dark', 'Invalid stored mode values must safely fall back to the original dark mode')
migrated.store.getState().setColorMode('light')
migrated.store.getState().setThemeAndFont({ themeId: 'ember', fontId: 'inter' })
assert.equal(migrated.store.getState().colorMode, 'light', 'Profile preference hydration must not overwrite the mode choice')

const noConsent = application({ consent: false })
noConsent.store.getState().setColorMode('light')
assert.equal(noConsent.store.getState().colorMode, 'light', 'The mode must still work for the current visit without persistence consent')
assert.equal(noConsent.saved.has('prometheus.theme.preferences.v1'), false)
const denied = application({ deniedStorage: true })
assert.doesNotThrow(() => denied.store.getState().setColorMode('light'), 'Unavailable storage must not break theme switching')

function luminance(hex) {
  const components = hex.match(/[a-f\d]{2}/gi).map(value => Number.parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722
}
for (const preset of app.tokens.THEME_PRESETS) {
  const light = app.tokens.themeCssVariables(preset.id, 'light')
  assert.ok((luminance(light['--theme-surface']) + 0.05) / (luminance(light['--theme-foreground']) + 0.05) >= 4.5, `${preset.name}: light text must be readable`)
  assert.ok((luminance(light['--theme-surface']) + 0.05) / (luminance(light['--theme-accent']) + 0.05) >= 4.5, `${preset.name}: accent text must be readable in light mode`)
}

const colorOnlyProperties = new Set(['color', 'color-scheme', 'background', 'background-color', 'background-image', 'border-color', 'box-shadow'])
postcss.parse(readFileSync('app/light-mode.css', 'utf8')).walkRules(rule => {
  for (const selector of rule.selectors) {
    assert.ok(selector.startsWith("html[data-color-mode='light']"), 'Every new theme rule must be opt-in so dark mode remains unchanged')
  }
  for (const declaration of rule.nodes.filter(node => node.type === 'decl')) {
    const logoColor = declaration.prop === 'filter' && declaration.value === 'brightness(0)' && rule.selector.endsWith("img[src*='prometheus-logo-no-bg.png']")
    const quietDecoration = ['backdrop-filter', '-webkit-backdrop-filter', 'text-shadow'].includes(declaration.prop) && declaration.value === 'none'
    const focusIndicator = ['outline-color', 'outline-width', 'outline-style', 'outline-offset'].includes(declaration.prop) && rule.selector.includes(':focus-visible')
    const projectArtworkBlend = declaration.prop === 'mix-blend-mode' && declaration.value === 'multiply' && rule.selector.endsWith('.project-tile-artwork')
    assert.ok(declaration.prop.startsWith('--') || colorOnlyProperties.has(declaration.prop) || logoColor || quietDecoration || focusIndicator || projectArtworkBlend, `Light mode must not change layout, typography, or project media: ${declaration.prop}`)
  }
})

console.log('light mode regression checks passed')
