'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { GlassUploadModalView } from '@/components/ui/glass-upload-modal-view'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import {
  detectSourceFileKind,
  formatFileSize,
  formatSourceProfileMetric,
  formatTimeProfile,
  inspectSourceFile,
} from '@/lib/media/source-profile'
import { clearPendingEditorNavigation, markPendingEditorNavigation, rememberCurrentPathForEditorReturn } from '@/lib/editor-navigation'
import { createProcessingJob, startProcessing as persistStartProcessing, upsertProject } from '@/lib/mock'
import { uploadProjectSourceMultipart, type MultipartUploadProgress } from '@/lib/r2/multipart-client'
import { setSessionSourcePreview } from '@/lib/source-preview-session'
import { createClient } from '@/lib/supabase/client'
import type { SourceProfile } from '@/lib/types'
import { normalizeUxError } from '@/lib/ux/errors'

type PendingUploadKind = 'video' | 'image' | 'audio' | 'file'
type UploadStatus = 'idle' | 'presigning' | 'uploading' | 'paused' | 'retrying' | 'done' | 'error'

type PendingUpload = {
  file: File
  previewUrl: string
  kind: PendingUploadKind
  sourceProfile: SourceProfile | null
  inspectionState: 'idle' | 'inspecting' | 'ready' | 'failed'
  inspectionError: string | null
}

type EditorNewProjectUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function detectUploadKind(file: File): PendingUploadKind {
  return detectSourceFileKind(file) as PendingUploadKind
}

function validateStudioUpload(file: File) {
  const kind = detectUploadKind(file)
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const supportedVideoExtensions = new Set(['mp4', 'mov', 'webm', 'm4v', 'mkv'])
  const supportedVideoMimeTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/x-matroska'])

  if (kind !== 'video' || (!supportedVideoMimeTypes.has(file.type.toLowerCase()) && !supportedVideoExtensions.has(extension))) {
    return 'Unsupported format. Upload an MP4, MOV, M4V, WEBM, or MKV video.'
  }

  return null
}

function describeMultipartUploadProgress(progress: MultipartUploadProgress, fileName: string) {
  const partLabel = progress.totalParts > 1
    ? `part ${Math.max(1, progress.currentPart)} of ${progress.totalParts}`
    : 'single part'

  if (progress.phase === 'initiating') return 'Preparing secure upload channel...'
  if (progress.phase === 'retrying') return `Network timeout. Retrying ${partLabel} for ${fileName}.`
  if (progress.phase === 'completing') return 'Finalizing uploaded parts in Cloudflare R2...'
  if (progress.phase === 'aborting') return 'Cancelling incomplete upload and cleaning up R2 parts...'
  if (progress.phase === 'done') return 'Upload complete. Registering asset metadata...'
  return `Uploading ${fileName} (${progress.percentage}%).`
}

