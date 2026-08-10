import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { InlineLoadingAnimation, LoadingAnimation } from '../index'

const ROOT = process.cwd()

test('renders no full-screen loading UI', () => {
  const markup = renderToStaticMarkup(
    React.createElement(LoadingAnimation, { message: 'Loading project...' }),
  )

  assert.equal(markup, '')
})

test('renders no inline loading UI', () => {
  const markup = renderToStaticMarkup(
    React.createElement(InlineLoadingAnimation, { size: 120, label: 'Buffering video' }),
  )

  assert.equal(markup, '')
})

test('contains no canvas, video, timer, or animation implementation', () => {
  const fullScreenSource = readFileSync(
    `${ROOT}/components/loading-animation/LoadingAnimation.tsx`,
    'utf8',
  )
  const inlineSource = readFileSync(
    `${ROOT}/components/loading-animation/InlineLoadingAnimation.tsx`,
    'utf8',
  )

  assert.match(fullScreenSource, /return null/)
  assert.match(inlineSource, /return null/)
  assert.doesNotMatch(fullScreenSource, /<canvas|<video|requestAnimationFrame|setInterval/)
  assert.doesNotMatch(inlineSource, /<canvas|<video|requestAnimationFrame|setInterval/)
})

test('keeps loading state calls compatible without mounting visual UI', () => {
  const contextSource = readFileSync(`${ROOT}/contexts/LoadingContext.tsx`, 'utf8')
  const fetchSource = readFileSync(`${ROOT}/hooks/useLoadingFetch.ts`, 'utf8')
  const layoutSource = readFileSync(`${ROOT}/app/layout.tsx`, 'utf8')

  assert.match(contextSource, /createContext/)
  assert.match(contextSource, /showLoading/)
  assert.match(contextSource, /hideLoading/)
  assert.match(contextSource, /showVideoLoader/)
  assert.doesNotMatch(contextSource, /activeCount|<LoadingAnimation|<VideoLoader/)
  assert.match(contextSource, /useLoading must be used within LoadingProvider/)
  assert.match(fetchSource, /try\s*{/)
  assert.match(fetchSource, /finally\s*{/)
  assert.match(fetchSource, /hideLoading\(\)/)
  assert.match(layoutSource, /import \{ LoadingProvider \}/)
  assert.match(layoutSource, /<LoadingProvider>[\s\S]*<AuthProvider>/)
  assert.doesNotMatch(layoutSource, /ReactQueryProvider/)
})
