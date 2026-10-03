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
  resolveTranscriptChunkCutTarget,
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
import { getVoiceCompanionBridge } from '../voice-companion/bridge'
import { performVoiceMusicAction } from '../voice-companion/music-controls'
import type { VoiceEditResult } from '../voice-companion/edit-results'

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
  private actionGeneration = 0

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

  /** Human input only ends takeover when the user explicitly acts on the canvas or presses Escape. */
  private initBargeInListeners() {
    const handleHumanInput = (event?: KeyboardEvent) => {
      if (event && event.key !== 'Escape') return
      this.isHumanInteracting = true
      if (this.state.isTakeover) {
        this.abortAction('user_barge_in')
      }

      if (this.humanInteractionTimer) clearTimeout(this.humanInteractionTimer)
      this.humanInteractionTimer = setTimeout(() => {
        this.isHumanInteracting = false
      }, 1200)
    }

    window.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement | null)?.closest?.('[aria-label="Jarvis edit activity"], [aria-label="Jarvis conversation"], [data-jarvis-trigger]')) return
      handleHumanInput()
    }, { passive: true })
    window.addEventListener('keydown', handleHumanInput as EventListener, { passive: true })
  }

  /**
   * Abort any ongoing autonomous action
   */
  public abortAction(reason: 'user_barge_in' | 'cancelled' = 'cancelled') {
    this.actionGeneration += 1
    if (this.cancelCurrentMotion) {
      this.cancelCurrentMotion()
      this.cancelCurrentMotion = null
    }

    this.state = {
      ...this.state,
      visible: false,
      isClicking: false,
      statusText: reason === 'user_barge_in' ? 'Control returned to you' : this.state.statusText,
      activeTargetRect: null,
      phase: this.state.isTakeover && reason === 'cancelled' ? 'idle' : 'yielding',
      // Completing one action hides the cursor while the task session stays visible.
      isTakeover: reason === 'user_barge_in' ? false : this.state.isTakeover,
      pillMode: 'idle',
      anticipatedTargetRect: null,
      spotlightRect: null,
    }
    this.notify()

    if (reason === 'user_barge_in' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prometheus:autonomous-takeover-ended'))
    }

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
      visible: false,
      phase: 'idle',
      statusText: label,
      pillMode: 'idle',
    }
    this.notify()
  }

  /**
   * Signal the end of a full autonomous UI takeover.
   * Fades the scrim out and returns pointer-events to the user.
   */
  public endTakeover() {
    this.abortAction('cancelled')
    this.state = {
      ...this.state,
      isTakeover: false,
      phase: 'yielding',
      statusText: 'Control returned to you',
      pillMode: 'idle',
      spotlightRect: null,
      anticipatedTargetRect: null,
    }
    this.notify()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prometheus:autonomous-takeover-ended'))
    }
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
      const cancelMotion = animateGlide(
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
          this.cancelCurrentMotion = null
          this.state.x = targetX
          this.state.y = targetY
          this.state.tiltAngleDeg = 0
          this.state.phase = 'hovering'
          this.notify()
          resolve(true)
        }
      )
      // A cancelled animation must also settle its awaiting tool/workflow.
      // Otherwise one interruption can leave the command queue waiting forever.
      this.cancelCurrentMotion = () => {
        cancelMotion()
        resolve(false)
      }
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
    const generation = this.actionGeneration
    this.state.isClicking = true
    this.state.phase = 'clicking'
    this.notify()

    await new Promise((resolve) => setTimeout(resolve, 220))
    if (generation !== this.actionGeneration) return

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
      onToggleCutWord: options?.onToggleCutWord,
      onToggleCutSegment: options?.onToggleCutSegment,
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
    onToggleCutWord?: (segmentId: string, wordIndex: number) => void
    onToggleCutSegment?: (segmentId: string) => void
    isContinuous?: boolean
  }): Promise<boolean> {
    if (this.isHumanInteracting) return false
    const generation = this.actionGeneration
    const targetTab: AutonomousWorkspaceTab = options.type === 'split' ? 'Editor' : 'Motion'
    this.beginTakeover(`Jarvis: Opening ${targetTab}`)
    const actionId = useAutonomousStore.getState().beginAction({ label: options.type === 'transcript_cut' ? `Cut ?${options.phrase || ''}?` : 'Apply editor change', targetLabel: targetTab })
    let success = false
    let summary = 'The editor did not confirm a change.'
    let count = 0
    let totalRemovedSec = 0
    try {
      if (!await this.executeTabSwitch(targetTab, options.onSwitchTab, true)) return false
      if (generation !== this.actionGeneration) { summary = 'Editing was interrupted.'; return false }
      if (options.type === 'transcript_cut' && options.phrase) {
        const handler = getVoiceCompanionBridge().onCutTranscriptPhrase
        if (!handler) { summary = 'Precise transcript cuts are unavailable in this editor.'; return false }
        const targets = resolveTranscriptPhraseElements(options.phrase)
        if (targets[0]) {
          const moved = await this.glideToTarget(targets[0], `Jarvis: Cutting "${options.phrase}"`, 320)
          if (!moved || generation !== this.actionGeneration) { summary = 'Editing was interrupted.'; return false }
          await this.simulateClick()
        }
        if (generation !== this.actionGeneration) { summary = 'Editing was interrupted.'; return false }
        // Animation is illustrative. The timed editor handler owns the only mutation.
        const result = await handler(options.phrase)
        success = result.success
        summary = result.summary
        count = result.count
        totalRemovedSec = result.totalRemovedSec
      } else if (options.type === 'split' && typeof options.timeSec === 'number' && options.onSplit) {
        await options.onSeek?.(options.timeSec)
        if (generation !== this.actionGeneration) { summary = 'Editing was interrupted.'; return false }
        await options.onSplit()
        success = true
        summary = `Split requested at ${options.timeSec.toFixed(3)}s.`
      } else if (options.type === 'caption_style' && options.style && options.onStyle) {
        await options.onStyle(options.style)
        success = true
        summary = `Caption preset applied: ${options.style}.`
      }
      this.setPillMode('action', summary)
      return success
    } catch (error) {
      summary = error instanceof Error ? error.message : 'Editing could not complete.'
      return false
    } finally {
      useAutonomousStore.getState().finishAction(actionId, { status: success ? 'succeeded' : generation !== this.actionGeneration ? 'cancelled' : 'failed', summary, affectedCount: count, durationRemovedSec: totalRemovedSec })
      if (!options.isContinuous) this.abortAction('cancelled')
    }
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
    const generation = this.actionGeneration
    this.beginTakeover('Jarvis: Reviewing timed transcript pauses')
    const actionId = useAutonomousStore.getState().beginAction({ label: 'Cut timed pauses', targetLabel: 'Motion timeline' })
    let result: VoiceEditResult = { success: false, count: 0, totalRemovedSec: 0, ranges: [], summary: 'The editor has no confirmed silence cut control.' }
    try {
      if (!await this.executeTabSwitch('Motion', options?.onSwitchTab, true)) return false
      if (generation !== this.actionGeneration) { result.summary = 'Silence cleanup was interrupted.'; return false }
      const handler = getVoiceCompanionBridge().onCutSilence
      if (!handler) return false
      const target = resolveSilenceCutTarget()
      if (target && !await this.glideToTarget(target, 'Jarvis: Cutting timed pauses', 320)) return false
      if (generation !== this.actionGeneration) { result.summary = 'Silence cleanup was interrupted.'; return false }
      result = await handler(options?.minDurationSec)
      this.setPillMode('action', result.summary)
      return result.success
    } catch (error) {
      result.summary = error instanceof Error ? error.message : 'Silence cleanup could not complete.'
      return false
    } finally {
      useAutonomousStore.getState().finishAction(actionId, { status: result.success ? 'succeeded' : generation !== this.actionGeneration ? 'cancelled' : 'failed', summary: result.summary, affectedCount: result.count, durationRemovedSec: result.totalRemovedSec })
      if (!options?.isContinuous) this.abortAction('cancelled')
    }
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
      action?: 'preview' | 'select'
      context?: {
        transcript?: string
        pace?: string
        mood?: string
      }
      onSwitchTab?: (tab: AutonomousWorkspaceTab) => void
      onSelectTrack?: import('../voice-companion/bridge').VoiceCompanionBridgeHandlers['onSelectMusicTrack']
      onPlayPreview?: import('../voice-companion/bridge').VoiceCompanionBridgeHandlers['onPlayMusicPreview']
      isContinuous?: boolean
    }
  ): Promise<boolean> {
    if (this.isHumanInteracting) return false
    const generation = this.actionGeneration
    this.beginTakeover('Jarvis: Opening Music')
    const isPreviewOnly = options?.action === 'preview'
    const searchPhrase = (options?.query || options?.genreOrMood || '').trim()
    const query = searchPhrase
    const actionId = useAutonomousStore.getState().beginAction({ label: isPreviewOnly ? 'Preview song' : options?.action === 'select' || options?.trackId ? 'Stage soundtrack' : 'Search music', targetLabel: query || options?.trackId || 'Music' })
    let success = false
    let summary = 'Music action could not complete.'
    try {
      const target = resolveTabElement('Music')
      if (target && !await this.glideToTarget(target, 'Jarvis: Opening Music', 360)) return false
      if (generation !== this.actionGeneration) { summary = 'Music action was interrupted.'; return false }
      const result = await performVoiceMusicAction({ query, trackId: options?.trackId, action: options?.action || (options?.trackId ? 'select' : 'search'), context: options?.context }, () => ({
        ...getVoiceCompanionBridge(),
        ...(options?.onSwitchTab ? { onTabChange: options.onSwitchTab } : {}),
        ...(options?.onSelectTrack ? { onSelectMusicTrack: options.onSelectTrack } : {}),
        ...(options?.onPlayPreview ? { onPlayMusicPreview: options.onPlayPreview } : {}),
      }))
      success = result.success
      summary = result.summary
      this.setPillMode('action', summary)
      return success
    } catch (error) {
      summary = error instanceof Error ? error.message : summary
      return false
    } finally {
      useAutonomousStore.getState().finishAction(actionId, { status: success ? 'succeeded' : generation !== this.actionGeneration ? 'cancelled' : 'failed', summary })
      if (!options?.isContinuous) this.abortAction('cancelled')
    }
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
    const switchHandler = onSwitchTab ?? useAutonomousStore.getState().onSwitchTab
    if (!tabTarget && !switchHandler) return false
    const generation = this.actionGeneration
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
      if (generation !== this.actionGeneration) return false
      if (!switchHandler) tabTarget.element.click()
    }

    await switchHandler?.(tabName)

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

    // Enabling access is idle; only real navigation renders cursor activity.
    this.beginTakeover(`Jarvis taking control: ${targetTab} schema`)
    try {
      const switched = await this.executeTabSwitch(targetTab, onSwitchTab, true)
      if (!switched) {
        this.endTakeover()
        return false
      }
      this.abortAction('cancelled')
      return true
    } catch {
      this.endTakeover()
      return false
    }
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
      if (!callback) target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    // 3. Fire callback synchronously with the click
    if (callback) {
      await callback()
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
      if (!callback) target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      await callback()
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
      if (!callback) target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      await callback()
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
      if (!callback) target.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    if (callback) {
      await callback()
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
