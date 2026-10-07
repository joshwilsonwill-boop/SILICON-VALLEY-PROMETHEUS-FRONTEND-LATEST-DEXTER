import React from 'react'
import { createRoot } from 'react-dom/client'
import { MotionEditWorkspace } from '../../components/editor/motion-edit-workspace'

function Harness() {
  const [fitMode, setFitMode] = React.useState<'fit' | 'fill'>('fill')
  const videoRef = React.useRef<HTMLVideoElement>(null)
  return <div style={{ width: '100vw', height: '100vh' }}>
    <MotionEditWorkspace
      projectTitle="Timeline resize check"
      previewUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1600'%3E%3Crect width='900' height='1600' fill='%23353d45'/%3E%3C/svg%3E"
      previewKind="image"
      hasPreviewMedia
      previewAspectRatio={9 / 16}
      fitMode={fitMode}
      onFitModeChange={setFitMode}
      objectFit="cover"
      currentTimeLabel="00:04"
      durationLabel="00:12"
      currentTimeSec={4}
      durationSec={12}
      previewPlaying={false}
      previewMuted
      videoRef={videoRef}
      onPreviewMutedChange={() => {}}
      onTogglePlayback={() => {}}
      onPickSource={() => { (window as any).__pickedSourceCount = ((window as any).__pickedSourceCount || 0) + 1 }}
      onSeek={() => {}}
      transcriptSegments={[]}
    />
  </div>
}

createRoot(document.getElementById('root')!).render(<Harness />)
