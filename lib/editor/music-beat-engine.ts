import type { MusicRecommendation } from '@/lib/types'

export interface MusicBeat {
  id: string
  time: number
  type: 'downbeat' | 'emphasis' | 'build' | 'climax'
  intensity: number
  word?: string
}

export interface WaveformPoint {
  time: number
  energy: number
}

const DEFAULT_BPM = 120

/**
 * Generates deterministic, tempo-aligned beat markers based on track BPM.
 * Produces structured rhythmic milestones (downbeats, quarter notes, 4-bar climaxes).
 */
export function generateBeatsForTrack(
  track: MusicRecommendation | null | undefined,
  durationSec: number,
): MusicBeat[] {
  const effectiveDuration = Math.max(1, durationSec)
  const bpm = track?.bpm && Number.isFinite(track.bpm) && track.bpm > 40 && track.bpm < 240
    ? track.bpm
    : DEFAULT_BPM

  const beatInterval = 60 / bpm
  const beats: MusicBeat[] = []

  let beatIndex = 0
  let currentTime = 0.2 // small initial offset for downbeat transient

  while (currentTime < effectiveDuration) {
    const barPosition = beatIndex % 4 // 4/4 time signature
    const phrasePosition = Math.floor(beatIndex / 4) % 8 // 8-bar phrase

    let type: MusicBeat['type'] = 'emphasis'
    let intensity = 0.65

    if (barPosition === 0) {
      if (phrasePosition === 7) {
        type = 'climax'
        intensity = 0.95
      } else if (phrasePosition === 3) {
        type = 'build'
        intensity = 0.85
      } else {
        type = 'downbeat'
        intensity = 0.78
      }
    } else if (barPosition === 2) {
      type = 'emphasis'
      intensity = 0.72
    } else {
      type = 'build'
      intensity = 0.55
    }

    beats.push({
      id: `beat-${track?.id ?? 'def'}-${beatIndex}-${currentTime.toFixed(2)}`,
      time: Math.round(currentTime * 100) / 100,
      type,
      intensity,
      word: barPosition === 0 ? (phrasePosition === 7 ? 'DROP' : 'BEAT') : undefined,
    })

    beatIndex++
    currentTime += beatInterval
  }

  return beats
}

/**
 * Generates a normalized waveform envelope for timeline visualization.
 * Synthesizes dynamic energy peaks tied to downbeats and transient pulses.
 */
export function generateWaveformEnvelope(
  track: MusicRecommendation | null | undefined,
  durationSec: number,
  sampleCount: number = 80,
): WaveformPoint[] {
  const effectiveDuration = Math.max(1, durationSec)
  const points: WaveformPoint[] = []
  const step = effectiveDuration / sampleCount
  const bpm = track?.bpm && Number.isFinite(track.bpm) ? track.bpm : DEFAULT_BPM
  const beatPeriod = 60 / bpm

  // Deterministic seed based on track id string hash
  let seed = 42
  if (track?.id) {
    for (let i = 0; i < track.id.length; i++) {
      seed = (seed * 31 + track.id.charCodeAt(i)) & 0xffffff
    }
  }

  for (let i = 0; i < sampleCount; i++) {
    const time = i * step
    // Phase alignment with beat period
    const beatPhase = (time % beatPeriod) / beatPeriod
    const beatProximity = Math.exp(-Math.pow(beatPhase * 4, 2)) // sharp spike at beat onset

    // Pseudo-random variance from seed
    const pseudoRandom = Math.sin(seed + i * 1.618) * 0.5 + 0.5
    
    // Overall dynamic envelope (intro lower, climax higher)
    const normalizedProgress = time / effectiveDuration
    const macroEnvelope = 0.4 + 0.5 * Math.sin(normalizedProgress * Math.PI)

    const rawEnergy = 0.2 + (beatProximity * 0.45) + (pseudoRandom * 0.25) * macroEnvelope
    const energy = Math.min(1, Math.max(0.12, Math.round(rawEnergy * 100) / 100))

    points.push({
      time: Math.round(time * 100) / 100,
      energy,
    })
  }

  return points
}

/**
 * Finds the nearest beat marker within a given tolerance threshold.
 */
export function findNearestBeat(
  timeSec: number,
  beats: MusicBeat[],
  maxDistanceSec: number = 0.35,
): MusicBeat | null {
  if (!beats || beats.length === 0) return null

  let closest: MusicBeat | null = null
  let minDiff = Infinity

  for (const beat of beats) {
    const diff = Math.abs(beat.time - timeSec)
    if (diff < minDiff && diff <= maxDistanceSec) {
      minDiff = diff
      closest = beat
    }
  }

  return closest
}
