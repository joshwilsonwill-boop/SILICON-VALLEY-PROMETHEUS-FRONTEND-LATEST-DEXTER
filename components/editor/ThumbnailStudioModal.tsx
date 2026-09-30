'use client'

import * as React from 'react'
import { ThumbnailEngine, type ExtractedFrameCandidate, type ThumbnailTextPosition } from '@/lib/thumbnails/thumbnail-engine'
import { VIRAL_THUMBNAIL_RECIPES } from '@/lib/thumbnails/nano-banana-rulebook'
import { DEFAULT_STUDIO_DESIGN, STUDIO_LAYOUTS, type StudioDesign, type StudioLayout } from '@/lib/thumbnails/studio-art-direction'
import { renderStudioDraft } from '@/lib/thumbnails/studio-draft'
import { readThumbnailGenerationResponse } from '@/lib/thumbnails/thumbnail-response'
import { ThumbnailWorkspace, type ThumbnailVariant } from '@/components/editor/thumbnail-studio/ThumbnailWorkspace'

interface ThumbnailStudioModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
  videoElement?: HTMLVideoElement | null
  videoUrl?: string | null
  transcriptSnippet?: string
  onSaveProjectThumbnail?: (dataUrl: string) => void
}

interface AiCurationResponse {
  recommendedFrameIndex: number
  hookTitles: string[]
}

export type StudioAspectRatio = '9:16' | '2:3' | '1:1' | '3:2' | '16:9'
const DIMENSIONS: Record<StudioAspectRatio, [number, number]> = { '16:9': [1280,720], '3:2': [1440,960], '1:1': [1080,1080], '9:16': [720,1280], '2:3': [720,1080] }

export type SpatialPointId =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface SpatialPositionConfig {
  id: SpatialPointId
  label: string
  row: ThumbnailTextPosition
  align: 'left' | 'center' | 'right'
}

export const SPATIAL_POSITIONS: SpatialPositionConfig[] = [
  { id: 'top-left', label: 'TL', row: 'top', align: 'left' },
  { id: 'top-center', label: 'TC', row: 'top', align: 'center' },
  { id: 'top-right', label: 'TR', row: 'top', align: 'right' },
  { id: 'center-left', label: 'CL', row: 'center', align: 'left' },
  { id: 'center', label: 'CC', row: 'center', align: 'center' },
  { id: 'center-right', label: 'CR', row: 'center', align: 'right' },
  { id: 'bottom-left', label: 'BL', row: 'bottom', align: 'left' },
  { id: 'bottom-center', label: 'BC', row: 'bottom', align: 'center' },
  { id: 'bottom-right', label: 'BR', row: 'bottom', align: 'right' },
]


function readImage(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > maxBytes) {
      reject(new Error('Use a PNG, JPEG, or WebP image under ' + Math.round(maxBytes / 1024 / 1024) + ' MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read that image.'))
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.readAsDataURL(file)
  })
}

