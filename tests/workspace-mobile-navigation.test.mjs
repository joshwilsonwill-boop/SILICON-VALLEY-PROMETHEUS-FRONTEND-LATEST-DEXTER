import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const postcss = require('postcss')
const { compile } = require('@tailwindcss/node')

// Execute the real workspace/sidebar components with a small hook host. This
// checks destinations and event handlers; it is not a browser/focus-trap test.
function application(pathname, recentProject = null) {
  const states = new Map()
  const effects = []
  const listeners = new Map()
  const remembered = []
  let currentStates, stateIndex
  const element = (type, props) => ({ type, props: props ?? {} })
  const icons = new Proxy({}, { get: (_, name) => String(name) })
  const media = {
    matches: false,
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event, fn) => { if (listeners.get(event) === fn) listeners.delete(event) },
  }
  const react = {
    __esModule: true,
    forwardRef: fn => fn,
    useState: initial => {
      const slot = stateIndex++
      const slots = currentStates
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial
      return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value }]
    },
    useEffect: fn => effects.push(fn),
    useLayoutEffect: fn => effects.push(fn),
    useMemo: fn => fn(),
    useCallback: fn => fn,
    useRef: value => ({ current: value }),
  }
  react.default = react
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'next/image': { __esModule: true, default: 'image' },
    'next/link': { __esModule: true, default: 'link' },
    'next/dynamic': { __esModule: true, default: () => 'background' },
    'next/navigation': { usePathname: () => pathname, useRouter: () => ({ prefetch() {} }) },
    'framer-motion': { motion: new Proxy({}, { get: (_, name) => `motion.${String(name)}` }), AnimatePresence: 'animation', useReducedMotion: () => true },
    'lucide-react': icons,
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/lib/mock': { getMostRecentProject: () => recentProject, PROJECTS_UPDATED_EVENT: 'projects-updated' },
    '@/lib/editor-navigation': { rememberCurrentPathForEditorReturn: () => remembered.push(pathname) },
    '@/hooks/use-deferred-enhancements-ready': { useDeferredEnhancementsReady: () => false },
    '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogTrigger', 'DialogContent', 'DialogTitle', 'DialogDescription'].map(name => [name, name])),
  }
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const compiledModule = { exports: {} }
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    runInNewContext(compiled.outputText, {
      module: compiledModule, exports: compiledModule.exports,
      require: id => id in mocks ? mocks[id] : load(`${id.slice(2)}.${id.includes('components/') ? 'tsx' : 'ts'}`),
      window: { matchMedia: () => media, addEventListener() {}, removeEventListener() {} },
    }, { filename: file })
    cache.set(file, compiledModule.exports)
    return compiledModule.exports
  }
  function render(component, props = {}) {
    if (!states.has(component)) states.set(component, [])
    currentStates = states.get(component)
    stateIndex = 0
    return component(props)
  }
  return { load, render, remembered, media, listeners, effects }
}

function all(tree, predicate) {
  if (tree == null || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, predicate))
  return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)]
}

for (const [pathname, recentProject] of [['/projects', null], ['/settings/appearance', { id: 'existing-project' }], ['/editor/existing-project', null]]) {
  const app = application(pathname, recentProject)
  const { DashboardSidebar } = app.load('components/dashboard-sidebar.tsx')
  const { WorkspaceFrame } = app.load('components/workspace-frame.tsx')
  const frame = app.render(WorkspaceFrame, { children: 'page content' })
  const instances = all(frame, node => node.type === DashboardSidebar)
  const mobile = instances.find(node => node.props.mobile)
  if (pathname.startsWith('/editor/')) {
    assert.equal(instances.length, 0, 'Detailed editor keeps its existing navigation instead of adding the workspace menu')
    continue
  }
  assert.ok(mobile, 'Workspace routes must expose navigation when the desktop sidebar is hidden')
  assert.ok(instances.some(node => !node.props.mobile), 'The established desktop sidebar remains mounted')
  assert.ok(app.render(DashboardSidebar).props.className.includes('hidden h-screen'), 'Desktop visibility and layout are preserved')
  app.effects.splice(0).forEach(effect => effect())
  const mobileComponent = app.render(DashboardSidebar, mobile.props)
  let menu = app.render(mobileComponent.type, mobileComponent.props)
  const header = all(menu, node => node.type === 'header')[0]
  assert.ok(header.props.className.includes('lg:hidden'), 'Mobile and desktop navigation have complementary breakpoints')
  assert.ok(header.props.className.includes('shrink-0'), 'Navigation reserves space instead of covering page content')
  const trigger = all(menu, node => node.type === 'button')[0]
  assert.equal(trigger.props['aria-label'], 'Open workspace navigation')
  assert.ok(trigger.props.className.includes('h-11'), 'Menu has a 44px touch target')
  const links = all(menu, node => node.type === 'link')
  assert.deepEqual(links.map(node => node.props.href), ['/studio', '/projects', '/assets', recentProject ? '/editor/existing-project' : '/editor', '/analytics', '/settings'])
  assert.equal(links.find(node => node.props['aria-current'] === 'page').props.href, pathname.startsWith('/settings') ? '/settings' : pathname)
  let dialog = all(menu, node => node.type === 'Dialog')[0]
  dialog.props.onOpenChange(true)
  menu = app.render(mobileComponent.type, mobileComponent.props)
  assert.equal(all(menu, node => node.type === 'Dialog')[0].props.open, true)
  all(menu, node => node.type === 'link').find(node => node.props.href.startsWith('/editor')).props.onClick()
  assert.deepEqual(app.remembered, [pathname], 'Editor return context is retained')
  menu = app.render(mobileComponent.type, mobileComponent.props)
  dialog = all(menu, node => node.type === 'Dialog')[0]
  assert.equal(dialog.props.open, false, 'Selecting a destination closes the menu')
  dialog.props.onOpenChange(true)
  app.render(mobileComponent.type, mobileComponent.props)
  const cleanup = app.effects.at(-1)()
  app.media.matches = true
  app.listeners.get('change')(app.media)
  assert.equal(all(app.render(mobileComponent.type, mobileComponent.props), node => node.type === 'Dialog')[0].props.open, false, 'Resizing to desktop dismisses the modal so focus cannot remain trapped')
  cleanup()
  assert.equal(app.listeners.size, 0)
}
const publicPage = application('/login')
const publicFrame = publicPage.render(publicPage.load('components/workspace-frame.tsx').WorkspaceFrame, { children: 'login' })
assert.equal(all(publicFrame, node => node.type === publicPage.load('components/dashboard-sidebar.tsx').DashboardSidebar).length, 0, 'Public/auth pages do not gain workspace navigation')

const compiler = await compile('@import "tailwindcss";', { base: process.cwd(), onDependency() {} })
const css = postcss.parse(compiler.build(['lg:hidden', 'hidden', 'lg:flex']))
let complementary = false
css.walkRules(rule => {
  if (rule.selector !== '.lg\\:hidden') return
  complementary = rule.nodes.some(node => node.type === 'atrule' && node.name === 'media' && node.params.includes('64rem') && node.nodes.some(declaration => declaration.prop === 'display' && declaration.value === 'none'))
})
assert.ok(complementary, 'The real Tailwind output hides the mobile menu at the desktop sidebar breakpoint')
console.log('workspace mobile navigation checks passed')
