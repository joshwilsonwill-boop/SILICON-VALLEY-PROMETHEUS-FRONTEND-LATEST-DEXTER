'use client'

import React, { useState, useEffect } from 'react'
import {
  Film,
  Download,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Loader2,
} from 'lucide-react'
import { OracleClient, MyVideoItem } from '@/lib/oracle'

interface MyVideosListProps {
  client: OracleClient
  userToken: string
  onSelectVideo?: (video: MyVideoItem) => void
}

export function MyVideosList({
  client,
  userToken,
  onSelectVideo,
}: MyVideosListProps) {
  const [videos, setVideos] = useState<MyVideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVideos = async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await client.listMyVideos(userToken)
      setVideos(items)
    } catch (err: any) {
      console.warn('Failed to load user videos:', err)
      setError(err?.message || 'Failed to retrieve your videos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userToken) {
      fetchVideos()
    }
  }, [userToken])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" />
            <span>Failed</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="capitalize">{status}</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-100">My Videos</h3>
          <p className="text-xs text-zinc-400">
            Videos associated with your authenticated account
          </p>
        </div>
        <button
          onClick={fetchVideos}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center space-y-2">
          <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
          <span>Loading your library...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchVideos}
            className="underline text-rose-300 hover:text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="p-8 border border-zinc-800 rounded-2xl text-center bg-zinc-950/40">
          <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-300">No videos processed yet</p>
          <p className="text-xs text-zinc-500 mt-1">
            Upload your first video to start automated editorial processing.
          </p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((vid) => (
            <div
              key={vid.id || vid.sessionId}
              className="p-4 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">
                    {vid.title || vid.filename || 'Untitled Video'}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {vid.createdAt
                        ? new Date(vid.createdAt).toLocaleDateString()
                        : 'Recent'}
                    </span>
                  </div>
                </div>
                {getStatusBadge(vid.status)}
              </div>

              {vid.metadata?.creativePrompt && (
                <p className="text-xs text-zinc-400 line-clamp-2 italic bg-zinc-950/50 p-2 rounded-lg border border-zinc-900">
                  "{vid.metadata.creativePrompt}"
                </p>
              )}

              <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800/60">
                {vid.previewUrl && (
                  <a
                    href={vid.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Preview</span>
                  </a>
                )}
                {vid.downloadUrl && (
                  <a
                    href={vid.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
