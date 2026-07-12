'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ChevronDown,
  GitBranch,
  MessageSquare,
  Music,
  Pause,
  Play,
  Search,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { useR2Music } from '@/app/editor/hooks/use-r2-music'
import { useAudioStore } from '@/app/editor/stores/audio-store'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import type { EditorSidebarPanel } from '@/app/editor/hooks/use-sidebar'
import type { R2Track } from '@/lib/music/r2-sync'
import { cn } from '@/lib/utils'

type SidebarDrawerProps = {
  activePanel: EditorSidebarPanel | null
  isOpen: boolean
  onClose: () => void
  onTogglePanel: (panel: EditorSidebarPanel) => void
}

const PANELS: Array<{
  id: EditorSidebarPanel
  label: string
  icon: LucideIcon
}> = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'motion', label: 'Motion Brain', icon: Zap },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'versions', label: 'Versions', icon: GitBranch },
  { id: 'status', label: 'Status', icon: Activity },
]

export function SidebarDrawer({ activePanel, isOpen, onClose, onTogglePanel }: SidebarDrawerProps) {
  const router = useRouter()

  return (
    <aside
      className={cn(
        'sidebar-drawer flex flex-col border-l border-white/10 bg-black/65 text-white shadow-[0_0_90px_rgba(0,0,0,0.55)] backdrop-blur-[24px] saturate-[1.2]',
        isOpen && 'open',
      )}
      aria-label="Prometheus editor sidebar"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (isOpen && window.innerWidth < 1024) {
              onClose()
              return
            }

            router.back()
          }}
          className="grid size-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <h2 className="text-sm font-semibold tracking-[0.24em] text-white/80">PROMETHEUS</h2>
        <div className="size-9" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {PANELS.map((panel) => {
            const expanded = panel.id !== 'motion' && activePanel === panel.id
            const Icon = panel.icon

            return (
              <section key={panel.id} className="rounded-xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => {
                    if (panel.id === 'motion') {
                      onClose()
                      router.push('/editor/motion')
                      return
                    }

                    onTogglePanel(panel.id)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  aria-expanded={expanded}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      expanded ? 'bg-accent-purple shadow-[0_0_16px_rgba(168,85,247,0.8)]' : 'bg-white/18',
                    )}
                    aria-hidden="true"
                  />
                  <Icon className="size-4 shrink-0 text-white/70" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm font-medium text-white/86">{panel.label}</span>
                  <ChevronDown
                    className={cn('size-4 text-white/45 transition-transform', expanded && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>

                {expanded ? (
                  <div className="border-t border-white/10 px-3 pb-3 pt-3">
                    {panel.id === 'music' ? <MusicPanel /> : null}
                    {panel.id === 'motion' ? <MotionPanel /> : null}
                    {panel.id === 'chat' ? <ChatPanel /> : null}
                    {panel.id === 'versions' ? <VersionsPanel /> : null}
                    {panel.id === 'status' ? <StatusPanel /> : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>

    </aside>
  )
}

function MusicPanel() {
  const { error, isLoading, tracks } = useR2Music()
  const [query, setQuery] = React.useState('')
  const [selectedTrackId, setSelectedTrackId] = React.useState<string | null>(null)
  const filteredTracks = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return tracks
    return tracks.filter((track) =>
      [track.title, track.artist, track.genre].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [query, tracks])

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracks..."
          className="h-10 w-full rounded-lg border border-white/10 bg-black/35 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-accent-cyan/70"
        />
      </label>

      <div className="flex items-center justify-between gap-3 text-xs text-white/45">
        <span>{isLoading ? 'Syncing R2 library' : `${tracks.length} songs available`}</span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-accent-purple/25 bg-accent-purple/10 px-2.5 py-1 font-medium text-accent-purple"
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI Auto-Match
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <InlineLoadingAnimation size={40} label="Loading music library" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</div>
      ) : filteredTracks.length === 0 ? (
        <div className="py-8 text-center text-sm text-white/40">No tracks found in R2 bucket</div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((track) => (
            <TrackItem
              key={track.id}
              selected={selectedTrackId === track.id}
              track={track}
              onSelect={() => setSelectedTrackId(track.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TrackItem({ onSelect, selected, track }: { onSelect: () => void; selected: boolean; track: R2Track }) {
  const [imageFailed, setImageFailed] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const { currentTrack, isPlaying, toggleTrack } = useAudioStore()
  const active = currentTrack?.id === track.id

  React.useEffect(() => setImageLoaded(false), [track.coverUrl])

  return (
    <div
      className={cn(
        'flex h-16 w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors',
        active && 'border-l-2 border-l-accent-cyan bg-white/5',
        selected && !active ? 'border-accent-cyan/60 bg-accent-cyan/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
        currentTrack && !active && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => void toggleTrack(track)}
        className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10 text-white/90"
        aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {track.coverUrl && !imageFailed ? (
          <>
            {!imageLoaded ? (
              <>
                <span className="absolute inset-0 bg-gray-700" aria-hidden="true" />
                <InlineLoadingAnimation
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                  size={20}
                  label={`Loading artwork for ${track.title}`}
                />
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.coverUrl}
              alt=""
              className={cn('h-full w-full object-cover transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <Music className="size-4" aria-hidden="true" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/48">
          {active && isPlaying ? <EqualizerIcon /> : active ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
        </span>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left" aria-pressed={selected}>
        <span className="block truncate text-sm font-medium text-white/86">{track.title}</span>
        <span className="block truncate text-xs text-white/40">
          {track.artist} / {track.genre}
        </span>
      </button>
      <span className="shrink-0 text-xs tabular-nums text-white/42">{formatDuration(track.duration)}</span>
    </div>
  )
}

function EqualizerIcon() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      <span className="h-2 w-1 animate-pulse rounded-full bg-accent-cyan" />
      <span className="h-4 w-1 animate-pulse rounded-full bg-accent-cyan [animation-delay:120ms]" />
      <span className="h-3 w-1 animate-pulse rounded-full bg-accent-cyan [animation-delay:240ms]" />
    </span>
  )
}

function MotionPanel() {
  return (
    <div className="space-y-3 text-sm text-white/64">
      <Metric label="Scene intelligence" value="Hook lift detected" />
      <Metric label="Suggested move" value="Push-in at 0:02.4" />
      <Metric label="Animation engine" value="Beat-synced captions ready" />
    </div>
  )
}

function ChatPanel() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/60">
        Ask for a tighter hook, caption rewrite, or export variant.
      </div>
      <textarea
        rows={3}
        placeholder="Message Prometheus..."
        className="w-full resize-none rounded-lg border border-white/10 bg-black/35 p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-accent-cyan/70"
      />
    </div>
  )
}

function VersionsPanel() {
  return (
    <div className="space-y-2">
      {['Draft 03', 'Music pass', 'Source import'].map((label, index) => (
        <Metric key={label} label={label} value={index === 0 ? 'Current' : `${index + 1} checkpoints ago`} />
      ))}
    </div>
  )
}

function StatusPanel() {
  return (
    <div className="space-y-2">
      <Metric label="Duration" value="0:45" />
      <Metric label="Resolution" value="1080 x 1920" />
      <Metric label="File size" value="82 MB estimate" />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-1 text-sm font-medium text-white/78">{value}</div>
    </div>
  )
}

function formatDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return '0:00'
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
