import type { MusicRecommendation } from '@/lib/types'

export const SELECTED_EDITOR_MUSIC_STORAGE_PREFIX = 'prometheus.editor.selected-track.v1'
export const SELECTED_EDITOR_MUSIC_EVENT = 'prometheus:editor-selected-music-track'

export type SelectedEditorMusicEventDetail = {
  projectId: string
  trackId: string
  track?: MusicRecommendation
  origin?: 'timeline'
}

export function selectedEditorMusicStorageKey(projectId: string) {
  return `${SELECTED_EDITOR_MUSIC_STORAGE_PREFIX}.${projectId}`
}

export function writeSelectedEditorMusicTrack(projectId: string, trackId: string) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(selectedEditorMusicStorageKey(projectId), JSON.stringify(trackId))
  window.dispatchEvent(
    new CustomEvent<SelectedEditorMusicEventDetail>(SELECTED_EDITOR_MUSIC_EVENT, {
      detail: { projectId, trackId },
    }),
  )
}

/** Retain the full selection, including songs outside the recommendation shelf. */
export function writeSelectedEditorMusicRecommendation(projectId: string, track: MusicRecommendation, origin?: 'timeline') {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(selectedEditorMusicStorageKey(projectId), JSON.stringify(track.id))
    window.localStorage.setItem(`${selectedEditorMusicStorageKey(projectId)}.record`, JSON.stringify(track))
  } catch {
    // Selection continues to work when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<SelectedEditorMusicEventDetail>(SELECTED_EDITOR_MUSIC_EVENT, {
    detail: { projectId, trackId: track.id, track, origin },
  }))
}

export function clearSelectedEditorMusicRecommendation(projectId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(selectedEditorMusicStorageKey(projectId))
    window.localStorage.removeItem(`${selectedEditorMusicStorageKey(projectId)}.record`)
  } catch {
    // The current editor still clears even when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<SelectedEditorMusicEventDetail>(SELECTED_EDITOR_MUSIC_EVENT, {
    detail: { projectId, trackId: '' },
  }))
}

export function readSelectedEditorMusicRecommendation(projectId: string): MusicRecommendation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${selectedEditorMusicStorageKey(projectId)}.record`)
    if (!raw) return null
    return JSON.parse(raw) as MusicRecommendation
  } catch {
    return null
  }
}
