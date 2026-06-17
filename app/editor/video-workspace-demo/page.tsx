'use client'

import * as React from 'react'

import { InfinityLoader, type InfinityLoaderMode } from '@/components/editor/InfinityLoader'
import { VideoWorkspace } from '@/components/editor/VideoWorkspace'
import type { PreviewFitMode, PreviewFramePreset } from '@/lib/types'

const ASPECT_RATIOS: Record<PreviewFramePreset, number> = {
  source: 16 / 10,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
}

const LOADER_MODES: InfinityLoaderMode[] = ['infinity', 'status', 'dock-hint']

export default function VideoWorkspaceDemoPage() {
  const [fitMode, setFitMode] = React.useState<PreviewFitMode>('fill')
  const [loaderMode, setLoaderMode] = React.useState<InfinityLoaderMode>('infinity')
  const [loading, setLoading] = React.useState(false)
  const [preset, setPreset] = React.useState<PreviewFramePreset>('16:9')

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setLoaderMode((current) => {
        const index = LOADER_MODES.indexOf(current)
        return LOADER_MODES[(index + 1) % LOADER_MODES.length]
      })
    }, 2600)

    return () => window.clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setLoading(true)
      window.setTimeout(() => setLoading(false), 1400)
    }, 5200)

    return () => window.clearInterval(interval)
  }, [])

  const mockAspectRatio = ASPECT_RATIOS[preset]
  const frameWidth = `min(82%, calc((clamp(250px, 40vh, 460px) - 2rem) * ${mockAspectRatio.toFixed(4)}))`

  return (
    <main className="min-h-screen bg-[#0A0A0C] px-6 py-10 text-[#EAEAEA]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <VideoWorkspace
          hasMedia
          loading={loading}
          aspectPreset={preset}
          fitMode={fitMode}
          onAspectPresetChange={setPreset}
          onFitModeChange={setFitMode}
          onImport={() => {
            setLoaderMode('infinity')
            setLoading(true)
            window.setTimeout(() => setLoading(false), 1400)
          }}
          onEmptyClick={() => undefined}
          onEmptyDragLeave={() => undefined}
          onEmptyDragOver={(event) => event.preventDefault()}
          onEmptyDrop={(event) => event.preventDefault()}
          className="min-h-[520px]"
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="relative overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
              style={{
                aspectRatio: mockAspectRatio,
                width: frameWidth,
                transition:
                  'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(234,234,234,0.18)_0%,rgba(234,234,234,0)_32%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015))]" />
              <div
                className="absolute inset-8 rounded-[18px] border border-[rgba(255,255,255,0.08)]"
                style={{
                  objectFit: fitMode === 'fill' ? 'cover' : 'contain',
                }}
              />
            </div>
          </div>
        </VideoWorkspace>

        <div className="flex flex-wrap items-center gap-2">
          {LOADER_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setLoaderMode(mode)
                setLoading(true)
                window.setTimeout(() => setLoading(false), 1400)
              }}
              className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[12px] text-[#888] transition-colors hover:bg-[rgba(255,255,255,0.07)] hover:text-[#EAEAEA]"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <InfinityLoader
        visible={loading}
        mode={loaderMode}
        title="Preparing preview"
        subtitle="Testing artifact-free overlay"
      />
    </main>
  )
}
