'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CalendarDays, Clock3, Copy, Film, Gauge, Trash2, X } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProjectListItem } from '@/lib/projects/types'

const statusLabels: Record<ProjectListItem['status'], string> = {
  draft: 'In progress',
  rendering: 'Rendering',
  completed: 'Ready',
  failed: 'Needs attention',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatDuration(value: number | null) {
  if (value === null || value <= 0) return null
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export interface ProjectDetailsModalProps {
  project: ProjectListItem | null
  isDeleting: boolean
  isDuplicating: boolean
  onClose: () => void
  onDelete: (project: ProjectListItem) => void
  onDuplicate: (project: ProjectListItem) => void
}

export function ProjectDetailsModal({
  project,
  isDeleting,
  isDuplicating,
  onClose,
  onDelete,
  onDuplicate,
}: ProjectDetailsModalProps) {
  const router = useRouter()
  const thumbnailStyle = project?.thumbnailUrl ? { backgroundImage: `url("${project.thumbnailUrl}")` } : undefined
  const durationLabel = formatDuration(project?.duration ?? null)
  const resolutionLabel = project?.width && project?.height ? `${project.width}×${project.height}` : null

  if (!project) return null

  const openInEditor = () => {
    onClose()
    router.push(`/editor/${project.id}`)
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-lg rounded-none border-white/15 bg-[#0a0a0b] p-0 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.96)]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{project.title}</DialogTitle>
          <DialogDescription>Project details for {project.title}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="font-mono text-[10px] tracking-[0.22em] text-white/70">PROMETHEUS / PROJECT</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="grid size-8 place-items-center text-white/50 transition-colors duration-300 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative aspect-video overflow-hidden border-b border-white/10 bg-black">
          {thumbnailStyle ? <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center grayscale opacity-30 mix-blend-screen" style={thumbnailStyle} /> : null}
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,.72)_0%,rgba(0,0,0,.1)_55%,rgba(0,0,0,.55))]" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 border border-white/55 bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            <span className="size-1.5 rounded-full bg-current" />
            {statusLabels[project.status]}
          </span>
          {project.status === 'rendering' && typeof project.progress === 'number' ? (
            <span className="absolute bottom-4 left-4 font-mono text-[10px] tracking-[0.18em] text-white/80">{project.progress}%</span>
          ) : null}
        </div>

        <div className="px-4 py-5">
          <h2 className="font-serif text-3xl font-normal leading-none tracking-[-0.04em] text-white">{project.title}</h2>

          {project.description ? (
            <p className="mt-3 text-sm leading-6 text-white/60">{project.description}</p>
          ) : null}

          {project.status === 'rendering' && typeof project.progress === 'number' ? (
            <div className="mt-4">
              <div className="h-px w-full overflow-hidden bg-white/15">
                <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
            <div className="bg-[#0a0a0b] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42"><CalendarDays className="size-3.5" /> Created</p>
              <p className="mt-1.5 text-xs text-white/85">{formatDate(project.createdAt)}</p>
            </div>
            <div className="bg-[#0a0a0b] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42"><Clock3 className="size-3.5" /> Updated</p>
              <p className="mt-1.5 text-xs text-white/85">{formatDate(project.updatedAt)}</p>
            </div>
            <div className="bg-[#0a0a0b] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42"><Film className="size-3.5" /> Resolution</p>
              <p className="mt-1.5 text-xs text-white/85">{resolutionLabel ?? '—'}</p>
            </div>
            <div className="bg-[#0a0a0b] p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42"><Gauge className="size-3.5" /> Duration</p>
              <p className="mt-1.5 text-xs text-white/85">{durationLabel ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDuplicate(project)}
              disabled={isDuplicating}
              className="inline-flex min-h-10 items-center gap-2 border border-white/25 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors duration-300 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDuplicating ? <InlineLoadingAnimation size={12} label="Duplicating project" /> : <Copy className="size-3.5" />}
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDelete(project)}
              disabled={isDeleting}
              className="inline-flex min-h-10 items-center gap-2 border border-white/25 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors duration-300 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? <InlineLoadingAnimation size={12} label="Deleting project" /> : <Trash2 className="size-3.5" />}
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={openInEditor}
            className="inline-flex min-h-10 items-center gap-2 border border-white bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-black transition-colors duration-300 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]"
          >
            Open in editor <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
