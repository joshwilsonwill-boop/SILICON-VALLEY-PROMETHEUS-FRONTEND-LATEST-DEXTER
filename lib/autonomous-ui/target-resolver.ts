/**
 * Prometheus Autonomous UI - DOM Target Resolver
 *
 * Resolves semantic targets (transcript words, music cards, workspace tabs)
 * into concrete DOM element references and viewport coordinates.
 */

import type { AutonomousWorkspaceTab } from './types'

export interface ResolvedTarget {
  element: HTMLElement
  rect: DOMRect
  centerX: number
  centerY: number
}

/**
 * Find viewport coordinates and element for a workspace tab
 */
export function resolveTabElement(tabName: AutonomousWorkspaceTab): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  // 1. Try explicit data attribute
  const byAttr = document.querySelector<HTMLElement>(`[data-workspace-tab="${tabName}"]`)
  if (byAttr) return getElementTarget(byAttr)

  // 2. Query header nav buttons by text content
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('header button, nav button, [role="tab"]'))
  const matched = buttons.find((btn) => btn.textContent?.trim().toLowerCase() === tabName.toLowerCase())
  if (matched) return getElementTarget(matched)

  return null
}

/**
 * Find transcript segment container
 */
export function resolveTranscriptSegmentElement(segmentId: string): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const el = document.querySelector<HTMLElement>(`[data-transcript-segment-id="${segmentId}"]`)
  if (el) return getElementTarget(el)

  return null
}

/**
 * Find specific word element in transcript by segment ID and word index
 */
export function resolveTranscriptWordElement(segmentId: string, wordIndex: number): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  // 1. Direct query
  const el = document.querySelector<HTMLElement>(
    `[data-transcript-segment-id="${segmentId}"] [data-word-index="${wordIndex}"]`
  )
  if (el) return getElementTarget(el)

  // 2. Fallback: query segment then child word spans
  const segment = document.querySelector<HTMLElement>(`[data-transcript-segment-id="${segmentId}"]`)
  if (segment) {
    const wordSpans = Array.from(segment.querySelectorAll<HTMLElement>('[data-word-index]'))
    if (wordSpans[wordIndex]) return getElementTarget(wordSpans[wordIndex])
  }

  return null
}

/**
 * Search transcript DOM for elements matching a spoken/typed phrase
 */
export function resolveTranscriptPhraseElements(phrase: string): ResolvedTarget[] {
  if (typeof document === 'undefined' || !phrase.trim()) return []

  const cleanTargetWords = phrase
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  if (cleanTargetWords.length === 0) return []

  const allWordElements = Array.from(document.querySelectorAll<HTMLElement>('[data-word-index]'))
  if (allWordElements.length === 0) return []

  const results: ResolvedTarget[] = []

  for (let i = 0; i <= allWordElements.length - cleanTargetWords.length; i++) {
    let match = true
    for (let j = 0; j < cleanTargetWords.length; j++) {
      const elText = (allWordElements[i + j].textContent ?? '')
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .trim()

      if (!elText.includes(cleanTargetWords[j]) && !cleanTargetWords[j].includes(elText)) {
        match = false
        break
      }
    }

    if (match) {
      for (let j = 0; j < cleanTargetWords.length; j++) {
        const target = getElementTarget(allWordElements[i + j])
        if (target) results.push(target)
      }
      break // Return the first matching sequence
    }
  }

  return results
}

/**
 * Find soundtrack track card or action button in Music catalog
 */
export function resolveMusicTrackElement(trackId?: string): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  if (trackId) {
    const el = document.querySelector<HTMLElement>(`[data-track-id="${trackId}"]`)
    if (el) return getElementTarget(el)
  }

  // Fallback: pick first visible soundtrack card or track row
  const firstTrack = document.querySelector<HTMLElement>(
    '[data-soundtrack-card], [data-track-id], button[data-music-select]'
  )
  if (firstTrack) return getElementTarget(firstTrack)

  return null
}

/**
 * Generic DOM selector resolution
 */
export function resolveDomSelector(selector: string): ResolvedTarget | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  return getElementTarget(el)
}

function getElementTarget(element: HTMLElement): ResolvedTarget | null {
  const rect = element.getBoundingClientRect()
  // Ensure element is attached and has non-zero geometry
  if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
    return null
  }

  return {
    element,
    rect,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  }
}
