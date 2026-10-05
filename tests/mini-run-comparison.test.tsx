import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { MiniRunComparison, type ComparisonClip } from '../components/mini-run/mini-run-comparison'

const clips: ComparisonClip[] = Array.from({ length: 5 }, (_, index) => ({
  id: `job-${index + 1}`,
  label: `Short ${String(index + 1).padStart(2, '0')}`,
  outputUrl: `/api/mini-run/job/job-${index + 1}/output`,
  sourceStartMs: (index + 1) * 10_000,
  sourceEndMs: (index + 1) * 10_000 + 25_000,
  hook: `Hook ${index + 1}`,
}))

function render(width: number, height: number, selectedClipId = 'job-3') {
  return renderToStaticMarkup(
    <MiniRunComparison
      sourceUrl="/source.mp4"
      sourceTitle="Interview source"
      sourceDimensions={{ width, height }}
      sourceDurationMs={180_000}
      clips={clips}
      selectedClipId={selectedClipId}
      onSelectClip={() => {}}
    />,
  )
}

const landscape = render(1920, 1080)
assert.match(landscape, /Landscape source/)
assert.match(landscape, /<video[^>]*class="[^"]*h-auto w-full"[^>]*aria-label="Original source video"/)
assert.match(landscape, /Rendered output: Short 03/)
assert.match(landscape, /0:30 → 0:55/)
assert.equal((landscape.match(/aria-pressed=/g) ?? []).length, 5)
assert.match(landscape, /aria-pressed="true"[^>]*>[\s\S]*?Cut 03/)
assert.equal((landscape.match(/role="group"/g) ?? []).length, 1)

const portrait = render(1080, 1920)
assert.match(portrait, /Portrait source/)
assert.match(portrait, /<video[^>]*class="[^"]*h-full w-auto"[^>]*aria-label="Original source video"/)
assert.match(portrait, /Rendered output: Short 03/)

const single = renderToStaticMarkup(
  <MiniRunComparison
    sourceUrl="/portrait.mp4"
    sourceTitle="Portrait take"
    sourceDimensions={{ width: 1080, height: 1920 }}
    clips={[clips[0]]}
    selectedClipId="job-1"
    onSelectClip={() => {}}
  />,
)
assert.doesNotMatch(single, /Select a rendered short/)
assert.match(single, /Jump to 0:10/)

console.log('mini-run comparison verification passed')
