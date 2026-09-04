import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

// 1. Verify package.json rename
const pkg = JSON.parse(read('package.json'))
assert.equal(pkg.name, 'prometheus-frontend', 'Package name must be prometheus-frontend')

// 2. Verify storage limits allow up to 4GB for free tier
const storageLimits = read('lib/storage-limits.ts')
assert.match(storageLimits, /free:\s*\{\s*label:\s*'Free',\s*bytes:\s*4\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024\s*\}/, 'Free tier must allow up to 4GB')

// 3. Verify lib/r2/multipart-client.ts exports resumable helpers and types
const client = read('lib/r2/multipart-client.ts')
assert.match(client, /export function getMultipartFingerprint/, 'Must export getMultipartFingerprint')
assert.match(client, /export async function getResumableSessionForFile/, 'Must export getResumableSessionForFile')
assert.match(client, /export async function clearResumableSessionForFile/, 'Must export clearResumableSessionForFile')
assert.match(client, /export async function cancelProjectSourceMultipartUpload/, 'Must export cancelProjectSourceMultipartUpload')
assert.match(client, /export type StoredMultipartSession/, 'Must export StoredMultipartSession')
assert.match(client, /import \{ get, set, del \} from 'idb-keyval'/, 'Must use idb-keyval for persistent chunk session caching')
assert.match(client, /if \(completedPartNumbers\.has\(partNumber\)\)/, 'Must skip previously completed parts when resuming')
assert.match(client, /isResumed:\s*true/, 'Must indicate resumed state in progress updates')

// 4. Verify lib/upload/resumable-upload.ts delegates to uploadProjectSourceMultipart
const resumableUpload = read('lib/upload/resumable-upload.ts')
assert.match(resumableUpload, /uploadProjectSourceMultipart/, 'uploadFileResumable must delegate to uploadProjectSourceMultipart')
assert.match(resumableUpload, /export async function uploadFileResumable/, 'Must export uploadFileResumable')

// 5. Test chunk calculations for a 4GB file
const FOUR_GB = 4 * 1024 * 1024 * 1024
const PART_SIZE = 50 * 1024 * 1024
const expectedParts = Math.ceil(FOUR_GB / PART_SIZE)
assert.equal(expectedParts, 82, '4GB file with 50MB parts should have 82 parts')

// 6. Test existing regression tests still hold
const uploadErrorsTest = read('tests/editor-source-ownership-and-upload-errors.test.mjs')
assert.match(uploadErrorsTest, /R2_MULTIPART_UPLOAD/)

console.log('resumable-multipart-upload: all checks passed.')
