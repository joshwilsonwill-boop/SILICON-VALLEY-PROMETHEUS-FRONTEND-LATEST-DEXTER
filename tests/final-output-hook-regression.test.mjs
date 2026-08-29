import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('polls only non-terminal final outputs and cleans up timers', () => {
  const source = readFileSync('hooks/use-project-final-output.ts', 'utf8')
  assert.match(source, /\/api\/projects\/\$\{projectId\}\/final-output/)
  assert.match(source, /status === 'queued' \|\| .*status === 'processing'/s)
  assert.match(source, /window\.setTimeout/)
  assert.match(source, /window\.clearTimeout/)
  assert.match(source, /AbortController/)
  assert.match(source, /sourceAssetId/)
})
