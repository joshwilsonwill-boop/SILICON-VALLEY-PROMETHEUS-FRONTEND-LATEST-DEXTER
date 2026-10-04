import type { VoiceActionResult } from './music-controls'

const generations = new WeakMap<HTMLAudioElement, number>()
const players = new Map<HTMLAudioElement, () => void>()

export function registerMusicPlayer(audio: HTMLAudioElement, onStop: () => void = () => {}) {
  players.set(audio, onStop)
  return () => { stopMusicElement(audio); players.delete(audio) }
}

export function stopMusicElement(audio: HTMLAudioElement | null | undefined) {
  if (!audio) return
  generations.set(audio, (generations.get(audio) ?? 0) + 1)
  audio.pause()
}

export function stopRegisteredMusicPlayers() {
  for (const [audio, onStop] of players) {
    stopMusicElement(audio)
    onStop()
  }
}

/** A late play() resolution after stop or timeout must never resume an audition. */
export async function playMusicElement(audio: HTMLAudioElement, timeoutMs = 12000): Promise<VoiceActionResult> {
  const generation = (generations.get(audio) ?? 0) + 1
  generations.set(audio, generation)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const playback = audio.play().then(() => {
      if (generations.get(audio) !== generation) {
        audio.pause()
        throw new Error('Music preview was cancelled.')
      }
      if (audio.paused || audio.muted || audio.volume === 0) throw new Error('Music preview is not playing audibly.')
    })
    await Promise.race([playback, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Music preview did not start before the timeout.')), timeoutMs)
    })])
    return { success: true, summary: 'Music preview playback started.' }
  } catch (error) {
    // Do not cancel a newer request which has already replaced this audition.
    if (generations.get(audio) === generation) stopMusicElement(audio)
    return { success: false, summary: error instanceof Error ? error.message : 'Music preview playback failed.' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
