'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Music2,
  PlusIcon,
  Send,
  Upload,
  Video,
} from 'lucide-react';

import type { SourceProfile } from '@/lib/types';
import {
  formatAspectFamily,
  formatDurationBucket,
  formatProcessingClass,
  formatSourceProfileMetric,
  formatTimeProfile,
  formatWeightBucket,
} from '@/lib/media/source-profile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GlassBubbleCard, GlassUploadBackdrop } from '@/components/ui/glass-upload-shell';
import { MediaUpscaleComparison } from '@/components/ui/media-upscale-comparison';

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
  const handleAttach = onApplyUploadToPrompt;
  const showSendAction = !!pendingUpload;
  const openSourcePicker = () => sourceFileInputRef.current?.click();
  const sourceMetrics = pendingUpload?.sourceProfile ? formatSourceProfileMetric(pendingUpload.sourceProfile) : null;
  const previewStageClassName =
    'relative flex h-full min-h-[280px] w-full flex-col items-center justify-center px-5 py-6 text-center sm:px-6';
  const comparisonPreviewStageClassName =
    'relative flex h-full min-h-[320px] w-full items-stretch justify-stretch px-3 py-3 sm:px-4 sm:py-4';

  return (
    <GlassUploadBackdrop className="mx-auto flex h-[calc(100svh-1rem)] w-full max-w-[940px] max-h-[calc(100svh-1rem)] flex-col sm:h-[min(820px,calc(100svh-2rem))] sm:max-h-[calc(100svh-2rem)]">
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-9 sm:px-4 sm:pb-4 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[900px]"
        >
          <GlassBubbleCard className="w-full overflow-hidden">
            <div className="max-h-[calc(100svh-7rem)] overflow-y-auto px-4 pb-4 pt-4 text-white sm:px-5 sm:pb-5 sm:pt-5 lg:px-6 lg:pb-6 lg:pt-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <div className="text-[10px] uppercase tracking-[0.32em] text-white/38">
                    Source Studio
                  </div>
                  <DialogTitle className="mt-2.5 text-[clamp(1.9rem,4vw,3.2rem)] font-medium leading-[0.92] tracking-[-0.03em] text-white">
                    Upload Source
                  </DialogTitle>
                  <DialogDescription className="mt-2.5 max-w-md text-[13px] leading-5 text-white/54">
                    Stage your source and continue directly to the editor.
                  </DialogDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-medium text-white">
                    <Upload className="h-4 w-4" /> Upload
                  </div>

                  {showSendAction ? (
                    <button
                      type="button"
                      onClick={handleAttach}
                      className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-black shadow-[0_16px_34px_-24px_rgba(255,255,255,0.85)] transition-all duration-200 hover:bg-white/92"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Continue to Edit
                    </button>
                  ) : (
                    <div className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/56 backdrop-blur-md">
                      {sourceReady ? 'Staged' : 'Standby'}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 py-4 lg:grid-cols-1">
                <aside className="flex flex-col gap-4">
                  <input
                    ref={sourceFileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska,.mp4,.mov,.m4v,.webm,.mkv"
                    className="hidden"
                    onChange={onSourceFileInputChange}
                  />

                  <AnimatePresence mode="wait">
                    {(
                      <motion.div
                        key="upload-mode"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,20,26,0.9)_0%,rgba(9,10,13,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                          Upload
                        </div>
                        <div className="mt-2 text-base font-medium text-white">Drop video</div>
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
                            'group mt-4 flex min-h-[216px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-5 py-8 text-center transition-all duration-300 focus:outline-none focus-visible:border-[#ff9a73]/55 focus-visible:shadow-[0_0_0_1px_rgba(255,154,115,0.45),0_0_0_10px_rgba(255,110,84,0.08)]',
                            isSourceDragOver
                              ? 'border-[#f0ff57]/45 bg-[#f0ff57]/8 shadow-[0_0_0_1px_rgba(240,255,87,0.12),0_26px_46px_-30px_rgba(240,255,87,0.18)]'
                              : 'border-white/12 bg-white/[0.03] hover:border-[#ff9a73]/34 hover:bg-[rgba(255,255,255,0.05)]',
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-full border bg-white/[0.05] p-3 text-white/90 transition-all duration-300',
                              isSourceDragOver
                                ? 'border-[#f0ff57]/48 shadow-[0_0_0_14px_rgba(240,255,87,0.08),0_0_22px_rgba(240,255,87,0.18)]'
                                : 'border-white/12 group-hover:border-[#ff9a73]/45 group-hover:text-white group-hover:shadow-[0_0_0_14px_rgba(255,110,84,0.08),0_0_30px_rgba(255,110,84,0.28)]',
                            )}
                          >
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="mt-4 text-sm font-medium text-white">Drop video to stage it</div>
                          <div className="mt-2 text-xs text-white/66">MP4, MOV, M4V, WEBM, MKV supported up to 10GB</div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-5 rounded-full border-white/14 bg-white px-4 py-2 text-xs text-black shadow-[0_16px_34px_-24px_rgba(255,255,255,0.85)] hover:bg-white/92"
                            onClick={(event) => {
                              event.stopPropagation();
                              openSourcePicker();
                            }}
                          >
                            Choose File
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {pendingUpload && (
                    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,18,24,0.88)_0%,rgba(9,10,13,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/38">
                        Active Source
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.04]">
                          {pendingUpload?.kind === 'image' ? (
                            <img
                              src={pendingUpload.previewUrl}
                              alt={pendingUpload.file.name}
                              className="h-full w-full object-cover"
                            />
                          ) : pendingUpload?.kind === 'video' ? (
                            <video
                              src={pendingUpload.previewUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/58">
                              {pendingUpload?.kind === 'audio' ? (
                                <Music2 className="h-4 w-4" />
                              ) : pendingUpload?.kind === 'file' ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <Video className="h-4 w-4" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{sourceDisplayName}</div>
                          <div className="mt-1 text-xs text-white/48">{sourceDetail}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </aside>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-white/42">Ready to edit.</div>

                <div className="flex flex-wrap items-center gap-3">
                  {pendingUpload && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-white/14 bg-transparent text-white hover:bg-white/[0.06]"
                      onClick={onClearPendingUpload}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </GlassBubbleCard>
        </motion.div>
      </div>
    </GlassUploadBackdrop>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-black/20 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/34">{label}</div>
      <div className="mt-1 text-[11px] leading-5 text-white/72">{value}</div>
    </div>
  );
}
