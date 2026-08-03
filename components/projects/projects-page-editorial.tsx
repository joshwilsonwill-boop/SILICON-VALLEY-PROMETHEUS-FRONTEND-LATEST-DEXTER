'use client'

import * as React from 'react'
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

import { CreateProjectModal } from '@/components/projects/create-project-modal'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { useProjectsList } from '@/hooks/use-projects-list'
import type { ProjectCardStatus, ProjectListItem } from '@/lib/projects/types'

type FilterKey = 'all' | ProjectCardStatus
type SortKey = 'updated' | 'created' | 'title'

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All work' },
  { key: 'draft', label: 'In progress' },
  { key: 'rendering', label: 'Rendering' },
  { key: 'completed', label: 'Ready' },
  { key: 'failed', label: 'Needs attention' },
]

const statusCopy: Record<ProjectCardStatus, { label: string; tone: string }> = {
  draft: { label: 'In progress', tone: 'bg-amber-300 text-black' },
  rendering: { label: 'Rendering', tone: 'bg-sky-300 text-black' },
  completed: { label: 'Ready', tone: 'bg-emerald-300 text-black' },
  failed: { label: 'Needs attention', tone: 'bg-rose-300 text-black' },
}

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
}: {
  project: ProjectListItem
  index: number
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
  isDuplicating: boolean
  isDeleting: boolean
}) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const status = statusCopy[project.status]
  const background = project.thumbnailUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(8,8,10,0.05) 10%, rgba(8,8,10,0.82) 100%), url("${project.thumbnailUrl}")` }
    : undefined
  const colourways = [
    'from-[#2a0507] via-[#991e0e] to-[#07151d]',
    'from-[#110b2a] via-[#244a91] to-[#0a0f11]',
    'from-[#132011] via-[#a34513] to-[#1d0b08]',
    'from-[#051a1d] via-[#087d78] to-[#0d0d12]',
    'from-[#2b101d] via-[#7b2c72] to-[#13151b]',
  ]

  return (
    <article
      className="group relative aspect-[4/5] min-h-[248px] overflow-hidden border border-white/10 bg-[#111114] shadow-[0_18px_45px_-28px_rgba(0,0,0,0.92)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_30px_58px_-28px_rgba(0,0,0,1)] focus-within:border-white/50"
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d5c0ff]"
        aria-label={`Open ${project.title}`}
      />

      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${colourways[index % colourways.length]} bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.035]`}
        style={background}
      >
        {!project.thumbnailUrl ? (
          <>
            <span className="absolute -right-12 -top-10 size-44 rounded-full bg-cyan-300/35 blur-3xl" />
            <span className="absolute -bottom-10 -left-8 size-40 rounded-full bg-orange-500/40 blur-3xl" />
            <span className="absolute left-5 top-5 font-mono text-[10px] tracking-[0.22em] text-white/70">PROMETHEUS / 0{index + 1}</span>
          </>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${status.tone}`}>
          <span className="size-1.5 rounded-full bg-current" />
          {status.label}
        </span>
        <div className="pointer-events-auto relative">
          <button
            type="button"
            aria-label={`Project actions for ${project.title}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid size-9 place-items-center border border-white/15 bg-black/35 text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-30 min-w-40 border border-white/15 bg-[#101014] p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDuplicate() }}
                disabled={isDuplicating}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/82 transition hover:bg-white/10 disabled:opacity-50"
              >
                <Copy className="size-3.5" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete() }}
                disabled={isDeleting}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="mb-3 h-px w-full bg-white/25" />
        <p className="mb-1 line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-0.04em] text-white">{project.title}</p>
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/64">
          <span className="truncate">{compactDate(project.updatedAt)}</span>
          <span className="shrink-0">{project.width && project.height ? `${project.width}×${project.height}` : 'Project'}</span>
        </div>
      </div>
    </article>
  )
}

