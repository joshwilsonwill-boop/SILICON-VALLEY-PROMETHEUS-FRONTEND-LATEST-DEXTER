import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'

const routePath = 'app/api/projects/[id]/source-analysis/route.ts'
assert.equal(existsSync(routePath), true)

const route = readFileSync(routePath, 'utf8')
const editor = readFileSync('app/editor/[id]/page.tsx', 'utf8')
const manager = readFileSync('lib/projects/index.ts', 'utf8')
const mockJobs = readFileSync('lib/mock/index.ts', 'utf8')

assert.match(route, /from\('source_ingestions'\)/)
assert.match(route, /from\('source_observation_snapshots'\)/)
assert.match(route, /dispatchModalSourceAnalysis/)
assert.match(editor, /\/source-analysis/)
assert.match(editor, /buildProcessingJobFromSourceAnalysis/)
assert.match(editor, /projects\.upsertJob/)
assert.doesNotMatch(manager, /Mock text segment content/)
assert.doesNotMatch(mockJobs, /transcriptProvider: 'mock'/)

console.log('source-analysis-editor-contract: all assertions passed')
