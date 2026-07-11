import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { InlineLoadingAnimation, LoadingAnimation } from '../index'

const ROOT = process.cwd()

test('renders a Canvas-only full-screen status on pure black', () => {
  const markup = renderToStaticMarkup(
    React.createElement(LoadingAnimation, { message: 'Loading project...' }),
  )

  assert.match(markup, /role="status"/)
  assert.match(markup, /aria-live="polite"/)
  assert.match(markup, /<canvas/)
  assert.match(markup, /background-color:#000000/)
  assert.match(markup, /Loading project/)
  assert.doesNotMatch(markup, /<svg|progressbar|animate-spin|skeleton/i)
})

test('gives cancellable full-screen loaders native keyboard semantics', () => {
  const markup = renderToStaticMarkup(
    React.createElement(LoadingAnimation, {
      message: 'Loading project...',
      onCancel: () => undefined,
    }),
  )

  assert.match(markup, /<button/)
  assert.match(markup, /aria-label="Cancel loading"/)
})

test('renders the inline status with a transparent stable square', () => {
  const markup = renderToStaticMarkup(
    React.createElement(InlineLoadingAnimation, { size: 120, label: 'Buffering video' }),
  )

  assert.match(markup, /role="status"/)
  assert.match(markup, /aria-label="Buffering video"/)
  assert.match(markup, /width:120px/)
  assert.match(markup, /height:120px/)
  assert.match(markup, /background-color:transparent/)
  assert.match(markup, /<canvas/)
  assert.doesNotMatch(markup, /<svg|WebGL|three/i)
})

test('uses requestAnimationFrame with resize, visibility, DPR, and teardown controls', () => {
  const source = readFileSync(
    `${ROOT}/components/loading-animation/LoadingAnimation.tsx`,
    'utf8',
  )

  assert.match(source, /requestAnimationFrame/)
  assert.match(source, /cancelAnimationFrame/)
  assert.match(source, /ResizeObserver/)
  assert.match(source, /visibilitychange/)
  assert.match(source, /devicePixelRatio/)
  assert.match(source, /getCanvasPixelRatio/)
  assert.match(source, /if \(document\.hidden\) controller\.pause/)
  assert.match(source, /controller\.pause/)
  assert.match(source, /controller\.resume/)
  assert.match(source, /renderer\.destroy/)
  assert.doesNotMatch(source, /setInterval|<svg|WebGL|three/i)
})

test('keeps the tilt axis horizontal and caches the exact-color bloom and reflection mask', () => {
  const rendererSource = readFileSync(
    `${ROOT}/components/loading-animation/RingRenderer.ts`,
    'utf8',
  )

  assert.match(
    rendererSource,
    /translate\(this\.metrics\.cx, this\.metrics\.cy\)[\s\S]{0,180}scale\([\s\S]{0,120}rotate\(state\.rotation/,
  )
  assert.doesNotMatch(
    rendererSource,
    /translate\(this\.metrics\.cx, this\.metrics\.cy\)[\s\S]{0,180}rotate\(state\.rotation[\s\S]{0,120}scale\(/,
  )
  assert.match(rendererSource, /PALETTE\.glowBright/)
  assert.match(rendererSource, /PALETTE\.glowDim/)
  assert.match(rendererSource, /intenseGlowTexture/)
  assert.match(rendererSource, /reflectionMask/)
  assert.match(rendererSource, /globalAlpha = REFLECTION_OPACITY\b/)
  assert.doesNotMatch(rendererSource, /REFLECTION_OPACITY \* state\.opacity/)
})

test('provides app-wide loading state and fetch cleanup at the root', () => {
  const contextSource = readFileSync(`${ROOT}/contexts/LoadingContext.tsx`, 'utf8')
  const fetchSource = readFileSync(`${ROOT}/hooks/useLoadingFetch.ts`, 'utf8')
  const layoutSource = readFileSync(`${ROOT}/app/layout.tsx`, 'utf8')

  assert.match(contextSource, /createContext/)
  assert.match(contextSource, /showLoading/)
  assert.match(contextSource, /hideLoading/)
  assert.match(contextSource, /cancellable/)
  assert.match(contextSource, /activeCount/)
  assert.match(contextSource, /<LoadingAnimation/)
  assert.match(contextSource, /useLoading must be used within LoadingProvider/)
  assert.match(fetchSource, /try\s*{/)
  assert.match(fetchSource, /finally\s*{/)
  assert.match(fetchSource, /hideLoading\(\)/)
  assert.match(layoutSource, /import \{ LoadingProvider \}/)
  assert.match(layoutSource, /<ReactQueryProvider>[\s\S]*<LoadingProvider>[\s\S]*<AuthProvider>/)
})