export function ProjectsPageEditorial() {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const [sortKey, setSortKey] = React.useState<SortKey>('updated')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isControlsOpen, setIsControlsOpen] = React.useState(false)
  const { projects, isLoading, error, refetch, deleteProject, duplicateProject, isDeleting, isDuplicating } = useProjectsList()

  const visibleProjects = React.useMemo(() => {
    const cleanedQuery = query.trim().toLocaleLowerCase()
    const matching = projects.filter((project) => {
      const matchesFilter = filter === 'all' || project.status === filter
      return matchesFilter && (!cleanedQuery || projectSearchText(project).includes(cleanedQuery))
    })
    return sortProjects(matching, sortKey)
  }, [filter, projects, query, sortKey])

  const countFor = React.useCallback((key: FilterKey) => key === 'all' ? projects.length : projects.filter((project) => project.status === key).length, [projects])

  const handleDelete = React.useCallback(async (project: ProjectListItem) => {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) return
    try {
      await deleteProject(project.id)
      toast.success('Project deleted')
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Could not delete project')
    }
  }, [deleteProject])

  const handleDuplicate = React.useCallback(async (project: ProjectListItem) => {
    try {
      await duplicateProject(project.id)
      toast.success(`Duplicated ${project.title}`)
    } catch (duplicateError) {
      toast.error(duplicateError instanceof Error ? duplicateError.message : 'Could not duplicate project')
    }
  }, [duplicateProject])

  return (
    <main className="min-h-dvh overflow-hidden bg-[#09090b] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10 px-4 pb-8 pt-5 sm:px-7 lg:px-10">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-[#09090b]">
          <div className="absolute -right-20 -top-24 size-[28rem] rounded-full bg-[#f14a1e]/50 blur-[100px]" />
          <div className="absolute right-[8%] top-[-10%] size-[25rem] rounded-full bg-[#37bde8]/40 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,.88)_15%,rgba(0,0,0,.25)_70%,rgba(0,0,0,.65))]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.45)_0.6px,transparent_0.6px)] [background-size:5px_5px]" />
        </div>

        <div className="mx-auto max-w-[1540px]">
          <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <span className="flex items-center gap-2"><Sparkles className="size-3.5 text-[#f0b96e]" /> Prometheus studio</span>
            <span>{projects.length.toString().padStart(2, '0')} pieces in motion</span>
          </div>

          <div className="flex flex-col justify-between gap-7 pt-8 lg:flex-row lg:items-end lg:pt-12">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Your creative room</p>
              <h1 className="max-w-3xl text-balance text-[clamp(3.25rem,9vw,8.5rem)] font-semibold leading-[0.78] tracking-[-0.09em]">
                Make <span className="font-serif font-normal italic text-[#ffceb2]">moves</span><br />
                <span className="inline-flex items-center border border-[#b9d8ff]/70 px-[0.08em] text-[#f5f5f2] shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]">together.</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ef6135] px-3 py-1.5 text-xs font-medium text-black"><span className="size-2 rounded-full bg-black/70" /> You</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#415cf4] px-3 py-1.5 text-xs font-medium text-white"><span className="size-2 rounded-full bg-white/70" /> Prometheus</span>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="ml-1 inline-flex min-h-11 items-center gap-2 bg-white px-4 text-sm font-semibold text-black transition duration-200 hover:bg-[#ffceb2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Plus className="size-4" /> New project
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Browse projects" className="mx-auto max-w-[1540px] px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
        <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:pb-0">
            {filters.map((item) => {
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`shrink-0 border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.03] text-white/68 hover:border-white/45 hover:text-white'}`}
                >
                  {item.label} <span className="ml-1.5 font-mono text-[10px] opacity-60">{countFor(item.key).toString().padStart(2, '0')}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/42" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search projects"
                placeholder="Search the room"
                className="h-10 w-full border border-white/15 bg-white/[0.035] pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-white/55 focus:bg-white/[0.07]"
              />
              {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear project search" className="absolute right-1 top-1 grid size-8 place-items-center text-white/55 hover:text-white"><X className="size-3.5" /></button> : null}
            </div>
            <button
              type="button"
              onClick={() => setIsControlsOpen((open) => !open)}
              aria-expanded={isControlsOpen}
              className="inline-flex size-10 items-center justify-center border border-white/15 text-white/75 transition hover:border-white/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
              aria-label="Open project sorting controls"
            >
              <SlidersHorizontal className="size-4" />
            </button>
            <label className={`${isControlsOpen ? 'flex' : 'hidden'} items-center gap-2 border border-white/15 bg-white/[0.035] px-3 lg:flex`}>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.13em] text-white/42 sm:inline">Sort</span>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-10 min-w-24 appearance-none bg-transparent pr-5 text-xs font-medium text-white outline-none">
                <option value="updated" className="bg-[#111114]">Latest</option>
                <option value="created" className="bg-[#111114]">Created</option>
                <option value="title" className="bg-[#111114]">A–Z</option>
              </select>
              <ChevronDown className="pointer-events-none -ml-7 size-3.5 text-white/55" />
            </label>
          </div>
        </div>

        {error ? (
          <div role="alert" className="flex min-h-60 flex-col items-center justify-center border border-rose-300/25 bg-rose-300/[0.04] p-6 text-center">
            <CircleAlert className="mb-3 size-6 text-rose-200" />
            <p className="font-medium text-white">The project room could not load.</p>
            <p className="mt-1 max-w-md text-sm text-white/55">{error}</p>
            <button type="button" onClick={() => void refetch()} className="mt-5 border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-white hover:text-black">Try again</button>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-80 items-center justify-center"><InlineLoadingAnimation size={64} label="Loading projects" /></div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setIsCreateOpen(true)} />
        ) : visibleProjects.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-white/18 p-6 text-center">
            <Search className="mb-4 size-6 text-white/40" />
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">Nothing in this cut.</h2>
            <p className="mt-2 text-sm text-white/52">Try a different word or return to all work.</p>
            <button type="button" onClick={() => { setQuery(''); setFilter('all') }} className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffceb2] hover:text-white">Reset view</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProjects.map((project, index) => (
              <ProjectTile
                key={project.id}
                project={project}
                index={index}
                onOpen={() => router.push(`/editor/${project.id}`)}
                onDuplicate={() => void handleDuplicate(project)}
                onDelete={() => void handleDelete(project)}
                isDuplicating={isDuplicating}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </section>
      <CreateProjectModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </main>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative isolate flex min-h-[420px] overflow-hidden border border-white/12 bg-[#101014] p-6 sm:p-10">
      <div aria-hidden="true" className="absolute -right-12 -top-16 -z-10 size-80 rounded-full bg-[#e74c1c]/35 blur-[90px]" />
      <div className="my-auto max-w-xl">
        <span className="mb-6 grid size-12 place-items-center rounded-full border border-white/20 bg-white/[0.07] text-[#ffceb2]"><FolderOpen className="size-5" /></span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/54">First cut</p>
        <h2 className="mt-3 text-balance text-4xl font-semibold leading-none tracking-[-0.065em] sm:text-5xl">Start something worth watching.</h2>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/60">Give Prometheus an idea and a direction. Your draft opens ready for the first move.</p>
        <button type="button" onClick={onCreate} className="mt-7 inline-flex min-h-11 items-center gap-2 bg-white px-4 text-sm font-semibold text-black transition hover:bg-[#ffceb2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          Make a project <ArrowUpRight className="size-4" />
        </button>
      </div>
      <span className="absolute bottom-6 right-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/48"><Clock3 className="size-3.5" /> Start with a thought</span>
    </div>
  )
}
