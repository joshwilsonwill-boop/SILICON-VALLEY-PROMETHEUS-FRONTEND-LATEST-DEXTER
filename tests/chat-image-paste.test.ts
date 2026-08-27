import assert from 'node:assert/strict'

import { extractImageFilesFromClipboard } from '@/lib/editor/chat-attachment'

function clipboardWith(items: Array<{ kind: string; type: string; file?: File }>) {
  return {
    items: items.map((item) => ({
      ...item,
      getAsFile: () => item.file ?? null,
    })),
  } as unknown as DataTransfer
}

const imageFiles = Array.from({ length: 5 }, (_, index) =>
  new File([`image-${index}`], `reference-${index}.png`, { type: 'image/png' }),
)

const extracted = extractImageFilesFromClipboard(
  clipboardWith([
    { kind: 'string', type: 'text/plain' },
    ...imageFiles.map((file) => ({ kind: 'file', type: file.type, file })),
    { kind: 'file', type: 'application/pdf', file: new File(['pdf'], 'notes.pdf', { type: 'application/pdf' }) },
  ]),
)

assert.equal(extracted.length, 4)
assert.deepEqual(extracted.map((file) => file.name), imageFiles.slice(0, 4).map((file) => file.name))

assert.deepEqual(
  extractImageFilesFromClipboard(clipboardWith([{ kind: 'string', type: 'text/plain' }])),
  [],
)

console.log('chat-image-paste: all assertions passed')
