'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileVideo, CheckCircle2, X } from 'lucide-react'
import Uppy, { type UppyFile } from '@uppy/core'
// @ts-ignore - Uppy types can be finicky in certain environments
import AwsS3Multipart from '@uppy/aws-s3-multipart'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface VideoUploaderProps {
  onUploadSuccess: (url: string, filename: string) => void
  onCancel?: () => void
  className?: string
}

export function VideoUploader({ onUploadSuccess, onCancel, className }: VideoUploaderProps) {
  const [uppy] = React.useState(() =>
    new Uppy({
      id: 'video-ingestion-engine',
      autoProceed: true,
      restrictions: {
        maxFileSize: 3 * 1024 * 1024 * 1024, // 3GB
        allowedFileTypes: ['video/*'],
        maxNumberOfFiles: 1,
      },
    }).use(AwsS3Multipart, {
      limit: 15,
      partSize: 5 * 1024 * 1024, // 5MB chunks (minimal allowed for S3)
      async createMultipartUpload(file: UppyFile<any, any>) {
        const response = await fetch('/api/upload/multipart/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        })
        if (!response.ok) throw new Error('Failed to initiate upload')
        return response.json()
      },
      async signPart(file: UppyFile<any, any>, options: { uploadId: string; key: string; partNumber: number }) {
        const response = await fetch('/api/upload/multipart/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: options.uploadId,
            key: options.key,
            partNumber: options.partNumber,
          }),
        })
        if (!response.ok) throw new Error('Failed to sign part')
        const data = await response.json()
        return { url: data.url }
      },
      async completeMultipartUpload(file: UppyFile<any, any>, options: { uploadId: string; key: string; parts: any[] }) {
        const response = await fetch('/api/upload/multipart/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: options.uploadId,
            key: options.key,
            parts: options.parts,
          }),
        })
        if (!response.ok) throw new Error('Failed to complete upload')
        return response.json()
      },
      async abortMultipartUpload(file: UppyFile<any, any>, options: { uploadId: string; key: string }) {
        await fetch('/api/upload/multipart/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: options.uploadId,
            key: options.key,
          }),
        })
      },
    })
  )

  const [uploadState, setUploadState] = React.useState<{
    status: 'idle' | 'uploading' | 'complete' | 'error'
    progress: number
    speed: string
    fileName: string | null
  }>({
    status: 'idle',
    progress: 0,
    speed: '0 MB/s',
    fileName: null,
  })

  React.useEffect(() => {
    uppy.on('upload', () => {
      const file = uppy.getFiles()[0]
      setUploadState(prev => ({
        ...prev,
        status: 'uploading',
        fileName: file?.name || 'Video'
      }))
    })

    uppy.on('upload-progress', (file, progress) => {
      if (!file) return
      // Calculate speed
      const startTime = (file.meta as any).startTime || Date.now()
      const duration = (Date.now() - startTime) / 1000
      const bytesPerSecond = duration > 0 ? progress.bytesUploaded / duration : 0
      const speedMb = (bytesPerSecond / (1024 * 1024)).toFixed(1)

      setUploadState(prev => ({
        ...prev,
        progress: Math.round(progress.percentage || 0),
        speed: `${speedMb} MB/s`
      }))
    })

    uppy.on('upload-success', (file, response) => {
      const url = (response.body as any).url
      setUploadState(prev => ({ ...prev, status: 'complete', progress: 100 }))
      toast.success('Upload complete')
      setTimeout(() => {
        onUploadSuccess(url, file?.name || 'Project')
      }, 800)
    })

    uppy.on('upload-error', (file, error) => {
      setUploadState(prev => ({ ...prev, status: 'error' }))
      toast.error('Upload failed', { description: error.message })
    })

    // Uppy 4.x uses logout/close cleanup depending on version,
    // but the proper way to prevent memory leaks is:
    return () => {
      // @ts-ignore
      if (typeof uppy.close === 'function') uppy.close()
    }
  }, [uppy, onUploadSuccess])

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <AnimatePresence mode="wait">
        {uploadState.status === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative"
          >
            <div
              className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] p-12 backdrop-blur-2xl transition-all hover:border-white/20"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const files = Array.from(e.dataTransfer.files)
                if (files.length > 0) {
                  const file = files[0]
                  uppy.addFile({
                    name: file.name,
                    type: file.type,
                    data: file,
                    meta: { startTime: Date.now() }
                  })
                }
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(127,242,212,0.12)_0%,rgba(127,242,212,0)_50%)]" />

              <div className="relative flex flex-col items-center text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-2xl transition-transform group-hover:scale-110">
                  <Upload className="size-8 text-[#9ff6e3] transition-colors group-hover:text-white" />
                </div>

                <h3 className="mb-2 text-2xl font-medium tracking-tight text-white/90">
                  Ingest Cinematic Source
                </h3>
                <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/40">
                  Drop your master video here. We support 4K/8K ingestions up to 3GB directly to the edge.
                </p>

                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95">
                    Select File
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uppy.addFile({
                        name: file.name,
                        type: file.type,
                        data: file,
                        meta: { startTime: Date.now() }
                      })
                    }}
                  />
                </label>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="absolute -right-4 -top-4 size-8 grid place-items-center rounded-full border border-white/10 bg-black/40 text-white/40 backdrop-blur-md hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 p-10 backdrop-blur-3xl shadow-2xl"
          >
            <div className="relative flex flex-col items-center">
              <div className="mb-8 flex h-48 w-48 flex-col items-center justify-center gap-2">
                {uploadState.status === 'uploading' ? (
                  <InlineLoadingAnimation
                    size={120}
                    label={`Uploading ${uploadState.fileName ?? 'video'}: ${uploadState.progress}% complete`}
                  />
                ) : null}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold tracking-tighter text-white">
                    {uploadState.progress}%
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Uploaded
                  </div>
                </div>
              </div>

              <div className="w-full space-y-6 text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 text-white/90">
                    <FileVideo className="size-4 text-white/40" />
                    <span className="text-sm font-medium truncate max-w-[240px]">
                      {uploadState.fileName}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white/25">
                    <span className="flex items-center gap-1.5">
                      {uploadState.status === 'uploading' ? (
                        <InlineLoadingAnimation
                          size={12}
                          label={`Uploading at ${uploadState.speed}`}
                        />
                      ) : null}
                      {uploadState.speed}
                    </span>
                    <div className="size-1 rounded-full bg-white/10" />
                    <span>Saturating Bandwidth</span>
                  </div>
                </div>

                {uploadState.status === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-[#9ff6e3]"
                  >
                    <CheckCircle2 className="size-4" />
                    <span className="text-xs font-semibold">Handoff to Editor...</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