export function EditorNewProjectUploadDialog({ open, onOpenChange }: EditorNewProjectUploadDialogProps) {
  const router = useRouter()
  const sourceFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const inspectionRunRef = React.useRef(0)
  const [addSourceMode, setAddSourceMode] = React.useState<'link' | 'upload'>('upload')
  const [isSourceDragOver, setIsSourceDragOver] = React.useState(false)
  const [pendingUpload, setPendingUpload] = React.useState<PendingUpload | null>(null)
  const [sourceUrl, setSourceUrl] = React.useState('')
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadPartLabel, setUploadPartLabel] = React.useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null)

  const isUploading = uploadStatus === 'presigning' || uploadStatus === 'uploading' || uploadStatus === 'retrying'
  const sourceProfile = pendingUpload?.sourceProfile ?? null
  const sourceMetrics = sourceProfile ? formatSourceProfileMetric(sourceProfile) : null
  const sourceDisplayName = pendingUpload?.file.name ?? 'Upload a source video'
  const sourcePrimaryBadge = pendingUpload?.kind ? pendingUpload.kind.toUpperCase() : 'VIDEO'
  const sourceExtension = pendingUpload?.file.name.split('.').pop()?.toUpperCase() ?? 'MP4'
  const sourceDetail = pendingUpload
    ? pendingUpload.inspectionState === 'inspecting'
      ? 'Inspecting source media...'
      : pendingUpload.inspectionState === 'failed'
        ? pendingUpload.inspectionError ?? formatFileSize(pendingUpload.file.size)
        : sourceProfile && sourceMetrics
          ? `${sourceMetrics.resolution ?? formatFileSize(pendingUpload.file.size)} - ${formatTimeProfile(sourceProfile.timeProfile)}`
          : formatFileSize(pendingUpload.file.size)
    : 'Choose a video to open as a new editor project.'

  React.useEffect(() => {
    return () => {
      if (pendingUpload?.previewUrl) {
        URL.revokeObjectURL(pendingUpload.previewUrl)
      }
    }
  }, [pendingUpload?.previewUrl])

  const clearPendingUpload = React.useCallback(() => {
    inspectionRunRef.current += 1
    setPendingUpload((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl)
      return null
    })
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadPartLabel(null)
    setUploadMessage(null)
  }, [])

  const closeDialog = React.useCallback(() => {
    if (isUploading) return
    onOpenChange(false)
    clearPendingUpload()
    setSourceUrl('')
    setAddSourceMode('upload')
  }, [clearPendingUpload, isUploading, onOpenChange])

  const handleUploadSelection = React.useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const validationError = validateStudioUpload(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const kind = detectUploadKind(file)
    const inspectionRun = inspectionRunRef.current + 1
    inspectionRunRef.current = inspectionRun

    setPendingUpload((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl)
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        kind,
        sourceProfile: null,
        inspectionState: 'inspecting',
        inspectionError: null,
      }
    })

    try {
      const profile = await inspectSourceFile(file)
      if (inspectionRunRef.current !== inspectionRun) return
      setPendingUpload((current) => current && current.file === file
        ? { ...current, sourceProfile: profile, inspectionState: 'ready', inspectionError: null }
        : current)
    } catch (error) {
      if (inspectionRunRef.current !== inspectionRun) return
      const message = error instanceof Error ? error.message : 'Could not inspect this source.'
      setPendingUpload((current) => current && current.file === file
        ? { ...current, inspectionState: 'failed', inspectionError: message }
        : current)
    }
  }, [])

  const handleSourceFileInputChange = React.useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      void handleUploadSelection(Array.from(event.target.files ?? []))
      event.target.value = ''
    },
    [handleUploadSelection],
  )

  const handleSourceDrop = React.useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault()
      setIsSourceDragOver(false)
      void handleUploadSelection(Array.from(event.dataTransfer.files ?? []))
    },
    [handleUploadSelection],
  )

  const startUpload = React.useCallback(async () => {
    if (!pendingUpload) {
      toast.error('Choose a video before creating a new project.')
      return
    }

    const file = pendingUpload.file
    let profile = pendingUpload.sourceProfile
    const title = file.name.replace(/\.[^/.]+$/, '') || 'Prometheus Project'
    let currentStage = 'INIT'

    try {
      setUploadStatus('presigning')
      setUploadMessage('Preparing your new editor project...')

      if (!profile) {
        currentStage = 'SOURCE_INSPECT'
        profile = await inspectSourceFile(file).catch(() => null)
      }

      currentStage = 'AUTH_CHECK'
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('You must be logged in to create a project.')

      currentStage = 'WORKSPACE_FETCH'
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', session.user.id)
        .limit(1)
      const workspaceId = workspaces?.[0]?.id

      currentStage = 'PROJECT_CREATE'
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          name: title.slice(0, 50),
          prompt: `Create a cinematic edit from ${file.name}.`,
          previewKind: 'video',
          sourceProfile: profile ?? undefined,
          workspaceId,
        }),
      })
      const projectData = await projectResponse.json().catch(() => ({}))
      if (!projectResponse.ok || !projectData.project) {
        throw new Error(projectData.error || 'Failed to create project')
      }
      const project = projectData.project

      currentStage = 'R2_MULTIPART_UPLOAD'
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      const multipartResult = await uploadProjectSourceMultipart({
        assetId: null,
        file,
        projectId: project.id,
        signal: abortController.signal,
        onProgress: (progress) => {
          const nextStatus: UploadStatus =
            progress.phase === 'initiating'
              ? 'presigning'
              : progress.phase === 'retrying'
                ? 'retrying'
                : progress.phase === 'aborting'
                  ? 'paused'
                  : progress.phase === 'done'
                    ? 'done'
                    : 'uploading'
          setUploadStatus(nextStatus)
          setUploadProgress(progress.percentage)
          setUploadPartLabel(progress.totalParts > 1
            ? `Uploading part ${Math.max(1, progress.currentPart)} of ${progress.totalParts}`
            : `Uploading ${formatFileSize(file.size)}`)
          setUploadMessage(describeMultipartUploadProgress(progress, file.name))
        },
      })
      abortControllerRef.current = null

      currentStage = 'ASSET_REGISTER'
      const uploadAsset = multipartResult.asset
      const assetResponse = await fetch(`/api/projects/${project.id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: uploadAsset.id,
          bucket: uploadAsset.bucket,
          objectKey: uploadAsset.objectKey,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          durationMs: profile?.inspection.durationSec ? Math.round(profile.inspection.durationSec * 1000) : undefined,
          width: profile?.inspection.width,
          height: profile?.inspection.height,
          profile,
        }),
      })
      const assetData = await assetResponse.json().catch(() => ({}))
      if (!assetResponse.ok) throw new Error(assetData.error || 'Failed to register uploaded source')

      project.sourceAssetId = uploadAsset.id
      upsertProject(project)

      setSessionSourcePreview({
        projectId: project.id,
        file,
        previewKind: 'video',
        sourceAssetId: uploadAsset.id,
      })

      const job = createProcessingJob({
        projectId: project.id,
        input: {
          prompt: `Create a cinematic edit from ${file.name}.`,
          sources: [`Upload: ${file.name}`],
        },
      })
      persistStartProcessing(job)

      const editorRoute = `/editor/${project.id}`
      rememberCurrentPathForEditorReturn()
      markPendingEditorNavigation(editorRoute)
      setUploadStatus('done')
      toast.success('New project created')
      router.push(editorRoute)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setUploadStatus('paused')
        setUploadMessage('Upload cancelled')
        clearPendingEditorNavigation()
        return
      }

      console.error(`[editor-upload-new-project] ${currentStage}`, error)
      setUploadStatus('error')
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed')
      toast.error('Upload failed', {
        description: normalizeUxError(error, 'upload'),
      })
      clearPendingEditorNavigation()
    }
  }, [pendingUpload, router])

  const cancelActiveUpload = React.useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[1040px] max-h-[calc(100svh-1rem)] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100svh-2rem)] [&>button[aria-label='Close']]:hidden">
        <DialogClose asChild>
          <button
            type="button"
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-lg border border-white/12 bg-black/55 text-white/70 shadow-[0_18px_42px_-26px_rgba(0,0,0,0.92)] backdrop-blur-xl transition-colors hover:bg-black/72 hover:text-white sm:right-5 sm:top-5"
            aria-label="Close source popup"
            disabled={isUploading}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </DialogClose>

        <GlassUploadModalView
          addSourceMode={addSourceMode}
          isSourceDragOver={isSourceDragOver}
          onApplyUploadToPrompt={() => void startUpload()}
          onClearPendingUpload={clearPendingUpload}
          onImportSourceLink={() => toast.info('Upload a video file to create a new editor project.')}
          onModeChange={setAddSourceMode}
          onSourceDragLeave={() => setIsSourceDragOver(false)}
          onSourceDragOver={(event) => {
            event.preventDefault()
            setIsSourceDragOver(true)
          }}
          onSourceDrop={handleSourceDrop}
          onSourceFileInputChange={handleSourceFileInputChange}
          onSourceUrlChange={setSourceUrl}
          pendingUpload={pendingUpload}
          sourceDetail={sourceDetail}
          sourceDisplayName={sourceDisplayName}
          sourceExtension={sourceExtension}
          sourceFileInputRef={sourceFileInputRef}
          sourcePrimaryBadge={sourcePrimaryBadge}
          sourceReady={Boolean(pendingUpload)}
          sourceUrl={sourceUrl}
          sourceUrlValue={sourceUrl.trim()}
        />

        <AnimatePresence>
          {isUploading || uploadStatus === 'error' ? (
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center bg-[#050505]/88 px-4 backdrop-blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-[620px]">
                <div className="flex flex-col items-center text-center">
                  {isUploading ? (
                    <InlineLoadingAnimation
                      size={96}
                      label={uploadMessage ?? 'Preparing video upload'}
                    />
                  ) : null}
                  <p className="mt-4 text-lg font-medium text-white">
                    {uploadStatus === 'error' ? 'Upload paused' : 'Preparing upload'}
                  </p>
                  <p className="mt-2 text-sm text-white/58">
                    {uploadMessage ?? 'Preparing your video for the editor.'}
                  </p>
                </div>
                {isUploading ? (
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4 text-xs text-white/62">
                      <span>{uploadPartLabel ?? 'Preparing upload'}</span>
                      <span className="font-semibold text-white">{uploadProgress}%</span>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-white/12 bg-transparent px-4 text-xs text-white/72 hover:bg-white/[0.08] hover:text-white"
                        onClick={cancelActiveUpload}
                      >
                        Cancel Upload
                      </Button>
                    </div>
                  </div>
                ) : null}
                {uploadStatus === 'error' ? (
                  <div className="mt-4 flex justify-center">
                    <Button type="button" variant="secondary" onClick={() => setUploadStatus('idle')}>
                      Try Again
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
