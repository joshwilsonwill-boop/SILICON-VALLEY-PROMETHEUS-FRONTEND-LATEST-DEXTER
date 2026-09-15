'use client'

/**
 * PrometheusTimelineTracks
 *
 * Replaces the flat inline TimelineTracks in motion-edit-workspace.tsx with a
 * proper draggable, resizable, multi-track timeline using @xzdarcy/react-timeline-editor.
 *
 * Props are a superset of the old TimelineTracks so the call site swap is zero-diff.
 */

import * as React from 'react'
import type { TimelineRow, TimelineAction } from '@xzdarcy/timeline-engine'
import type { MotionTranscriptSegment, MotionTextPlacement } from './motion-edit-workspace'

export interface PrometheusTimelineAction extends TimelineAction {
  name?: string
}

// Lazy-load the Timeline component to avoid SSR issues
const TimelineEditor = React.lazy(() =>
  import('@xzdarcy/react-timeline-editor').then((mod) => ({ default: mod.Timeline }))
)

// ─── Colour palette per track type ───────────────────────────────────────────
const TRACK_COLOURS: Record<string, { bg: string; border: string; label: string }> = {
  video: { bg: 'rgba(0, 240, 255, 0.14)', border: 'rgba(0, 240, 255, 0.40)', label: 'VIDEO' },
  audio: { bg: 'rgba(152, 242, 55, 0.13)',  border: 'rgba(152, 242, 55, 0.38)', label: 'AUDIO' },
  captions: { bg: 'rgba(135, 100, 255, 0.14)', border: 'rgba(135, 100, 255, 0.40)', label: 'CAPTIONS' },
  text: { bg: 'rgba(255, 180, 50, 0.13)',  border: 'rgba(255, 180, 50, 0.38)', label: 'TEXT' },
}

// ─── Props (matches old TimelineTracks exactly) ───────────────────────────────
export interface PrometheusTimelineTracksProps {
  zoom: number
  effectiveDuration: number
  sourceLabel: string
  transcriptSegments: MotionTranscriptSegment[]
  captionsVisible: boolean
  currentTime: number
  textPlacements?: MotionTextPlacement[]
  cutRanges?: { start: number; end: number }[]
  onSeek?: (timeSec: number) => void
}

// ─── Build editor rows from transcript data ───────────────────────────────────
function buildEditorRows(
  transcriptSegments: MotionTranscriptSegment[],
  captionsVisible: boolean,
  textPlacements: MotionTextPlacement[],
  effectiveDuration: number,
  sourceLabel: string,
  cutRanges: { start: number; end: number }[]
): TimelineRow[] {
  const hasCuts = cutRanges.length > 0

  // Video track — one full-width action, overlaid with cut regions as separate actions
  const videoActions: PrometheusTimelineAction[] = [
    {
      id: 'video-master',
      start: 0,
      end: effectiveDuration,
      effectId: 'video',
      name: sourceLabel,
    },
    // Cut regions displayed as separate, non-draggable overlays
    ...cutRanges.map((r, i) => ({
      id: `video-cut-${i}`,
      start: r.start,
      end: r.end,
      effectId: 'cut',
      name: `Cut ${i + 1}`,
      disable: true,
    })),
  ]

  // Audio track — waveform-derived from transcript timing
  const audioActions: PrometheusTimelineAction[] = transcriptSegments.length > 0
    ? transcriptSegments.map((seg, i) => ({
        id: `audio-seg-${seg.id ?? i}`,
        start: seg.start,
        end: seg.end,
        effectId: seg.isCut ? 'cut' : 'audio',
        name: seg.text.split(' ').slice(0, 5).join(' '),
        disable: Boolean(seg.isCut),
      }))
    : [{ id: 'audio-master', start: 0, end: effectiveDuration, effectId: 'audio', name: 'Audio' }]

  // Captions track
  const captionActions: PrometheusTimelineAction[] = captionsVisible
    ? transcriptSegments.map((seg, i) => ({
        id: `caption-${seg.id ?? i}`,
        start: seg.start,
        end: seg.end,
        effectId: 'captions',
        name: seg.text.split(' ').slice(0, 3).join(' '),
        disable: Boolean(seg.isCut),
      }))
    : []

  // Text overlays track
  const textActions: PrometheusTimelineAction[] = textPlacements.map((p, i) => ({
    id: `text-${p.id ?? i}`,
    start: p.start,
    end: p.end,
    effectId: 'text',
    name: p.text ?? `Text ${i + 1}`,
  }))

  const rows: TimelineRow[] = [
    { id: 'track-video', actions: videoActions },
    { id: 'track-audio', actions: audioActions },
  ]

  if (captionsVisible) {
    rows.push({ id: 'track-captions', actions: captionActions })
  }

  if (textActions.length > 0) {
    rows.push({ id: 'track-text', actions: textActions })
  }

  return rows
}