export function ThumbnailStudioModal({ isOpen, onClose, projectId, projectTitle, videoElement, videoUrl, transcriptSnippet = '', onSaveProjectThumbnail }: ThumbnailStudioModalProps) {
  const [candidates, setCandidates] = React.useState<ExtractedFrameCandidate[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = React.useState(0)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [isAiCurating, setIsAiCurating] = React.useState(false)
  const [aiData, setAiData] = React.useState<AiCurationResponse | null>(null)
  const [aspectRatio, setAspectRatio] = React.useState<StudioAspectRatio>('16:9')
  const [design, setDesign] = React.useState<StudioDesign>({ ...DEFAULT_STUDIO_DESIGN })
  const [headline, setHeadline] = React.useState(() => projectTitle?.trim() && projectTitle !== 'Untitled Project' ? projectTitle.trim().slice(0,64) : '')
  const [highlightWord, setHighlightWord] = React.useState('')
  const [creativeDirection, setCreativeDirection] = React.useState('')
  const [recipeId, setRecipeId] = React.useState(VIRAL_THUMBNAIL_RECIPES[0].id)
  const [channelReferences, setChannelReferences] = React.useState<string[]>([])
  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | null>(null)
  const [layoutPreviews, setLayoutPreviews] = React.useState<Partial<Record<StudioLayout,string>>>({})
  const [generatedDataUrl, setGeneratedDataUrl] = React.useState<string | null>(null)
  const [variants, setVariants] = React.useState<ThumbnailVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null)
  const [isGeneratingNano, setIsGeneratingNano] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)
  const [nanoErrorMessage, setNanoErrorMessage] = React.useState<string | null>(null)
  const [nanoSuccessMessage, setNanoSuccessMessage] = React.useState<string | null>(null)
  const generationAbortRef = React.useRef<AbortController | null>(null)
  const curationAbortRef = React.useRef<AbortController | null>(null)
  const headlineTouchedRef = React.useRef(false)
  const frameTouchedRef = React.useRef(false)
  const candidatesRef = React.useRef(candidates)
  const extractedSourceRef = React.useRef('')
  const generatedSignatureRef = React.useRef('')
  const fileReadEpochRef = React.useRef(0)
  const pendingReferenceCountRef = React.useRef(0)
  const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeFrame = candidates[selectedFrameIndex]
  const requestSignature = React.useMemo(() => JSON.stringify({ frameDataUrl: activeFrame?.dataUrl, headline, highlightWord, aspectRatio, studioDesign: design, recipeId, userPrompt: creativeDirection, referenceImages: channelReferences }), [activeFrame, headline, highlightWord, aspectRatio, design, recipeId, creativeDirection, channelReferences])
  const currentSignatureRef = React.useRef(requestSignature)
  const currentGeneratedUrlRef = React.useRef(generatedDataUrl)

  React.useEffect(() => { currentSignatureRef.current = requestSignature }, [requestSignature])
  React.useEffect(() => { currentGeneratedUrlRef.current = generatedDataUrl }, [generatedDataUrl])
  React.useEffect(() => { candidatesRef.current = candidates }, [candidates])
  React.useEffect(() => {
    generationAbortRef.current?.abort()
    setIsGeneratingNano(false)
    if (generatedSignatureRef.current !== requestSignature) {
      setGeneratedDataUrl(null)
      setSelectedVariantId(null)
      setNanoSuccessMessage(null)
      setSavedSuccess(false)
    }
  }, [requestSignature])
  React.useEffect(() => {
    if (!isOpen) { generationAbortRef.current?.abort(); curationAbortRef.current?.abort(); fileReadEpochRef.current++; setIsGeneratingNano(false); setIsAiCurating(false) }
  }, [isOpen])
  React.useEffect(() => () => { generationAbortRef.current?.abort(); curationAbortRef.current?.abort(); fileReadEpochRef.current++; if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }, [])

  React.useEffect(() => {
    if (!isOpen) return
    const sourceKey = projectId + ':' + (videoUrl ?? videoElement?.currentSrc ?? '')
    if (extractedSourceRef.current === sourceKey && candidatesRef.current.length) return
    let cancelled = false
    const controller = new AbortController()
    curationAbortRef.current = controller
    setIsExtracting(true)
    setNanoErrorMessage(null)
    setPreviewDataUrl(null)
    setLayoutPreviews({})
    setCandidates([])
    setAiData(null)
    frameTouchedRef.current = false
    const extract = async () => {
      try {
        let frames: ExtractedFrameCandidate[] = []
        if (videoElement && videoElement.readyState >= 2) {
          const current = ThumbnailEngine.captureFrameFromVideo(videoElement)
          frames = await ThumbnailEngine.extractCandidateFrames(videoElement, 6)
          if (current) frames.unshift(current)
        } else if (videoUrl) frames = await ThumbnailEngine.extractCandidateFrames(videoUrl, 7)
        if (cancelled || controller.signal.aborted) return
        extractedSourceRef.current = sourceKey
        setCandidates(frames)
        setSelectedFrameIndex(0)
        setIsExtracting(false)
        if (!frames.length) return
        setIsAiCurating(true)
        const response = await fetch('/api/projects/' + projectId + '/thumbnails/ai-curate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ frames: frames.slice(0,6).map(frame => ({ timeSec: frame.timeSec, timecode: frame.timecode, dataUrl: frame.dataUrl })), transcriptSnippet, projectTitle }),
        })
        if (!response.ok) return
        const data = await response.json() as AiCurationResponse
        if (cancelled || controller.signal.aborted) return
        const recommendedFrameIndex = Number.isInteger(data.recommendedFrameIndex) && data.recommendedFrameIndex >= 0 && data.recommendedFrameIndex < Math.min(frames.length,6) ? data.recommendedFrameIndex : 0
        const hookTitles = Array.isArray(data.hookTitles) ? data.hookTitles.filter((hook): hook is string => typeof hook === 'string' && Boolean(hook.trim())).map(hook => hook.slice(0,64)) : []
        setAiData({ recommendedFrameIndex, hookTitles })
        if (!frameTouchedRef.current) setSelectedFrameIndex(recommendedFrameIndex)
        if (!headlineTouchedRef.current && hookTitles.length) setHeadline(hookTitles[0])
      } catch (error) {
        if (!cancelled && !controller.signal.aborted && !candidatesRef.current.length) setNanoErrorMessage(error instanceof Error ? error.message : 'Could not extract video frames. Try adding a source image.')
      } finally { if (!cancelled) { setIsExtracting(false); setIsAiCurating(false) } }
    }
    void extract()
    return () => { cancelled = true; controller.abort() }
  }, [isOpen, projectId, projectTitle, videoElement, videoUrl, transcriptSnippet])

  React.useEffect(() => {
    if (!isOpen || !activeFrame) return
    let cancelled = false
    const timer = setTimeout(() => {
      const [width,height] = DIMENSIONS[aspectRatio]
      void renderStudioDraft(activeFrame.dataUrl, headline, highlightWord, design, width, height)
        .then(url => { if (!cancelled) setPreviewDataUrl(url) })
        .catch(error => { if (!cancelled) setNanoErrorMessage(error instanceof Error ? error.message : 'Could not prepare the preview.') })
    }, 120)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [isOpen, activeFrame, headline, highlightWord, design, aspectRatio])
  React.useEffect(() => {
    if (!isOpen || !activeFrame) return
    let cancelled = false
    const timer = setTimeout(() => {
      void Promise.all(STUDIO_LAYOUTS.map(async layout => [layout.id, await renderStudioDraft(activeFrame.dataUrl, headline, highlightWord, { ...design, layout: layout.id }, 480,270)] as const))
        .then(entries => { if (!cancelled) setLayoutPreviews(Object.fromEntries(entries)) }).catch(() => {})
    }, 240)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [isOpen, activeFrame, headline, highlightWord, design])

  const handleHeadline = (value: string) => { headlineTouchedRef.current = true; setHeadline(value.slice(0,64)); if (!value.split(/\s+/).includes(highlightWord)) setHighlightWord('') }
  const handleFrame = (index: number) => { frameTouchedRef.current = true; setSelectedFrameIndex(index) }
  const handleCaptureCurrentPlayhead = () => {
    if (!videoElement) return
    const frame = ThumbnailEngine.captureFrameFromVideo(videoElement)
    if (!frame) { setNanoErrorMessage('Wait for the video to load before capturing a frame.'); return }
    frameTouchedRef.current = true
    setCandidates(previous => [frame,...previous].slice(0,24))
    setSelectedFrameIndex(0)
    setNanoErrorMessage(null)
  }
  const handleAddReferenceImages = async (files: File[]) => {
    if (!files.length) return
    if (files.length + channelReferences.length + pendingReferenceCountRef.current > 4) { setNanoErrorMessage('You can use up to four style references. Remove one before adding more.'); return }
    const epoch = fileReadEpochRef.current
    pendingReferenceCountRef.current += files.length
    try {
      const images = await Promise.all(files.map(file => readImage(file,5 * 1024 * 1024)))
      if (epoch !== fileReadEpochRef.current) return
      setChannelReferences(previous => Array.from(new Set([...previous,...images])).slice(0,4))
      setNanoErrorMessage(null)
    } catch (error) { if (epoch === fileReadEpochRef.current) setNanoErrorMessage(error instanceof Error ? error.message : 'Could not read that image.') }
    finally { pendingReferenceCountRef.current -= files.length }
  }
  const handleUploadFrame = async (files: File[]) => {
    if (!files[0]) return
    const epoch = fileReadEpochRef.current
    try {
      const dataUrl = await readImage(files[0],10 * 1024 * 1024)
      const image = new Image()
      image.src = dataUrl
      await image.decode()
      if (epoch !== fileReadEpochRef.current) return
      frameTouchedRef.current = true
      curationAbortRef.current?.abort()
      setCandidates(previous => [{ dataUrl, timeSec: 0, timecode: 'Still', width: image.width, height: image.height },...previous].slice(0,24))
      setSelectedFrameIndex(0)
      setNanoErrorMessage(null)
    } catch (error) { if (epoch === fileReadEpochRef.current) setNanoErrorMessage(error instanceof Error ? error.message : 'Could not load the source image.') }
  }
  const handleCancelGeneration = () => { generationAbortRef.current?.abort(); setIsGeneratingNano(false); setNanoSuccessMessage('Generation cancelled. Your previous versions are still available.') }
  const handleGenerateNanoBanana = async () => {
    if (!activeFrame || !headline.trim() || isGeneratingNano) return
    generationAbortRef.current?.abort()
    const controller = new AbortController()
    generationAbortRef.current = controller
    const timeout = setTimeout(() => { if (!controller.signal.aborted) { controller.abort(); setIsGeneratingNano(false); setNanoErrorMessage('Generation took too long. Your versions are safe. Try again with Nano Banana 2.'); } },180000)
    setIsGeneratingNano(true)
    setNanoErrorMessage(null)
    setNanoSuccessMessage(null)
    const signature = requestSignature
    try {
      const recipe = VIRAL_THUMBNAIL_RECIPES.find(item => item.id === recipeId)!
      const response = await fetch('/api/projects/' + projectId + '/thumbnails/nano-banana', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ frameDataUrl: activeFrame.dataUrl, headline: headline.trim(), highlightWord, recipeId, backgroundId: recipe.backgroundStyle, textTreatmentId: recipe.textTreatmentStyle, proofArtifactId: recipe.proofArtifact, directionalId: recipe.directionalStyle, lightingId: recipe.lightingStyle, brandColor: design.accent, aspectRatio, userPrompt: creativeDirection.trim(), referenceImages: channelReferences, lockChannelStyle: channelReferences.length > 0, studioDesign: design }),
      })
      const data = await readThumbnailGenerationResponse(response)
      if (controller.signal.aborted) return
      if (!response.ok || typeof data.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(data.dataUrl)) throw new Error(typeof data.error === 'string' ? data.error : 'Nano Banana did not return an image. Try another frame or direction.')
      const generatedImage = new Image()
      generatedImage.src = data.dataUrl
      await generatedImage.decode()
      if (controller.signal.aborted) return
      const variant: ThumbnailVariant = { id: crypto.randomUUID(), dataUrl: data.dataUrl, headline, emphasis: highlightWord, aspectRatio, design: { ...design }, frame: activeFrame, creativeDirection, recipeId, references: [...channelReferences] }
      generatedSignatureRef.current = signature
      setGeneratedDataUrl(data.dataUrl)
      setVariants(previous => [...previous,variant].slice(-8))
      setSelectedVariantId(variant.id)
      setNanoSuccessMessage('Thumbnail ready. Save it or create another version.')
      setSavedSuccess(false)
    } catch (error) { if (!controller.signal.aborted) setNanoErrorMessage(error instanceof Error ? error.message : 'Thumbnail generation failed. Try again.') }
    finally { clearTimeout(timeout); if (!controller.signal.aborted) setIsGeneratingNano(false) }
  }
  const handleRestoreVariant = (variant: ThumbnailVariant) => {
    generationAbortRef.current?.abort()
    curationAbortRef.current?.abort()
    headlineTouchedRef.current = true
    frameTouchedRef.current = true
    const index = candidates.findIndex(frame => frame.dataUrl === variant.frame.dataUrl)
    if (index < 0) { setCandidates(previous => [variant.frame,...previous].slice(0,24)); setSelectedFrameIndex(0) } else setSelectedFrameIndex(index)
    generatedSignatureRef.current = JSON.stringify({ frameDataUrl: variant.frame.dataUrl, headline: variant.headline, highlightWord: variant.emphasis, aspectRatio: variant.aspectRatio, studioDesign: variant.design, recipeId: variant.recipeId, userPrompt: variant.creativeDirection, referenceImages: variant.references })
    setHeadline(variant.headline)
    setHighlightWord(variant.emphasis)
    setAspectRatio(variant.aspectRatio as StudioAspectRatio)
    setDesign({ ...variant.design })
    setRecipeId(variant.recipeId)
    setCreativeDirection(variant.creativeDirection)
    setChannelReferences([...variant.references])
    setGeneratedDataUrl(variant.dataUrl)
    setSelectedVariantId(variant.id)
    setIsGeneratingNano(false)
    setNanoErrorMessage(null)
    setNanoSuccessMessage('Version restored with its original design.')
    setSavedSuccess(false)
  }
  const handleDownload = () => {
    if (!generatedDataUrl) return
    const extension = generatedDataUrl.startsWith('data:image/png') ? 'png' : generatedDataUrl.startsWith('data:image/webp') ? 'webp' : 'jpg'
    const link = document.createElement('a')
    link.href = generatedDataUrl
    link.download = (headline || projectTitle || 'thumbnail').toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,60) + '_' + aspectRatio.replace(':','x') + '.' + extension
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  const handleSaveCover = async () => {
    if (!generatedDataUrl || isExporting) return
    const activeUrl = generatedDataUrl
    const savedSignature = requestSignature
    setIsExporting(true)
    setNanoErrorMessage(null)
    try {
      const response = await fetch('/api/projects/' + projectId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thumbnailUrl: activeUrl }) })
      if (!response.ok) throw new Error('Could not save the project cover. Your thumbnail is still available to download.')
      onSaveProjectThumbnail?.(activeUrl)
      if (currentSignatureRef.current === savedSignature && currentGeneratedUrlRef.current === activeUrl) {
        setSavedSuccess(true)
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSavedSuccess(false),2400)
      }
    } catch (error) { setNanoErrorMessage(error instanceof Error ? error.message : 'Could not save the thumbnail.') }
    finally { setIsExporting(false) }
  }

  if (!isOpen) return null
  return <ThumbnailWorkspace projectTitle={projectTitle} aspectRatio={aspectRatio} onAspectRatio={setAspectRatio} design={design} onDesign={update => setDesign(previous => ({ ...previous,...update }))} headline={headline} onHeadline={handleHeadline} emphasis={highlightWord} onEmphasis={setHighlightWord} creativeDirection={creativeDirection} onCreativeDirection={setCreativeDirection} recipeId={recipeId} onRecipe={setRecipeId} candidates={candidates} selectedFrameIndex={selectedFrameIndex} onFrame={handleFrame} isExtracting={isExtracting} isCurating={isAiCurating} recommendedFrameIndex={aiData?.recommendedFrameIndex} hookTitles={aiData?.hookTitles ?? []} onCapture={videoElement ? handleCaptureCurrentPlayhead : undefined} onUploadFrame={files => { void handleUploadFrame(files) }} previewUrl={previewDataUrl} generatedUrl={generatedDataUrl} layoutPreviews={layoutPreviews} references={channelReferences} onReferences={files => { void handleAddReferenceImages(files) }} onRemoveReference={index => setChannelReferences(previous => previous.filter((_,i) => i !== index))} variants={variants} selectedVariantId={selectedVariantId} onVariant={handleRestoreVariant} isGenerating={isGeneratingNano} onGenerate={() => { void handleGenerateNanoBanana() }} onCancel={handleCancelGeneration} error={nanoErrorMessage} success={nanoSuccessMessage} onDownload={handleDownload} onSave={() => { void handleSaveCover() }} isSaving={isExporting} saved={savedSuccess} onClose={onClose} />
}
