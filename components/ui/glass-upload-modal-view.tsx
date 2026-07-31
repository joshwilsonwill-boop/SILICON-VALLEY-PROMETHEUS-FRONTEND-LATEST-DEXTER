'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, FileText, Image as ImageIcon, Music2, Upload, Video, X } from 'lucide-react';

import type { SourceProfile } from '@/lib/types';
import { formatSourceProfileMetric, formatTimeProfile } from '@/lib/media/source-profile';
import { cn } from '@/lib/utils';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GlassUploadBackdrop } from '@/components/ui/glass-upload-shell';

type PendingUploadKind = 'video' | 'image' | 'audio' | 'file';

type PendingUpload = {
  file: File;
  previewUrl: string;
  kind: PendingUploadKind;
  sourceProfile?: SourceProfile | null;
  inspectionState?: 'idle' | 'inspecting' | 'ready' | 'failed';
  inspectionError?: string | null;
};

type GlassUploadModalViewProps = {
  isSourceDragOver: boolean;
  onApplyUploadToPrompt: () => void;
  onClearPendingUpload: () => void;
  onSourceDragLeave: () => void;
  onSourceDragOver: React.DragEventHandler<HTMLDivElement>;
  onSourceDrop: React.DragEventHandler<HTMLDivElement>;
  onSourceFileInputChange: React.ChangeEventHandler<HTMLInputElement>;
  pendingUpload: PendingUpload | null;
  sourceDetail: string;
  sourceDisplayName: string;
  sourceExtension: string;
  sourceFileInputRef: React.RefObject<HTMLInputElement | null>;
  sourcePrimaryBadge: string;
  sourceReady: boolean;
};

function MediaIcon({ kind, className }: { kind?: PendingUploadKind; className?: string }) {
  if (kind === 'image') return <ImageIcon className={className} />;
  if (kind === 'audio') return <Music2 className={className} />;
  if (kind === 'file') return <FileText className={className} />;
  return <Video className={className} />;
}

