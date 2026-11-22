'use client'

import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileVideo,
  Sparkles,
  Sliders,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Film,
} from 'lucide-react'
import { OracleClient, ProcessResponse, DesignOptions } from '@/lib/oracle'

interface UploadAndPromptFormProps {
  client: OracleClient
  userToken: string
  onProcessStarted: (res: ProcessResponse, initialPrompt?: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function UploadAndPromptForm({
  client,
  userToken,
  onProcessStarted,
}: UploadAndPromptFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [creativePrompt, setCreativePrompt] = useState(
    'Transform into an engaging, high-retention video with cinematic cuts, kinetic typography, and punchy pacing.',
  )
  const [designOptions, setDesignOptions] = useState<DesignOptions>({
    aspectRatio: '9:16',
    stylePreset: 'Cinematic Editorial',
    pacing: 'dynamic',
    colorTheme: 'Cinematic Warm',
  })

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStepText, setCurrentStepText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // NO upload size cap - accepts any size
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // NO upload size cap - accepts any size
      setFile(e.dataTransfer.files[0])
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a video file.')
      return
    }

    if (!creativePrompt.trim()) {
      setError('Please enter a creative prompt describing your target video.')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Step 1: Request signed upload URL from Oracle gateway
      setCurrentStepText('Requesting signed upload URL...')
      const contentType = file.type || 'video/mp4'
      const uploadInfo = await client.getUploadUrl(
        {
          filename: file.name,
          contentType,
        },
        userToken,
      )

      // Step 2: Upload file directly to signed storage with PUT & progress
      setCurrentStepText('Uploading raw video to storage...')
      await client.uploadFileToSignedUrl(file, uploadInfo, (pct) => {
        setUploadProgress(pct)
      })

      // Step 3: Trigger process with raw video coordinates + creative prompt ONLY (Intake Law)
      setCurrentStepText('Dispatching job to Oracle pipeline...')
      const processRes = await client.startProcess(
        {
          bucket: uploadInfo.bucket,
          key: uploadInfo.key,
          filename: file.name,
          contentType,
          mediaUrl: uploadInfo.publicUrl,
          metadata: {
            creativePrompt: creativePrompt.trim(),
            designOptions,
            originalFileSize: file.size,
          },
        },
        userToken,
      )

      setCurrentStepText('Job successfully queued!')
      onProcessStarted(processRes, creativePrompt.trim())
    } catch (err: any) {
      console.error('Upload/processing error:', err)
      setError(err?.message || 'Failed to complete upload and dispatch processing job.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload Zone - NO upload size cap */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          file
            ? 'border-orange-500/50 bg-orange-500/5'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/70'
        } ${uploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {file ? (
          <div className="flex flex-col items-center">
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 mb-3">
              <FileVideo className="w-8 h-8" />
            </div>
            <div className="text-sm font-semibold text-zinc-100">{file.name}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {formatBytes(file.size)} • {file.type || 'video'} • No size cap
            </div>
            {!uploading && (
              <span className="mt-3 text-xs text-orange-400 hover:underline">
                Click to choose another file
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="text-sm font-semibold text-zinc-200">
              Drag & drop raw footage or click to browse
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Direct-to-storage signed PUT • Zero upload size cap
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center space-x-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              <span>{currentStepText}</span>
            </span>
            <span className="text-orange-400 font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Creative Prompt Input */}
      <div>
        <label className="flex items-center justify-between text-xs font-medium text-zinc-300 mb-2">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Creative Prompt (Intake Law: Raw Video + Creative Prompt)</span>
          </span>
          <span className="text-[11px] text-zinc-500">Autonomous editorial guidance</span>
        </label>
        <textarea
          rows={3}
          required
          disabled={uploading}
          value={creativePrompt}
          onChange={(e) => setCreativePrompt(e.target.value)}
          placeholder="Describe pacing, hook focus, target audience, and editorial vision..."
          className="w-full p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all disabled:opacity-50 resize-y"
        />
      </div>

      {/* Design Options */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sliders className="w-4 h-4 text-orange-400" />
          <span>Design & Framing Options</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Aspect Ratio
            </label>
            <select
              disabled={uploading}
              value={designOptions.aspectRatio}
              onChange={(e) =>
                setDesignOptions({
                  ...designOptions,
                  aspectRatio: e.target.value as '9:16' | '16:9' | '1:1',
                })
              }
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
            >
              <option value="9:16">9:16 (Shorts, Reels, TikTok)</option>
              <option value="16:9">16:9 (Landscape YouTube)</option>
              <option value="1:1">1:1 (Square Feed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Style Preset
            </label>
            <select
              disabled={uploading}
              value={designOptions.stylePreset}
              onChange={(e) =>
                setDesignOptions({ ...designOptions, stylePreset: e.target.value })
              }
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
            >
              <option value="Cinematic Editorial">Cinematic Editorial</option>
              <option value="Punchy Viral">Punchy Viral</option>
              <option value="Minimal Clean">Minimal Clean</option>
              <option value="Luxury Modern">Luxury Modern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Pacing
            </label>
            <select
              disabled={uploading}
              value={designOptions.pacing}
              onChange={(e) =>
                setDesignOptions({
                  ...designOptions,
                  pacing: e.target.value as 'dynamic' | 'balanced' | 'fast',
                })
              }
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
            >
              <option value="dynamic">Dynamic (Content-adaptive)</option>
              <option value="fast">Fast (High retention)</option>
              <option value="balanced">Balanced (Narrative focus)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={uploading || !file}
        className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/15"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Intake...</span>
          </>
        ) : (
          <>
            <Film className="w-4 h-4" />
            <span>Upload & Start Oracle Process</span>
          </>
        )}
      </button>
    </form>
  )
}
