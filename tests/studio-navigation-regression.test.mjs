import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const readSourceFile = (path) => readFileSync(join(root, path), 'utf8')

test('Studio is the first collapsible desktop sidebar destination', () => {
  const navigationSource = readSourceFile('lib/navigation.ts')
  const desktopSidebarSource = readSourceFile('components/dashboard-sidebar.tsx')

  assert.match(desktopSidebarSource, /key: 'studio', label: 'Studio', href: '\/studio', icon: LayoutDashboard/)
  assert.ok(desktopSidebarSource.indexOf("key: 'studio'") < desktopSidebarSource.indexOf('...prometheusNavItems'))
  assert.doesNotMatch(navigationSource, /key: 'studio'/)
})
