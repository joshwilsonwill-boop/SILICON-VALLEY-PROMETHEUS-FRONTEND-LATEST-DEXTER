import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

const editor = read('app/editor/[id]/page.tsx')
const studio = read('components/video-upload-interface.tsx')

// An editor without a durable source must stay empty. It must never borrow
// the last asset that happened to be stored by a different project.
assert.doesNotMatch(editor, /getLatestStoredSourceAssetRecord/)
assert.doesNotMatch(editor, /restoreStoredSourceAssetFile/)

// The studio handoff must surface the actual failed transport/commit stage,
// rather than labelling every failure as an invalid source file.
assert.match(studio, /function describeStudioUploadFailure/)
assert.match(studio, /description: describeStudioUploadFailure\(error, currentStage\)/)
assert.match(studio, /Missing readable ETag/)
assert.match(studio, /R2_MULTIPART_UPLOAD[\s\S]*bucket CORS/)

console.log('editor source ownership and Studio upload error checks passed')
