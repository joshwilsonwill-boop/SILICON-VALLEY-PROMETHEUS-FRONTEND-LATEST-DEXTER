'use client'

import * as React from 'react'
import type { MusicRecommendation } from '@/lib/types'
import { editorialAudioTime, type EditorialSoundEffect } from '@/lib/editor/editorial-timeline-state'

/** Follow the preview's media clock, including scrubs and transcript cut jumps. */
export function EditorialAudioPreview({ track, volume, muted, effects, videoRef, playing, currentTime, onError }: {
  track: MusicRecommendation | null
  volume: number
  muted: boolean
  effects: EditorialSoundEffect[]
  videoRef: React.Ref<HTMLVideoElement>
  playing: boolean
  currentTime: number
  onError: (message: string | null) => void
}) {
  const players = React.useRef(new Map<string, HTMLAudioElement>())
  const latest = React.useRef({ volume, muted, playing, currentTime, effects })
  latest.current = { volume, muted, playing, currentTime, effects }
  const syncNow = React.useRef<(() => void) | null>(null)
  const sources = JSON.stringify([
    ...(track?.previewUrl ? [{ id: 'music', url: track.previewUrl }] : []),
    ...effects.filter((cue) => cue.url).map((cue) => ({ id: `effect:${cue.id}`, url: cue.url! })),
  ])

  React.useEffect(() => {
    const sounds = JSON.parse(sources) as Array<{ id: string; url: string }>
    onError(null)
    for (const sound of sounds) {
      const audio = new Audio(sound.url)
      audio.preload = 'metadata'
      audio.loop = sound.id === 'music'
      audio.addEventListener('error', () => onError('An audio clip could not load. Check its source and retry playback.'))
      players.current.set(sound.id, audio)
    }
    return () => {
      for (const audio of players.current.values()) { audio.pause(); audio.removeAttribute('src'); audio.load() }
      players.current.clear()
    }
  }, [sources, onError])

  React.useEffect(() => {
    const failed = new Set<string>()
    let frame = 0
    const sync = () => {
      const state = latest.current
      const video = typeof videoRef === 'object' ? videoRef?.current : null
      const time = video && Number.isFinite(video.currentTime) ? video.currentTime : state.currentTime
      const isPlaying = state.playing && (!video || !video.paused)
      for (const [id, audio] of players.current) {
        const cue = state.effects.find((item) => `effect:${item.id}` === id)
        let position = id === 'music' ? time : cue ? editorialAudioTime(cue, time) : null
        audio.volume = id === 'music' ? (state.muted ? 0 : state.volume) : cue?.muted ? 0 : cue?.volume ?? 0.7
        if (position === null || !isPlaying) audio.pause()
        if (position === null || audio.readyState < 1) continue
        if (audio.loop && Number.isFinite(audio.duration) && audio.duration > 0) position %= audio.duration
        if (!audio.loop && position >= audio.duration) { audio.pause(); continue }
        if (Math.abs(audio.currentTime - position) > 0.18) audio.currentTime = position
        if (isPlaying && audio.volume > 0 && audio.paused && !failed.has(id)) {
          failed.add(id)
          void audio.play().then(() => failed.delete(id)).catch(() => onError('Audio playback paused. Press play again to retry.'))
        }
      }
    }
    const tick = () => { sync(); if (latest.current.playing) frame = requestAnimationFrame(tick) }
    syncNow.current = sync
    tick()
    return () => { syncNow.current = null; cancelAnimationFrame(frame); for (const audio of players.current.values()) audio.pause() }
  }, [playing, sources, videoRef, onError])
  React.useEffect(() => { syncNow.current?.() }, [currentTime, volume, muted, effects])
  return null
}
