import assert from 'node:assert'
import { generateBeatsForTrack, generateWaveformEnvelope, findNearestBeat } from '../lib/editor/music-beat-engine'
import type { MusicRecommendation } from '../lib/types'

// Test 1: Fallback when track is null
const beatsFallback = generateBeatsForTrack(null, 10)
assert(Array.isArray(beatsFallback), 'Should return array')
assert(beatsFallback.length > 5, 'Should generate beats for 10s duration at default 120 bpm')
console.log('Test 1 Passed: Fallback beats generated')

// Test 2: BPM calculation
const mockTrack: MusicRecommendation = {
  id: 'track-cyber-128',
  title: 'Cyber Pulse',
  artist: 'Prometheus Audio',
  producer: 'Prometheus',
  genre: 'Electronic',
  bpm: 120,
  vibeTags: ['high-tech'],
  coverArtUrl: '',
  previewUrl: 'https://example.com/audio.mp3',
  reason: 'Hero theme',
  mood: 'cinematic',
  energy: 'high',
  sourcePlatform: 'online',
  durationSec: 60,
}

const beats120 = generateBeatsForTrack(mockTrack, 60)
// At 120 bpm, interval is 0.5s -> 60s should yield ~120 beats
assert(beats120.length >= 115 && beats120.length <= 125, `Expected ~120 beats, got ${beats120.length}`)
assert(beats120[0].type === 'downbeat', 'First bar beat should be downbeat')
console.log('Test 2 Passed: 120 BPM generates correct count')

// Test 3: Waveform generation
const envelope = generateWaveformEnvelope(mockTrack, 60, 60)
assert.strictEqual(envelope.length, 60, 'Should match requested sampleCount')
assert(envelope.every((p) => p.energy >= 0.1 && p.energy <= 1.0), 'Energies should be bounded 0.1 - 1.0')
console.log('Test 3 Passed: Waveform envelope generated')

// Test 4: Nearest beat finder
const nearest = findNearestBeat(1.02, beats120, 0.2)
assert(nearest !== null, 'Should find nearest beat within 0.2s of 1.02s')
console.log('Test 4 Passed: Nearest beat found at', nearest?.time)

console.log('ALL MUSIC BEAT ENGINE TESTS PASSED')
