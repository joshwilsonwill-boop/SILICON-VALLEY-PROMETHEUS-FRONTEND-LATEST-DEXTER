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
import { upsertProject } from '@/lib/mock'
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
  const supportedImageExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif'])
  const supportedImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/avif'])

  const isSupportedVideo = kind === 'video' && (supportedVideoMimeTypes.has(file.type.toLowerCase()) || supportedVideoExtensions.has(extension))
  const isSupportedImage = kind === 'image' && (supportedImageMimeTypes.has(file.type.toLowerCase()) || supportedImageExtensions.has(extension))
  if (!isSupportedVideo && !isSupportedImage) {
    return 'Unsupported format. Upload an image or an MP4, MOV, M4V, WEBM, or MKV video.'
  }

  return null
}

function describeMultipartUploadProgress(progress: MultipartUploadProgress, fileName: string) {
  const partLabel = progress.totalParts > 1
    ? `part ${Math.max(1, progress.currentPart)} of ${progress.totalParts}`
    : 'single part'

  if (progress.phase === 'completing' || progress.phase === 'done') return 'Processing...'
  return 'Uploading video...'
}

export function EditorNewProjectUploadDialog({ open, onOpenChange }: EditorNewProjectUploadDialogProps) {
  const router = useRouter()
  const sourceFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const inspectionRunRef = React.useRef(0)
  const [isSourceDragOver, setIsSourceDragOver] = React.useState(false)
  const [pendingUpload, setPendingUpload] = React.useState<PendingUpload | null>(null)
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = React.useState(0)
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
    setUploadMessage(null)
  }, [])

  const closeDialog = React.useCallback(() => {
    if (isUploading) return
    onOpenChange(false)
    clearPendingUpload()
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
          previewKind: pendingUpload.kind === 'image' ? 'image' : 'video',
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
          mimeType: uploadAsset.mimeType,
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
        previewKind: pendingUpload.kind === 'image' ? 'image' : 'video',
        sourceAssetId: uploadAsset.id,
      })

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
          isSourceDragOver={isSourceDragOver}
          onApplyUploadToPrompt={() => void startUpload()}
          onClearPendingUpload={clearPendingUpload}
          onSourceDragLeave={() => setIsSourceDragOver(false)}
          onSourceDragOver={(event) => {
            event.preventDefault()
            setIsSourceDragOver(true)
          }}
          onSourceDrop={handleSourceDrop}
          onSourceFileInputChange={handleSourceFileInputChange}
          pendingUpload={pendingUpload}
          sourceDetail={sourceDetail}
          sourceDisplayName={sourceDisplayName}
          sourceExtension={sourceExtension}
          sourceFileInputRef={sourceFileInputRef}
          sourcePrimaryBadge={sourcePrimaryBadge}
          sourceReady={Boolean(pendingUpload)}
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
                  <p className="mt-4 text-lg font-medium text-white">{uploadStatus === 'error' ? 'Upload failed' : uploadMessage ?? 'Uploading video...'}</p>
                </div>
                {isUploading ? (
                  <button type="button" aria-label="Cancel upload" onClick={cancelActiveUpload} className="mt-5 grid size-10 place-items-center rounded-full border border-red-400/20 bg-red-500/10 text-red-300/70 transition-colors hover:bg-red-500/20 hover:text-red-200"><XIcon className="size-4" /></button>
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
