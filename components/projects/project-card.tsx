'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Clock3, Copy, Film, Gauge, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import type { ProjectListItem } from '@/lib/projects/types'
import { cn } from '@/lib/utils'

export interface ProjectCardProps {
  project: ProjectListItem
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onShare: (id: string) => void
}

function formatDuration(duration: number | null) {
  if (!duration || duration <= 0) return null
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function initialsFromTitle(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('') || 'PR'
}

function badgeClass(status: ProjectListItem['status']) {
  switch (status) {
    case 'rendering':
      return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-200'
    case 'completed':
      return 'border-emerald-300/16 bg-emerald-300/[0.08] text-emerald-200'
    case 'failed':
      return 'border-red-300/18 bg-red-300/[0.08] text-red-200'
    default:
      return 'border-white/10 bg-white/[0.055] text-white/56'
  }
}

export function ProjectCard({ project, onEdit, onDuplicate, onDelete, onShare }: ProjectCardProps) {
  const [thumbnailFailed, setThumbnailFailed] = React.useState(false)
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false)
  const durationLabel = formatDuration(project.duration)
  const resolutionLabel =
    project.width && project.height ? `${project.width}x${project.height}` : null
  const lastEdited = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })

  const actions = [
    { label: 'Duplicate project', icon: Copy, onClick: () => onDuplicate(project.id) },
    { label: 'Share project', icon: Link2, onClick: () => onShare(project.id) },
    { label: 'Delete project', icon: Trash2, onClick: () => onDelete(project.id), danger: true },
  ]

  return (
    <article className="group relative overflow-visible rounded-[18px] border border-white/[0.09] bg-[#0d0d13] shadow-[0_24px_70px_-56px_rgba(0,0,0,0.95)] transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#11121a] hover:shadow-[0_30px_90px_-62px_rgba(0,0,0,0.98)] focus-within:border-white/[0.18]">
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.14]" aria-hidden="true" />

      <button
        type="button"
        aria-label={`Open ${project.title}`}
        onClick={() => onEdit(project.id)}
        className="relative block aspect-video w-full overflow-hidden rounded-t-[17px] bg-[#151622] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/28"
      >
        {project.thumbnailUrl && !thumbnailFailed ? (
          // R2/public thumbnails can be external or blob/data URLs, so next/image is not guaranteed to fit.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt={`${project.title} thumbnail`}
            className="h-full w-full object-cover opacity-90 transition-[opacity,filter] duration-200 group-hover:opacity-100"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 42%, rgba(0, 0, 0, 0.12) 100%)',
            }}
          >
            <div className="grid h-16 w-16 place-items-center rounded-[10px] border border-white/10 bg-black/18 text-lg font-semibold tracking-[0.14em] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {initialsFromTitle(project.title)}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/62 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/44 px-2.5 py-1 text-[11px] font-medium text-white/72 backdrop-blur-md">
          <Film className="size-3.5" />
          {resolutionLabel ?? 'Source'}
        </div>
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              aria-label={`Open ${project.title}`}
              onClick={() => onEdit(project.id)}
              className="block max-w-full truncate text-left text-base font-semibold leading-6 text-white transition-colors hover:text-white/86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/24"
            >
              {project.title}
            </button>
            {project.description ? (
              <p className="mt-1 truncate text-sm text-white/50">{project.description}</p>
            ) : null}
          </div>
          <div
            role={project.status === 'rendering' ? 'status' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              badgeClass(project.status),
            )}
          >
            {project.status === 'rendering' ? (
              <InlineLoadingAnimation size={12} label={`Rendering ${project.title}`} />
            ) : null}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/44 sm:grid-cols-3">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <Clock3 className="size-3.5 shrink-0 text-white/28" />
            <span className="truncate">{lastEdited}</span>
          </span>
          {durationLabel ? (
            <span className="flex items-center gap-1.5">
              <Film className="size-3.5 shrink-0 text-white/28" />
              {durationLabel}
            </span>
          ) : null}
          {project.fps ? (
            <span className="flex items-center gap-1.5">
              <Gauge className="size-3.5 shrink-0 text-white/28" />
              {project.fps}fps
            </span>
          ) : null}
        </div>

        {project.status === 'rendering' ? (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-white/46">
              <span>Rendering</span>
              <span>{project.progress ?? 0}%</span>
            </div>
            <div className="flex justify-center py-2">
              <InlineLoadingAnimation size={32} label={`Rendering ${project.title}`} />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <button
            type="button"
            onClick={() => onEdit(project.id)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs font-semibold text-white/78 transition-colors hover:border-white/18 hover:bg-white/[0.085] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/24"
          >
            <Pencil className="size-3.5" />
            Open
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={`Project actions for ${project.title}`}
              aria-expanded={actionMenuOpen}
              onClick={() => setActionMenuOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/64 transition-colors hover:border-white/18 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/24"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {actionMenuOpen ? (
              <div className="absolute bottom-12 right-0 z-30 w-48 overflow-hidden rounded-[12px] border border-white/10 bg-[#111218]/96 p-1 shadow-[0_22px_70px_-44px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false)
                      action.onClick()
                    }}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-2 rounded-[9px] px-3 text-left text-xs font-medium text-white/68 transition-colors hover:bg-white/[0.07] hover:text-white',
                      action.danger && 'hover:bg-red-500/[0.1] hover:text-red-100',
                    )}
                  >
                    <action.icon className="size-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