export function GlassUploadModalView({
  isSourceDragOver,
  onApplyUploadToPrompt,
  onClearPendingUpload,
  onSourceDragLeave,
  onSourceDragOver,
  onSourceDrop,
  onSourceFileInputChange,
  pendingUpload,
  sourceDetail,
  sourceDisplayName,
  sourceExtension,
  sourceFileInputRef,
  sourcePrimaryBadge,
  sourceReady,
}: GlassUploadModalViewProps) {
  const openSourcePicker = () => sourceFileInputRef.current?.click();
  const sourceMetrics = pendingUpload?.sourceProfile
    ? formatSourceProfileMetric(pendingUpload.sourceProfile)
    : null;
  const isVisual = pendingUpload?.kind === 'image' || pendingUpload?.kind === 'video';

  return (
    <GlassUploadBackdrop className="mx-auto flex h-[calc(100svh-1rem)] w-full max-w-[1180px] flex-col sm:h-[min(860px,calc(100svh-2rem))]">
      <input
        ref={sourceFileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
        className="hidden"
        onChange={onSourceFileInputChange}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d9ff64] shadow-[0_0_14px_rgba(217,255,100,0.8)]" />
              Source studio
            </div>
            <DialogTitle className="mt-2 text-[clamp(1.65rem,3.6vw,2.8rem)] font-medium leading-[0.95] tracking-[-0.04em] text-white">
              {pendingUpload ? 'Source staged' : 'Upload source'}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-sm text-xs leading-5 text-white/55 sm:text-sm">
              {pendingUpload ? 'Your media is ready for the edit.' : 'Drop an image or video into the frame.'}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            {pendingUpload ? (
              <>
                <button
                  type="button"
                  onClick={onClearPendingUpload}
                  aria-label="Remove staged source"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/25 text-white/65 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onApplyUploadToPrompt}
                  className="group inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-transform duration-300 hover:scale-[1.03] hover:bg-[#edffb2]"
                >
                  Continue <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </>
            ) : (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                Standby
              </div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {pendingUpload ? (
            <motion.section
              key="staged"
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative min-h-0 flex-1 overflow-hidden bg-[#050609]"
            >
              {isVisual && (
                <div aria-hidden className="absolute inset-0 overflow-hidden opacity-30 blur-3xl">
                  {pendingUpload.kind === 'image' ? (
                    <img src={pendingUpload.previewUrl} alt="" className="h-full w-full scale-110 object-cover" />
                  ) : (
                    <video src={pendingUpload.previewUrl} muted autoPlay loop playsInline className="h-full w-full scale-110 object-cover" />
                  )}
                </div>
              )}

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),transparent_36%),linear-gradient(180deg,rgba(5,6,9,0.18)_0%,rgba(5,6,9,0.06)_44%,rgba(5,6,9,0.86)_100%)]" />

              <div className="absolute inset-0 flex items-center justify-center px-4 pb-16 pt-24 sm:px-10 sm:pb-20">
                {isVisual ? (
                  pendingUpload.kind === 'image' ? (
                    <img src={pendingUpload.previewUrl} alt={pendingUpload.file.name} className="max-h-full max-w-full object-contain drop-shadow-[0_32px_70px_rgba(0,0,0,0.6)]" />
                  ) : (
                    <video src={pendingUpload.previewUrl} muted autoPlay loop playsInline controls className="max-h-full max-w-full object-contain drop-shadow-[0_32px_70px_rgba(0,0,0,0.6)]" />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-white/70">
                    <MediaIcon kind={pendingUpload.kind} className="h-10 w-10" />
                    <div className="mt-4 text-sm">Preview available in the editor</div>
                  </div>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-7">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/48">
                    <span className="rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-white/65">{sourcePrimaryBadge}</span>
                    <span>{sourceExtension}</span>
                    {sourceReady && <Check className="h-3.5 w-3.5 text-[#d9ff64]" />}
                  </div>
                  <div className="mt-2 truncate text-sm font-medium text-white sm:text-base">{sourceDisplayName}</div>
                  <div className="mt-1 text-xs text-white/50">{sourceMetrics ? `${sourceMetrics.resolution ?? sourceDetail} · ${formatTimeProfile(pendingUpload.sourceProfile!.timeProfile)}` : sourceDetail}</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Ready to edit</div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative min-h-0 flex-1 p-3 pt-24 sm:p-5 sm:pt-28"
            >
              <div
                onDragOver={onSourceDragOver}
                onDragLeave={onSourceDragLeave}
                onDrop={onSourceDrop}
                onClick={openSourcePicker}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openSourcePicker();
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  'group relative flex h-full min-h-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border border-dashed px-6 text-center transition-all duration-500 focus:outline-none focus-visible:border-[#d9ff64]/70 focus-visible:ring-2 focus-visible:ring-[#d9ff64]/20 sm:rounded-[28px]',
                  isSourceDragOver
                    ? 'border-[#d9ff64]/80 bg-[#d9ff64]/[0.06]'
                    : 'border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.045]',
                )}
              >
                <div className={cn('relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-all duration-500', isSourceDragOver ? 'scale-110 border-[#d9ff64]/60 text-[#d9ff64] shadow-[0_0_0_16px_rgba(217,255,100,0.08)]' : 'group-hover:scale-105 group-hover:border-white/35')}>
                  <Upload className="h-6 w-6" />
                </div>
                <div className="mt-6 text-lg font-medium tracking-[-0.02em] text-white sm:text-xl">Drop video to stage it</div>
                <div className="mt-2 max-w-sm text-xs leading-5 text-white/48 sm:text-sm">Images and video · up to 10GB · your original stays untouched</div>
                <button type="button" onClick={(event) => { event.stopPropagation(); openSourcePicker(); }} className="mt-7 inline-flex h-10 items-center gap-2 rounded-full border border-white/18 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#edffb2]">
                  Choose file <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
                <div className="pointer-events-none absolute inset-x-10 bottom-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </GlassUploadBackdrop>
  );
}
