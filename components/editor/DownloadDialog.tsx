'use client'

import * as React from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Project } from '@/lib/types'

export interface DownloadDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onConfirmDownload: () => void
  isDownloading: boolean
}

export function DownloadDialog({
  isOpen,
  onOpenChange,
  project,
  onConfirmDownload,
  isDownloading,
}: DownloadDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] border-white/12 bg-[#0e1016]/95 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(circle_at_32%_22%,rgba(155,142,255,0.14)_0%,rgba(155,142,255,0)_42%)]" />

        <DialogHeader className="relative">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Download className="size-6 text-[#9ff6e3]" />
          </div>
          <DialogTitle className="text-2xl font-medium tracking-tight">Prepare final download?</DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-white/60">
            Your export is ready. This prototype download uses the current source-backed export proof. Real rendered
            edits will replace this in the render worker phase.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-6 mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Project</span>
            <span className="font-medium text-white/90">{project?.title ?? 'Untitled'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Type</span>
            <span className="text-white/80">MP4 Video</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/40">Security</span>
            <span className="text-white/50">Signed R2 Link</span>
          </div>
        </div>

        <DialogFooter className="relative mt-6 gap-3 px-6 pb-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-xl border border-white/8 bg-white/5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirmDownload}
            disabled={isDownloading}
            className="h-11 flex-1 rounded-xl bg-white text-sm font-medium text-black transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
          >
            {isDownloading ? (
              <>
                <InlineLoadingAnimation size={16} label="Downloading export" />
                <span>Downloading...</span>
              </>
            ) : 'Download MP4'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
