'use client'

import * as React from 'react'
import { CheckCircle2, Sparkles, Undo2, Redo2 } from 'lucide-react'
import { WorkspaceNavBar, type WorkspaceNavItem } from '@/components/ui/anime-navbar'
import { CinematicExportCluster } from '@/components/editor/cinematic-export-cluster'
import { cn } from '@/lib/utils'
import type { Project, ProcessingJob, ProjectExport, HeaderNavMode } from '@/lib/types'
import { toast } from 'sonner'

export interface EditorHeaderProps {
  project: Project | null
  job: ProcessingJob | null
  saveStatus: 'saved' | 'saving' | 'error'
  progressPercent: number
  isEditingTitle: boolean
  tempTitle: string
  setTempTitle: (title: string) => void
  titleInputRef: React.RefObject<HTMLInputElement | null>
  activeWorkspaceTab: HeaderNavMode
  isDeferredChromeReady: boolean
  isExporting: boolean
  isDownloading: boolean
  latestExport: ProjectExport | null
  hasSourceAsset: boolean
  headerNavItems: WorkspaceNavItem[]
  onTitleSave: () => void
  onTitleKeyDown: (e: React.KeyboardEvent) => void
  onTitleStartEdit: () => void
  onWorkspaceTabChange: (name: string) => void
  onPrepareExport: () => void
  onDownload: () => void
}

export function EditorHeader({
  project,
  job,
  saveStatus,
  progressPercent,
  isEditingTitle,
  tempTitle,
  setTempTitle,
  titleInputRef,
  activeWorkspaceTab,
  isDeferredChromeReady,
  isExporting,
  isDownloading,
  latestExport,
  hasSourceAsset,
  headerNavItems,
  onTitleSave,
  onTitleKeyDown,
  onTitleStartEdit,
  onWorkspaceTabChange,
  onPrepareExport,
  onDownload,
}: EditorHeaderProps) {
  const handleUndo = () => {
    toast.info('Undo triggered', {
      description: 'Undo functionality will be available soon.',
    })
  }

  const handleRedo = () => {
    toast.info('Redo triggered', {
      description: 'Redo functionality will be available soon.',
    })
  }

  return (
    <header className="sticky top-0 z-[100] h-14 shrink-0 overflow-visible border-b border-white/8 bg-black/86 backdrop-blur-2xl">
      <div className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-between px-4 lg:px-6">
        {/* Left: Project Info */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={onTitleSave}
                  onKeyDown={onTitleKeyDown}
                  className="bg-transparent text-sm font-medium text-white outline-none"
                  autoFocus
                />
              ) : (
                <h1
                  className="cursor-pointer text-sm font-medium text-white transition-opacity hover:opacity-70"
                  onClick={onTitleStartEdit}
                >
                  {project?.title ?? 'Untitled Project'}
                </h1>
              )}
              
              <div
                className={cn(
                  'flex items-center gap-1.5 text-[10px] uppercase tracking-widest',
                  saveStatus === 'saving' ? 'text-accent-blue animate-pulse' : 'text-white/20'
                )}
              >
                {saveStatus === 'saving' ? (
                  <Sparkles className="size-3" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                {saveStatus === 'saving' ? 'Saving' : 'Saved'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: one hover-revealed command island */}
        <div className="group/editor-command absolute left-1/2 flex -translate-x-1/2 items-center overflow-visible rounded-full border border-white/10 bg-black/58 p-1 shadow-[0_22px_58px_-36px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-[border-color,box-shadow] duration-300 hover:border-white/18 hover:shadow-[0_28px_72px_-40px_rgba(0,0,0,1),0_0_34px_-28px_rgba(135,160,255,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div className="flex w-0 items-center gap-1 overflow-hidden opacity-0 transition-[width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/editor-command:mr-1 group-hover/editor-command:w-[5.25rem] group-hover/editor-command:opacity-100">
            <button
              onClick={handleUndo}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/32 transition-colors hover:bg-white/7 hover:text-white"
              title="Undo (Cmd+Z)"
              aria-label="Undo"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              onClick={handleRedo}
              className="grid size-8 shrink-0 place-items-center rounded-full text-white/32 transition-colors hover:bg-white/7 hover:text-white"
              title="Redo (Cmd+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 className="size-4" />
            </button>
          </div>

          <WorkspaceNavBar
            items={headerNavItems}
            defaultActive={activeWorkspaceTab}
            activeItem={activeWorkspaceTab}
            onChange={onWorkspaceTabChange}
            className="h-10"
          />

          <div className="ml-0 flex w-0 items-center overflow-hidden opacity-0 transition-[width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/editor-command:ml-1 group-hover/editor-command:w-[13.75rem] group-hover/editor-command:opacity-100">
            {isDeferredChromeReady ? (
              <CinematicExportCluster
                onExport={onPrepareExport}
                isExporting={isExporting}
                isCompleted={latestExport?.status === 'completed'}
                onDownload={onDownload}
                isDownloading={isDownloading}
              />
            ) : (
              <div className="h-9 w-[180px] rounded-full border border-white/8 bg-white/[0.03]" />
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  )
}

