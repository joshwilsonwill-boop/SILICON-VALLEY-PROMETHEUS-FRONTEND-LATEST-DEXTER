/**
 * Prometheus Autonomous UI Coordinator (Deep Module)
 *
 * Orchestrates autonomous GUI actions across Prometheus Studio workspaces.
 * Encapsulates target resolution, motion planning, human priority barge-in,
 * ambient signaling, and execution of existing React state handlers.
 *
 * Cinematic Takeover: adds beginTakeover / endTakeover / anticipateTarget /
 * setPillMode methods that drive the scrim, reticle, and escape-hatch layers.
 */

import type {
  AutonomousWorkspaceTab,
  GhostCursorState,
  AutonomousUIEventListener,
  AutonomousActionPayload,
  PillMode,
} from './types'
import {
  resolveTabElement,
  resolveTranscriptWordElement,
  resolveTranscriptPhraseElements,
  resolveMusicTrackElement,
  resolveDomSelector,
  resolveMuteTarget,
  resolvePlaybackTarget,
  resolveExportTarget,
  resolveScrubberTarget,
  resolveThumbnailStudioTarget,
  resolveMasterReviewTarget,
  resolveMusicSearchTarget,
  resolveMusicPlayTarget,
  resolveMusicSelectTarget,
  resolveSplitTarget,
  resolveSilenceCutTarget,
  resolveStylingTarget,
} from './target-resolver'
import {
  animateGlide,
  ensureElementInView,
  computeFittsDuration,
  getFreshTargetPoint,
} from './motion-driver'
import { useAutonomousStore } from './autonomous-store'

