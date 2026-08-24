'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Film, X } from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { rememberCurrentPathForEditorReturn } from '@/lib/editor-navigation'
import type { ProjectListItem } from '@/lib/projects/types'
import { cn } from '@/lib/utils'

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

type VideoSourceState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export interface ProjectPreviewDrawerProps {
  project: ProjectListItem | null
  onClose: () => void
}

export function ProjectPreviewDrawer({ project, onClose }: ProjectPreviewDrawerProps) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [source, setSource] = React.useState<VideoSourceState>({ status: 'loading' })

  React.useEffect(() => {
    if (!project) return
    let active = true
    setSource({ status: 'loading' })
    const projectId = project.id

    async function loadVideo() {
      try {
        const response = await fetch(`/api/projects/${projectId}/assets`, { cache: 'no-store' })
        if (!response.ok) {
          setSource({ status: 'empty' })
          return
        }
        const payload = await response.json() as { source?: { url?: string } } | null
        if (!active) return
        if (payload?.source?.url) {
          setSource({ status: 'ready', url: payload.source.url })
        } else {
          setSource({ status: 'empty' })
        }
      } catch {
        if (active) setSource({ status: 'error', message: 'The source video could not be recovered.' })
      }
    }

    void loadVideo()
    return () => {
      active = false
    }
  }, [project])

  const openInEditor = React.useCallback(() => {
    if (!project) return
    rememberCurrentPathForEditorReturn()
    onClose()
    router.push(`/editor/${project.id}`)
  }, [onClose, project, router])

  const durationLabel = formatDuration(project?.duration ?? null)
  const resolutionLabel = project?.width && project?.height ? `${project.width}×${project.height}` : null

  return (
    <AnimatePresence>
      {project ? (
        <>
          <motion.div
            key="project-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="project-preview-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${project.title}`}
            initial={prefersReducedMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={prefersReducedMotion ? undefined : { x: '100%' }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.44, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[121] flex w-full max-w-[36rem] flex-col overflow-hidden border-l border-white/10 bg-[#0a0a0b] text-white shadow-[-40px_0_120px_-40px_rgba(0,0,0,0.98)]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Prometheus / Project
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close project preview"
                className="grid size-8 place-items-center text-white/50 transition-colors duration-300 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="relative aspect-video shrink-0 overflow-hidden border-b border-white/10 bg-black">
              {source.status === 'ready' ? (
                <video
                  key={source.url}
                  src={source.url}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(100deg,rgba(0,0,0,.9)_0%,rgba(0,0,0,.55)_55%,rgba(0,0,0,.75))]">
                  {source.status === 'loading' ? (
                    <>
                      <InlineLoadingAnimation size={40} label="Loading source video" />
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">Recovering source</p>
                    </>
                  ) : source.status === 'error' ? (
                    <>
                      <Film className="size-6 text-white/30" aria-hidden="true" />
                      <p className="max-w-xs text-center text-xs text-white/50">{source.message}</p>
                    </>
                  ) : (
                    <>
                      <Film className="size-6 text-white/30" aria-hidden="true" />
                      <p className="max-w-xs text-center text-xs text-white/50">No source video has been attached to this project yet.</p>
                    </>
                  )}
                </div>
              )}
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 border border-white/55 bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                <span className="size-1.5 rounded-full bg-current" />
                {statusLabels[project.status]}
              </span>
              {project.status === 'rendering' && typeof project.progress === 'number' ? (
                <span className="absolute bottom-4 left-4 font-mono text-[10px] tracking-[0.18em] text-white/80">
                  {project.progress}%
                </span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/38">Piece in motion</p>
              <h2 className="mt-2 font-serif text-3xl font-normal leading-none tracking-[-0.04em] text-white sm:text-4xl">
                {project.title}
              </h2>

              {project.description ? (
                <p className="mt-4 text-sm leading-6 text-white/58">{project.description}</p>
              ) : null}

              <div className="mt-6 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
                <div className="bg-[#0a0a0b] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Created</p>
                  <p className="mt-1.5 text-xs text-white/85">{formatDate(project.createdAt)}</p>
                </div>
                <div className="bg-[#0a0a0b] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Updated</p>
                  <p className="mt-1.5 text-xs text-white/85">{formatDate(project.updatedAt)}</p>
                </div>
                <div className="bg-[#0a0a0b] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Format</p>
                  <p className="mt-1.5 text-xs text-white/85">{resolutionLabel ?? '—'}</p>
                </div>
                <div className="bg-[#0a0a0b] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Length</p>
                  <p className="mt-1.5 text-xs text-white/85">{durationLabel ?? '—'}</p>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
              <p className={cn('max-w-[12rem] text-[10px] uppercase tracking-[0.16em] text-white/35')}>
                {project.status === 'rendering' ? 'Render in progress' : 'Everything stays yours'}
              </p>
              <button
                type="button"
                onClick={openInEditor}
                className="inline-flex min-h-11 items-center gap-2 border border-white bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-black transition-colors duration-300 hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b]"
              >
                Open in editor <ArrowUpRight className="size-3.5" />
              </button>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
