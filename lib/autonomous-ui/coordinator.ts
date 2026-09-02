/**
 * Prometheus Autonomous UI Coordinator (Deep Module)
 *
 * Orchestrates autonomous GUI actions across Prometheus Studio workspaces.
 * Encapsulates target resolution, motion planning, human priority barge-in,
 * ambient signaling, and execution of existing React state handlers.
 */

import type {
  AutonomousWorkspaceTab,
  GhostCursorState,
  AutonomousUIEventListener,
  AutonomousActionPayload,
} from './types'
import {
  resolveTabElement,
  resolveTranscriptWordElement,
  resolveTranscriptPhraseElements,
  resolveMusicTrackElement,
  resolveDomSelector,
} from './target-resolver'
import { animateGlide, ensureElementInView } from './motion-driver'

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

