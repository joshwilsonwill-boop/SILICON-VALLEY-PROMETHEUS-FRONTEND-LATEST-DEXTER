'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, Clock3, Copy, Film, Gauge, Link2, MoreHorizontal, Trash2 } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import type { ProjectListItem } from '@/lib/projects/types'
import { cn } from '@/lib/utils'

export interface ProjectCardProps {
  project: ProjectListItem
  featured?: boolean
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

export function ProjectCard({ project, featured = false, onEdit, onDuplicate, onDelete, onShare }: ProjectCardProps) {
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
    <article className="group relative overflow-visible border-t border-white/[0.16] bg-transparent pt-3 transition-colors duration-300 hover:border-[#d3ad75]/80 focus-within:border-[#d3ad75]/80 max-lg:bg-white/[0.02] max-lg:p-4">
      <button
        type="button"
        aria-label={`Open ${project.title}`}
        onClick={() => onEdit(project.id)}
        className={cn(
          'relative block w-full overflow-hidden bg-[#151515] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3ad75] max-lg:border max-lg:border-white/5',
          featured ? 'aspect-[16/9]' : 'aspect-[4/3]',
        )}
      >
        {project.thumbnailUrl && !thumbnailFailed ? (
          // R2/public thumbnails can be external or blob/data URLs, so next/image is not guaranteed to fit.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt={`${project.title} thumbnail`}
            className="h-full w-full object-cover opacity-75 grayscale-[18%] transition-[opacity,filter] duration-500 group-hover:opacity-100 group-hover:grayscale-0"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 42%, rgba(0, 0, 0, 0.12) 100%)',
            }}
          >
            <div className="grid h-16 w-16 place-items-center border border-white/10 bg-black/18 text-lg font-semibold tracking-[0.14em] text-white/78">
              {initialsFromTitle(project.title)}
            </div>
            <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 max-lg:flex" aria-hidden="true">
              <span className="text-2xl font-bold text-gray-600">{project.title.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/72 backdrop-blur-md max-lg:hidden">
          <Film className="size-3.5" />
          {resolutionLabel ?? 'Source'}
        </div>
        <div className="absolute left-3 top-3 hidden border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-md max-lg:block">
          {resolutionLabel ?? 'Source'}
        </div>
      </button>

      <div className="py-4 max-lg:px-0 max-lg:pb-0 max-lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              aria-label={`Open ${project.title}`}
              onClick={() => onEdit(project.id)}
              className={cn(
                'block max-w-full truncate text-left [font-family:var(--font-migra)] font-extrabold leading-[0.9] text-[#f2f0eb] transition-colors hover:text-[#d3ad75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3ad75]',
                featured ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl',
              )}
            >
              {project.title}
            </button>
            {project.description ? (
              <p className="mt-2 truncate [font-family:var(--font-playfair-display)] text-base italic text-white/55 max-lg:line-clamp-2 max-lg:whitespace-normal">{project.description}</p>
            ) : null}
          </div>
          <div
            role={project.status === 'rendering' ? 'status' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] max-lg:hidden',
              badgeClass(project.status),
            )}
          >
            {project.status === 'rendering' ? (
              <InlineLoadingAnimation size={12} label={`Rendering ${project.title}`} />
            ) : null}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-b border-white/[0.09] pb-4 text-[11px] text-white/44 max-lg:flex max-lg:flex-wrap max-lg:gap-x-3 max-lg:gap-y-1 sm:grid-cols-3">
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
          <span className="hidden items-center gap-1.5 capitalize max-lg:flex">
            <span className="size-1.5 rounded-full bg-white/45" aria-hidden="true" />
            {project.status}
          </span>
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

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onEdit(project.id)}
            className="inline-flex min-h-10 items-center gap-2 px-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-[#d3ad75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3ad75] max-lg:min-h-11 max-lg:flex-1 max-lg:justify-center max-lg:px-4 max-lg:py-2"
          >
            Open project
            <ArrowUpRight className="size-3.5" />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={`Project actions for ${project.title}`}
              aria-expanded={actionMenuOpen}
              onClick={() => setActionMenuOpen((open) => !open)}
              className="grid size-10 place-items-center border border-white/10 bg-white/[0.03] text-white/64 transition-colors hover:border-[#d3ad75]/70 hover:text-[#d3ad75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d3ad75] max-lg:size-11"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {actionMenuOpen ? (
              <div className="absolute bottom-12 right-0 z-30 w-48 overflow-hidden rounded-md border border-white/10 bg-[#111111]/96 p-1 shadow-[0_22px_70px_-44px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(false)
                      action.onClick()
                    }}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-xs font-medium text-white/68 transition-colors hover:bg-white/[0.07] hover:text-white',
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