class AutonomousUICoordinator {
  private state: GhostCursorState = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    visible: false,
    isClicking: false,
    statusText: null,
    activeTargetRect: null,
    phase: 'idle',
    // Cinematic Takeover fields
    isTakeover: false,
    pillMode: 'idle',
    anticipatedTargetRect: null,
    spotlightRect: null,
  }

  private listeners = new Set<AutonomousUIEventListener>()
  private cancelCurrentMotion: (() => void) | null = null
  private isHumanInteracting = false
  private humanInteractionTimer: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBargeInListeners()
      // Center cursor initially
      this.state.x = window.innerWidth / 2
      this.state.y = window.innerHeight / 2
    }
  }

  /**
   * Subscribe to ghost cursor state changes
   */
  public subscribe(listener: AutonomousUIEventListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state })
    }
  }

  /**
   * Human Priority Rule (Barge-In)
   * If human moves mouse or taps screen during autonomous action, immediately yield.
   */
  private initBargeInListeners() {
    const handleHumanInput = () => {
      this.isHumanInteracting = true
      if (this.state.visible) {
        this.abortAction('user_barge_in')
      }

      if (this.humanInteractionTimer) clearTimeout(this.humanInteractionTimer)
      this.humanInteractionTimer = setTimeout(() => {
        this.isHumanInteracting = false
      }, 1200)
    }

    window.addEventListener('pointerdown', handleHumanInput, { passive: true })
    window.addEventListener('wheel', handleHumanInput, { passive: true })
    window.addEventListener('keydown', handleHumanInput, { passive: true })
  }

  /**
   * Abort any ongoing autonomous action
   */
  public abortAction(reason: 'user_barge_in' | 'cancelled' = 'cancelled') {
    if (this.cancelCurrentMotion) {
      this.cancelCurrentMotion()
      this.cancelCurrentMotion = null
    }

    this.state = {
      ...this.state,
      visible: false,
      isClicking: false,
      statusText: reason === 'user_barge_in' ? 'Control returned to user' : null,
      activeTargetRect: null,
      phase: 'yielding',
      // Cinematic Takeover — clear all overlay layers
      isTakeover: false,
      pillMode: 'idle',
      anticipatedTargetRect: null,
      spotlightRect: null,
    }
    this.notify()

    setTimeout(() => {
      if (this.state.phase === 'yielding') {
        this.state.phase = 'idle'
        this.state.statusText = null
        this.notify()
      }
    }, 400)
  }

  // ─── Cinematic Takeover Lifecycle ──────────────────────────────────────────

  /**
   * Signal the start of a full autonomous UI takeover.
   * Activates the ambient scrim, spotlight, and escape hatch.
   * Called automatically by high-level workflow methods but can be called
   * manually for custom sequences.
   */
  public beginTakeover(label = 'Jarvis is in control') {
    this.state = {
      ...this.state,
      isTakeover: true,
      visible: true,
      statusText: label,
      pillMode: 'action',
    }
    this.notify()
  }

  /**
   * Signal the end of a full autonomous UI takeover.
   * Fades the scrim out and returns pointer-events to the user.
   */
  public endTakeover() {
    this.abortAction('cancelled')
  }

  /**
   * Pre-signal a target element 200-300ms before the cursor arrives.
   * Causes the bounding reticle to spring to life around the target element
   * before the click is executed — conveying intent.
   */
  public anticipateTarget(element: HTMLElement | null) {
    this.state = {
      ...this.state,
      anticipatedTargetRect: element ? element.getBoundingClientRect() : null,
      spotlightRect: element ? element.getBoundingClientRect() : null,
    }
    this.notify()
  }

  /**
   * Set the action-pill visual mode dynamically during autonomous execution.
   * - 'typing'  → animated caret icon (text input phase)
   * - 'waiting' → indeterminate spinner (processing phase)
   * - 'action'  → declarative verb label (navigation / click phase)
   * - 'idle'    → pill hidden
   */
  public setPillMode(mode: PillMode, statusText?: string) {
    this.state = {
      ...this.state,
      pillMode: mode,
      statusText: statusText ?? this.state.statusText,
    }
    this.notify()
  }

  /**
   * Stream live thought / reasoning into the active takeover harness.
   * Dynamically formats thought text and smoothly orients the living cursor
   * towards relevant interface regions (music, timeline, editing, export)
   * while the AI plans.
   */
  public streamThought(thoughtText: string) {
    if (this.isHumanInteracting || !thoughtText) return

    // Clean thought text to concise sentence
    const clean = thoughtText
      .replace(/[*_#`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!clean) return

    const truncated = clean.length > 55 ? `${clean.slice(0, 52)}...` : clean
    const pillLabel = `Jarvis: ${truncated}`

    this.state = {
      ...this.state,
      isTakeover: true,
      visible: true,
      statusText: pillLabel,
      pillMode: 'waiting',
      phase: 'moving',
    }
    this.notify()

    // Determine semantic intent from thought keywords to orient the cursor
    const lower = clean.toLowerCase()
    let destX: number | null = null
    let destY: number | null = null

    if (lower.includes('music') || lower.includes('soundtrack') || lower.includes('song') || lower.includes('audio')) {
      const tab = resolveTabElement('Music')
      if (tab) {
        destX = tab.centerX
        destY = tab.centerY + 50
      }
    } else if (lower.includes('cut') || lower.includes('trim') || lower.includes('transcript') || lower.includes('word') || lower.includes('split') || lower.includes('edit')) {
      const tab = resolveTabElement('Motion') || resolveTabElement('Editor')
      if (tab) {
        destX = tab.centerX
        destY = tab.centerY + 80
      }
    } else if (lower.includes('export') || lower.includes('render') || lower.includes('download') || lower.includes('review')) {
      const exportTarget = resolveExportTarget()
      if (exportTarget) {
        destX = exportTarget.centerX
        destY = exportTarget.centerY
      }
    }

    if (destX !== null && destY !== null && typeof window !== 'undefined') {
      void this.glideTo(destX, destY, pillLabel, null, 750)
    }
  }

  /**
   * Stream an ongoing tool invocation into the dynamic action pill
   */
  public streamTool(label: string, summary?: string) {
    if (this.isHumanInteracting) return
    const text = summary ? `Jarvis: ${label} — ${summary}` : `Jarvis: Executing ${label}`
    const truncated = text.length > 55 ? `${text.slice(0, 52)}...` : text
    this.setPillMode('action', truncated)
  }

  /**
   * Stream a status update into the dynamic action pill
   */
  public streamStatus(status: string) {
    if (this.isHumanInteracting) return
    const text = `Jarvis: ${status}`
    const truncated = text.length > 55 ? `${text.slice(0, 52)}...` : text
    this.setPillMode('typing', truncated)
  }



  /**
   * Move the ghost cursor smoothly to a screen coordinate and execute an action.
   * Calibrates biological travel time via Fitts's Law when not explicitly forced.
   * Tracks instantaneous velocity and banking tilt angle.
   */
  public async glideTo(
    targetX: number,
    targetY: number,
    statusText: string,
    targetRect?: DOMRect | null,
    durationMs?: number
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    if (this.cancelCurrentMotion) {
      this.cancelCurrentMotion()
    }

    const startX = this.state.visible ? this.state.x : targetX - 60
    const startY = this.state.visible ? this.state.y : targetY + 80

    // Calibrate movement duration according to Fitts's Law if not explicitly forced
    const effectiveDuration =
      typeof durationMs === 'number' && durationMs > 0
        ? durationMs
        : computeFittsDuration(
            { x: startX, y: startY },
            { x: targetX, y: targetY },
            targetRect?.width
          )

    this.state = {
      ...this.state,
      x: startX,
      y: startY,
      targetX,
      targetY,
      visible: true,
      isClicking: false,
      statusText,
      activeTargetRect: targetRect ?? null,
      phase: 'moving',
    }
    this.notify()

    return new Promise<boolean>((resolve) => {
      this.cancelCurrentMotion = animateGlide(
        { x: startX, y: startY },
        { x: targetX, y: targetY },
        effectiveDuration,
        (p) => {
          this.state.x = p.x
          this.state.y = p.y
          this.state.tiltAngleDeg = p.tiltAngleDeg
          this.notify()
        },
        () => {
          this.state.x = targetX
          this.state.y = targetY
          this.state.tiltAngleDeg = 0
          this.state.phase = 'hovering'
          this.notify()
          resolve(true)
        }
      )
    })
  }

  /**
   * High-precision targeting: scrolls element into view, pre-signals intent,
   * re-samples exact coordinates post-scroll, and executes a Fitts's-scaled trajectory.
   */
  public async glideToTarget(
    target: { element: HTMLElement; rect?: DOMRect },
    label: string,
    explicitDuration?: number
  ): Promise<boolean> {
    await ensureElementInView(target.element)
    this.anticipateTarget(target.element)
    await new Promise((r) => setTimeout(r, 60))

    // Re-sample post-scroll rect to ensure sub-pixel accuracy
    const fresh = getFreshTargetPoint(target.element)
    const duration =
      explicitDuration ??
      computeFittsDuration(
        { x: this.state.x, y: this.state.y },
        { x: fresh.x, y: fresh.y },
        fresh.rect.width
      )

    return this.glideTo(fresh.x, fresh.y, label, fresh.rect, duration)
  }

  /**
   * Perform a visual click pulse at current cursor position
   */
  public async simulateClick(): Promise<void> {
    this.state.isClicking = true
    this.state.phase = 'clicking'
    this.notify()

    await new Promise((resolve) => setTimeout(resolve, 220))

    this.state.isClicking = false
    this.state.phase = 'hovering'
    this.notify()
  }

  /**
   * High-level Workflow: Descript-style autonomous transcript cut
   */
  public async executeTranscriptCut(
    phrase: string,
    options?: {
      onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
      onToggleCutWord?: (segmentId: string, wordIndex: number) => void
      onToggleCutSegment?: (segmentId: string) => void
      isContinuous?: boolean
    }
  ): Promise<boolean> {
    return this.executeAutonomousEditingWorkflow({
      type: 'transcript_cut',
      phrase,
      onSwitchTab: options?.onSwitchTab,
      isContinuous: options?.isContinuous,
    })
  }

  /**
   * High-level Workflow: Dynamic Autonomous Editing Operator
   *
   * Visibly navigates to the appropriate workspace page (Editor or Motion),
   * dynamically navigates to the target tool/word/scrubber on that page,
   * applies the editing modifications (cuts, splits, styles),
   * and verifies the edit in the live preview player.
   */
  public async executeAutonomousEditingWorkflow(options: {
    type: 'transcript_cut' | 'split' | 'caption_style' | 'generic_edit'
    phrase?: string
    timeSec?: number
    style?: string
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
    onSeek?: (timeSec: number) => void
    onSplit?: () => void
    onStyle?: (style: string) => void
    onPlayback?: () => void
    isContinuous?: boolean
  }): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const targetTab: AutonomousWorkspaceTab = options.type === 'split' ? 'Editor' : 'Motion'
    this.beginTakeover(`Jarvis: Navigating to ${targetTab} Workspace`)

    // 1. Physically glide to and click the workspace navigation tab
    const tabTarget = resolveTabElement(targetTab)
    if (tabTarget) {
      this.anticipateTarget(tabTarget.element)
      await new Promise((r) => setTimeout(r, 140))
      await this.glideTo(
        tabTarget.centerX,
        tabTarget.centerY,
        `Jarvis: Switching to ${targetTab}`,
        tabTarget.rect,
        480
      )
      await this.simulateClick()
      tabTarget.element.click()
    }

    if (options.onSwitchTab) {
      options.onSwitchTab(targetTab)
    } else {
      useAutonomousStore.getState().onSwitchTab?.(targetTab)
    }

    await new Promise((r) => setTimeout(r, 320))

    // 2. Perform editing tasks on said page
    if (options.type === 'transcript_cut' && options.phrase) {
      const targets = resolveTranscriptPhraseElements(options.phrase)
      if (targets.length > 0) {
        for (const target of targets) {
          await ensureElementInView(target.element)
          const updatedRect = target.element.getBoundingClientRect()
          this.anticipateTarget(target.element)
          await new Promise((r) => setTimeout(r, 100))

          await this.glideTo(
            updatedRect.left + updatedRect.width / 2,
            updatedRect.top + updatedRect.height / 2,
            `Jarvis: Cutting "${target.element.textContent?.trim()}"`,
            updatedRect,
            380
          )
          await this.simulateClick()
          target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          await new Promise((r) => setTimeout(r, 150))
        }
      } else {
        const transcriptHeader = resolveDomSelector('[data-motion-chamber] aside')
        if (transcriptHeader) {
          await this.glideTo(
            transcriptHeader.centerX,
            transcriptHeader.centerY,
            `Jarvis: Editing transcript for "${options.phrase}"`,
            transcriptHeader.rect,
            420
          )
          await this.simulateClick()
        }
      }
    } else if (options.type === 'split' && typeof options.timeSec === 'number') {
      // 2a. Scrub to the split timestamp
      const scrubber = resolveScrubberTarget()
      if (scrubber) {
        this.anticipateTarget(scrubber.element)
        await this.glideTo(
          scrubber.centerX,
          scrubber.centerY,
          `Jarvis: Seeking playhead to ${options.timeSec.toFixed(1)}s`,
          scrubber.rect,
          420
        )
        await this.simulateClick()
      }
      if (options.onSeek) {
        options.onSeek(options.timeSec)
      } else {
        useAutonomousStore.getState().onSeekSeconds?.(options.timeSec)
      }

      await new Promise((r) => setTimeout(r, 200))

      // 2b. Glide to and click the Scissors / Split button
      const splitTarget = resolveSplitTarget()
      if (splitTarget) {
        this.anticipateTarget(splitTarget.element)
        await new Promise((r) => setTimeout(r, 120))
        await this.glideTo(
          splitTarget.centerX,
          splitTarget.centerY,
          `Jarvis: Splitting clip at ${options.timeSec.toFixed(1)}s`,
          splitTarget.rect,
          380
        )
        await this.simulateClick()
        splitTarget.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
      options.onSplit?.()
    } else if (options.type === 'caption_style' && options.style) {
      const styleTarget = resolveStylingTarget()
      if (styleTarget) {
        this.anticipateTarget(styleTarget.element)
        await this.glideTo(
          styleTarget.centerX,
          styleTarget.centerY,
          `Jarvis: Applying ${options.style} style`,
          styleTarget.rect,
          420
        )
        await this.simulateClick()
        styleTarget.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
      options.onStyle?.(options.style)
    }

    // 3. Verification step: Audition in Preview
    const playTarget = resolvePlaybackTarget('play')
    if (playTarget) {
      await this.glideTo(
        playTarget.centerX,
        playTarget.centerY,
        'Jarvis: Auditioning edit in preview...',
        playTarget.rect,
        380
      )
      await this.simulateClick()
      if (options.onPlayback) {
        options.onPlayback()
      } else {
        useAutonomousStore.getState().onTogglePlayback?.()
      }
      await new Promise((r) => setTimeout(r, 700))
    }

    this.setPillMode('action', 'Jarvis: Edit verified')
    if (!options.isContinuous) {
      await new Promise((r) => setTimeout(r, 400))
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Autonomous Silence Removal & Ripple-Cut
   *
   * Visibly navigates to the Motion workspace, scans audio/speech for dead air gaps,
   * rapidly glides the 3D cursor across the timeline to each gap, clicks the scissors / split tool
   * with tactile micro-compression and shockwaves, collapses the dead space with accordion snapping,
   * and reports duration saved.
   */
  public async executeSilenceCutWorkflow(options?: {
    silenceSpans?: Array<{ start: number; end: number }>
    minDurationSec?: number
    onCutSpans?: (spans: Array<{ start: number; end: number }>) => void
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
    isContinuous?: boolean
  }): Promise<boolean> {
    if (this.isHumanInteracting) return false

    // 1. Begin takeover sequence
    this.beginTakeover('Jarvis: Scanning timeline for dead air & silences...')
    await new Promise((r) => setTimeout(r, 140))

    // 2. Ensure Motion tab is active
    const motionTab = resolveTabElement('Motion')
    if (motionTab) {
      this.anticipateTarget(motionTab.element)
      await this.glideTo(
        motionTab.centerX,
        motionTab.centerY,
        'Jarvis: Navigating to Motion workspace...',
        motionTab.rect,
        380
      )
      await this.simulateClick()
      motionTab.element.click()
    }
    if (options?.onSwitchTab) {
      options.onSwitchTab('Motion')
    } else {
      useAutonomousStore.getState().onSwitchTab?.('Motion')
    }

    await new Promise((r) => setTimeout(r, 260))

    // 3. Status update: analyzing audio pauses
    const threshold = options?.minDurationSec ?? 0.4
    this.setPillMode('waiting', `Jarvis: Detecting pauses (> ${threshold.toFixed(1)}s)...`)
    await new Promise((r) => setTimeout(r, 380))

    // 4. Silence spans must come from the live, timed transcript. Never invent
    // placeholder cuts: an empty result is an honest "nothing to remove" state.
    const spans = options?.silenceSpans ?? []
    if (spans.length === 0) {
      this.setPillMode('action', 'Jarvis: No pauses met the removal threshold')
      if (!options?.isContinuous) {
        await new Promise((r) => setTimeout(r, 450))
        this.abortAction('cancelled')
      }
      return true
    }

    // 5. Navigate to Cut Silence / Split tool
    const cutToolTarget = resolveSilenceCutTarget() || resolveSplitTarget()
    if (cutToolTarget) {
      await ensureElementInView(cutToolTarget.element)
      this.anticipateTarget(cutToolTarget.element)
      await this.glideTo(
        cutToolTarget.centerX,
        cutToolTarget.centerY,
        'Jarvis: Arming razor ripple-cut tool...',
        cutToolTarget.rect,
        360
      )
      await this.simulateClick()
    }

    // 6. Rapidly execute cuts along the timeline
    const scrubberTarget = resolveScrubberTarget()
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i]!
      const gapSec = span.end - span.start

      this.setPillMode('action', `Jarvis: Slicing gap [${span.start.toFixed(1)}s - ${span.end.toFixed(1)}s]`)

      // Glide along scrubber to start of silence gap
      if (scrubberTarget) {
        const spanFraction = Math.min(1, Math.max(0, span.start / 20)) // approximate viewport fraction
        const startX = scrubberTarget.rect.left + scrubberTarget.rect.width * spanFraction
        await this.glideTo(
          startX,
          scrubberTarget.centerY,
          `Jarvis: Razor cut at ${span.start.toFixed(1)}s`,
          scrubberTarget.rect,
          240
        )
        await this.simulateClick()
      }

      await new Promise((r) => setTimeout(r, 120))

      // Glide along scrubber to end of silence gap and ripple-collapse
      if (scrubberTarget) {
        const endFraction = Math.min(1, Math.max(0, span.end / 20))
        const endX = scrubberTarget.rect.left + scrubberTarget.rect.width * endFraction
        await this.glideTo(
          endX,
          scrubberTarget.centerY,
          `Jarvis: Ripple-collapsing ${gapSec.toFixed(1)}s dead air`,
          scrubberTarget.rect,
          220
        )
        await this.simulateClick()
      }

      // Visual accordion collapse micro-pause
      await new Promise((r) => setTimeout(r, 150))
    }

    // 7. Dispatch cut spans to update editor timeline state
    if (options?.onCutSpans) {
      options.onCutSpans(spans)
    }

    // 8. Confirm total removed
    const totalRemoved = spans.reduce((sum, s) => sum + (s.end - s.start), 0)
    this.setPillMode('action', `Jarvis: Ripple-cut done — ${totalRemoved.toFixed(1)}s removed`)

    if (!options?.isContinuous) {
      await new Promise((r) => setTimeout(r, 450))
      this.abortAction('cancelled')
    }

    return true
  }

  /**
   * Alias for executeSilenceCutWorkflow
   */
  public async executeSilenceRemoval(options?: {
    silenceSpans?: Array<{ start: number; end: number }>
    minDurationSec?: number
    onCutSpans?: (spans: Array<{ start: number; end: number }>) => void
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
    isContinuous?: boolean
  }): Promise<boolean> {
    return this.executeSilenceCutWorkflow(options)
  }

  /**
   * High-level Workflow: Autonomous music curation & track selection
   *
   * Visibly navigates to the Music Studio tab, activates search, checks catalog /
   * downloads candidate track, auditions via the play preview button,
   * stages the track with the select button, and verifies the update.
   */
  public async executeMusicSelection(
    options?: {
      trackId?: string
      genreOrMood?: string
      query?: string
      onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
      onSelectTrack?: (trackId: string) => void
      onPlayPreview?: (trackId: string) => void
      isContinuous?: boolean
    }
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const phrase = options?.query || options?.genreOrMood || 'cinematic soundtrack'

    // 1. Physically glide to and click the Music workspace navigation tab
    this.beginTakeover('Jarvis: Navigating to Music Studio')
    const tabTarget = resolveTabElement('Music')
    if (tabTarget) {
      this.anticipateTarget(tabTarget.element)
      await new Promise((r) => setTimeout(r, 140))
      await this.glideTo(
        tabTarget.centerX,
        tabTarget.centerY,
        'Jarvis: Navigating to Music Studio',
        tabTarget.rect,
        480
      )
      await this.simulateClick()
      tabTarget.element.click()
    }

    if (options?.onSwitchTab) {
      options.onSwitchTab('Music')
    } else {
      useAutonomousStore.getState().onSwitchTab?.('Music')
    }

    await new Promise((resolve) => setTimeout(resolve, 320))

    // 2. Locate search input and expressively query the catalog
    const searchTarget = resolveMusicSearchTarget()
    if (searchTarget) {
      this.anticipateTarget(searchTarget.element)
      await this.glideTo(
        searchTarget.centerX,
        searchTarget.centerY,
        `Jarvis: Searching library for "${phrase}"`,
        searchTarget.rect,
        420
      )
      this.setPillMode('typing', `Jarvis: Searching "${phrase}"`)
      await this.simulateClick()
      searchTarget.element.focus()
    }

    // 3. Dynamic cache / collection download simulation step
    // Gives physical expression to downloading/fetching from storage when not locally staged
    this.setPillMode('waiting', 'Jarvis: Fetching collection asset...')
    await new Promise((r) => setTimeout(r, 450))

    // 4. Audition candidate track via Play button
    const playTarget = resolveMusicPlayTarget(options?.trackId)
    if (playTarget) {
      await ensureElementInView(playTarget.element)
      this.anticipateTarget(playTarget.element)
      await this.glideTo(
        playTarget.centerX,
        playTarget.centerY,
        'Jarvis: Auditioning soundtrack candidate...',
        playTarget.rect,
        420
      )
      this.setPillMode('action', 'Jarvis: Auditioning soundtrack...')
      await this.simulateClick()
      playTarget.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      // Hover while auditioning
      await new Promise((r) => setTimeout(r, 650))
    }

    // 5. Stage soundtrack by clicking select button
    const selectTarget = resolveMusicSelectTarget(options?.trackId) || resolveMusicTrackElement(options?.trackId)
    if (selectTarget) {
      await ensureElementInView(selectTarget.element)
      this.anticipateTarget(selectTarget.element)
      await this.glideTo(
        selectTarget.centerX,
        selectTarget.centerY,
        'Jarvis: Staging soundtrack to timeline...',
        selectTarget.rect,
        380
      )
      await this.simulateClick()
      selectTarget.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (options?.onSelectTrack && options.trackId) {
      options.onSelectTrack(options.trackId)
    }

    // 6. Confirm status
    this.setPillMode('action', 'Jarvis: Soundtrack staged')
    if (!options?.isContinuous) {
      await new Promise((resolve) => setTimeout(resolve, 450))
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Switch Studio Tab
   */
  public async executeTabSwitch(
    tabName: AutonomousWorkspaceTab,
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void,
    isContinuous?: boolean
  ): Promise<boolean> {
    const tabTarget = resolveTabElement(tabName)
    if (tabTarget) {
      this.anticipateTarget(tabTarget.element)
      const glided = await this.glideTo(
        tabTarget.centerX,
        tabTarget.centerY,
        `Jarvis: Opening ${tabName} Studio`,
        tabTarget.rect,
        500
      )
      if (!glided) return false
      await this.simulateClick()
      tabTarget.element.click()
    }

    if (onSwitchTab) {
      onSwitchTab(tabName)
    } else {
      // Fallback: read from the zustand store bridge
      useAutonomousStore.getState().onSwitchTab?.(tabName)
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Full Autonomous Page Takeover
   *
   * Actively moves the 3D ghost cursor to the requested schema/tab (e.g. Motion Brain),
   * pre-signals target reticle, stimulates the click, switches the active workspace,
   * and maintains the cinematic viewport moving border and ambient shade throughout the session.
   */
  public async executeAutonomousTakeover(
    targetTab: AutonomousWorkspaceTab = 'Motion',
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    // 1. Activate full takeover mode with perimeter moving border
    this.beginTakeover(`Jarvis taking control: ${targetTab} schema`)

    await new Promise((resolve) => setTimeout(resolve, 150))

    // 2. Resolve target element (e.g. Motion tab button)
    const tabTarget = resolveTabElement(targetTab)

    if (tabTarget) {
      // Pre-signal 200ms ahead with precision corner ticks
      this.anticipateTarget(tabTarget.element)
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Glide the 3D pillowy black cursor to target
      const glided = await this.glideTo(
        tabTarget.centerX,
        tabTarget.centerY,
        `Jarvis: Switching to ${targetTab} Schema`,
        tabTarget.rect,
        650
      )

      if (!glided) return false

      // Stimulate tactile click
      await this.simulateClick()
      tabTarget.element.click()
    }

    // Switch tab callback
    if (onSwitchTab) {
      onSwitchTab(targetTab)
    } else {
      useAutonomousStore.getState().onSwitchTab?.(targetTab)
    }

    // Retain takeover active state so the viewport moving border and escape hatch persist
    this.state = {
      ...this.state,
      isTakeover: true,
      visible: true,
      phase: 'hovering',
      statusText: `Jarvis: ${targetTab} Schema Active`,
      pillMode: 'action',
    }
    this.notify()

    return true
  }

  /**
   * High-level Workflow: Seek the timeline to a specific time in seconds
   */
  public async executeSeekTimeline(
    timeSec: number,
    durationSec?: number,
    callback?: (timeSec: number) => void,
    isContinuous?: boolean
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const label = `Jarvis: Seeking to ${timeSec.toFixed(1)}s`
    this.beginTakeover(label)

    const fraction = durationSec && durationSec > 0 ? timeSec / durationSec : undefined
    const scrubber = resolveScrubberTarget(fraction)

    if (scrubber) {
      await ensureElementInView(scrubber.element)
      this.anticipateTarget(scrubber.element)
      await new Promise((resolve) => setTimeout(resolve, 140))

      const glided = await this.glideTo(
        scrubber.centerX,
        scrubber.centerY,
        label,
        scrubber.rect,
        420
      )
      if (!glided) return false
      await this.simulateClick()
    }

    if (callback) {
      callback(timeSec)
    } else {
      useAutonomousStore.getState().onSeekSeconds?.(timeSec)
    }

    this.setPillMode('action', `Scrubbed to ${timeSec.toFixed(1)}s`)
    await new Promise((resolve) => setTimeout(resolve, 280))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Control preview playback (play / pause / mute / unmute)
   */
  public async executePreviewControl(
    command: 'play' | 'pause' | 'mute' | 'unmute',
    callback?: () => void,
    isContinuous?: boolean
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const isMuting = command === 'mute' || command === 'unmute'
    const label =
      command === 'play' ? 'Jarvis: Playing preview'
      : command === 'pause' ? 'Jarvis: Pausing preview'
      : command === 'mute' ? 'Jarvis: Muting audio'
      : 'Jarvis: Unmuting audio'

    // 1. Immediately begin visual takeover sequence with high-speed reaction
    this.beginTakeover(label)

    // 2. Resolve target element (Mute button or Play button)
    const target = isMuting ? resolveMuteTarget() : resolvePlaybackTarget(command)

    if (target) {
      const glided = await this.glideToTarget(target, label)
      if (!glided) return false

      // Tactile click with micro-compression and shockwaves
      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    // 3. Fire callback synchronously with the click
    if (callback) {
      callback()
    } else {
      if (isMuting) {
        useAutonomousStore.getState().onToggleMute?.()
      } else {
        useAutonomousStore.getState().onTogglePlayback?.()
      }
    }

    this.setPillMode('action', isMuting ? (command === 'mute' ? 'Audio muted' : 'Audio unmuted') : (command === 'play' ? 'Playing' : 'Paused'))
    await new Promise((resolve) => setTimeout(resolve, 320))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Autonomous Export Action
   */
  public async executeExportAction(
    mode: 'final' | 'preview' | 'export' = 'export',
    callback?: () => void,
    isContinuous?: boolean
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const label = mode === 'final'
      ? 'Jarvis: Opening Master Review'
      : 'Jarvis: Opening Export workflow'

    this.beginTakeover(label)

    const target = mode === 'final' ? (resolveMasterReviewTarget() || resolveExportTarget()) : resolveExportTarget()

    if (target) {
      const glided = await this.glideToTarget(target, label)
      if (!glided) return false

      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      callback()
    }

    this.setPillMode('action', mode === 'final' ? 'Master Review open' : 'Export initiated')
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Autonomous Thumbnail Studio Launch
   */
  public async executeThumbnailStudio(callback?: () => void, isContinuous?: boolean): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const label = 'Jarvis: Opening Thumbnail Studio'
    this.beginTakeover(label)

    const target = resolveThumbnailStudioTarget()
    if (target) {
      const glided = await this.glideToTarget(target, label)
      if (!glided) return false

      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      callback()
    }

    this.setPillMode('action', 'Thumbnail Studio open')
    await new Promise((resolve) => setTimeout(resolve, 320))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }

  /**
   * High-level Workflow: Autonomous Master Review Launch
   */
  public async executeMasterReview(callback?: () => void, isContinuous?: boolean): Promise<boolean> {
    if (this.isHumanInteracting) return false

    const label = 'Jarvis: Opening Master Review'
    this.beginTakeover(label)

    const target = resolveMasterReviewTarget() || resolveExportTarget()
    if (target) {
      const glided = await this.glideToTarget(target, label)
      if (!glided) return false

      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      callback()
    }

    this.setPillMode('action', 'Master Review open')
    await new Promise((resolve) => setTimeout(resolve, 320))
    if (!isContinuous) {
      this.abortAction('cancelled')
    }
    return true
  }
}

// Global Singleton Instance
export const autonomousCoordinator = new AutonomousUICoordinator()

if (typeof window !== 'undefined') {
  ;(window as unknown as { autonomousCoordinator?: AutonomousUICoordinator }).autonomousCoordinator =
    autonomousCoordinator
}
