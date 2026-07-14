import assert from 'node:assert/strict'
import test from 'node:test'

import { getDevSession, isDevBypassActive } from '@/lib/supabase/dev-bypass'

test('dev auth bypass is active only for an explicit development opt-in', () => {
  const environment = process.env as Record<string, string | undefined>
  const originalNodeEnv = environment.NODE_ENV
  const originalBypass = environment.DEV_AUTH_BYPASS

  try {
    environment.NODE_ENV = 'development'
    environment.DEV_AUTH_BYPASS = 'false'
    assert.equal(isDevBypassActive(), false)
    assert.equal(getDevSession(), null)

    environment.DEV_AUTH_BYPASS = 'true'
    const session = getDevSession()
    assert.equal(isDevBypassActive(), true)
    assert.equal(session?.user.id, 'dev-audit-user-001')
    assert.equal(session?.user.email, 'audit@prometheus.local')
    assert.ok((session?.expires_at ?? 0) > Math.floor(Date.now() / 1000))

    environment.NODE_ENV = 'production'
    assert.equal(isDevBypassActive(), false)
    assert.equal(getDevSession(), null)
  } finally {
    if (originalNodeEnv === undefined) delete environment.NODE_ENV
    else environment.NODE_ENV = originalNodeEnv

    if (originalBypass === undefined) delete environment.DEV_AUTH_BYPASS
    else environment.DEV_AUTH_BYPASS = originalBypass
  }
})
