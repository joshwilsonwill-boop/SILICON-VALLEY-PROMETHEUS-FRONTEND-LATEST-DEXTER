import assert from 'node:assert/strict'
import test from 'node:test'

import { mapSavedBrandDnaToCanvas } from '../lib/brand-dna/canvas-mapping'

test('a website profile maps its actual identity into all four brand canvas cards', () => {
  const direction = mapSavedBrandDnaToCanvas(JSON.stringify({
    id: 'site-dan-martell',
    url: 'https://www.danmartell.com/',
    brandName: 'Dan Martell',
    tagline: 'Build freedom through better systems',
    valueProposition: 'Help founders scale while buying back time',
    targetAudience: 'SaaS founders and CEOs',
    industry: 'Founder coaching',
    logoText: 'DAN MARTELL',
    primaryColors: { surface: '#101a2d', primary: '#24568c', accent: '#b7ef68', text: '#ffffff' },
    fonts: { display: 'Manrope', body: 'Inter', mono: 'IBM Plex Mono' },
    kineticStyle: { captionStyle: 'Short direct statements', pacing: 'rapid_dynamic' },
    toneOfVoice: ['Direct', 'Optimistic'],
    keyMessages: [{ title: 'Buy back time' }, { title: 'Scale with systems' }],
    aiPhotoPreset: 'Warm documentary portraits',
    evidence: { pagesRead: 3, colorsObserved: ['#101a2d', '#24568c', '#b7ef68', '#ffffff'], fontsObserved: ['Manrope', 'Inter'] },
  }))

  assert.ok(direction)
  assert.equal(direction.name, 'Dan Martell')
  assert.equal(direction.subtitle, 'Analyzed from danmartell.com · 3 pages')
  assert.equal(direction.colors.start, '#101a2d')
  assert.equal(direction.colors.accent, '#b7ef68')
  assert.equal(direction.cards.length, 4)
  assert.ok(direction.cards[0].lines.includes('SaaS founders and CEOs'))
  assert.ok(direction.cards[1].lines.includes('Type: Manrope'))
  assert.ok(direction.cards[2].lines.includes('Accent #b7ef68'))
  assert.ok(direction.cards[3].lines.includes('Buy back time'))
})

test('profile mapping safely handles malformed or incomplete saved data', () => {
  assert.equal(mapSavedBrandDnaToCanvas(null), null)
  assert.equal(mapSavedBrandDnaToCanvas('{broken'), null)
  assert.equal(mapSavedBrandDnaToCanvas(JSON.stringify({ brandName: 'No colors' })), null)
  const unsafeLink = mapSavedBrandDnaToCanvas(JSON.stringify({ brandName: 'Test', url: 'javascript:alert(1)', primaryColors: {} }))
  assert.ok(unsafeLink)
  assert.equal(unsafeLink.sourceUrl, '')
})