// ─── Custom action renderer ──────────────────────────────────────────────────
function renderAction(action: PrometheusTimelineAction, row: TimelineRow): React.ReactNode {
  const trackId = row.id.replace('track-', '') as keyof typeof TRACK_COLOURS
  const colours = action.effectId === 'cut'
    ? { bg: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.60)', label: 'CUT' }
    : TRACK_COLOURS[trackId] ?? TRACK_COLOURS.video

  return (
    <div
      className="h-full w-full overflow-hidden rounded-sm"
      style={{
        background: colours.bg,
        border: `1px solid ${colours.border}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <span
        className="block truncate px-1.5 pt-0.5 text-[9px] font-medium tracking-widest"
        style={{ color: colours.border }}
      >
        {action.name ?? ''}
      </span>
    </div>
  )
}

// ─── Track label sidebar ──────────────────────────────────────────────────────
function TrackLabelSidebar({ rows, rowHeight }: { rows: TimelineRow[]; rowHeight: number }) {
  return (
    <div
      className="shrink-0 border-r border-white/8"
      style={{ width: 64 }}
    >
      {rows.map((row) => {
        const trackId = row.id.replace('track-', '') as keyof typeof TRACK_COLOURS
        const colour = TRACK_COLOURS[trackId] ?? TRACK_COLOURS.video
        return (
          <div
            key={row.id}
            className="flex items-center justify-end pr-2"
            style={{ height: rowHeight }}
          >
            <span
              className="text-[9px] font-semibold tracking-[0.1em]"
              style={{ color: colour.border }}
            >
              {colour.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main exported component ─────────────────────────────────────────────────
export function PrometheusTimelineTracks({
  zoom,
  effectiveDuration,
  sourceLabel,
  transcriptSegments,
  captionsVisible,
  currentTime,
  textPlacements = [],
  cutRanges = [],
  onSeek,
}: PrometheusTimelineTracksProps) {
  const [rows, setRows] = React.useState<TimelineRow[]>([])
  const ROW_HEIGHT = 36
  const SCALE_WIDTH = Math.round(160 * zoom)

  // Rebuild rows when data changes
  React.useEffect(() => {
    setRows(
      buildEditorRows(
        transcriptSegments,
        captionsVisible,
        textPlacements,
        effectiveDuration,
        sourceLabel,
        cutRanges
      )
    )
  }, [transcriptSegments, captionsVisible, textPlacements, effectiveDuration, sourceLabel, cutRanges])

  // Effects map — one effect per track type (visual only, no actual playback engine)
  const effects = React.useMemo(
    () => ({
      video: { id: 'video', name: 'Video' },
      audio: { id: 'audio', name: 'Audio' },
      captions: { id: 'captions', name: 'Captions' },
      text: { id: 'text', name: 'Text' },
      cut: { id: 'cut', name: 'Cut', source: { start: () => {}, stop: () => {} } },
    }),
    []
  )

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-white/28">
        Loading timeline…
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <TrackLabelSidebar rows={rows} rowHeight={ROW_HEIGHT} />

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <React.Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-[10px] text-white/28">
              Loading timeline editor…
            </div>
          }
        >
          <TimelineEditor
            editorData={rows}
            effects={effects}
            scale={1}
            scaleWidth={SCALE_WIDTH}
            startLeft={8}
            rowHeight={ROW_HEIGHT}
            minScaleCount={Math.ceil(effectiveDuration)}
            maxScaleCount={Math.ceil(effectiveDuration) + 60}
            scaleSplitCount={5}
            gridSnap
            dragLine
            autoScroll
            onChange={(nextData) => setRows(nextData)}
            onCursorDrag={(time) => onSeek?.(time)}
            onClickTimeArea={(time) => {
              onSeek?.(time)
              return true
            }}
            getActionRender={renderAction}
            getScaleRender={(scale) => (
              <span className="text-[9px] tabular-nums text-white/35">
                {`${Math.floor(scale / 60)}:${String(scale % 60).padStart(2, '0')}`}
              </span>
            )}
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 10,
              height: rows.length * ROW_HEIGHT + 24,
            }}
          />
        </React.Suspense>

        {/* Playhead overlay synced to external currentTime */}
        <div
          className="pointer-events-none absolute bottom-0 top-6 z-20 border-l border-white shadow-[0_0_12px_rgba(255,255,255,0.75)]"
          style={{
            left: `${Math.min(100, (currentTime / effectiveDuration) * 100)}%`,
          }}
        >
          <span className="absolute -left-1.5 -top-1 size-3 rotate-45 bg-white" />
        </div>
      </div>
    </div>
  )
}
