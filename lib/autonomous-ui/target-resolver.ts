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

  const targetLower = tabName.toLowerCase()

  // 1. Try explicit data attribute
  const byAttr =
    document.querySelector<HTMLElement>(`[data-workspace-tab="${tabName}"]`) ||
    document.querySelector<HTMLElement>(`[data-workspace-tab*="${targetLower}" i]`)
  if (byAttr) return getElementTarget(byAttr)

  // 2. Query header nav buttons by text content or aria-label
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('header button, nav button, [role="tab"], button'))
  const matched = buttons.find((btn) => {
    const text = btn.textContent?.trim().toLowerCase() ?? ''
    const label = btn.getAttribute('aria-label')?.toLowerCase() ?? ''
    return text === targetLower || text.includes(targetLower) || label.includes(targetLower)
  })
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

export interface TranscriptChunkCutResolution {
  segmentId: string
  segmentButtonTarget: ResolvedTarget | null
  strategy: 'segment_cut' | 'inverse_restore' | 'individual_words'
  matchedTargets: ResolvedTarget[]
  unmatchedTargets: ResolvedTarget[]
}

/**
 * Evaluates whether a target phrase can be cut faster at the segment/chunk level,
 * with the option of an inverse restore (cut full chunk, restore 1-2 unselected words).
 */
export function resolveTranscriptChunkCutTarget(phrase: string): TranscriptChunkCutResolution | null {
  if (typeof document === 'undefined' || !phrase.trim()) return null

  const cleanTargetWords = phrase
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  if (cleanTargetWords.length === 0) return null

  const segmentContainers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-transcript-segment-id]')
  )

  for (const seg of segmentContainers) {
    const segId = seg.getAttribute('data-transcript-segment-id') || ''
    const wordElements = Array.from(seg.querySelectorAll<HTMLElement>('[data-word-index]'))
    if (wordElements.length === 0) continue

    const matchedTargets: ResolvedTarget[] = []
    const unmatchedTargets: ResolvedTarget[] = []

    const segWords = wordElements.map((el) =>
      (el.textContent ?? '')
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .trim()
    )

    // Check how many target words appear in this segment
    wordElements.forEach((el, idx) => {
      const wText = segWords[idx]
      const isMatch = cleanTargetWords.some((tw) => wText.includes(tw) || tw.includes(wText))
      const target = getElementTarget(el)
      if (target) {
        if (isMatch) matchedTargets.push(target)
        else unmatchedTargets.push(target)
      }
    })

    // If >= 60% of the segment or at least 3 matching words found
    if (
      matchedTargets.length >= Math.min(cleanTargetWords.length, 3) &&
      matchedTargets.length >= wordElements.length * 0.6
    ) {
      const segBtn = seg.querySelector<HTMLElement>(
        '[data-action="cut-segment"], [data-autonomous-target="transcript-segment-cut"], button[title*="sentence"]'
      )
      const segmentButtonTarget = segBtn ? getElementTarget(segBtn) : null

      let strategy: 'segment_cut' | 'inverse_restore' | 'individual_words' = 'segment_cut'
      if (unmatchedTargets.length === 0) {
        strategy = 'segment_cut'
      } else if (unmatchedTargets.length <= 2 && unmatchedTargets.length < matchedTargets.length) {
        strategy = 'inverse_restore'
      } else {
        strategy = 'individual_words'
      }

      return {
        segmentId: segId,
        segmentButtonTarget,
        strategy,
        matchedTargets,
        unmatchedTargets,
      }
    }
  }

  return null
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

/**
 * Find the primary preview audio mute/unmute toggle or mic mute button
 */
export function resolveMuteTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="toggle-mute"]',
    '[data-autonomous-target="mute"]',
    '[data-action="mute"]',
    'button[aria-label*="mute" i]',
    'button[aria-label*="unmute" i]',
    'button[aria-label*="volume" i]',
    '[data-action="filament-mute-mic"]',
    'button[aria-label*="microphone" i]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'))
  for (const btn of buttons) {
    const hasVolIcon = btn.querySelector('svg.lucide-volume-2, svg.lucide-volume-x, svg.lucide-volume')
    if (hasVolIcon) {
      const target = getElementTarget(btn)
      if (target) return target
    }
  }

  return null
}

/**
 * Find playback play/pause button
 */
export function resolvePlaybackTarget(command?: 'play' | 'pause'): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="toggle-playback"]',
    '[data-autonomous-target="playback"]',
    command ? `button[aria-label*="${command}" i]` : 'button[aria-label*="play" i], button[aria-label*="pause" i]',
    '[data-action="play"]',
    '[data-action="pause"]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'))
  for (const btn of buttons) {
    const hasPlayIcon = btn.querySelector('svg.lucide-play, svg.lucide-pause')
    if (hasPlayIcon) {
      const target = getElementTarget(btn)
      if (target) return target
    }
  }

  return null
}

/**
 * Find Export trigger button or panel
 */
