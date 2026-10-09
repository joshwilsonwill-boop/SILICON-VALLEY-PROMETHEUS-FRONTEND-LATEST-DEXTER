'use client'

import * as React from 'react'
import { ThumbnailWorkspace, type ThumbnailVariant } from '@/components/editor/thumbnail-studio/ThumbnailWorkspace'
import { DEFAULT_STUDIO_DESIGN } from '@/lib/thumbnails/studio-art-direction'
import { STUDIO_REFERENCES } from '@/lib/thumbnails/studio-references'
import { VIRAL_THUMBNAIL_RECIPES } from '@/lib/thumbnails/nano-banana-rulebook'

export const THUMBNAIL_FIXTURE_GENERATION_DELAY_MS = 750

export default function ThumbnailWorkspaceFixture() {
  const [open, setOpen] = React.useState(true)
  const [aspectRatio, setAspectRatio] = React.useState<'16:9' | '3:2' | '1:1' | '9:16' | '2:3'>('16:9')
  const [design, setDesign] = React.useState(DEFAULT_STUDIO_DESIGN)
  const [headline, setHeadline] = React.useState('A BETTER FIRST LOOK')
  const [emphasis, setEmphasis] = React.useState('')
  const [creativeDirection, setCreativeDirection] = React.useState('')
  const [recipeId, setRecipeId] = React.useState<string>(VIRAL_THUMBNAIL_RECIPES[0].id)
  const [referenceId, setReferenceId] = React.useState(STUDIO_REFERENCES[0].id)
  const [frameIndex, setFrameIndex] = React.useState(0)
  const [candidates, setCandidates] = React.useState(STUDIO_REFERENCES.slice(0, 3).map((reference, index) => ({
    timeSec: index, timecode: `00:0${index}`, dataUrl: reference.src, width: 1280, height: 720,
  })))
  const [references, setReferences] = React.useState<string[]>([])
  const [variants, setVariants] = React.useState<ThumbnailVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const generationTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const variantSequence = React.useRef(0)
  const mounted = React.useRef(true)
  React.useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (generationTimer.current) clearTimeout(generationTimer.current) }
  }, [])
  const cancel = () => {
    if (generationTimer.current) clearTimeout(generationTimer.current)
    generationTimer.current = null
    setIsGenerating(false)
  }
  const generate = (prompt = creativeDirection) => {
    const frame = candidates[frameIndex]
    if (!frame || !headline.trim() || isGenerating) return
    setSaved(false)
    setCreativeDirection(prompt)
    setIsGenerating(true)
    generationTimer.current = setTimeout(() => {
      generationTimer.current = null
      const variant: ThumbnailVariant = {
        id: `fixture-${++variantSequence.current}`, dataUrl: frame.dataUrl, headline, emphasis, aspectRatio,
        design: { ...design }, frame, creativeDirection: prompt, recipeId, references: [...references], referenceId,
      }
      setVariants(previous => [...previous, variant])
      setSelectedVariantId(variant.id)
      setGeneratedUrl(variant.dataUrl)
      setIsGenerating(false)
    }, THUMBNAIL_FIXTURE_GENERATION_DELAY_MS)
  }
  const readUploads = async (files: File[]) => {
    const accepted = files.filter(file => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024)
    if (accepted.length !== files.length) setError('Use PNG, JPG or WebP files up to 5 MB.')
    else setError(null)
    return Promise.all(accepted.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read this image.'))
      reader.readAsDataURL(file)
    })))
  }
  const uploadFrame = async (files: File[]) => {
    try {
      const uploads = await readUploads(files.slice(0, 1))
      if (!mounted.current || !uploads[0]) return
      setFrameIndex(candidates.length)
      setCandidates(previous => [...previous, { timeSec: previous.length, timecode: 'Uploaded', dataUrl: uploads[0], width: 1280, height: 720 }])
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not read this image.') }
  }
  const uploadReferences = async (files: File[]) => {
    try {
      const uploads = await readUploads(files.slice(0, Math.max(0, 3 - references.length)))
      if (mounted.current) setReferences(previous => [...new Set([...previous, ...uploads])].slice(0, 3))
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Could not read these images.') }
  }
  const restore = (variant: ThumbnailVariant) => {
    cancel()
    setHeadline(variant.headline); setEmphasis(variant.emphasis); setCreativeDirection(variant.creativeDirection)
    setAspectRatio(variant.aspectRatio as typeof aspectRatio); setDesign(variant.design); setRecipeId(variant.recipeId)
    setReferences([...variant.references]); setReferenceId(variant.referenceId)
    setFrameIndex(candidates.findIndex(frame => frame.dataUrl === variant.frame.dataUrl))
    setGeneratedUrl(variant.dataUrl); setSelectedVariantId(variant.id); setSaved(false)
  }
  const download = () => {
    if (!generatedUrl) return
    const anchor = document.createElement('a')
    anchor.href = generatedUrl
    const format = /^data:image\/(png|jpeg|webp);/i.exec(generatedUrl)?.[1] ?? 'webp'
    anchor.download = 'thumbnail-fixture.' + (format === 'jpeg' ? 'jpg' : format)
    anchor.click()
  }
  return <div style={{ height: '100vh', overflow: 'hidden', transform: 'translateZ(0)' }}>
    <p>Thumbnail fixture: generation copies the selected frame. Saves are local to this preview; no account requests are made.</p>
    <button type="button" onClick={() => setOpen(true)}>Open Thumbnail Studio</button>
    <button type="button" onClick={() => { cancel(); setCandidates([]); setFrameIndex(0); setGeneratedUrl(null); setSaved(false); setOpen(true) }}>Start with an uploaded source</button>
    {open && <ThumbnailWorkspace
      projectTitle="Thumbnail layout regression fixture"
      aspectRatio={aspectRatio} onAspectRatio={setAspectRatio}
      design={design} onDesign={update => setDesign(previous => ({ ...previous, ...update }))}
      headline={headline} onHeadline={value => { setHeadline(value); setSaved(false) }} emphasis={emphasis} onEmphasis={setEmphasis}
      creativeDirection={creativeDirection} onCreativeDirection={setCreativeDirection} recipeId={recipeId} onRecipe={setRecipeId}
      candidates={candidates} selectedFrameIndex={frameIndex} onFrame={setFrameIndex}
      isExtracting={false} isCurating={false} hookTitles={['A better first impression', 'Make every frame count']} onUploadFrame={files => { void uploadFrame(files) }}
      generatedUrl={generatedUrl} referenceId={referenceId} onReference={setReferenceId}
      references={references} onReferences={files => { void uploadReferences(files) }} onRemoveReference={index => setReferences(previous => previous.filter((_, item) => item !== index))}
      variants={variants} selectedVariantId={selectedVariantId} onVariant={restore}
      isGenerating={isGenerating} onGenerate={() => generate()} onCancel={cancel}
      error={error} success={saved ? 'Saved in the local fixture.' : null} onDownload={download} onSave={() => setSaved(true)}
      isSaving={false} saved={saved} onClose={() => { cancel(); setOpen(false) }} onIterateThumbnail={generate}
    />}
  </div>
}
