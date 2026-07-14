'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Clapperboard, FolderOpen, Plus, Search, Globe, FileEdit, CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

import { CreateProjectModal } from '@/components/projects/create-project-modal'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { ProjectCard } from '@/components/projects/project-card'
import { MenuBar } from '@/components/ui/bottom-menu'
import { Button } from '@/components/ui/button'
import { LiquidChromeButton } from '@/components/ui/liquid-chrome-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PrometheusShell } from '@/components/prometheus-shell'
import { useProjectsList } from '@/hooks/use-projects-list'
import type { ProjectListItem } from '@/lib/projects/types'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'draft' | 'rendering' | 'completed' | 'failed'
type SortKey = 'updated' | 'created' | 'name' | 'progress'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'updated', label: 'Last edited' },
  { value: 'created', label: 'Created' },
  { value: 'name', label: 'Name' },
  { value: 'progress', label: 'Progress' },
]

const FILTER_OPTIONS: StatusFilter[] = ['all', 'draft', 'rendering', 'completed', 'failed']

function sortProjects(projects: ProjectListItem[], sortKey: SortKey) {
  return [...projects].sort((a, b) => {
    if (sortKey === 'name') return a.title.localeCompare(b.title)
    if (sortKey === 'created') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    if (sortKey === 'progress') return (b.progress ?? 0) - (a.progress ?? 0)
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  })
}

export function ProjectsPageV2() {
  const router = useRouter()
  const {
    projects,
    isLoading,
    error,
    refetch,
    deleteProject,
    isDeleting,
    duplicateProject,
    isDuplicating,
  } = useProjectsList()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectListItem | null>(null)
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [sortKey, setSortKey] = React.useState<SortKey>('updated')

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300)
    return () => window.clearTimeout(timeoutId)
  }, [query])

  const filteredProjects = React.useMemo(() => {
    const matching = projects.filter((project) => {
      const matchesQuery =
        !debouncedQuery ||
        project.title.toLowerCase().includes(debouncedQuery) ||
        project.description?.toLowerCase().includes(debouncedQuery)
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesQuery && matchesStatus
    })

    return sortProjects(matching, sortKey)
  }, [debouncedQuery, projects, sortKey, statusFilter])

  const filterCounts = React.useMemo(() => {
    return FILTER_OPTIONS.reduce<Record<StatusFilter, number>>((acc, filter) => {
      acc[filter] = filter === 'all' ? projects.length : projects.filter((project) => project.status === filter).length
      return acc
    }, { all: 0, draft: 0, rendering: 0, completed: 0, failed: 0 })
  }, [projects])

  const subtitle =
    projects.length > 0 ? `${projects.length} project${projects.length === 1 ? '' : 's'}` : 'Your creative workspace'

  async function handleDuplicate(id: string) {
    try {
      await duplicateProject(id)
      toast.success('Project duplicated')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to duplicate.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    try {
      await deleteProject(deleteTarget.id)
      toast.success('Project deleted')
      setDeleteTarget(null)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to delete. Please try again.')
    }
  }

  async function handleShare(id: string) {
    const shareUrl = `${window.location.origin}/p/${id}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard')
        return
      }
      throw new Error('Clipboard unavailable')
    } catch {
      toast.info(`Copy failed. URL: ${shareUrl}`)
    }
  }

  return (
    <PrometheusShell>
      <div className="min-h-full px-4 py-6 text-white max-lg:overflow-x-hidden md:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 border-b border-white/10 pb-6 max-lg:items-stretch md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Projects</h1>
              <p className="mt-2 text-sm text-white/48">{subtitle}</p>
            </div>
            <LiquidChromeButton
              type="button"
              variant="secondary"
              size="md"
              liquid={false}
              magnetic
              ripple
              containerClassName="max-lg:flex max-lg:w-full"
              className="min-h-12 border-white/14 bg-white/[0.08] px-5 text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.8)] hover:border-white/22 hover:bg-white/[0.14] max-lg:min-h-11 max-lg:w-full max-lg:justify-center"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Project
            </LiquidChromeButton>
          </header>

          <div className="mt-6 flex justify-center max-lg:-mx-4 max-lg:overflow-x-auto max-lg:px-4">
            <MenuBar
              className="max-lg:min-w-max max-lg:justify-start"
              activeValue={statusFilter}
              onItemClick={(value) => setStatusFilter(value as StatusFilter)}
              touchOptimized
              items={[
                { label: 'All', icon: Globe, value: 'all' },
                { label: 'Draft', icon: FileEdit, value: 'draft' },
                { label: 'Rendering', icon: Clapperboard, value: 'rendering' },
                { label: 'Completed', icon: CheckCircle, value: 'completed' },
                { label: 'Failed', icon: XCircle, value: 'failed' },
              ]}
            />
          </div>

          <div className="mt-6">
            {error ? (
              <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Unable to load projects.</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                  <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-[28rem] items-center justify-center">
                <InlineLoadingAnimation size={72} label="Loading projects" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-center">
                <Clapperboard className="h-20 w-20 text-white/20" />
                <h2 className="mt-5 text-2xl font-semibold text-white">No projects yet</h2>
                <p className="mt-2 text-sm text-white/52">
                  Create your first project to start producing premium content.
                </p>
                <Button type="button" className="mt-6 bg-white text-black hover:bg-white/90" onClick={() => setCreateOpen(true)}>
                  Create new project
                </Button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-center">
                <FolderOpen className="h-16 w-16 text-white/20" />
                <h2 className="mt-4 text-xl font-semibold text-white">No projects match &quot;{query}&quot;</h2>
                <p className="mt-2 text-sm text-white/52">Try another name or clear the active filters.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => {
                    setQuery('')
                    setStatusFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <motion.div layout className="grid gap-4 max-lg:!grid-cols-1 max-lg:w-full md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <motion.div key={project.id} layout className="max-lg:min-w-0">
                    <ProjectCard
                      project={project}
                      onEdit={(id) => router.push(`/editor/${id}`)}
                      onDuplicate={handleDuplicate}
                      onDelete={(id) => {
                        const target = projects.find((project) => project.id === id) ?? null
                        setDeleteTarget(target)
                      }}
                      onShare={handleShare}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md border-white/10 bg-[#0a0a0d] text-white">
          <DialogHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/20 bg-rose-300/[0.08] text-rose-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete &quot;{deleteTarget?.title ?? 'Project'}&quot;?</DialogTitle>
            <DialogDescription className="text-white/50">
              This will permanently delete the project and all associated segments, renders, and exports. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || isDeleting}
              onClick={() => void handleDeleteConfirm()}
            >
              {isDeleting ? <InlineLoadingAnimation size={16} label="Deleting project" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PrometheusShell>
  )
}
