import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import Loading from '../app/loading'

test('workspace route transitions show the Prometheus animation on a dark screen', () => {
  const markup = renderToStaticMarkup(React.createElement(Loading))

  assert.match(markup, /role="status"/)
  assert.match(markup, /prometheus-logo-cinematic\.webm/)
  assert.doesNotMatch(markup, /Opening your workspace|Loading workspace/i)
  assert.match(markup, /background:\s*#050507/)
  assert.match(markup, /animation-duration:\s*500ms/)
  assert.doesNotMatch(markup, /animate-spin/)
})
