import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeBrandProfile } from '../lib/brand-dna/analyze-site'
import type { BrandSiteEvidence } from '../lib/brand-dna/site-source'

const evidence: BrandSiteEvidence = {
  requestedUrl: 'https://northstar.example/',
  canonicalUrl: 'https://northstar.example/',
  pages: [{
    url: 'https://northstar.example/',
    title: 'Northstar Coaching',
    description: 'Founder coaching that buys back time.',
    headings: ['Make space for better work'],
    text: 'Northstar helps startup founders reclaim their time and build sustainable companies.',
    imageDescriptions: ['Founder workshop'],
  }],
  observedColors: ['#102030', '#2255aa', '#4ac0b0', '#f2f4f8'],
  observedFonts: ['Aptos', 'Bebas Neue'],
  logoText: 'Northstar',
}

test('analysis output is bounded and only uses colors and fonts observed on the website', () => {
  const profile = normalizeBrandProfile({
    brandName: 'Northstar Coaching',
    industry: 'Founder coaching',
    tagline: 'Make space for better work',
    valueProposition: 'Sustainable growth through reclaimed founder time.',
    targetAudience: 'SaaS founders',
    logoText: 'NORTHSTAR',
    primaryColors: {
      surface: '#102030', primary: '#ff0000', accent: '#4ac0b0', text: '#000000', muted: '#f2f4f8', border: '#123456',
    },
    fonts: { display: 'Comic Sans', body: 'Aptos', mono: 'Fira Code' },
    kineticStyle: { curveName: 'Steady', pacing: 'cinematic_deliberate', captionStyle: 'Clear statement-led captions' },
    toneOfVoice: ['Direct', 'Warm', 'Founder-first', 'Practical', 'Invented', 'Extra'],
    personality: { visionary: 130, polish: -5, intensity: 65.4 },
    keyMessages: [{ title: 'Reclaim the calendar', body: 'Give leaders room for high-value work.' }],
    aiPhotoPreset: 'Natural founder portrait',
  }, evidence)

  assert.equal(profile.brandName, 'Northstar Coaching')
  assert.equal(profile.url, evidence.canonicalUrl)
  assert.equal(profile.primaryColors.surface, '#102030')
  assert.ok(evidence.observedColors.includes(profile.primaryColors.primary))
  assert.ok(evidence.observedColors.includes(profile.primaryColors.accent))
  assert.ok(evidence.observedFonts.includes(profile.fonts.display))
  assert.equal(profile.fonts.mono, 'Aptos')
  assert.equal(profile.personality.visionary, 100)
  assert.equal(profile.personality.polish, 0)
  assert.equal(profile.toneOfVoice.length, 6)
  assert.equal(profile.kineticStyle.pacing, 'cinematic_deliberate')
  assert.deepEqual(profile.sourceUrls, [evidence.canonicalUrl])
  assert.deepEqual(profile.evidence.colorsObserved, evidence.observedColors)
})

test('analysis rejects malformed model output and supplies grounded fallbacks for missing fields', () => {
  assert.throws(() => normalizeBrandProfile(null, evidence), /not an object/)
  const profile = normalizeBrandProfile({ brandName: 'Northstar' }, evidence)
  assert.equal(profile.brandName, 'Northstar')
  assert.ok(profile.tagline.length > 0)
  assert.ok(profile.toneOfVoice.length > 0)
  assert.equal(profile.fonts.display, 'Aptos')
  assert.equal(profile.keyMessages[0].title, 'Observed brand idea')
})
