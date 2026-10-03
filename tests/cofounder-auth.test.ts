import assert from 'node:assert/strict'
import test from 'node:test'
import { displayNameSchema, usernameSchema, signupSchema, ENABLED_OAUTH_PROVIDERS, emailSchema } from '../lib/auth/validation'
import { buildAuthConfirmUrl, normalizeNextPath } from '../lib/auth/redirect'
import { requestProjectDeletion } from '../components/projects/project-actions'

test('display names preserve existing digits and accept international names', () => {
  for (const value of ['joshuaayogu12', 'QA Reverted', 'Zoë 2', 'مريم 12', "O'Neil"]) assert.equal(displayNameSchema.parse(value), value)
  for (const value of ['', ' ', 'x', 'Name<script>', 'x'.repeat(51)]) assert.equal(displayNameSchema.safeParse(value).success, false)
})

test('documented username set is enforced; punctuation attack is rejected', () => {
  assert.equal(usernameSchema.parse(' qa.test-user_12 '), 'qa.test-user_12')
  for (const value of ['', 'x', 'qa!test@user#', 'white space', 'x'.repeat(33)]) assert.equal(usernameSchema.safeParse(value).success, false)
})

test('signup validates types, email and password before contacting auth', () => {
  const valid = { fullName: 'Creator 12', email: 'creator@example.com', password: 'ValidPass123!' }
  assert.equal(signupSchema.safeParse(valid).success, true)
  for (const body of [{ ...valid, password: '123' }, { ...valid, password: 'alllowercase12' }, { ...valid, email: 'user@' }, { ...valid, fullName: '' }, { ...valid, email: 123 }]) assert.equal(signupSchema.safeParse(body).success, false)
  assert.equal(emailSchema.safeParse('user@').success, false)
})

test('enabled providers share safe next URL and never advertise Apple', () => {
  assert.deepEqual(ENABLED_OAUTH_PROVIDERS, ['google', 'github'])
  for (const provider of ENABLED_OAUTH_PROVIDERS) {
    assert.ok(provider)
    assert.equal(buildAuthConfirmUrl('https://app.example/login', '/editor/123?tab=video').searchParams.get('next'), '/editor/123?tab=video')
  }
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example']) assert.equal(normalizeNextPath(next), '/')
})

test('delete sends exactly one DELETE request; success requires server acknowledgement', async () => {
  const calls: Array<[string, RequestInit | undefined]> = []
  await requestProjectDeletion('project/123', async (url, options) => {
    calls.push([String(url), options])
    return Response.json({ success: true })
  })
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], ['/api/projects/project%2F123', { method: 'DELETE' }])
  await assert.rejects(requestProjectDeletion('123', async () => Response.json({ success: false, error: { message: 'You cannot delete this project' } }, { status: 403 })), /You cannot delete/)
  await assert.rejects(requestProjectDeletion('123', async () => new Response('invalid', { status: 500 })), /Failed to delete/)
  await assert.rejects(requestProjectDeletion('123', async () => Response.json({})), /Failed to delete/)
})
