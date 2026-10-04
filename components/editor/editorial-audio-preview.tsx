'use client'

import * as React from 'react'
import type { MusicRecommendation } from '@/lib/types'
import { editorialAudioTime, type EditorialSoundEffect } from '@/lib/editor/editorial-timeline-state'
import { playMusicElement, registerMusicPlayer, stopMusicElement } from '@/lib/voice-companion/music-playback'

/** Follow the preview's media clock, including scrubs and transcript cut jumps. */
export function EditorialAudioPreview({ track, volume, muted, effects, videoRef, playing, currentTime, ducking = false, voiceActive = false, onError }: {
  track: MusicRecommendation | null
  volume: number
  muted: boolean
  effects: EditorialSoundEffect[]
  videoRef: React.Ref<HTMLVideoElement>
  playing: boolean
  currentTime: number
  ducking?: boolean
  voiceActive?: boolean
  onError: (message: string | null) => void
}) {
  const players = React.useRef(new Map<string, HTMLAudioElement>())
  const musicStopped = React.useRef(false)
  const latest = React.useRef({ volume, muted, playing, currentTime, effects, ducking, voiceActive })
  React.useEffect(() => {
    latest.current = { volume, muted, playing, currentTime, effects, ducking, voiceActive }
  }, [volume, muted, playing, currentTime, effects, ducking, voiceActive])
  const syncNow = React.useRef<(() => void) | null>(null)
  const sources = JSON.stringify([
    ...(track?.previewUrl ? [{ id: 'music', url: track.previewUrl }] : []),
    ...effects.filter((cue) => cue.url).map((cue) => ({ id: `effect:${cue.id}`, url: cue.url! })),
  ])

  React.useEffect(() => {
    const sounds = JSON.parse(sources) as Array<{ id: string; url: string }>
    musicStopped.current = false
    const unregister: Array<() => void> = []
    onError(null)
    for (const sound of sounds) {
      const audio = new Audio(sound.url)
      audio.preload = 'metadata'
      audio.loop = sound.id === 'music'
      audio.addEventListener('error', () => onError('An audio clip could not load. Check its source and retry playback.'))
      players.current.set(sound.id, audio)
      if (sound.id === 'music') unregister.push(registerMusicPlayer(audio, () => { musicStopped.current = true }))
    }
    return () => {
      unregister.forEach(release => release())
      for (const audio of players.current.values()) { audio.pause(); audio.removeAttribute('src'); audio.load() }
      players.current.clear()
    }
  }, [sources, onError])

  React.useEffect(() => {
    if (playing) musicStopped.current = false
    const failed = new Set<string>()
    let frame = 0
    const sync = () => {
      const state = latest.current
      const video = typeof videoRef === 'object' ? videoRef?.current : null
      const time = video && Number.isFinite(video.currentTime) ? video.currentTime : state.currentTime
      const isPlaying = state.playing && (!video || !video.paused)
      for (const [id, audio] of players.current) {
        if (id === 'music' && musicStopped.current) { audio.pause(); continue }
        const cue = state.effects.find((item) => `effect:${item.id}` === id)
        let position = id === 'music' ? time : cue ? editorialAudioTime(cue, time) : null
        audio.volume = id === 'music'
          ? (state.muted ? 0 : state.volume * (state.ducking && state.voiceActive ? 0.24 : 1))
          : cue?.muted ? 0 : cue?.volume ?? 0.7
        if (position === null || !isPlaying) {
          if (id === 'music') stopMusicElement(audio)
          else audio.pause()
        }
        if (position === null || audio.readyState < 1) continue
        if (audio.loop && Number.isFinite(audio.duration) && audio.duration > 0) position %= audio.duration
        if (!audio.loop && position >= audio.duration) { audio.pause(); continue }
        if (Math.abs(audio.currentTime - position) > 0.18) audio.currentTime = position
        if (isPlaying && audio.volume > 0 && audio.paused && !failed.has(id)) {
          failed.add(id)
          if (id === 'music') void playMusicElement(audio).then(result => { if (result.success) failed.delete(id); else if (!musicStopped.current) onError(result.summary) })
          else void audio.play().then(() => failed.delete(id)).catch(() => onError('Audio playback paused. Press play again to retry.'))
        }
      }
    }
    const tick = () => { sync(); if (latest.current.playing) frame = requestAnimationFrame(tick) }
    syncNow.current = sync
    tick()
    return () => { syncNow.current = null; cancelAnimationFrame(frame); for (const [id, audio] of players.current) { if (id === 'music') stopMusicElement(audio); else audio.pause() } }
  }, [playing, sources, videoRef, onError])
  React.useEffect(() => { if (!muted) musicStopped.current = false }, [muted])
  React.useEffect(() => { syncNow.current?.() }, [currentTime, volume, muted, effects, ducking, voiceActive])
  return null
}
