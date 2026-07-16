'use client'

import * as React from 'react'

import type { R2Track } from '@/lib/music/r2-sync'

type AudioStoreState = {
  currentTrack: R2Track | null
  duration: number
  isPlaying: boolean
  progress: number
  volume: number
}

type AudioStoreSnapshot = AudioStoreState & {
  close: () => void
  pause: () => void
  playTrack: (track: R2Track) => Promise<void>
  resume: () => Promise<void>
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleTrack: (track: R2Track) => Promise<void>
}

const initialState: AudioStoreState = {
  currentTrack: null,
  duration: 0,
  isPlaying: false,
  progress: 0,
  volume: 1,
}

let state = initialState
let audio: HTMLAudioElement | null = null
const listeners = new Set<() => void>()
let cachedSnapshot: AudioStoreSnapshot | null = null
let cachedServerSnapshot: AudioStoreSnapshot | null = null

function emit(nextState: Partial<AudioStoreState>) {
  state = { ...state, ...nextState }
  cachedSnapshot = null
  listeners.forEach((listener) => listener())
}

function ensureAudio() {
  if (audio) return audio

  audio = new Audio()
  audio.preload = 'metadata'
  audio.addEventListener('timeupdate', () => emit({ progress: audio?.currentTime ?? 0 }))
  audio.addEventListener('durationchange', () => emit({ duration: audio?.duration ?? 0 }))
  audio.addEventListener('loadedmetadata', () => emit({ duration: audio?.duration ?? 0 }))
  audio.addEventListener('play', () => emit({ isPlaying: true }))
  audio.addEventListener('pause', () => emit({ isPlaying: false }))
  audio.addEventListener('ended', () => emit({ isPlaying: false, progress: 0 }))
  audio.addEventListener('volumechange', () => emit({ volume: audio?.volume ?? state.volume }))

  return audio
}

async function playTrack(track: R2Track) {
  const player = ensureAudio()
  if (!track.url) return

  if (state.currentTrack?.id !== track.id) {
    player.src = track.url
    player.currentTime = 0
    emit({ currentTrack: track, duration: 0, progress: 0 })
  }

  player.volume = state.volume

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      artist: track.artist,
      artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/png' }] : [],
      title: track.title,
    })
  }

  try {
    await player.play()
    emit({ isPlaying: true })
  } catch {
    emit({ isPlaying: false })
  }
}

async function resume() {
  const player = ensureAudio()
  if (!state.currentTrack) return
  try {
    await player.play()
  } catch {
    emit({ isPlaying: false })
  }
}

function pause() {
  audio?.pause()
  emit({ isPlaying: false })
}

async function toggleTrack(track: R2Track) {
  if (state.currentTrack?.id === track.id) {
    if (state.isPlaying) {
      pause()
      return
    }
    await resume()
    return
  }

  await playTrack(track)
}

function seek(time: number) {
  if (!audio) return
  audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : time, time))
  emit({ progress: audio.currentTime })
}

function setVolume(volume: number) {
  const player = ensureAudio()
  const normalized = Math.max(0, Math.min(1, volume))
  player.volume = normalized
  emit({ volume: normalized })
}

function close() {
  audio?.pause()
  if (audio) audio.currentTime = 0
  emit({ ...initialState, volume: state.volume })
}

export function stopEditorMedia() {
  audio?.pause()
  if (audio) {
    audio.currentTime = 0
    audio.src = ''
  }
  emit({ ...initialState, volume: state.volume })
}

function getSnapshot(): AudioStoreSnapshot {
  if (cachedSnapshot) return cachedSnapshot

  cachedSnapshot = {
    ...state,
    close,
    pause,
    playTrack,
    resume,
    seek,
    setVolume,
    toggleTrack,
  }

  return cachedSnapshot
}

function getServerSnapshot(): AudioStoreSnapshot {
  if (cachedServerSnapshot) return cachedServerSnapshot

  cachedServerSnapshot = {
    ...initialState,
    close,
    pause,
    playTrack,
    resume,
    seek,
    setVolume,
    toggleTrack,
  }

  return cachedServerSnapshot
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAudioStore() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
