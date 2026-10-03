import { spawnSync } from 'node:child_process'

const files = [
  'app/api/mini-run/job/[id]/output/route.ts',
  'lib/api/mini-run.ts',
  'lib/server/mini-run-delivery.ts',
  'tests/mini-run-proxy-delivery.test.ts',
]

const result = spawnSync(
  process.execPath,
  ['node_modules/eslint/bin/eslint.js', ...files],
  { encoding: 'utf8' },
)

if (result.status !== 0) {
  process.stderr.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exit(result.status || 1)
}

console.log('Mini-Run changed files pass ESLint.')
