'use client'

import { projects } from '@/lib/projects'
import { SELECTED_EDITOR_MUSIC_EVENT, selectedEditorMusicStorageKey, writeSelectedEditorMusicRecommendation, type SelectedEditorMusicEventDetail } from '@/lib/editor-music-selection'
import { applyEditorialTimelinePatch, editorialMusicSchema, emptyEditorialTimeline, readEditorialTimeline, type EditorialTimelinePatch, type EditorialTimelineState } from './editorial-timeline-state'
import type { MusicRecommendation } from '@/lib/types'

export type EditorialTimelineSnapshot = {
  timeline: EditorialTimelineState | null
  status: 'loading' | 'saved' | 'saving' | 'error'
  error: string | null
}
const emptySnapshot: EditorialTimelineSnapshot = { timeline: null, status: 'loading', error: null }

async function resolveTrack(trackId: string): Promise<MusicRecommendation | null> {
  const response = await fetch(`/api/music/catalog/${trackId.split('/').map(encodeURIComponent).join('/')}`)
  if (!response.ok) return null
  const track = await response.json()
  return {
    id: track.id, title: track.title, artist: track.artist || 'Unknown artist',
    producer: 'Prometheus', genre: track.genreTags?.[0] || track.category || 'Soundtrack',
    bpm: track.bpm || 0, vibeTags: [...(track.genreTags || []), ...(track.moodTags || [])],
    coverArtUrl: track.thumbnailUrl || '', previewUrl: track.audioPreviewUrl || `/api/music/preview?trackId=${encodeURIComponent(track.id)}`,
    reason: 'Selected soundtrack', mood: 'cinematic', energy: 'medium', sourcePlatform: 'local', durationSec: track.durationSec || 0,
  }
}

export class EditorialTimelineController {
  snapshot: EditorialTimelineSnapshot = emptySnapshot
  private listeners = new Set<() => void>()
  private queue: EditorialTimelinePatch[] = []
  private busy = false
  private initialized = false
  private refreshing = false
  private stop: (() => void) | null = null
  constructor(readonly projectId: string) {}

  private publish(snapshot: EditorialTimelineSnapshot) {
    this.snapshot = snapshot
    const cached = projects.get(this.projectId)
    if (cached && snapshot.timeline) {
      const current = cached.editorState ?? {}
      if (JSON.stringify(current.editorialTimeline) !== JSON.stringify(snapshot.timeline)) {
        projects.update(this.projectId, { editorState: { ...current, editorialTimeline: snapshot.timeline } })
      }
    }
    this.listeners.forEach((listener) => listener())
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    if (!this.stop) this.start()
    return () => {
      this.listeners.delete(listener)
      if (!this.listeners.size) { this.stop?.(); this.stop = null }
    }
  }
  getSnapshot = () => this.snapshot
  getServerSnapshot = () => emptySnapshot

