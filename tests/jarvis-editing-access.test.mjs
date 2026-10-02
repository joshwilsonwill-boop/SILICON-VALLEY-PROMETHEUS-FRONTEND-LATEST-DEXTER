import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { ensureVoiceEditingAccess } = require('../lib/voice-companion/editing-access.ts')

let enabled = false
let toggles = 0
const handlers = () => ({
  isTakeoverEnabled: enabled,
  onToggleTakeover: () => {
    toggles += 1
    setTimeout(() => { enabled = true }, 40)
  },
})

assert.deepEqual(await ensureVoiceEditingAccess(handlers), { success: true })
assert.equal(toggles, 1, 'A delegated mutation starts takeover automatically exactly once')
assert.deepEqual(await ensureVoiceEditingAccess(handlers), { success: true })
assert.equal(toggles, 1, 'An active session is reused for later mutations')

const unavailable = await ensureVoiceEditingAccess(() => ({}), 50)
assert.equal(unavailable.success, false)
assert.match(unavailable.error, /not linked/)

const unconfirmed = await ensureVoiceEditingAccess(() => ({ onToggleTakeover() {} }), 50)
assert.equal(unconfirmed.success, false)
assert.match(unconfirmed.error, /did not confirm/)

console.log('jarvis-editing-access passed')
