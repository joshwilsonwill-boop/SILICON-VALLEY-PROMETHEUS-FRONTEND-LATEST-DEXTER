import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const styles = readFileSync(join(process.cwd(), 'app/premium-vignette.css'), 'utf8')

assert.match(
  styles,
  /\.editorial-chamber-shell\s*\{[\s\S]*?background:\s*radial-gradient\(ellipse at 50% 42%, #080808 0%, #000 68%\);/,
)
assert.equal(styles.includes('.editorial-chamber-shell::before'), false)
