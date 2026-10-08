'use client'

import * as React from 'react'
import { ThumbnailEngine, type ExtractedFrameCandidate, type ThumbnailTextPosition } from '@/lib/thumbnails/thumbnail-engine'
import { VIRAL_THUMBNAIL_RECIPES } from '@/lib/thumbnails/nano-banana-rulebook'
import { DEFAULT_STUDIO_DESIGN, type StudioDesign } from '@/lib/thumbnails/studio-art-direction'
import { STUDIO_REFERENCES, getStudioReference, type StudioReferenceId } from '@/lib/thumbnails/studio-references'
import { readThumbnailGenerationResponse } from '@/lib/thumbnails/thumbnail-response'
import { isThumbnailRequestWithinBudget } from '@/lib/thumbnails/thumbnail-request'
import { THUMBNAIL_CLIENT_TIMEOUT_MS } from '@/lib/thumbnails/thumbnail-runtime'
import { ThumbnailWorkspace, type ThumbnailVariant, type ThumbnailChatMessage } from '@/components/editor/thumbnail-studio/ThumbnailWorkspace'

interface ThumbnailStudioModalProps {
  isOpen: boolean
  onClose: () => void
  jarvisDraft?: {
    id: number
    creativeDirection?: string
    headline?: string
    referenceId?: StudioReferenceId
    generateNow?: boolean
    isIterative?: boolean
    iterationPrompt?: string
    baseThumbnailUrl?: string
    aspectRatio?: string
  } | null
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


async function readCompactReference(file: File): Promise<string> {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Use a PNG, JPEG, or WebP reference under 5 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare that reference image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not prepare that reference image.')), 'image/webp', 0.82))
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not prepare that reference image.'))
      reader.onerror = () => reject(new Error('Could not prepare that reference image.'))
      reader.readAsDataURL(blob)
    })
  } finally { bitmap.close() }
}

async function readCompactFrame(file: File): Promise<string> {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Use a PNG, JPEG, or WebP source under 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare that source image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not prepare that source image.')), 'image/jpeg', 0.82))
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not prepare that source image.'))
      reader.onerror = () => reject(new Error('Could not prepare that source image.'))
      reader.readAsDataURL(blob)
    })
  } finally { bitmap.close() }
}

async function readStudioReference(id: StudioReferenceId): Promise<string> {
  const reference = getStudioReference(id)
  const response = await fetch(reference.src)
  if (!response.ok) throw new Error('Could not load the selected visual reference.')
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not load the selected visual reference.'))
    reader.onerror = () => reject(new Error('Could not load the selected visual reference.'))
    reader.readAsDataURL(blob)
  })
}

