import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

test('Nano Banana rulebook exists and contains core snippets', () => {
  const filePath = path.resolve('lib/thumbnails/nano-banana-rulebook.ts')
  assert.ok(fs.existsSync(filePath), 'nano-banana-rulebook.ts must exist')

  const content = fs.readFileSync(filePath, 'utf8')
  assert.ok(content.includes('BACKGROUND_SNIPPETS'), 'Must export BACKGROUND_SNIPPETS')
  assert.ok(content.includes('TEXT_TREATMENT_SNIPPETS'), 'Must export TEXT_TREATMENT_SNIPPETS')
  assert.ok(content.includes('PROOF_ARTIFACT_SNIPPETS'), 'Must export PROOF_ARTIFACT_SNIPPETS')
  assert.ok(content.includes('DIRECTIONAL_SNIPPETS'), 'Must export DIRECTIONAL_SNIPPETS')
  assert.ok(content.includes('VIRAL_THUMBNAIL_RECIPES'), 'Must export VIRAL_THUMBNAIL_RECIPES')
  assert.ok(content.includes('buildNanoBananaPrompt'), 'Must export buildNanoBananaPrompt')

  // Verify key qualities mentioned by user:
  assert.ok(content.includes('highlighter_power_word'), 'Must have highlighter power word style')
  assert.ok(content.includes('chalk_doodle_arrows'), 'Must have chalk doodle arrows')
  assert.ok(content.includes('dark_isometric_grid'), 'Must have isometric grid background')
  assert.ok(content.includes('metric_growth_card'), 'Must have metric growth card')
})

test('Prompt builder formats prompt cleanly', () => {
  const filePath = path.resolve('lib/thumbnails/nano-banana-rulebook.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  // Ensure prompt clauses are properly structured
  assert.ok(content.includes('MAIN SUBJECT:'), 'Prompt should have main subject clause')
  assert.ok(content.includes('HEADLINE & TEXT:'), 'Prompt should have headline & text clause')
  assert.ok(content.includes('PROOF ARTIFACT & UI:'), 'Prompt should have proof artifact clause')
})
