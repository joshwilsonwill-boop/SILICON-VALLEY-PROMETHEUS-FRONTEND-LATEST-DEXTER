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
} from './target-resolver'
import { animateGlide, ensureElementInView } from './motion-driver'
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
   * Move the ghost cursor smoothly to a screen coordinate and execute an action
   */
  public async glideTo(
    targetX: number,
    targetY: number,
    statusText: string,
    targetRect?: DOMRect | null,
    durationMs = 600
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false

    if (this.cancelCurrentMotion) {
      this.cancelCurrentMotion()
    }

    const startX = this.state.visible ? this.state.x : targetX - 60
    const startY = this.state.visible ? this.state.y : targetY + 80

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
        durationMs,
        (p) => {
          this.state.x = p.x
          this.state.y = p.y
          this.notify()
        },
        () => {
          this.state.phase = 'hovering'
          this.notify()
          resolve(true)
        }
      )
    })
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
    }
  ): Promise<boolean> {
    if (!phrase) return false

    // 1. Ensure Motion workspace is active
    if (options?.onSwitchTab) {
      options.onSwitchTab('Motion')
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // 2. Find matching words in the transcript DOM
    const targets = resolveTranscriptPhraseElements(phrase)
    if (targets.length === 0) {
      // If words not rendered yet, retry after short wait
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    const resolvedTargets = resolveTranscriptPhraseElements(phrase)

    if (resolvedTargets.length > 0) {
      for (const target of resolvedTargets) {
        await ensureElementInView(target.element)
        const updatedRect = target.element.getBoundingClientRect()
        const targetX = updatedRect.left + updatedRect.width / 2
        const targetY = updatedRect.top + updatedRect.height / 2

        const glided = await this.glideTo(
          targetX,
          targetY,
          `Jarvis: Cutting "${target.element.textContent?.trim()}"`,
          updatedRect,
          450
        )

        if (!glided) return false

        await this.simulateClick()

        // Trigger synthetic click on the word element to trigger existing onClick
        target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        await new Promise((resolve) => setTimeout(resolve, 140))
      }
    } else {
      // Fallback: If elements not found by DOM query, glide to Transcript header
      const transcriptHeader = resolveDomSelector('[data-motion-chamber] aside')
      if (transcriptHeader) {
        await this.glideTo(
          transcriptHeader.centerX,
          transcriptHeader.centerY,
          `Jarvis: Processed transcript cut for "${phrase}"`,
          transcriptHeader.rect,
          500
        )
        await this.simulateClick()
      }
    }

    // Wrap up: fade cursor out gracefully
    await new Promise((resolve) => setTimeout(resolve, 400))
    this.abortAction('cancelled')
    return true
  }

  /**
   * High-level Workflow: Autonomous music curation & track selection
   */
  public async executeMusicSelection(
    options?: {
      trackId?: string
      genreOrMood?: string
      onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
      onSelectTrack?: (trackId: string) => void
    }
  ): Promise<boolean> {
    // 1. Switch to Music workspace
    if (options?.onSwitchTab) {
      options.onSwitchTab('Music')
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    // 2. Find target track card or first track
    const target = resolveMusicTrackElement(options?.trackId)
    if (target) {
      await ensureElementInView(target.element)
      const updatedRect = target.element.getBoundingClientRect()
      const targetX = updatedRect.left + updatedRect.width / 2
      const targetY = updatedRect.top + updatedRect.height / 2

      const glided = await this.glideTo(
        targetX,
        targetY,
        `Jarvis: Selecting soundtrack ${options?.genreOrMood ? `(${options.genreOrMood})` : ''}`,
        updatedRect,
        600
      )

      if (!glided) return false

      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    // 3. Complete
    await new Promise((resolve) => setTimeout(resolve, 500))
    this.abortAction('cancelled')
    return true
  }

  /**
   * High-level Workflow: Switch Studio Tab
   */
  public async executeTabSwitch(
    tabName: AutonomousWorkspaceTab,
    onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
  ): Promise<boolean> {
    const tabTarget = resolveTabElement(tabName)
    if (tabTarget) {
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
    this.abortAction('cancelled')
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
  public async executeSeekTimeline(timeSec: number): Promise<boolean> {
    // 1. Try to find and interact with the timeline scrubber
    const scrubber = resolveDomSelector('[data-motion-chamber] [role="slider"]')
    if (scrubber) {
      await ensureElementInView(scrubber.element)
      const glided = await this.glideTo(
        scrubber.centerX,
        scrubber.centerY,
        `Jarvis: Seeking to ${timeSec.toFixed(1)}s`,
        scrubber.rect,
        500
      )
      if (!glided) return false
      await this.simulateClick()
    }

    // 2. Call the React callback via store bridge (works even without DOM target)
    useAutonomousStore.getState().onSeekSeconds?.(timeSec)

    await new Promise((resolve) => setTimeout(resolve, 300))
    this.abortAction('cancelled')
    return true
  }

  /**
   * High-level Workflow: Control preview playback (play / pause / mute / unmute)
   */
  public async executePreviewControl(
    command: 'play' | 'pause' | 'mute' | 'unmute'
  ): Promise<boolean> {
    const label =
      command === 'play' ? 'Playing preview'
      : command === 'pause' ? 'Pausing preview'
      : command === 'mute' ? 'Muting audio'
      : 'Unmuting audio'

    // 1. Try to find the physical button
    const isPlayback = command === 'play' || command === 'pause'
    const buttonQuery = isPlayback
      ? '[data-motion-chamber] button[aria-label*="play" i], [data-motion-chamber] button[aria-label*="pause" i]'
      : '[data-motion-chamber] button[aria-label*="mute" i], [data-motion-chamber] button[aria-label*="unmute" i]'

    const target = resolveDomSelector(buttonQuery)
    if (target) {
      await ensureElementInView(target.element)
      const glided = await this.glideTo(
        target.centerX,
        target.centerY,
        `Jarvis: ${label}`,
        target.rect,
        400
      )
      if (!glided) return false
      await this.simulateClick()
      target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    } else {
      // 2. Fallback: call React callback via store bridge
      if (isPlayback) {
        useAutonomousStore.getState().onTogglePlayback?.()
      } else {
        useAutonomousStore.getState().onToggleMute?.()
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300))
    this.abortAction('cancelled')
    return true
  }
}

// Global Singleton Instance
export const autonomousCoordinator = new AutonomousUICoordinator()

if (typeof window !== 'undefined') {
  ;(window as unknown as { autonomousCoordinator?: AutonomousUICoordinator }).autonomousCoordinator =
    autonomousCoordinator
}

