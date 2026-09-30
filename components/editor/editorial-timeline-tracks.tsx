'use client'

import * as React from 'react'
import {
  Activity,
  MoreHorizontal,
  Music,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { useEditorialTimelineThumbnails } from '@/components/editor/editorial-timeline-thumbnails'
import type { MotionTextPlacement, MotionTranscriptSegment } from '@/components/editor/motion-edit-workspace'
import type { MusicRecommendation } from '@/lib/types'
import type { EditorialCue } from '@/lib/editor/editorial-timeline-state'
import { cn } from '@/lib/utils'

export interface EditorialVideoClip {
  id: string
  start: number
  end: number
  title: string
  thumbnailIndex?: number
  type: 'video' | 'b-roll'
  isCut?: boolean
  badge?: string
}

export interface EditorialTimelineTracksProps {
  previewUrl: string
  zoom: number
  effectiveDuration: number
  sourceLabel: string
  transcriptSegments: MotionTranscriptSegment[]
  captionsVisible: boolean
  currentTime: number
  textPlacements?: MotionTextPlacement[]
  cutRanges?: { start: number; end: number }[]
  selectedMusicTrack?: MusicRecommendation | null
  editorialCues?: EditorialCue[]
  onEditorialCuesChange?: (cues: EditorialCue[]) => void
  soundtrackVolume?: number
  soundtrackMuted?: boolean
  onSoundtrackVolumeChange?: (volume: number) => void
  onSoundtrackMutedChange?: (muted: boolean) => void
  onOpenMusicCatalog?: () => void
  onSeek?: (timeSec: number) => void
  // Interactive clip manipulation
  selectedClipId?: string | null
  onSelectClip?: (clipId: string | null) => void
  onTrimClip?: (clipId: string, newStart: number, newEnd: number) => void
  onSplitClip?: () => void
  onDeleteClip?: () => void
  onDuplicateClip?: () => void
  isVideoLocked?: boolean
  isVideoHidden?: boolean
  isAudioMuted?: boolean
  isAudioHidden?: boolean
  isMusicHidden?: boolean
}

function shortTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

function percent(time: number, duration: number): string {
  const safeDuration = Math.max(duration, 0.01)
  return `${Math.max(0, Math.min(100, (time / safeDuration) * 100))}%`
}

// Generate realistic organic audio waveform bars
function generateWaveBars(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i + seed * 17) * 0.28
    const envelope = Math.sin((i / count) * Math.PI)
    const noise = Math.abs(Math.sin(angle) * Math.cos(angle * 1.7) + Math.sin(angle * 3.1) * 0.4)
    return Math.max(0.12, Math.min(0.96, (noise * 0.75 + 0.25) * (envelope * 0.65 + 0.35)))
  })
}

