'use client'

import * as React from 'react'
import { ThumbnailWorkspace } from '@/components/editor/thumbnail-studio/ThumbnailWorkspace'
import { DEFAULT_STUDIO_DESIGN } from '@/lib/thumbnails/studio-art-direction'
import { STUDIO_REFERENCES } from '@/lib/thumbnails/studio-references'

export default function ThumbnailWorkspaceFixture() {
  const [open, setOpen] = React.useState(true)
  const [aspectRatio, setAspectRatio] = React.useState<'16:9' | '3:2' | '1:1' | '9:16' | '2:3'>('16:9')
  const [design, setDesign] = React.useState(DEFAULT_STUDIO_DESIGN)
  const [headline, setHeadline] = React.useState('A BETTER FIRST LOOK')
  const [referenceId, setReferenceId] = React.useState(STUDIO_REFERENCES[0].id)
  const [frameIndex, setFrameIndex] = React.useState(0)
  const candidates = STUDIO_REFERENCES.slice(0, 3).map((reference, index) => ({
    timeSec: index, timecode: `00:0${index}`, dataUrl: reference.src, width: 1280, height: 720,
  }))
  return <div style={{ height: '100vh', overflow: 'hidden', transform: 'translateZ(0)' }}>
    <button type="button" onClick={() => setOpen(true)}>Open Thumbnail Studio</button>
    {open && <ThumbnailWorkspace
      projectTitle="Thumbnail layout regression fixture"
      aspectRatio={aspectRatio} onAspectRatio={setAspectRatio}
      design={design} onDesign={update => setDesign(previous => ({ ...previous, ...update }))}
      headline={headline} onHeadline={setHeadline} emphasis="" onEmphasis={() => {}}
      creativeDirection="" onCreativeDirection={() => {}} recipeId="impact" onRecipe={() => {}}
      candidates={candidates} selectedFrameIndex={frameIndex} onFrame={setFrameIndex}
      isExtracting={false} isCurating={false} hookTitles={[]} onUploadFrame={() => {}}
      generatedUrl={null} referenceId={referenceId} onReference={setReferenceId}
      references={[]} onReferences={() => {}} onRemoveReference={() => {}}
      variants={[]} selectedVariantId={null} onVariant={() => {}}
      isGenerating={false} onGenerate={() => {}} onCancel={() => {}}
      error={null} success={null} onDownload={() => {}} onSave={() => {}}
      isSaving={false} saved={false} onClose={() => setOpen(false)}
    />}
  </div>
}
