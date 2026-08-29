import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { FinalOutputControls } from '../components/editor/final-output-controls'

const baseProps = {
  view: 'original' as const,
  revealId: null,
  error: null,
  onSelect: () => {},
}

test('processing state announces that the final render is in progress without showing a selector', () => {
  const markup = renderToStaticMarkup(
    <FinalOutputControls {...baseProps} lifecycle="processing" hasFinal={false} />,
  )

  assert.match(markup, /data-final-output-state="processing"/)
  assert.match(markup, /Rendering final/)
  assert.doesNotMatch(markup, /role="tablist"/)
})

test('completed state exposes an accessible original/final selector', () => {
  const markup = renderToStaticMarkup(
    <FinalOutputControls {...baseProps} lifecycle="completed" hasFinal />,
  )

  assert.match(markup, /data-final-output-state="completed"/)
  assert.match(markup, /role="tablist"/)
  assert.match(markup, /aria-label="Preview source"/)
  assert.match(markup, /Original/)
  assert.match(markup, /Final/)
  assert.match(markup, /aria-selected="true"/)
})

test('failed state keeps the failure visible and does not offer an unusable final tab', () => {
  const markup = renderToStaticMarkup(
    <FinalOutputControls
      {...baseProps}
      lifecycle="failed"
      hasFinal={false}
      error="Render timed out"
    />,
  )

  assert.match(markup, /data-final-output-state="failed"/)
  assert.match(markup, /Render timed out/)
  assert.doesNotMatch(markup, /role="tablist"/)
})