export function EditorialTimelineTracks({
  previewUrl,
  zoom,
  effectiveDuration,
  sourceLabel,
  transcriptSegments,
  captionsVisible,
  currentTime,
  textPlacements,
  cutRanges,
  selectedMusicTrack,
  editorialCues = [],
  onEditorialCuesChange,
  soundtrackVolume = 0.7,
  soundtrackMuted = false,
  onSoundtrackVolumeChange,
  onSoundtrackMutedChange,
  onOpenMusicCatalog,
  onSeek,
  selectedClipId: controlledSelectedClipId,
  onSelectClip,
  onTrimClip,
  isVideoLocked = false,
  isVideoHidden = false,
  isAudioMuted = false,
  isAudioHidden = false,
  isMusicHidden = false,
}: EditorialTimelineTracksProps) {
  const thumbnails = useEditorialTimelineThumbnails(previewUrl, 12)
  const width = `${zoom * 100}%`

  // Default clips based on reference 9103 if not provided
  const [internalClips, setInternalClips] = React.useState<EditorialVideoClip[]>(() => {
    const dur = Math.max(30, effectiveDuration)
    return [
      { id: 'clip-1', start: 0, end: dur * 0.12, title: '00:00 - 00:04', thumbnailIndex: 0, type: 'video' },
      { id: 'clip-2', start: dur * 0.12, end: dur * 0.27, title: '00:04 - 00:09', thumbnailIndex: 1, type: 'video' },
      { id: 'clip-3', start: dur * 0.27, end: dur * 0.42, title: '00:09 - 00:14', thumbnailIndex: 2, type: 'video' },
      { id: 'clip-4', start: dur * 0.42, end: dur * 0.60, title: 'videoplayback (4)', thumbnailIndex: 3, type: 'video' },
      { id: 'clip-5', start: dur * 0.60, end: dur * 0.72, title: '00:20 - 00:24', thumbnailIndex: 4, type: 'video' },
      { id: 'clip-6', start: dur * 0.72, end: dur * 0.81, title: '00:24 - 00:27', thumbnailIndex: 5, type: 'video' },
      { id: 'clip-7', start: dur * 0.81, end: dur * 0.87, title: '00:27 - 00:29', thumbnailIndex: 6, type: 'video' },
      { id: 'clip-8', start: dur * 0.87, end: dur * 0.94, title: 'B-roll', thumbnailIndex: 7, type: 'b-roll', badge: 'B-roll' },
      { id: 'clip-9', start: dur * 0.94, end: dur, title: 'Scenery', thumbnailIndex: 8, type: 'b-roll' },
    ]
  })

  // Synchronize duration changes to clips if needed
  React.useEffect(() => {
    setInternalClips((current) => {
      const dur = Math.max(30, effectiveDuration)
      return current.map((c, i, arr) => {
        const factor = dur / Math.max(30, arr[arr.length - 1]?.end || 30)
        return {
          ...c,
          start: c.start * factor,
          end: c.end * factor,
        }
      })
    })
  }, [effectiveDuration])

  const [internalSelectedClipId, setInternalSelectedClipId] = React.useState<string | null>('clip-4')
  const activeClipId = controlledSelectedClipId !== undefined ? controlledSelectedClipId : internalSelectedClipId

  const handleClipClick = (clipId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onSelectClip) onSelectClip(clipId)
    else setInternalSelectedClipId(clipId)
  }

  // Ruler tick marks: major marks every 5s, minor marks every 1s
  const ticks = React.useMemo(() => {
    const count = Math.max(6, Math.min(20, Math.ceil(effectiveDuration / 5)))
    return Array.from({ length: count + 1 }, (_, index) => {
      const time = (index * 5)
      return { time, label: shortTime(time) }
    }).filter((t) => t.time <= effectiveDuration)
  }, [effectiveDuration])

  // Waveform generation for Voice track
  const voiceWaveBars = React.useMemo(() => generateWaveBars(140, 3), [])
  const musicWaveBars = React.useMemo(() => generateWaveBars(160, 7), [])

  // High-def Captions Pills from transcript segments (or reference fallback)
  const resolvedCaptions = React.useMemo(() => {
    if (transcriptSegments && transcriptSegments.length > 0) {
      return transcriptSegments
    }
    const dur = Math.max(30, effectiveDuration)
    return [
      { id: 'cap-1', start: 0, end: dur * 0.12, text: "Hey, what's up?" },
      { id: 'cap-2', start: dur * 0.13, end: dur * 0.27, text: "Today I'm going to share" },
      { id: 'cap-3', start: dur * 0.28, end: dur * 0.42, text: "A simple framework" },
      { id: 'cap-4', start: dur * 0.43, end: dur * 0.60, text: "that helped me scale" },
      { id: 'cap-5', start: dur * 0.61, end: dur * 0.75, text: "Most people make the mistake" },
      { id: 'cap-6', start: dur * 0.76, end: dur * 0.94, text: "If you focus on these three core areas" },
    ]
  }, [transcriptSegments, effectiveDuration])

  const timelineText = React.useMemo(() => {
    const saved = editorialCues.filter((cue) => cue.type === 'text')
    const ids = new Set(saved.map((cue) => cue.id))
    return [...saved, ...(textPlacements ?? []).filter((cue) => !ids.has(cue.id)).map((cue) => ({
      id: cue.id, type: 'text' as const, start: cue.start, end: cue.end, title: cue.text,
      text: cue.text, region: cue.region, origin: 'editor' as const,
    }))]
  }, [editorialCues, textPlacements])
  const textLanes = React.useMemo(() => packCueLanes(timelineText), [timelineText])
  const visualCues = React.useMemo(() => editorialCues.filter((cue) => cue.type !== 'text'), [editorialCues])
  const visualLanes = React.useMemo(() => packCueLanes(visualCues), [visualCues])

  return (
    <div
      data-editorial-timeline-tracks
      className="relative select-none pb-2 pt-0"
      style={{ width, minWidth: '100%' }}
    >
      {/* 0. TIME RULER */}
      <div
        className="relative h-[22px] border-b border-white/10"
        aria-label="Timeline Ruler"
      >
        {ticks.map(({ time, label }) => (
          <div
            key={time}
            className="absolute top-0 h-full border-l border-white/20 text-[9px] font-mono text-white/45"
            style={{ left: percent(time, effectiveDuration) }}
          >
            <span className="absolute left-1 top-0.5 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>

      {/* 1. VIDEO TRACK (Separable Clips, Thumbnails, Selection Highlight, Trim Handles) */}
      <div
        className={cn(
          'relative mt-1.5 h-[50px] overflow-visible rounded-[4px] bg-[#111622]/90 border border-white/10 transition-opacity',
          isVideoHidden && 'opacity-20 pointer-events-none',
        )}
        aria-label="Separable Video Clips Track"
      >
        <div className="absolute inset-0 flex">
          {internalClips.map((clip, index) => {
            const isSelected = clip.id === activeClipId
            const leftPct = percent(clip.start, effectiveDuration)
            const widthPct = percent(clip.end - clip.start, effectiveDuration)
            const thumbUrl = thumbnails[clip.thumbnailIndex ?? (index % 10)]

            return (
              <div
                key={clip.id}
                onClick={(e) => handleClipClick(clip.id, e)}
                data-clip-id={clip.id}
                data-selected={isSelected ? 'true' : 'false'}
                style={{ left: leftPct, width: widthPct }}
                className={cn(
                  'group absolute inset-y-0 cursor-pointer overflow-hidden transition-all',
                  isSelected
                    ? 'z-10 rounded-[5px] border-2 border-[#9df65a] shadow-[0_0_14px_rgba(157,246,90,0.35)]'
                    : 'border-r border-black/80 hover:brightness-110',
                )}
              >
                {/* Filmstrip thumbnail preview */}
                <div className="absolute inset-0 bg-[#251e22]">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={clip.title}
                      className="h-full w-full object-cover pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className={cn(
                        'h-full w-full',
                        clip.type === 'b-roll'
                          ? 'bg-[linear-gradient(135deg,#1e293b_0%,#334155_50%,#0f172a_100%)]'
                          : 'bg-[linear-gradient(125deg,#5f3e30_0%,#9e6c4e_45%,#2b3944_70%,#7a523b_100%)]',
                      )}
                    />
                  )}
                  {/* Subtle darkening gradient */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
                </div>

                {/* Left Trim Handle on selected clip */}
                {isSelected && !isVideoLocked && (
                  <div
                    data-handle="trim-left"
                    aria-label="Trim clip start"
                    className="absolute inset-y-0 left-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-center rounded-l-[3px] bg-[#9df65a] shadow-[0_0_6px_rgba(157,246,90,0.6)]"
                  >
                    <div className="h-3 w-0.5 rounded-full bg-black/60" />
                  </div>
                )}

                {/* Right Trim Handle on selected clip */}
                {isSelected && !isVideoLocked && (
                  <div
                    data-handle="trim-right"
                    aria-label="Trim clip end"
                    className="absolute inset-y-0 right-0 z-20 flex w-2.5 cursor-ew-resize items-center justify-center rounded-r-[3px] bg-[#9df65a] shadow-[0_0_6px_rgba(157,246,90,0.6)]"
                  >
                    <div className="h-3 w-0.5 rounded-full bg-black/60" />
                  </div>
                )}

                {/* Selected clip title badge */}
                {isSelected && (
                  <div className="pointer-events-none absolute left-3 top-1 z-10 flex max-w-[85%] items-center gap-1.5 truncate rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                    <span className="truncate">{clip.title}</span>
                  </div>
                )}

                {/* B-roll badge */}
                {clip.badge && (
                  <div className="pointer-events-none absolute right-2 top-1 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white/90 border border-white/20 shadow">
                    {clip.badge}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action more menu on right */}
        <button
          type="button"
          aria-label="Clip options"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 grid size-6 place-items-center rounded bg-black/60 text-white/70 hover:bg-black/90 hover:text-white transition-colors"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>

      {/* 2. AUDIO TRACK: Original voice waveform */}
      <div
        className={cn(
          'relative mt-1.5 h-[42px] overflow-hidden rounded-[4px] border border-[#10b981]/30 bg-[#082922] transition-opacity',
          isAudioHidden && 'opacity-20 pointer-events-none',
        )}
        aria-label="Audio Track"
      >
        {/* Emerald Voice (Enhanced) Section */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden bg-[linear-gradient(90deg,#0a2a22_0%,#0e3831_50%,#0a2620_100%)]"
          style={{ width: '100%' }}
        >
          {/* Waveform visualization */}
          <div className="absolute inset-0 flex items-center gap-[1px] px-2 opacity-85">
            {voiceWaveBars.map((height, i) => (
              <span
                key={i}
                className="flex-1 rounded-[1px] bg-[#10b981]"
                style={{ height: `${Math.round(height * 78)}%` }}
              />
            ))}
          </div>

          {/* Interactive Audio Automation Curve (Ducking / Volume Envelope) */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 400 42"
            preserveAspectRatio="none"
          >
            {/* Smooth curved bezier line dipping down for ducking */}
            <path
              d="M 0 10 L 160 10 Q 190 10 210 28 Q 230 36 260 36 Q 290 36 310 16 Q 325 10 400 10"
              fill="none"
              stroke="#5eead4"
              strokeWidth="2"
              strokeLinecap="round"
              className="opacity-90"
            />
            {/* Keyframe Nodes with glowing circular handles */}
            <circle cx="160" cy="10" r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <circle cx="210" cy="28" r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <circle cx="260" cy="36" r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <circle cx="310" cy="16" r="3.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
          </svg>

          {/* Voice (Enhanced) Badge */}
          <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1 rounded-full bg-[#052b24]/90 px-2 py-0.5 text-[9px] font-semibold text-[#34d399] border border-[#10b981]/40 shadow-sm backdrop-blur-sm">
            <Activity className="size-2.5 text-[#34d399]" />
            <span>Voice (Enhanced)</span>
          </div>
        </div>

      </div>

      {/* 3. CAPTIONS TRACK: Separable Rounded Transcript Pills */}
      <div
        className={cn(
          'relative mt-1.5 h-[32px] overflow-hidden rounded-[4px] bg-[#0c1017]/80 transition-opacity',
          !captionsVisible && 'opacity-65',
        )}
        aria-label="Separable Transcript Captions Track"
      >
        <div className="absolute inset-0">
          {resolvedCaptions.map((segment) => {
            const isActive = currentTime >= segment.start && currentTime < segment.end
            const leftPct = percent(segment.start, effectiveDuration)
            const widthPct = percent(segment.end - segment.start, effectiveDuration)

            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => onSeek?.(segment.start)}
                style={{ left: leftPct, width: widthPct }}
                title={segment.text}
                className={cn(
                  'group absolute inset-y-[2px] cursor-pointer overflow-hidden rounded-md border px-2.5 text-left text-[10px] font-medium leading-[26px] transition-all',
                  isActive
                    ? 'border-[#9df65a] bg-[#1a2b20] text-[#e0ffd4] shadow-[0_0_10px_rgba(157,246,90,0.3)] z-10'
                    : 'border-white/10 bg-[#161b26] text-white/85 hover:border-white/30 hover:bg-[#1f2535]',
                )}
              >
                <span className="block truncate">{segment.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Text clips are independently placed and stacked when their times overlap. */}
      <div data-timeline-track="text" className="relative mt-1.5 overflow-hidden rounded-[4px] border border-white/10 bg-[#11131b]" style={{ height: Math.max(30, textLanes.length * 30) }} aria-label="Text placements track">
        {!textLanes.length ? <span className="flex h-[30px] items-center px-2 text-[10px] text-white/35">Text placements from the edit will appear here</span> : null}
        {textLanes.map((lane, laneIndex) => lane.map((cue) => <DraggableEditorialCue key={cue.id} cue={cue} laneIndex={laneIndex} duration={effectiveDuration} currentTime={currentTime} onSeek={onSeek} onCommit={(updated) => onEditorialCuesChange?.(replaceCue(editorialCues, cue, updated))} />))}
      </div>

      {/* 5. Backend visual cues keep their type, source timing and context on the timeline. */}
      {visualCues.length ? <div data-timeline-track="visual-cues" className="relative mt-1.5 overflow-hidden rounded-[4px] border border-[#38bdf8]/15 bg-[#0d1720]" style={{ height: Math.max(30, visualLanes.length * 30) }} aria-label="Backend visual cues track">
        {visualLanes.map((lane, laneIndex) => lane.map((cue) => <DraggableEditorialCue key={cue.id} cue={cue} laneIndex={laneIndex} duration={effectiveDuration} currentTime={currentTime} onSeek={onSeek} onCommit={(updated) => onEditorialCuesChange?.(replaceCue(editorialCues, cue, updated))} />))}
      </div> : null}

      {/* 6. MUSIC TRACK: Reflects Music Section selection, Waveform, Fade-in/out Curves */}
      <div
        className={cn(
          'relative mt-1.5 h-[42px] overflow-hidden rounded-[4px] transition-opacity',
          isMusicHidden && 'opacity-20 pointer-events-none',
        )}
        aria-label="Music Track"
      >
        {selectedMusicTrack ? (
          <div
            data-timeline-track="music-active"
            className="group relative h-full w-full overflow-hidden rounded-[4px] border border-[#7c3aed]/50 bg-[linear-gradient(90deg,#241852_0%,#3e218b_50%,#1f1448_100%)] shadow-[0_0_12px_rgba(124,58,237,0.25)]"
          >
            {/* Waveform visualization */}
            <div className="absolute inset-0 flex items-center gap-[1.5px] px-2 opacity-75">
              {musicWaveBars.map((height, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-[1px] bg-[#9333ea]"
                  style={{ height: `${Math.round(height * 82)}%` }}
                />
              ))}
            </div>

            {/* Volume Automation Curves (Fade-In at start, Fade-Out at end) */}
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              viewBox="0 0 400 42"
              preserveAspectRatio="none"
            >
              {/* Fade-in curve at beginning */}
              <path
                d="M 2 38 Q 15 30 35 10 L 370 10 Q 388 12 398 38"
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-90"
              />
              <circle cx="2" cy="38" r="3.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
              <circle cx="35" cy="10" r="3.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
              <circle cx="370" cy="10" r="3.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
              <circle cx="398" cy="38" r="3.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
            </svg>

            {/* Music Track Badge & Song Title */}
            <div className="relative z-10 flex h-full items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-[#7c3aed]/40 text-[#c084fc]">
                  <Music className="size-3" />
                </div>
                <span className="text-[11px] font-semibold text-white tracking-wide">
                  {selectedMusicTrack.title}
                </span>
                {selectedMusicTrack.artist && (
                  <span className="hidden text-[10px] text-white/50 sm:inline">
                    · {selectedMusicTrack.artist}
                  </span>
                )}
              </div>

              {/* Mute toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSoundtrackMutedChange?.(!soundtrackMuted)
                }}
                aria-label={soundtrackMuted ? 'Unmute music' : 'Mute music'}
                className="grid size-6 place-items-center rounded bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors"
              >
                {soundtrackMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
              </button>
            </div>
          </div>
        ) : (
          /* Empty Music Slot with Sync soundtrack to motion */
          <div
            data-timeline-track="music-empty"
            className="h-full w-full overflow-hidden rounded-[4px] border border-dashed border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all"
          >
            <button
              type="button"
              onClick={onOpenMusicCatalog}
              className="flex h-full w-full items-center gap-2 px-3 text-[11px] text-white/55 hover:text-white transition-colors"
            >
              <div className="flex size-5 items-center justify-center rounded bg-white/5 text-[#9df65a]">
                <Plus className="size-3" />
              </div>
              <span className="font-medium text-white/75">Sync soundtrack to motion</span>
              <span className="text-[10px] text-white/35">
                — click to browse catalog or personal audio
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function packCueLanes<T extends { start: number; end: number }>(cues: T[]) {
  const lanes: T[][] = []
  for (const cue of [...cues].filter((item) => item.end > item.start).sort((a, b) => a.start - b.start || a.end - b.end)) {
    const lane = lanes.find((items) => items[items.length - 1]!.end <= cue.start)
    if (lane) lane.push(cue)
    else lanes.push([cue])
  }
  return lanes
}

function replaceCue(cues: EditorialCue[], previous: EditorialCue, updated: EditorialCue) {
  const index = cues.findIndex((cue) => cue.id === previous.id)
  if (index < 0) return [...cues, updated]
  return cues.map((cue, cueIndex) => cueIndex === index ? updated : cue)
}

function DraggableEditorialCue({ cue, laneIndex, duration, currentTime, onSeek, onCommit }: {
  cue: EditorialCue
  laneIndex: number
  duration: number
  currentTime: number
  onSeek?: (time: number) => void
  onCommit: (cue: EditorialCue) => void
}) {
  const [preview, setPreview] = React.useState<{ start: number; end: number } | null>(null)
  const drag = React.useRef<{ pointerId: number; x: number; start: number; end: number; width: number; moved: boolean } | null>(null)
  const suppressClick = React.useRef(false)
  const contextSummary = Object.entries(cue.context ?? {})
    .filter(([key, value]) => ['variant', 'treatment', 'tone', 'alignment', 'layout', 'templateType', 'templateId', 'direction', 'kind', 'sourceId', 'sourceUrl', 'cue'].includes(key) && (typeof value === 'string' || typeof value === 'number'))
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ')
  const start = preview?.start ?? cue.start
  const end = preview?.end ?? cue.end
  return (
    <button
      type="button"
      data-editorial-cue-id={cue.id}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return }
        onSeek?.(start)
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
        if (!bounds?.width) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, x: event.clientX, start, end, width: bounds.width, moved: false }
      }}
      onPointerMove={(event) => {
        const state = drag.current
        if (!state || state.pointerId !== event.pointerId) return
        const delta = ((event.clientX - state.x) / state.width) * duration
        if (Math.abs(delta) >= 0.03) state.moved = true
        if (!state.moved) return
        const nextStart = Math.max(0, Math.min(duration - (state.end - state.start), state.start + delta))
        setPreview({ start: nextStart, end: nextStart + (state.end - state.start) })
      }}
      onPointerUp={(event) => {
        const state = drag.current
        if (!state || state.pointerId !== event.pointerId) return
        if (state.moved && preview) {
          suppressClick.current = true
          onCommit({ ...cue, start: preview.start, end: preview.end, origin: 'editor' })
        }
        drag.current = null
        setPreview(null)
      }}
      onPointerCancel={() => { drag.current = null; setPreview(null) }}
      style={{ top: laneIndex * 30 + 3, left: percent(start, duration), width: percent(end - start, duration) }}
      className={cn('absolute flex h-6 min-w-[8px] touch-none cursor-grab items-center overflow-hidden rounded border px-1.5 text-left text-[9px] text-white/85 active:cursor-grabbing', cue.type === 'text' ? 'border-dashed border-[#9df65a]/45 bg-[#9df65a]/10 hover:border-[#9df65a]' : 'border-sky-300/30 bg-sky-300/10 hover:border-sky-200/70', currentTime >= start && currentTime < end && 'ring-1 ring-white/40')}
      title={`${cue.title} · ${start.toFixed(2)}–${end.toFixed(2)}s · drag to move${cue.region ? ` · ${cue.region}` : ''}${contextSummary ? ` · ${contextSummary}` : ''}`}
    >
      <span className="truncate">{cue.text || cue.title}</span>
    </button>
  )
}