export function ThumbnailStudioModal({ isOpen, onClose, jarvisDraft, projectId, projectTitle, videoElement, videoUrl, transcriptSnippet = '', onSaveProjectThumbnail }: ThumbnailStudioModalProps) {
  const [candidates, setCandidates] = React.useState<ExtractedFrameCandidate[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = React.useState(0)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [isAiCurating, setIsAiCurating] = React.useState(false)
  const [aiData, setAiData] = React.useState<AiCurationResponse | null>(null)
  const [aspectRatio, setAspectRatio] = React.useState<StudioAspectRatio>('16:9')
  const [design, setDesign] = React.useState<StudioDesign>({ ...DEFAULT_STUDIO_DESIGN })
  const [referenceId, setReferenceId] = React.useState<StudioReferenceId>(STUDIO_REFERENCES[0].id)
  const [headline, setHeadline] = React.useState(() => projectTitle?.trim() && projectTitle !== 'Untitled Project' ? projectTitle.trim().slice(0,64) : '')
  const [highlightWord, setHighlightWord] = React.useState('')
  const [creativeDirection, setCreativeDirection] = React.useState('')
  const [recipeId, setRecipeId] = React.useState(VIRAL_THUMBNAIL_RECIPES[0].id)
  const [channelReferences, setChannelReferences] = React.useState<string[]>([])
  const [generatedDataUrl, setGeneratedDataUrl] = React.useState<string | null>(null)
  const [variants, setVariants] = React.useState<ThumbnailVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null)
  const [isGeneratingNano, setIsGeneratingNano] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [savedSuccess, setSavedSuccess] = React.useState(false)
  const [nanoErrorMessage, setNanoErrorMessage] = React.useState<string | null>(null)
  const [nanoSuccessMessage, setNanoSuccessMessage] = React.useState<string | null>(null)
  const [chatMessages, setChatMessages] = React.useState<ThumbnailChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to Thumbnail Studio. Select a keyframe or describe how you want to refine your thumbnail.',
    },
  ])
  const generationAbortRef = React.useRef<AbortController | null>(null)
  const curationAbortRef = React.useRef<AbortController | null>(null)
  const headlineTouchedRef = React.useRef(false)
  const frameTouchedRef = React.useRef(false)
  const candidatesRef = React.useRef(candidates)
  const extractedSourceRef = React.useRef('')
  const generatedSignatureRef = React.useRef('')
  const fileReadEpochRef = React.useRef(0)
  const pendingReferenceCountRef = React.useRef(0)
  const appliedJarvisDraftIdRef = React.useRef<number | null>(null)
  const autoGenerateQueuedRef = React.useRef(false)
  const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeFrame = candidates[selectedFrameIndex]
  const lastActiveFrameDataUrlRef = React.useRef<string | undefined>(undefined)
  const requestSignature = React.useMemo(() => JSON.stringify({ frameDataUrl: activeFrame?.dataUrl, headline, highlightWord, aspectRatio, studioDesign: design, recipeId, userPrompt: creativeDirection, referenceImages: channelReferences, studioReferenceId: referenceId }), [activeFrame, headline, highlightWord, aspectRatio, design, recipeId, creativeDirection, channelReferences, referenceId])
  const currentSignatureRef = React.useRef(requestSignature)
  const currentGeneratedUrlRef = React.useRef(generatedDataUrl)

  React.useEffect(() => { currentSignatureRef.current = requestSignature }, [requestSignature])
  React.useEffect(() => { currentGeneratedUrlRef.current = generatedDataUrl }, [generatedDataUrl])
  React.useEffect(() => { candidatesRef.current = candidates }, [candidates])
  React.useEffect(() => {
    if (!isOpen || !jarvisDraft || appliedJarvisDraftIdRef.current === jarvisDraft.id) return
    appliedJarvisDraftIdRef.current = jarvisDraft.id
    autoGenerateQueuedRef.current = Boolean(jarvisDraft.generateNow)
    if (jarvisDraft.creativeDirection) setCreativeDirection(jarvisDraft.creativeDirection.slice(0, 500))
    if (jarvisDraft.headline) {
      headlineTouchedRef.current = true
      setHeadline(jarvisDraft.headline.slice(0, 64))
    }
    if (jarvisDraft.referenceId) setReferenceId(jarvisDraft.referenceId)
    if (jarvisDraft.aspectRatio && ['9:16', '2:3', '1:1', '3:2', '16:9'].includes(jarvisDraft.aspectRatio)) {
      setAspectRatio(jarvisDraft.aspectRatio as StudioAspectRatio)
    }
    if (jarvisDraft.baseThumbnailUrl && !generatedDataUrl) {
      setGeneratedDataUrl(jarvisDraft.baseThumbnailUrl)
    }
    if (jarvisDraft.isIterative && jarvisDraft.iterationPrompt) {
      setChatMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'user',
          content: jarvisDraft.iterationPrompt!,
        },
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `Refining thumbnail with: "${jarvisDraft.iterationPrompt}". Base artwork and subject identity locked.`,
        },
      ])
    }
  }, [isOpen, jarvisDraft, generatedDataUrl])
  React.useEffect(() => {
    generationAbortRef.current?.abort()
    setIsGeneratingNano(false)
    if (activeFrame && lastActiveFrameDataUrlRef.current && lastActiveFrameDataUrlRef.current !== activeFrame.dataUrl) {
      setNanoSuccessMessage(null)
      setSavedSuccess(false)
    }
    lastActiveFrameDataUrlRef.current = activeFrame?.dataUrl
  }, [requestSignature, activeFrame?.dataUrl])
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
    if (files.length + channelReferences.length + pendingReferenceCountRef.current > 3) { setNanoErrorMessage('The selected library look plus up to three uploaded images can guide one generation. Remove an upload before adding more.'); return }
    const epoch = fileReadEpochRef.current
    pendingReferenceCountRef.current += files.length
    try {
      const images = await Promise.all(files.map(readCompactReference))
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
      const dataUrl = await readCompactFrame(files[0])
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
  const handleGenerateNanoBanana = async (options?: { iterationPrompt?: string; isIterative?: boolean }) => {
    if (!activeFrame || !headline.trim() || isGeneratingNano) return
    generationAbortRef.current?.abort()
    const controller = new AbortController()
    generationAbortRef.current = controller
    const timeout = setTimeout(() => { if (!controller.signal.aborted) { controller.abort(); setIsGeneratingNano(false); setNanoErrorMessage('The thumbnail service did not respond in time. Your versions are safe. Try again, or choose Fast quality for a quicker render.'); } },THUMBNAIL_CLIENT_TIMEOUT_MS)
    setIsGeneratingNano(true)
    setNanoErrorMessage(null)
    setNanoSuccessMessage(null)
    const signature = requestSignature
    try {
      const recipe = VIRAL_THUMBNAIL_RECIPES.find(item => item.id === recipeId)!
      const visualReference = await readStudioReference(referenceId)
      if (controller.signal.aborted) return
      const referenceImages = [visualReference, ...channelReferences].slice(0, 4)
      const effectiveIterativePrompt = options?.iterationPrompt || (jarvisDraft?.isIterative ? jarvisDraft.iterationPrompt : undefined)
      const baseThumbnailUrl = (options?.isIterative || effectiveIterativePrompt || jarvisDraft?.isIterative)
        ? (generatedDataUrl ?? jarvisDraft?.baseThumbnailUrl ?? undefined)
        : (generatedDataUrl ?? undefined)

      const requestBody = {
        frameDataUrl: activeFrame.dataUrl,
        baseThumbnailUrl,
        iterationPrompt: effectiveIterativePrompt,
        headline: headline.trim(),
        highlightWord,
        recipeId,
        backgroundId: recipe.backgroundStyle,
        textTreatmentId: recipe.textTreatmentStyle,
        proofArtifactId: recipe.proofArtifact,
        directionalId: recipe.directionalStyle,
        lightingId: recipe.lightingStyle,
        brandColor: design.accent,
        aspectRatio,
        userPrompt: creativeDirection.trim(),
        projectTitle,
        transcriptSnippet: transcriptSnippet.slice(0, 5000),
        referenceImages,
        lockChannelStyle: true,
        studioReferenceId: referenceId,
        studioDesign: design,
      }
      if (!isThumbnailRequestWithinBudget(requestBody)) {
        setNanoErrorMessage('The selected image references make this request too large. Remove a reference image or choose a smaller source, then try again.')
        return
      }
      const response = await fetch('/api/projects/' + projectId + '/thumbnails/nano-banana', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify(requestBody),
      })
      const data = await readThumbnailGenerationResponse(response)
      if (controller.signal.aborted) return
      if (!response.ok || typeof data.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(data.dataUrl)) throw new Error(typeof data.error === 'string' ? data.error : 'Nano Banana did not return an image. Try another frame or direction.')
      const generatedImage = new Image()
      generatedImage.src = data.dataUrl
      await generatedImage.decode()
      if (controller.signal.aborted) return
      const variant: ThumbnailVariant = { id: crypto.randomUUID(), dataUrl: data.dataUrl, headline, emphasis: highlightWord, aspectRatio, design: { ...design }, frame: activeFrame, creativeDirection, recipeId, references: [...channelReferences], referenceId }
      generatedSignatureRef.current = signature
      setGeneratedDataUrl(data.dataUrl)
      setVariants(previous => [...previous,variant].slice(-8))
      setSelectedVariantId(variant.id)
      setNanoSuccessMessage(effectiveIterativePrompt ? 'Refined thumbnail ready. Saved as a new version.' : 'Thumbnail ready. Save it or create another version.')
      setSavedSuccess(false)
      if (effectiveIterativePrompt) {
        setChatMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            role: 'assistant',
            content: `Refined thumbnail with "${effectiveIterativePrompt}". The composition and subject features have been updated while preserving your original look.`,
          },
        ])
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const errorMsg = error instanceof Error ? error.message : 'Thumbnail generation failed. Try again.'
        setNanoErrorMessage(errorMsg)
        if (options?.iterationPrompt || jarvisDraft?.isIterative) {
          setChatMessages(prev => [
            ...prev,
            {
              id: String(Date.now()),
              role: 'assistant',
              content: `Failed to apply refinement: ${errorMsg}. Your previous version is preserved.`,
            },
          ])
        }
      }
    }
    finally { clearTimeout(timeout); if (!controller.signal.aborted) setIsGeneratingNano(false) }
  }
  const generateFromJarvisRef = React.useRef<(options?: { iterationPrompt?: string; isIterative?: boolean }) => Promise<void>>(handleGenerateNanoBanana)
  generateFromJarvisRef.current = handleGenerateNanoBanana
  React.useEffect(() => {
    if (!isOpen || !autoGenerateQueuedRef.current || isExtracting || isAiCurating || !activeFrame || !headline.trim() || isGeneratingNano) return
    autoGenerateQueuedRef.current = false
    const isIterative = Boolean(jarvisDraft?.isIterative)
    const iterationPrompt = jarvisDraft?.iterationPrompt
    const timer = setTimeout(() => { void generateFromJarvisRef.current({ isIterative, iterationPrompt }) }, 0)
    return () => clearTimeout(timer)
  }, [isOpen, isExtracting, isAiCurating, activeFrame, headline, isGeneratingNano, jarvisDraft])

  const handleIterateThumbnail = async (prompt: string) => {
    if (!prompt.trim() || isGeneratingNano) return
    const trimmed = prompt.trim()
    setChatMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'user',
        content: trimmed,
      },
    ])
    await handleGenerateNanoBanana({ iterationPrompt: trimmed, isIterative: true })
  }
  const handleRestoreVariant = (variant: ThumbnailVariant) => {
    generationAbortRef.current?.abort()
    curationAbortRef.current?.abort()
    headlineTouchedRef.current = true
    frameTouchedRef.current = true
    const index = candidates.findIndex(frame => frame.dataUrl === variant.frame.dataUrl)
    if (index < 0) { setCandidates(previous => [variant.frame,...previous].slice(0,24)); setSelectedFrameIndex(0) } else setSelectedFrameIndex(index)
    generatedSignatureRef.current = JSON.stringify({ frameDataUrl: variant.frame.dataUrl, headline: variant.headline, highlightWord: variant.emphasis, aspectRatio: variant.aspectRatio, studioDesign: variant.design, recipeId: variant.recipeId, userPrompt: variant.creativeDirection, referenceImages: variant.references, studioReferenceId: variant.referenceId })
    setHeadline(variant.headline)
    setHighlightWord(variant.emphasis)
    setAspectRatio(variant.aspectRatio as StudioAspectRatio)
    setDesign({ ...variant.design })
    setRecipeId(variant.recipeId)
    setCreativeDirection(variant.creativeDirection)
    setChannelReferences([...variant.references])
    setReferenceId(variant.referenceId)
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
  return <ThumbnailWorkspace projectTitle={projectTitle} aspectRatio={aspectRatio} onAspectRatio={setAspectRatio} design={design} onDesign={update => setDesign(previous => ({ ...previous,...update }))} headline={headline} onHeadline={handleHeadline} emphasis={highlightWord} onEmphasis={setHighlightWord} creativeDirection={creativeDirection} onCreativeDirection={setCreativeDirection} recipeId={recipeId} onRecipe={setRecipeId} candidates={candidates} selectedFrameIndex={selectedFrameIndex} onFrame={handleFrame} isExtracting={isExtracting} isCurating={isAiCurating} recommendedFrameIndex={aiData?.recommendedFrameIndex} hookTitles={aiData?.hookTitles ?? []} onCapture={videoElement ? handleCaptureCurrentPlayhead : undefined} onUploadFrame={files => { void handleUploadFrame(files) }} generatedUrl={generatedDataUrl} referenceId={referenceId} onReference={setReferenceId} references={channelReferences} onReferences={files => { void handleAddReferenceImages(files) }} onRemoveReference={index => setChannelReferences(previous => previous.filter((_,i) => i !== index))} variants={variants} selectedVariantId={selectedVariantId} onVariant={handleRestoreVariant} isGenerating={isGeneratingNano} onGenerate={() => { void handleGenerateNanoBanana() }} onCancel={handleCancelGeneration} error={nanoErrorMessage} success={nanoSuccessMessage} onDownload={handleDownload} onSave={() => { void handleSaveCover() }} isSaving={isExporting} saved={savedSuccess} onClose={onClose} chatMessages={chatMessages} onIterateThumbnail={handleIterateThumbnail} />
}