export function resolveExportTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="export"]',
    '[data-autonomous-target="export"]',
    'button[aria-label*="export video" i]',
    'button[aria-label*="start export" i]',
    'button[aria-label*="export" i]',
    'button[aria-label*="download completed" i]',
    'aside#editor-sidebar-v2 [aria-label*="export" i]',
    'header [data-action="export"]',
    'button[data-action="start-render"]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
  for (const btn of buttons) {
    const text = btn.textContent?.trim().toLowerCase() ?? ''
    const label = btn.getAttribute('aria-label')?.toLowerCase() ?? ''
    if (text === 'export' || text.includes('export') || label.includes('export')) {
      const target = getElementTarget(btn)
      if (target) return target
    }
  }

  return null
}

/**
 * Find timeline scrubber slider, optionally computing exact fraction along the track
 */
export function resolveScrubberTarget(fraction?: number): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="seek-scrubber"]',
    '[data-autonomous-target="timeline-scrubber"]',
    '[role="slider"][aria-label*="scrubber" i]',
    '[data-motion-chamber] [role="slider"]',
    '[role="slider"]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) {
        if (typeof fraction === 'number' && Number.isFinite(fraction)) {
          const clamped = Math.min(1, Math.max(0, fraction))
          return {
            ...target,
            centerX: target.rect.left + target.rect.width * clamped,
          }
        }
        return target
      }
    }
  }

  return null
}

/**
 * Find Thumbnail Studio trigger
 */
export function resolveThumbnailStudioTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="thumbnail-studio"]',
    '[data-autonomous-target="thumbnail-studio"]',
    'button[title*="Thumbnail Studio" i]',
    'button[aria-label*="Thumbnail Studio" i]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  return null
}

/**
 * Find Master Review trigger
 */
export function resolveMasterReviewTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="master-review"]',
    '[data-autonomous-target="master-review"]',
    'button[title*="Master Review" i]',
    'button[aria-label*="Review Final Render" i]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  return null
}

/**
 * Find search input in Music catalog panel
 */
export function resolveMusicSearchTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-autonomous-target="music-search"]',
    'input[placeholder*="Search" i]',
    'input[placeholder*="title or artist" i]',
    'aside input[type="text"]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  return null
}

/**
 * Find play/preview button for a soundtrack card
 */
export function resolveMusicPlayTarget(trackId?: string): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  if (trackId) {
    const el = document.querySelector<HTMLElement>(
      `[data-track-id="${trackId}"] [data-action="play-track"], [data-track-id="${trackId}"] button[aria-label*="Play" i], [data-track-id="${trackId}"] button[aria-label*="Pause" i]`
    )
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  const fallback = document.querySelector<HTMLElement>(
    '[data-autonomous-target="music-track"] [data-action="play-track"], [data-soundtrack-card] button[aria-label*="Play" i], [data-action="play-track"]'
  )
  if (fallback) return getElementTarget(fallback)

  return null
}

/**
 * Find selection button or clickable card to stage a soundtrack track
 */
export function resolveMusicSelectTarget(trackId?: string): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  if (trackId) {
    const selectBtn = document.querySelector<HTMLElement>(
      `[data-track-id="${trackId}"] [data-action="select-track"], [data-track-id="${trackId}"] button[aria-label*="Select" i]`
    )
    if (selectBtn) {
      const target = getElementTarget(selectBtn)
      if (target) return target
    }
    const card = document.querySelector<HTMLElement>(`[data-track-id="${trackId}"]`)
    if (card) return getElementTarget(card)
  }

  const fallbackBtn = document.querySelector<HTMLElement>(
    '[data-autonomous-target="music-track"] [data-action="select-track"], [data-autonomous-target="music-track"]'
  )
  if (fallbackBtn) return getElementTarget(fallbackBtn)

  return null
}

/**
 * Find split/cut tool button in timeline controls
 */
export function resolveSplitTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="split-cut"]',
    '[data-autonomous-target="split"]',
    'button[aria-label*="split" i]',
    'button[title*="split" i]',
    'button[aria-label*="cut" i]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  // Look for scissors icon
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button'))
  for (const btn of buttons) {
    if (btn.querySelector('svg.lucide-scissors')) {
      const target = getElementTarget(btn)
      if (target) return target
    }
  }

  return null
}

/**
 * Find silence-cut tool button or auto-cut trigger
 */
export function resolveSilenceCutTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="cut-silence"]',
    '[data-autonomous-target="cut-silence"]',
    'button[title*="silence" i]',
    'button[aria-label*="silence" i]',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  return resolveSplitTarget()
}

/**
 * Find caption styling or typography selector button
 */
export function resolveStylingTarget(): ResolvedTarget | null {
  if (typeof document === 'undefined') return null

  const candidates = [
    '[data-action="style-selector"]',
    '[data-autonomous-target="styling"]',
    'button[aria-label*="style" i]',
    'button[aria-label*="caption" i]',
    '[data-motion-chamber] button',
  ]

  for (const selector of candidates) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) {
      const target = getElementTarget(el)
      if (target) return target
    }
  }

  return null
}

function getElementTarget(element: HTMLElement): ResolvedTarget | null {
  const rect = element.getBoundingClientRect()
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
