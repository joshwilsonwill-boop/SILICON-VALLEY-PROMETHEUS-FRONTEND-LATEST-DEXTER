import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

if (process.argv.includes('--lint')) {
  const result = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', 'components/auth', 'components/sidebar', 'components/projects', 'app/(auth)', 'app/api/auth', 'app/api/profile', 'app/settings/profile', 'hooks/use-profile.ts', 'hooks/use-projects-list.ts', 'lib/auth', 'lib/user', 'proxy.ts', 'components/settings/settings-detail-shell.tsx', 'tests/cofounder-auth.test.ts', 'tests/cofounder-projects.test.mjs'], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
  console.log('AUTH_PROJECTS_LINT_OK')
} else {
  test('project confirmation is controlled and failure remains visible', () => {
    const projects = read('components/projects/projects-page-editorial.tsx')
    assert.equal(projects.includes('window.confirm'), false)
    assert.match(projects, /onDelete=\{\(\) => \{ setDeleteError\(null\); setDeleteTarget\(project\) \}\}/)
    assert.match(projects, /await deleteProject\(project.id\)[\s\S]*setDeleteTarget\(null\)/)
    assert.match(projects, /setDeleteError\(message\)/)
    const dialog = read('components/projects/delete-project-dialog.tsx')
    assert.match(dialog, /AlertDialog.Title/)
    assert.match(dialog, /AlertDialog.Description/)
    assert.match(dialog, /AlertDialog.Cancel asChild/)
    assert.match(dialog, /role="alert"/)
    assert.match(dialog, /disabled=\{busy\}/)
  })

  test('project list removes acknowledged deletions and refetches truth', () => {
    const hook = read('hooks/use-projects-list.ts')
    assert.match(hook, /setQueryData<ProjectListItem\[\]>[\s\S]*project.id !== id/)
    assert.match(hook, /invalidateQueries\(\{ queryKey: PROJECTS_QUERY_KEY \}\)/)
    assert.match(hook, /cache: 'no-store'/)
  })

  test('project opening uses one synchronous guard and loading counts are explicit', () => {
    const projects = read('components/projects/projects-page-editorial.tsx')
    assert.match(projects, /if \(openingRef.current\) return\s+openingRef.current = true/)
    assert.match(projects, /isLoading \? 'Loading[^']*'/)
    assert.match(projects, /countFor\(item.key\)/)
  })

  test('auth advertises a consistent supported set, recovery stays minimal', () => {
    assert.equal(read('components/auth/SocialAuthButtons.tsx').includes("provider: 'apple'"), false)
    assert.match(read('components/auth/SignupForm.tsx'), /<SocialAuthButtons \/>/)
    assert.match(read('app/(auth)/forgot-password/page.tsx'), /showSocialAuth=\{false\} showLegalCopy=\{false\}/)
    assert.match(read('components/auth/LoginForm.tsx'), /aria-label=\{showPassword \? 'Hide password' : 'Show password'\}/)
    assert.match(read('components/auth/SignupForm.tsx'), /onExpire=/)
    assert.match(read('components/auth/SignupForm.tsx'), /onError=/)
  })

  test('analytics shares the auth boundary; canonical studio redirect precedes it', () => {
    const proxy = read('proxy.ts')
    assert.match(proxy, /'\/analytics'/)
    assert.ok(proxy.indexOf("pathname === '/studio'") < proxy.indexOf('if (isPublicPath(pathname))'))
    assert.match(proxy, /NextResponse.redirect\(canonical, 308\)/)
  })

  test('profile saves surface server errors and broadcast fresh mutation state', () => {
    assert.match(read('app/settings/profile/page.tsx'), /form.setError\(target, \{ type: 'server', message \}\)/)
    assert.match(read('hooks/use-profile.ts'), /setProfile\(\(current\) => \(\{ ...current, ...payload.profile \}/)
    assert.match(read('hooks/use-profile.ts'), /prometheus:profile-updated/)
    assert.equal(read('app/settings/profile/page.tsx').includes('MOCK_SESSIONS'), false)
    assert.equal(read('app/settings/profile/page.tsx').includes('pk_live_mock'), false)
    assert.match(read('components/sidebar/AwwwardsSidebar.tsx'), /\/api\/auth\/logout/)
    assert.match(read('components/sidebar/AwwwardsSidebar.tsx'), /window.location.assign\('\/login'\)/)
    assert.equal(read('components/sidebar/AwwwardsSidebar.tsx').includes('60%'), false)
  })
}
