import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

console.log('Running Jarvis Persistent Memory Regression Test...')

// 1. Memory module must exist
assert.ok(existsSync('lib/voice-companion/memory.ts'), 'lib/voice-companion/memory.ts must exist')

// 2. Import memory functions
const {
  getJarvisMemory,
  saveJarvisMemory,
  clearJarvisMemory,
  formatMemoryForSystemInstruction,
} = await import('../lib/voice-companion/memory.ts')

// 3. Test saving and reading brand and editorial context
clearJarvisMemory('test-project')
const initial = getJarvisMemory('test-project')
assert.ok(initial, 'Must return initial memory object')
assert.ok(Array.isArray(initial.editorialDecisions), 'editorialDecisions must be an array')

saveJarvisMemory(
  {
    brandProfile: {
      brandName: 'Vincere Media',
      tone: 'Cinematic High-Tech',
      preferredCaptionStyle: 'karaoke_pop',
      pacing: 'rapid_dynamic',
    },
    editorialDecisions: [
      { timestamp: Date.now(), summary: 'Approved intense trailer soundtrack for intro' },
    ],
    userPreferences: {
      autoRemoveSilences: true,
      silenceThresholdSec: 0.5,
    },
  },
  'test-project'
)

const retrieved = getJarvisMemory('test-project')
assert.equal(retrieved.brandProfile.brandName, 'Vincere Media')
assert.equal(retrieved.brandProfile.preferredCaptionStyle, 'karaoke_pop')
assert.equal(retrieved.editorialDecisions.length, 1)

// 4. Formatter generates concise, high-signal system instruction section
const instructionSnippet = formatMemoryForSystemInstruction(retrieved)
assert.match(instructionSnippet, /Vincere Media/, 'Formatted memory must mention brand name')
assert.match(instructionSnippet, /karaoke_pop/, 'Formatted memory must mention caption preference')
assert.match(instructionSnippet, /intense trailer/, 'Formatted memory must include editorial decision history')

// 5. Check live client mounts formatted memory
const clientSource = readFileSync('lib/voice-companion/gemini-live-client.ts', 'utf8')
assert.match(clientSource, /formatMemoryForSystemInstruction|getJarvisMemory|memoryInstruction/, 'gemini-live-client must inject persistent memory into system instruction')

// 6. Check hook or bridge updates memory on actions
const hookSource = readFileSync('hooks/use-voice-companion.ts', 'utf8')
assert.match(hookSource, /saveJarvisMemory|getJarvisMemory/, 'useVoiceCompanion must reference persistent memory')

console.log('jarvis-persistent-memory-regression: all checks passed')
