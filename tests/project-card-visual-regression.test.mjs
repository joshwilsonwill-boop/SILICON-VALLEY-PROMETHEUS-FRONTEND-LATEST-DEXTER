import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const source = readFileSync(join(root, 'components/projects/project-card.tsx'), 'utf8')

assert.equal(source.includes('GlassCard'), false, 'Project cards must not use the rotating GlassCard shell.')
assert.equal(source.includes('glass-card'), false, 'Project cards must not inherit glass-card rotating border styles.')
assert.equal(source.includes('radial-gradient'), false, 'Project cards must not use radial placeholder gradients.')
assert.equal(source.includes('group-hover:scale'), false, 'Project card thumbnails must not scale on hover.')
assert.equal(source.includes('md:opacity-0'), false, 'Project card actions must not be hidden until desktop hover.')
assert.match(source, /aria-label=\{`Open \$\{project\.title\}`\}/, 'Project cards need a clear primary open action label.')
assert.match(source, /MoreHorizontal/, 'Project cards need a persistent action menu affordance for touch devices.')
assert.match(source, /linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/, 'Project placeholder should use a restrained linear plate.')

console.log('project-card visual regression checks passed')
