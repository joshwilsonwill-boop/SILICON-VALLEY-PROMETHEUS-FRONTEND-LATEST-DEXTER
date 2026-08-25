import assert from 'node:assert/strict'
import test from 'node:test'

import { r2SigningClockOffset } from '../lib/r2/signing-clock'

test('uses the R2 server clock when the local signing clock is materially stale', () => {
  const localNow = Date.parse('2026-08-25T00:27:31.000Z')
  const serverDate = 'Tue, 25 Aug 2026 13:46:34 GMT'

  assert.equal(r2SigningClockOffset(serverDate, localNow), 47_943_000)
})

test('does not add a needless offset for clocks already within one minute', () => {
  const localNow = Date.parse('2026-08-25T13:46:00.000Z')
  const serverDate = 'Tue, 25 Aug 2026 13:46:34 GMT'

  assert.equal(r2SigningClockOffset(serverDate, localNow), null)
})
