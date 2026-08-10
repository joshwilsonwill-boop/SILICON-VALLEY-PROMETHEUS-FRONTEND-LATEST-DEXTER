import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(process.cwd(), 'components/ui/music-player.tsx'), 'utf8')

assert.match(source, /music-player-visual[^\n]+\[container-type:size\]/)
assert.match(source, /music-player-art[^\n]+size-\[min\(100cqw,100cqh,18rem\)\][^\n]+rounded-full/)
assert.doesNotMatch(source, /music-player-art[^\n]+max-h-full[^\n]+max-w-full/)

console.log('music-player-circle-regression: all assertions passed')
