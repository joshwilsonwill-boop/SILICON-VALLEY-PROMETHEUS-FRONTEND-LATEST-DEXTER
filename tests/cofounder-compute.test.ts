import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COMPUTE_COSTS, isComputeOperation, parseComputeConfirmation } from '../lib/compute/policy'
import { trustedOAuthOrigin, providerCredentials, configuredOAuthProviders, PRODUCTION_ORIGIN } from '../lib/oauth/capabilities'
import { isExportProviderConnected, normalizeExportConnections } from '../lib/editor/export-connections'
import { BILLING_PLAN_DEFINITIONS } from '../lib/billing-plans'

test('compute policy defines expected costs and validates operations', () => {
  assert.equal(COMPUTE_COSTS.transcribe, 1)
  assert.equal(COMPUTE_COSTS.sync, 0)
  assert.equal(COMPUTE_COSTS.export, 1)
  assert.equal(COMPUTE_COSTS.enhance, 1)
  assert.equal(isComputeOperation('transcribe'), true)
  assert.equal(isComputeOperation('export'), true)
  assert.equal(isComputeOperation('invalid_op'), false)
})

test('compute confirmation enforces valid UUID request id and confirmed flag', () => {
  assert.equal(parseComputeConfirmation(null), null)
  assert.equal(parseComputeConfirmation({ confirmed: false, requestId: 'c07c3a4d-a8eb-41d3-856d-91c0dcb489a8' }), null)
  assert.equal(parseComputeConfirmation({ confirmed: true, requestId: 'not-a-uuid' }), null)
  const valid = parseComputeConfirmation({ confirmed: true, requestId: 'c07c3a4d-a8eb-41d3-856d-91c0dcb489a8' })
  assert.notEqual(valid, null)
  assert.equal(valid?.confirmed, true)
  assert.equal(valid?.requestId, 'c07c3a4d-a8eb-41d3-856d-91c0dcb489a8')
})

test('trusted OAuth origin enforces production domain and rejects unauthorized redirect hosts', () => {
  assert.equal(PRODUCTION_ORIGIN, 'https://prometheusstudio.tech')
  assert.equal(trustedOAuthOrigin({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), PRODUCTION_ORIGIN)
  assert.equal(
    trustedOAuthOrigin({ NODE_ENV: 'production', OAUTH_APP_ORIGIN: 'https://scaling-space-funicular.app.github.dev' } as unknown as NodeJS.ProcessEnv),
    PRODUCTION_ORIGIN,
  )
  assert.equal(
    trustedOAuthOrigin({ NODE_ENV: 'development', OAUTH_APP_ORIGIN: 'http://localhost:3000' } as unknown as NodeJS.ProcessEnv),
    'http://localhost:3000',
  )
})

test('configured OAuth providers requires explicit opt-in and client credentials', () => {
  const emptyEnv = { OAUTH_ENABLED_PROVIDERS: '' } as unknown as NodeJS.ProcessEnv
  assert.deepEqual(configuredOAuthProviders(emptyEnv), [])

  const missingSecretEnv = {
    OAUTH_ENABLED_PROVIDERS: 'youtube',
    YOUTUBE_CLIENT_ID: 'yt-client-id',
  } as unknown as NodeJS.ProcessEnv
  assert.deepEqual(configuredOAuthProviders(missingSecretEnv), [])

  const configuredEnv = {
    OAUTH_ENABLED_PROVIDERS: 'youtube',
    YOUTUBE_CLIENT_ID: 'yt-client-id',
    YOUTUBE_CLIENT_SECRET: 'yt-secret',
  } as unknown as NodeJS.ProcessEnv
  assert.deepEqual(configuredOAuthProviders(configuredEnv), ['youtube'])
})

test('export connection verification rejects fake or unverified connection status', () => {
  // TikTok or other providers are never considered connected if the record is missing or expired
  assert.equal(isExportProviderConnected([], 'tiktok'), false)
  assert.equal(isExportProviderConnected([{ provider: 'tiktok', connected: false }], 'tiktok'), false)
  assert.equal(
    isExportProviderConnected([{ provider: 'tiktok', connected: true, expiresAt: new Date(Date.now() - 60000).toISOString() }], 'tiktok'),
    false,
  )
  assert.equal(
    isExportProviderConnected([{ provider: 'tiktok', connected: true, expiresAt: new Date(Date.now() + 60000).toISOString() }], 'tiktok'),
    true,
  )
})

test('billing plan definitions include currency symbol on all plans', () => {
  assert.match(BILLING_PLAN_DEFINITIONS.creator.priceWhole, /^\$/)
  assert.match(BILLING_PLAN_DEFINITIONS.studio.priceWhole, /^\$/)
  assert.match(BILLING_PLAN_DEFINITIONS.cinema.priceWhole, /^\$/)
})
