'use client'

import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  Film,
  Video,
  ListVideo,
  Globe,
  RotateCcw,
} from 'lucide-react'
import { OracleClient, ProcessResponse, SessionStatusResponse, getOracleApiBaseUrl } from '@/lib/oracle'
import { AuthGate } from './auth-gate'
import { UploadAndPromptForm } from './upload-and-prompt-form'
import { StageTracker } from './stage-tracker'
import { VideoPreviewAndRender } from './video-preview-and-render'
import { MyVideosList } from './my-videos-list'

export function OracleView() {
  const [userToken, setUserToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create')

  // Pipeline flow state
  const [currentProcess, setCurrentProcess] = useState<ProcessResponse | null>(null)
  const [completedStatus, setCompletedStatus] = useState<SessionStatusResponse | null>(null)
  const [masterDownloadUrl, setMasterDownloadUrl] = useState<string | null>(null)

  const baseUrl = useMemo(() => getOracleApiBaseUrl(), [])

  const client = useMemo(() => {
    return new OracleClient({
      baseUrl,
      token: userToken,
    })
  }, [baseUrl, userToken])

  const handleAuthenticated = (token: string, email: string) => {
    setUserToken(token)
    setUserEmail(email)
  }

  const handleSignOut = () => {
    setUserToken(null)
    setUserEmail(null)
    setCurrentProcess(null)
    setCompletedStatus(null)
    setMasterDownloadUrl(null)
  }

  const handleResetFlow = () => {
    setCurrentProcess(null)
    setCompletedStatus(null)
    setMasterDownloadUrl(null)
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                <span>Prometheus</span>
                <span className="text-orange-500">↔</span>
                <span className="text-zinc-300">Oracle</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Autonomous Video Editorial & Generation Pipeline
              </p>
            </div>
          </div>
        </div>

        {/* Gateway connection pill */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] truncate max-w-[200px]" title={baseUrl}>
              {baseUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Auth Gate Header / Authentication state */}
      <AuthGate
        onAuthenticated={handleAuthenticated}
        userToken={userToken}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      {/* Main app body - requires authenticated session */}
      {userToken && (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Create Video</span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'library'
                    ? 'bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <ListVideo className="w-4 h-4" />
                <span>My Videos</span>
              </button>
            </div>

            {activeTab === 'create' && currentProcess && (
              <button
                onClick={handleResetFlow}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Video</span>
              </button>
            )}
          </div>

          {/* Active Tab Content */}
          {activeTab === 'library' ? (
            <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
              <MyVideosList client={client} userToken={userToken} />
            </div>
          ) : (
            <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl backdrop-blur-sm">
              {/* Step 1: Intake & Upload Form */}
              {!currentProcess && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-zinc-100 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                      <span>Intake: Video Footage + Creative Prompt</span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Upload raw footage directly to storage and set your creative vision.
                      Transcripts and manifests are derived autonomously by the Oracle pipeline.
                    </p>
                  </div>
                  <UploadAndPromptForm
                    client={client}
                    userToken={userToken}
                    onProcessStarted={(proc) => setCurrentProcess(proc)}
                  />
                </div>
              )}

              {/* Step 2: Live Processing Stage Tracker */}
              {currentProcess && !completedStatus && (
                <StageTracker
                  client={client}
                  userToken={userToken}
                  sessionId={currentProcess.sessionId}
                  eventsUrl={currentProcess.urls?.events}
                  statusUrl={currentProcess.urls?.status}
                  initialStage={currentProcess.status}
                  onComplete={(status) => setCompletedStatus(status)}
                />
              )}

              {/* Step 3: Preview, Render & Download */}
              {currentProcess && completedStatus && (
                <VideoPreviewAndRender
                  client={client}
                  userToken={userToken}
                  sessionId={currentProcess.sessionId}
                  previewUrl={completedStatus.previewUrl || currentProcess.urls?.preview}
                  renderUrl={completedStatus.renderUrl || currentProcess.urls?.render}
                  onRenderCompleted={(dlUrl) => setMasterDownloadUrl(dlUrl)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
