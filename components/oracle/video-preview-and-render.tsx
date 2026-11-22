'use client'

import React, { useState } from 'react'
import {
  Play,
  Film,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Settings2,
} from 'lucide-react'
import { OracleClient, RenderRequest, RenderStatusResponse } from '@/lib/oracle'

interface VideoPreviewAndRenderProps {
  client: OracleClient
  userToken: string
  previewUrl?: string
  renderUrl?: string
  sessionId: string
  onRenderCompleted: (downloadUrl: string) => void
}

export function VideoPreviewAndRender({
  client,
  userToken,
  previewUrl,
  renderUrl,
  sessionId,
  onRenderCompleted,
}: VideoPreviewAndRenderProps) {
  const [resolution, setResolution] = useState<'1080p' | '720p' | '4k'>('1080p')
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high')
  const [format, setFormat] = useState<'mp4' | 'mov'>('mp4')

  const [rendering, setRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderJobId, setRenderJobId] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null)

  const handleStartRender = async () => {
    setRendering(true)
    setRenderError(null)
    setRenderProgress(10)

    try {
      const targetRenderUrl = renderUrl || `/api/session/${sessionId}/render`
      const renderRes = await client.triggerRender(
        targetRenderUrl,
        {
          resolution,
          quality,
          format,
        },
        userToken,
      )

      setRenderJobId(renderRes.renderJobId)

      if (renderRes.downloadUrl) {
        setFinalDownloadUrl(renderRes.downloadUrl)
        setRenderProgress(100)
        setRendering(false)
        onRenderCompleted(renderRes.downloadUrl)
        return
      }

      // Poll render status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await client.getRenderStatus(renderRes.renderJobId, userToken)
          if (statusRes.progress) {
            setRenderProgress(statusRes.progress)
          }

          if (statusRes.status === 'completed') {
            clearInterval(pollInterval)
            const dl = statusRes.downloadUrl || statusRes.signedUrl || ''
            setFinalDownloadUrl(dl)
            setRenderProgress(100)
            setRendering(false)
            if (dl) onRenderCompleted(dl)
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval)
            setRenderError(statusRes.error || 'Rendering job failed')
            setRendering(false)
          }
        } catch (err: any) {
          console.warn('Render status polling error:', err)
        }
      }, 3000)
    } catch (err: any) {
      setRenderError(err?.message || 'Failed to dispatch render job')
      setRendering(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Video Preview Card */}
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
            <Film className="w-4 h-4 text-orange-400" />
            <span>Curated Cut Preview</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Timeline Ready
          </span>
        </div>

        <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
          {previewUrl ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <Play className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-500">
                Preview timeline generated. Ready for high-resolution render.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Render Trigger & Controls */}
      {!finalDownloadUrl && (
        <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Settings2 className="w-4 h-4 text-orange-400" />
            <span>Master Export Settings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Resolution
              </label>
              <select
                disabled={rendering}
                value={resolution}
                onChange={(e) => setResolution(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD)</option>
                <option value="720p">720p (Fast)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Quality
              </label>
              <select
                disabled={rendering}
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
              >
                <option value="high">High (Production standard)</option>
                <option value="ultra">Ultra (Master grade)</option>
                <option value="standard">Standard (Compact)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Format
              </label>
              <select
                disabled={rendering}
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-orange-500/50"
              >
                <option value="mp4">MP4 (H.264 Universal)</option>
                <option value="mov">MOV (ProRes Compatible)</option>
              </select>
            </div>
          </div>

          {rendering && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 flex items-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>
                    {renderJobId
                      ? `Rendering master output (${renderJobId})...`
                      : 'Submitting render job...'}
                  </span>
                </span>
                <span className="text-orange-400 font-semibold">{renderProgress}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>
          )}

          {renderError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{renderError}</span>
            </div>
          )}

          <button
            onClick={handleStartRender}
            disabled={rendering}
            className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/15"
          >
            {rendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering High-Res Master...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Start Final Master Render</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Render Completed Card */}
      {finalDownloadUrl && (
        <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center space-y-4">
          <div className="p-3 w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              Master Video Render Complete!
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Your video has been rendered and is ready for download via secure signed URL.
            </p>
          </div>
          <a
            href={finalDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center justify-center space-x-2 py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Master Video</span>
          </a>
        </div>
      )}
    </div>
  )
}
