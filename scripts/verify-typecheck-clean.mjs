import { spawnSync } from 'node:child_process'

console.log('Running TypeScript typecheck check...')

const result = spawnSync(
  process.execPath,
  ['--max-old-space-size=4096', './node_modules/typescript/bin/tsc', '--noEmit'],
  {
    stdio: 'inherit',
    encoding: 'utf-8',
    shell: false,
  }
)

if (result.status === 0) {
  console.log('typecheck-clean-passed')
  process.exit(0)
} else {
  console.error('Typecheck failed with status:', result.status)
  process.exit(result.status ?? 1)
}
