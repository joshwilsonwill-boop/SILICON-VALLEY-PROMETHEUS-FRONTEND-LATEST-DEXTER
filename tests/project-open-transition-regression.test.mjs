import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(process.cwd(), 'components/projects/projects-page-editorial.tsx'), 'utf8')

assert.match(source, /import \{[^}]*LoadingAnimation[^}]*\} from '@\/components\/loading-animation'/)
assert.match(source, /<LoadingAnimation message=\{`Opening \$\{openingProjectTitle\}\.\.\.`\} \/>/)
assert.match(source, /sourceAssetId: project\.sourceAssetId \?\? existing\?\.sourceAssetId \?\? undefined/)

