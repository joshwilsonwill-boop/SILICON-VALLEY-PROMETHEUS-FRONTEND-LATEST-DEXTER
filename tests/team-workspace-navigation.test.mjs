import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

// Execute the real page → header → back-button chain. Only framework hooks,
// account data, and visual components are replaced; navigation handlers run unchanged.
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = process.cwd()

function createNavigation(initialUrl = '/settings', historyState = { __NA: true }) {
  let url = initialUrl
  let hooks = []
  let hookIndex = 0
  let effects = []
  let stateChanged = false
  const history = [initialUrl]
  const cache = new Map()
  const element = (type, props) => ({ type, props: props ?? {} })
  const visual = ({ children }) => element('visual', { children })
  const pathname = () => new URL(url, 'https://example.test').pathname
  const navigate = (href, replace = false) => {
    const previousPath = pathname()
    url = href
    if (replace) history[history.length - 1] = href
    else history.push(href)
    if (pathname() !== previousPath) hooks = []
  }
  const router = {
    push: (href) => navigate(href),
    replace: (href) => navigate(href, true),
    back: () => {
      if (history.length > 1) history.pop()
      url = history[history.length - 1]
      hooks = []
    },
  }
  const react = {
    __esModule: true,
    Suspense: visual,
    useState: (initial) => {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], (next) => {
        const value = typeof next === 'function' ? next(hooks[index]) : next
        if (!Object.is(value, hooks[index])) stateChanged = true
        hooks[index] = value
      }]
    },
    useEffect: (callback, dependencies) => {
      const index = hookIndex++
      const previous = hooks[index]
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous[i]))) {
        effects.push(callback)
        hooks[index] = dependencies
      }
    },
    useCallback: (callback) => callback,
  }
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: visual },
    'next/navigation': {
      useRouter: () => router,
      usePathname: pathname,
      useSearchParams: () => new URL(url, 'https://example.test').searchParams,
    },
    'next/link': { __esModule: true, default: (props) => element('a', props) },
    'lucide-react': new Proxy({}, { get: (_, name) => name === '__esModule' ? true : visual }),
    '@/components/auth/auth-provider': { useAuth: () => ({ session: null }) },
    '@/hooks/use-profile': { useProfile: () => ({ profile: null, loading: false }), getProfileDisplayName: () => 'Test User' },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/components/prometheus-shell': {
      PrometheusShell: ({ header, children }) => element('shell', { children: [header, children] }),
    },
    '@/components/loading-animation': { InlineLoadingAnimation: visual },
    '@/components/cookie-consent/cookie-settings-button': { CookieSettingsButton: visual },
    '@/components/settings/storage-integrations-panel': { StorageIntegrationsPanel: visual },
    '@/components/theme/color-mode-selector': { ColorModeSelector: visual },
    '@/components/ui/button': { Button: visual },
    '@/components/ui/switch': { Switch: visual },
    '@/components/ui/card': Object.fromEntries(['Card', 'CardContent', 'CardHeader', 'CardTitle', 'CardDescription'].map((name) => [name, visual])),
  }

  function load(relativePath) {
    if (cache.has(relativePath)) return cache.get(relativePath)
    const source = readFileSync(join(root, relativePath), 'utf8')
    const compiled = ts.transpileModule(source, {
      fileName: relativePath,
      reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    assert.deepEqual(compiled.diagnostics, [], `${relativePath} must parse successfully`)
    const module = { exports: {} }
    cache.set(relativePath, module.exports)
    runInNewContext(compiled.outputText, {
      module,
      exports: module.exports,
      require: (id) => {
        if (id in mocks) return mocks[id]
        if (id === '@/components/page-header') return load('components/page-header.tsx')
        if (id === '@/components/navigation/BackButton') return load('components/navigation/BackButton.tsx')
        throw new Error(`Unexpected dependency: ${id}`)
      },
      URL,
      URLSearchParams,
      window: {
        location: { get search() { return new URL(url, 'https://example.test').search } },
        history: { state: historyState, replaceState: (_, __, href) => navigate(href, true) },
      },
    }, { filename: relativePath })
    return module.exports
  }

  function expand(node) {
    if (Array.isArray(node)) return node.flatMap((child) => expand(child))
    if (node == null || typeof node === 'boolean') return []
    if (typeof node !== 'object') return [node]
    if (typeof node.type === 'function') return expand(node.type(node.props))
    return [{ ...node, props: { ...node.props, children: expand(node.props.children) } }]
  }

  function render() {
    let tree
    for (let pass = 0; pass < 10; pass++) {
      hookIndex = 0
      effects = []
      stateChanged = false
      const page = pathname() === '/team' ? 'app/team/page.tsx' : 'app/settings/page.tsx'
      tree = expand(element(load(page).default))
      for (const effect of effects) effect()
      if (!stateChanged) return tree
    }
    assert.fail('Settings effects must settle without a render loop')
    return tree
  }

  function nodes(tree) {
    return tree.flatMap((node) => typeof node === 'object' ? [node, ...nodes(node.props.children)] : [])
  }

  const textContent = (node) => typeof node === 'object' ? node.props.children.map(textContent).join('') : String(node)
  const find = (predicate) => nodes(render()).find(predicate)

  return {
    get url() { return url },
    selectPanel(label) {
      const button = find((node) => node.type === 'button' && textContent(node) === label)
      assert.ok(button, `Settings must expose the ${label} panel`)
      button.props.onClick()
    },
    assertPanel(label) {
      assert.ok(find((node) => node.type === 'button' && textContent(node) === label && node.props['aria-current'] === 'page'), `${label} must be the selected settings panel after returning from Team`)
    },
    openTeam() {
      const link = find((node) => node.type === 'a' && textContent(node) === 'Team workspace')
      assert.ok(link, 'Workspace must expose Team workspace')
      router.push(link.props.href)
      assert.equal(pathname(), '/team')
    },
    goBack() {
      const button = find((node) => node.type === 'button' && node.props['aria-label'] === 'Go back')
      assert.ok(button, 'Team must expose its back button')
      button.props.onClick()
    },
    browserBack: () => router.back(),
    reload() { hooks = [] },
  }
}

// A page back button has a logical destination even when a user opened Team
// from elsewhere or the browser happens to expose a numeric history index.
for (const state of [{ __NA: true }, null, { idx: 0 }, { idx: 1 }]) {
  const directTeam = createNavigation('/team', state)
  directTeam.goBack()
  directTeam.assertPanel('Workspace')
}

for (const state of [{ __NA: true }, null, { idx: 0 }, { idx: 1 }]) {
  const app = createNavigation('/settings', state)
  app.selectPanel('Workspace')
  app.assertPanel('Workspace')
  app.openTeam()
  app.goBack()
  assert.equal(new URL(app.url, 'https://example.test').pathname, '/settings', 'Team back must return to Settings instead of Studio')
  app.assertPanel('Workspace')
  app.reload()
  app.assertPanel('Workspace')
  app.openTeam()
  app.browserBack()
  app.assertPanel('Workspace')
}

const directTeam = createNavigation('/team')
directTeam.goBack()
directTeam.assertPanel('Workspace')

for (const [query, panel] of [['', 'Profile'], ['?panel=workspace', 'Workspace'], ['?panel=unknown', 'Profile']]) {
  createNavigation(`/settings${query}`).assertPanel(panel)
}

const settings = createNavigation('/settings?connected=google_drive')
for (const label of ['Profile', 'Notifications', 'Appearance', 'Workspace', 'Integrations', 'Billing & access', 'Privacy & security']) {
  settings.selectPanel(label)
  settings.assertPanel(label)
  settings.reload()
  settings.assertPanel(label)
  assert.equal(new URL(settings.url, 'https://example.test').searchParams.get('connected'), 'google_drive', 'Selecting a panel must preserve unrelated query parameters')
}

console.log('team workspace navigation checks passed')
