import { spawnSync } from 'node:child_process'

const res = spawnSync(
  process.execPath,
  ['--max-old-space-size=4096', 'node_modules/typescript/bin/tsc', '--noEmit'],
  { stdio: 'inherit', env: process.env }
)

if (res.status !== 0) {
  process.exit(res.status || 1)
}

console.log('typecheck passed')
