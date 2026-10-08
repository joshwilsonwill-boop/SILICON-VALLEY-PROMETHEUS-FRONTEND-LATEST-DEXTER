'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog'
import { CreateProjectModal } from '@/components/projects/create-project-modal'
import { InlineLoadingAnimation, LoadingAnimation } from '@/components/loading-animation'
import { useProjectsList } from '@/hooks/use-projects-list'
import { rememberCurrentPathForEditorReturn } from '@/lib/editor-navigation'
import { getProject, upsertProject } from '@/lib/mock'
import type { ProjectCardStatus, ProjectListItem } from '@/lib/projects/types'
import type { Project } from '@/lib/types'

// Light mode aliases the shared palette; each fallback is the existing dark color.
const PROJECT_THEME = {
  '--project-canvas': 'var(--light-ui-canvas, #09090b)',
  '--project-card': 'var(--light-ui-surface, #000)',
  '--project-option': 'var(--light-ui-surface, #111114)',
  '--project-ink': 'var(--light-ui-text, #fff)',
  '--project-line': 'var(--light-ui-line, #fff)',
  '--project-inverse': 'var(--light-ui-subtle, #fff)',
  '--project-inverse-ink': 'var(--light-ui-text, #000)',
} as React.CSSProperties

type FilterKey = 'all' | ProjectCardStatus
type SortKey = 'updated' | 'created' | 'title'

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All work' },
  { key: 'draft', label: 'In progress' },
  { key: 'rendering', label: 'Rendering' },
  { key: 'completed', label: 'Ready' },
  { key: 'failed', label: 'Needs attention' },
]

const statusCopy: Record<ProjectCardStatus, { label: string }> = {
  draft: { label: 'In progress' },
  rendering: { label: 'Rendering' },
  completed: { label: 'Ready' },
  failed: { label: 'Needs attention' },
}

const movesLetters = Array.from('moves')
const togetherLetters = Array.from('together.')

function compactDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  const difference = Date.now() - date.getTime()
  const hours = Math.floor(difference / 3_600_000)
  if (hours < 1) return 'Updated now'
  if (hours < 24) return `Updated ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Updated ${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function sortProjects(projects: ProjectListItem[], sortKey: SortKey) {
  return [...projects].sort((first, second) => {
    if (sortKey === 'title') return first.title.localeCompare(second.title)
    const firstDate = Date.parse(sortKey === 'updated' ? first.updatedAt : first.createdAt)
    const secondDate = Date.parse(sortKey === 'updated' ? second.updatedAt : second.createdAt)
    return secondDate - firstDate
  })
}

function projectSearchText(project: ProjectListItem) {
  return `${project.title} ${project.description ?? ''} ${project.status}`.toLocaleLowerCase()
}

function ProjectTile({
  project,
  index,
  onOpen,
  onDuplicate,
  onDelete,
  isDuplicating,
  isDeleting,
  isOpening,
}: {
  project: ProjectListItem
  index: number
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
  isDuplicating: boolean
  isDeleting: boolean
  isOpening: boolean
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const status = statusCopy[project.status]
  const thumbnailStyle = project.thumbnailUrl ? { backgroundImage: `url("${project.thumbnailUrl}")` } : undefined

  return (
    <article
      data-ui-surface="project-card"
      onClick={(event) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('button[data-menu-action]')) return
        onOpen()
      }}
      className="group relative aspect-[4/5] min-h-[248px] cursor-pointer overflow-hidden border border-[var(--project-line)]/45 bg-[var(--project-card)] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.92)] transition-[transform,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[var(--project-line)] hover:bg-[var(--project-inverse)] hover:shadow-[0_30px_58px_-28px_rgba(0,0,0,1)] focus-within:border-[var(--project-line)] focus-within:bg-[var(--project-inverse)]"
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="absolute inset-0 z-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--project-line)]"
        aria-label={`Open ${project.title}`}
      />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:28px_28px] transition-opacity duration-500 group-hover:opacity-0 group-focus-within:opacity-0" />
        {thumbnailStyle ? <div className="project-tile-artwork absolute inset-0 bg-cover bg-center grayscale opacity-[0.18] mix-blend-screen transition-[opacity,transform,mix-blend-mode] duration-700 group-hover:scale-105 group-hover:opacity-[0.12] group-hover:mix-blend-multiply group-focus-within:scale-105 group-focus-within:opacity-[0.12] group-focus-within:mix-blend-multiply" style={thumbnailStyle} /> : null}
        <span className="absolute -right-12 -top-10 size-44 rounded-full bg-[var(--project-inverse)]/10 blur-3xl transition-[transform,background-color] duration-700 group-hover:translate-x-6 group-hover:translate-y-5 group-hover:bg-[var(--project-card)]/10 group-focus-within:translate-x-6 group-focus-within:translate-y-5 group-focus-within:bg-[var(--project-card)]/10" />
        <span className="absolute left-5 top-5 font-mono text-[10px] tracking-[0.22em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.7))] transition-colors duration-500 group-hover:text-[color:var(--light-ui-muted,rgba(0,0,0,0.65))] group-focus-within:text-[color:var(--light-ui-muted,rgba(0,0,0,0.65))]">PROMETHEUS / 0{index + 1}</span>
      </div>

      {isOpening ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-[var(--project-card)]/78 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center text-xs text-[color:var(--light-ui-muted,rgba(255,255,255,0.76))]">
            <InlineLoadingAnimation size={46} label={`Opening ${project.title}`} />
            <span>Opening editorial chamber</span>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
        <span className="inline-flex items-center gap-1.5 border border-[var(--project-line)]/55 bg-[var(--project-card)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--project-ink)] transition-[background-color,border-color,color] duration-500 group-hover:border-[var(--project-inverse-ink)] group-hover:bg-[var(--project-card)] group-hover:text-[var(--project-ink)]">
          <span className="size-1.5 rounded-full bg-current" />
          {status.label}
        </span>
        <div className="pointer-events-auto relative">
          <button
            type="button"
            data-menu-action="trigger"
            aria-label={`Project actions for ${project.title}`}
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((open) => !open)
            }}
            className="grid size-9 place-items-center border border-[var(--project-line)]/55 bg-[var(--project-inverse)] text-[var(--project-inverse-ink)] transition-[background-color,border-color,color,transform] duration-300 hover:scale-105 hover:border-[var(--project-inverse-ink)] hover:bg-[var(--project-card)] hover:text-[var(--project-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--project-line)] group-hover:border-[var(--project-inverse-ink)]/60"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen ? (
            <div data-ui-elevation="menu" className="absolute right-0 top-11 z-30 min-w-40 border border-[var(--project-inverse-ink)] bg-[var(--project-inverse)] p-1.5 text-[var(--project-inverse-ink)] shadow-2xl">
              <button
                type="button"
                data-menu-action="duplicate"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onDuplicate()
                }}
                disabled={isDuplicating}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[color:var(--light-ui-muted,rgba(0,0,0,0.75))] transition hover:bg-[var(--project-card)] hover:text-[var(--project-ink)] disabled:opacity-50"
              >
                <Copy className="size-3.5" /> Duplicate
              </button>
              <button
                type="button"
                data-menu-action="delete"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onDelete()
                }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[color:var(--light-ui-muted,rgba(0,0,0,0.75))] transition hover:bg-[var(--project-card)] hover:text-[var(--project-ink)] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="mb-3 h-px w-full bg-[var(--project-inverse)]/45 transition-colors duration-500 group-hover:bg-[var(--project-card)]/45 group-focus-within:bg-[var(--project-card)]/45" />
        <p
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
          className="mb-1 line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--project-ink)] transition-[color,transform] duration-500 group-hover:translate-x-1 group-hover:text-[var(--project-inverse-ink)] group-focus-within:translate-x-1 group-focus-within:text-[var(--project-inverse-ink)]"
        >
          {project.title}
        </p>
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.64))] transition-colors duration-500 group-hover:text-[color:var(--light-ui-muted,rgba(0,0,0,0.65))] group-focus-within:text-[color:var(--light-ui-muted,rgba(0,0,0,0.65))]">
          <span className="truncate">{compactDate(project.updatedAt)}</span>
          <span className="shrink-0">{project.width && project.height ? `${project.width}×${project.height}` : 'Project'}</span>
        </div>
      </div>
    </article>
  )
}

export function ProjectsPageEditorial() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectListItem | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const openingRef = React.useRef(false)
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const [sortKey, setSortKey] = React.useState<SortKey>('updated')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isControlsOpen, setIsControlsOpen] = React.useState(false)
  const [openingProjectId, setOpeningProjectId] = React.useState<string | null>(null)
  const { projects, isLoading, error, refetch, deleteProject, duplicateProject, isDeleting, isDuplicating } = useProjectsList()
  const openingProjectTitle = projects.find((project) => project.id === openingProjectId)?.title ?? 'project'

  const openProject = React.useCallback((project: ProjectListItem) => {
    if (openingRef.current) return
    openingRef.current = true
    setOpeningProjectId(project.id)
    rememberCurrentPathForEditorReturn()
    const now = new Date().toISOString()
    const mappedStatus = (
      project.status === 'completed' ? 'ready' :
      project.status === 'rendering' ? 'processing' :
      'draft'
    ) as Project['status']

    const existing = getProject(project.id)
    const projectRecord: Project = {
      ...(existing || {}),
      id: project.id,
      title: project.title,
      status: mappedStatus,
      createdAt: project.createdAt || existing?.createdAt || now,
      updatedAt: project.updatedAt || existing?.updatedAt || now,
      thumbnailUrl: project.thumbnailUrl ?? existing?.thumbnailUrl ?? undefined,
      sourceAssetId: project.sourceAssetId ?? existing?.sourceAssetId ?? undefined,
      sourceProfile: existing?.sourceProfile ?? undefined,
      editorState: existing?.editorState ?? undefined,
      previewKind: existing?.previewKind ?? 'video',
    }
    upsertProject(projectRecord)
    window.requestAnimationFrame(() => {
      router.push(`/editor/${project.id}`)
    })
  }, [router])

  const visibleProjects = React.useMemo(() => {
    const cleanedQuery = query.trim().toLocaleLowerCase()
    const matching = projects.filter((project) => {
      const matchesFilter = filter === 'all' || project.status === filter
      return matchesFilter && (!cleanedQuery || projectSearchText(project).includes(cleanedQuery))
    })
    return sortProjects(matching, sortKey)
  }, [filter, projects, query, sortKey])

  const countFor = React.useCallback(
    (key: FilterKey) =>
      key === 'all' ? projects.length : projects.filter((project) => project.status === key).length,
    [projects]
  )

  const handleDelete = React.useCallback(async (project: ProjectListItem) => {
    if (isDeleting) return false
    setDeleteError(null)
    try {
      await deleteProject(project.id)
      setDeleteTarget(null)
      toast.success('Project deleted')
      return true
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Could not delete project'
      setDeleteError(message)
      toast.error(message)
      return false
    }
  }, [deleteProject, isDeleting])

  const handleDuplicate = React.useCallback(async (project: ProjectListItem) => {
    try {
      await duplicateProject(project.id)
      toast.success(`Duplicated ${project.title}`)
      return true
    } catch (duplicateError) {
      toast.error(duplicateError instanceof Error ? duplicateError.message : 'Could not duplicate project')
      return false
    }
  }, [duplicateProject])

  return (
    <main style={PROJECT_THEME} aria-busy={isLoading || Boolean(openingProjectId)} className="min-h-dvh overflow-hidden bg-[var(--project-canvas)] text-[var(--project-ink)]">
      <section className="relative isolate overflow-hidden border-b border-[var(--project-line)]/10 px-4 pb-8 pt-5 sm:px-7 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-[var(--project-canvas)]">
          <div className="project-hero-glow absolute -right-20 -top-24 size-[28rem] rounded-full bg-[var(--project-inverse)]/10 blur-[100px]" />
          <div className="project-hero-shade absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,.94)_15%,rgba(0,0,0,.45)_70%,rgba(0,0,0,.78))]" />
          <div className="project-hero-grain absolute inset-0 opacity-35 [background-image:radial-gradient(rgba(255,255,255,.52)_0.6px,transparent_0.6px)] [background-size:5px_5px]" />
        </div>

        <div className="mx-auto max-w-[1540px]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--project-line)]/15 pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.7))]">
            <span className="flex items-center gap-2"><Sparkles className="size-3.5" /> Prometheus studio</span>
            <span>{isLoading ? 'Loading your projects?' : `${projects.length} pieces in motion`}</span>
          </div>

          <div className="flex flex-col justify-between gap-7 pt-8 lg:flex-row lg:items-end lg:pt-12">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.65))]">Your creative room</p>
              <h1 className="max-w-3xl [font-family:var(--font-playfair-display)] text-balance text-[clamp(3.25rem,9vw,8.5rem)] font-semibold leading-[0.78] tracking-[-0.09em]">
                <motion.span
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
                >
                  Make{' '}
                </motion.span>
                <span aria-label="moves" className="font-serif font-normal text-[var(--project-ink)]">
                  {movesLetters.map((letter, index) => (
                    <motion.span
                      aria-hidden="true"
                      className="inline-block origin-bottom"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 28, rotate: 4, skewX: 0 }}
                      animate={{ opacity: 1, y: 0, rotate: 0, skewX: [0, 0, -12, 0], fontStyle: ['normal', 'normal', 'normal', 'italic'] }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 1.35,
                        delay: prefersReducedMotion ? 0 : 0.25 + index * 0.075,
                        times: [0, 0.5, 0.88, 1],
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      key={letter}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
                <br />
                <motion.span
                  aria-label="together."
                  className="inline-flex items-baseline border border-[var(--project-line)]/65 px-[0.08em] text-[color:var(--light-ui-text,#f5f5f2)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.01, delay: prefersReducedMotion ? 0 : 0.8 }}
                >
                  {togetherLetters.map((letter, index) => (
                    <span className="inline-block overflow-hidden" key={`${letter}-${index}`} aria-hidden="true">
                      <motion.span
                        className="inline-block"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: '112%', rotate: 7, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, y: '0%', rotate: 0, filter: 'blur(0px)' }}
                        transition={{
                          duration: prefersReducedMotion ? 0 : 0.54,
                          delay: prefersReducedMotion ? 0 : 0.83 + index * 0.065,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        {letter}
                      </motion.span>
                    </span>
                  ))}
                  {!prefersReducedMotion ? <motion.span aria-hidden="true" className="ml-[0.03em] inline-block h-[0.74em] w-[0.035em] bg-[var(--project-inverse)] align-[-0.02em]" animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 0.72, delay: 1.46, times: [0, 0.15, 0.78, 1] }} /> : null}
                </motion.span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--project-line)] bg-[var(--project-inverse)] px-3 py-1.5 text-xs font-medium text-[var(--project-inverse-ink)]"><span className="size-2 rounded-full bg-[var(--project-card)]/70" /> You</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--project-line)]/55 bg-[var(--project-card)] px-3 py-1.5 text-xs font-medium text-[var(--project-ink)]"><span className="size-2 rounded-full bg-[var(--project-inverse)]/70" /> Prometheus</span>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="ml-1 inline-flex min-h-11 items-center gap-2 border border-[var(--project-line)] bg-[var(--project-inverse)] px-4 text-sm font-semibold text-[var(--project-inverse-ink)] transition duration-200 hover:bg-[var(--project-card)] hover:text-[var(--project-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--project-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--project-card)]"
              >
                <Plus className="size-4" /> New project
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Browse projects" className="mx-auto max-w-[1540px] px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
        <div className="mb-5 flex flex-col gap-3 border-b border-[var(--project-line)]/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:pb-0">
            {filters.map((item) => {
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`shrink-0 border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--project-line)] ${active ? 'border-[var(--project-line)] bg-[var(--project-inverse)] text-[var(--project-inverse-ink)]' : 'border-[var(--project-line)]/15 bg-[var(--project-inverse)]/[0.03] text-[color:var(--light-ui-muted,rgba(255,255,255,0.68))] hover:border-[var(--project-line)]/45 hover:text-[var(--project-ink)]'}`}
                >
                  {item.label} <span className="ml-1.5 font-mono text-[10px] opacity-60">{isLoading ? 'Loading' : `(${countFor(item.key)})`}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--light-ui-muted,rgba(255,255,255,0.42))]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search projects"
                placeholder="Search the room"
                className="h-10 w-full border border-[var(--project-line)]/15 bg-[var(--project-inverse)]/[0.035] pl-9 pr-9 text-sm text-[var(--project-ink)] outline-none transition placeholder:text-[color:var(--light-ui-muted,rgba(255,255,255,0.38))] focus:border-[var(--project-line)]/55 focus:bg-[var(--project-inverse)]/[0.07]"
              />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear project search" className="absolute right-1 top-1 grid size-8 place-items-center text-[color:var(--light-ui-muted,rgba(255,255,255,0.55))] hover:text-[var(--project-ink)]"><X className="size-3.5" /></button> : null}
            </div>
            <button
              type="button"
              onClick={() => setIsControlsOpen((open) => !open)}
              aria-expanded={isControlsOpen}
              className="inline-flex size-10 items-center justify-center border border-[var(--project-line)]/15 text-[color:var(--light-ui-muted,rgba(255,255,255,0.75))] transition hover:border-[var(--project-line)]/50 hover:bg-[var(--project-inverse)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--project-line)] lg:hidden"
              aria-label="Open project sorting controls"
            >
              <SlidersHorizontal className="size-4" />
            </button>
            <label className={`${isControlsOpen ? 'flex' : 'hidden'} items-center gap-2 border border-[var(--project-line)]/15 bg-[var(--project-inverse)]/[0.035] px-3 lg:flex`}>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.13em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.42))] sm:inline">Sort</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-10 min-w-24 appearance-none bg-transparent pr-5 text-xs font-medium text-[var(--project-ink)] outline-none">
                <option value="updated" className="bg-[var(--project-option)]">Latest</option>
                <option value="created" className="bg-[var(--project-option)]">Created</option>
                <option value="title" className="bg-[var(--project-option)]">A–Z</option>
              </select>
              <ChevronDown className="pointer-events-none -ml-7 size-3.5 text-[color:var(--light-ui-muted,rgba(255,255,255,0.55))]" />
            </label>
          </div>
        </div>

        {error ? (
          <div role="alert" className="flex min-h-60 flex-col items-center justify-center border border-[var(--project-line)]/25 bg-[var(--project-inverse)]/[0.04] p-6 text-center">
            <CircleAlert className="mb-3 size-6 text-[color:var(--light-ui-muted,rgba(255,255,255,0.75))]" />
            <p className="font-medium text-[var(--project-ink)]">The project room could not load.</p>
            <p className="mt-1 max-w-md text-sm text-[color:var(--light-ui-muted,rgba(255,255,255,0.55))]">{error}</p>
            <button type="button" onClick={() => void refetch()} className="mt-5 border border-[var(--project-line)]/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-[var(--project-inverse)] hover:text-[var(--project-inverse-ink)]">Try again</button>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-80 items-center justify-center"><InlineLoadingAnimation size={64} label="Loading projects" /></div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : visibleProjects.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-[var(--project-line)]/18 p-6 text-center">
            <Search className="mb-4 size-6 text-[color:var(--light-ui-muted,rgba(255,255,255,0.4))]" />
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Nothing in this cut.</h2>
            <p className="mt-2 text-sm text-[color:var(--light-ui-muted,rgba(255,255,255,0.52))]">Try a different word or return to all work.</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('all') }} className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.7))] hover:text-[var(--project-ink)]">Reset view</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProjects.map((project, index) => (
              <ProjectTile
                key={project.id}
                project={project}
                index={index}
                onOpen={() => openProject(project)}
                onDuplicate={() => void handleDuplicate(project)}
                onDelete={() => { setDeleteError(null); setDeleteTarget(project) }}
                isDuplicating={isDuplicating}
                isDeleting={isDeleting}
                isOpening={openingProjectId === project.id}
              />
            ))}
          </div>
        )}
      </section>
      <DeleteProjectDialog title={deleteTarget?.title ?? null} busy={isDeleting} error={deleteError} onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget) }} />
      <CreateProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {openingProjectId ? <LoadingAnimation message={`Opening ${openingProjectTitle}...`} /> : null}
    </main>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative isolate flex min-h-[420px] overflow-hidden border border-[var(--project-line)]/25 bg-[var(--project-card)] p-6 sm:p-10">
      <div aria-hidden="true" className="absolute -right-12 -top-16 -z-10 size-80 rounded-full bg-[var(--project-inverse)]/10 blur-[90px]" />
      <div className="my-auto max-w-xl">
        <span className="mb-6 grid size-12 place-items-center rounded-full border border-[var(--project-line)]/45 bg-[var(--project-inverse)]/[0.07] text-[var(--project-ink)]"><FolderOpen className="size-5" /></span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.54))]">First cut</p>
        <h2 className="mt-3 text-balance text-4xl font-semibold leading-none tracking-[-0.065em] sm:text-5xl">Start something worth watching.</h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-[color:var(--light-ui-muted,rgba(255,255,255,0.6))]">Give Prometheus an idea and a direction. Your draft opens ready for the first move.</p>
        <button type="button" onClick={onCreate} className="mt-7 inline-flex min-h-11 items-center gap-2 border border-[var(--project-line)] bg-[var(--project-inverse)] px-4 text-sm font-semibold text-[var(--project-inverse-ink)] transition hover:bg-[var(--project-card)] hover:text-[var(--project-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--project-line)]">
          Make a project <ArrowUpRight className="size-4" />
        </button>
      </div>
      <span className="absolute bottom-6 right-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--light-ui-muted,rgba(255,255,255,0.48))]"><Clock3 className="size-3.5" /> Start with a thought</span>
    </div>
  )
}