  private start() {
    if (!this.projectId || this.projectId === '__new__') {
      this.snapshot = { timeline: null, status: 'saved', error: null }
      this.stop = () => {}
      return
    }
    const onSelection = (event: Event) => {
      const detail = (event as CustomEvent<SelectedEditorMusicEventDetail>).detail
      if (detail?.projectId !== this.projectId || detail.origin === 'timeline') return
      if (!detail.trackId) {
        this.patch({ type: 'music', track: null })
        return
      }
      void this.select(detail.trackId, detail.track)
    }
    const onFocus = () => { if (document.visibilityState === 'visible') void this.refresh() }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== selectedEditorMusicStorageKey(this.projectId)) return
      if (!event.newValue) {
        this.patch({ type: 'music', track: null })
        return
      }
      try { const id = JSON.parse(event.newValue); if (typeof id === 'string') void this.select(id) } catch { /* Ignore malformed cache. */ }
    }
    window.addEventListener(SELECTED_EDITOR_MUSIC_EVENT, onSelection)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const interval = window.setInterval(onFocus, 5000)
    this.stop = () => {
      window.clearInterval(interval)
      window.removeEventListener(SELECTED_EDITOR_MUSIC_EVENT, onSelection)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
    void this.refresh()
  }

  async select(trackId: string, fullTrack?: MusicRecommendation) {
    // A slower catalog lookup must never supersede a more recent selection.
    this.selectionToken++
    const token = this.selectionToken
    try {
      const track = fullTrack ?? await resolveTrack(trackId)
      if (token !== this.selectionToken || !track) return
      const parsed = editorialMusicSchema.safeParse(track)
      if (parsed.success) this.patch({ type: 'music', track: parsed.data })
    } catch (error) {
      if (token === this.selectionToken) this.publish({ ...this.snapshot, status: 'error', error: error instanceof Error ? error.message : 'Unable to load the selected song.' })
    }
  }
  private selectionToken = 0

  patch = (patch: EditorialTimelinePatch) => {
    this.queue.push(patch)
    const timeline = this.snapshot.timeline ?? emptyEditorialTimeline(projects.get(this.projectId)?.sourceAssetId ?? null)
    this.publish({ timeline: applyEditorialTimelinePatch(timeline, patch), status: 'saving', error: null })
    if (this.initialized) void this.drain()
    else void this.refresh()
  }

  retry = () => { if (this.queue.length && this.initialized) void this.drain(); else void this.refresh() }

  async refresh() {
    if (this.refreshing || this.busy || (this.initialized && this.queue.length)) return
    this.refreshing = true
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/editorial-timeline`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to sync the timeline.')
      let timeline = readEditorialTimeline({ editorialTimeline: data.timeline }, data.timeline.sourceAssetId)
      if (!this.initialized && timeline.revision === 0 && !this.queue.length) {
        // Restore the existing browser selection once, after checking the server.
        try {
          const raw = window.localStorage.getItem(`${selectedEditorMusicStorageKey(this.projectId)}.record`)
          const selectedId = JSON.parse(window.localStorage.getItem(selectedEditorMusicStorageKey(this.projectId)) || 'null')
          const parsed = editorialMusicSchema.safeParse(raw ? JSON.parse(raw) : null)
          if (parsed.success && parsed.data.id === selectedId) this.queue.push({ type: 'music', track: parsed.data })
          else if (typeof selectedId === 'string') void this.select(selectedId)
        } catch { /* Storage is optional. */ }
      }
      this.initialized = true
      for (const patch of this.queue) timeline = applyEditorialTimelinePatch(timeline, patch)
      if (!this.queue.length && timeline.music) writeSelectedEditorMusicRecommendation(this.projectId, timeline.music.track, 'timeline')
      if (JSON.stringify(timeline) !== JSON.stringify(this.snapshot.timeline) || this.snapshot.status !== 'saved') {
        this.publish({ timeline, status: this.queue.length ? 'saving' : 'saved', error: null })
      }
    } catch (error) {
      this.publish({ ...this.snapshot, status: 'error', error: error instanceof Error ? error.message : 'Unable to sync the timeline.' })
    } finally {
      this.refreshing = false
      if (this.initialized && this.queue.length && this.snapshot.status !== 'error') void this.drain()
    }
  }

  private async drain() {
    if (this.busy) return
    this.busy = true
    try {
      while (this.queue.length) {
        const patch = this.queue[0]!
        const sourceAssetId = this.snapshot.timeline?.sourceAssetId ?? null
        const response = await fetch(`/api/projects/${encodeURIComponent(this.projectId)}/editorial-timeline`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceAssetId, patch }), signal: AbortSignal.timeout(12000),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to save the timeline.')
        this.queue.shift()
        let timeline = readEditorialTimeline({ editorialTimeline: data.timeline }, data.timeline.sourceAssetId)
        for (const remaining of this.queue) timeline = applyEditorialTimelinePatch(timeline, remaining)
        this.publish({ timeline, status: this.queue.length ? 'saving' : 'saved', error: null })
      }
    } catch (error) {
      this.publish({ ...this.snapshot, status: 'error', error: error instanceof Error ? error.message : 'Unable to save the timeline.' })
    } finally { this.busy = false }
  }
}

const controllers = new Map<string, EditorialTimelineController>()
export function getEditorialTimelineController(projectId: string) {
  let controller = controllers.get(projectId)
  if (!controller) { controller = new EditorialTimelineController(projectId); controllers.set(projectId, controller) }
  return controller
}
