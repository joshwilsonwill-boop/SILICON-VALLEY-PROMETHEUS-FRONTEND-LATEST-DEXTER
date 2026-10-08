'use client'

import * as React from 'react'
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Download, Frame, ImagePlus, Layers, Loader2, MessageSquare, Palette, ScanLine, Send, Sparkles, X } from 'lucide-react'
import { STUDIO_ACCENTS, STUDIO_BACKGROUNDS, type StudioDesign } from '@/lib/thumbnails/studio-art-direction'
import { STUDIO_REFERENCES, type StudioReferenceCategory, type StudioReferenceId } from '@/lib/thumbnails/studio-references'
import { VIRAL_THUMBNAIL_RECIPES } from '@/lib/thumbnails/nano-banana-rulebook'
import type { ExtractedFrameCandidate } from '@/lib/thumbnails/thumbnail-engine'
import styles from './ThumbnailWorkspace.module.css'

export type ThumbnailVariant = {
  id: string
  dataUrl: string
  headline: string
  emphasis: string
  aspectRatio: string
  design: StudioDesign
  frame: ExtractedFrameCandidate
  creativeDirection: string
  recipeId: string
  references: string[]
  referenceId: StudioReferenceId
}

export type ThumbnailChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

type Props = {
  projectTitle: string
  aspectRatio: string
  onAspectRatio: (value: '16:9' | '3:2' | '1:1' | '9:16' | '2:3') => void
  design: StudioDesign
  onDesign: (update: Partial<StudioDesign>) => void
  headline: string
  onHeadline: (value: string) => void
  emphasis: string
  onEmphasis: (value: string) => void
  creativeDirection: string
  onCreativeDirection: (value: string) => void
  recipeId: string
  onRecipe: (value: string) => void
  candidates: ExtractedFrameCandidate[]
  selectedFrameIndex: number
  onFrame: (index: number) => void
  isExtracting: boolean
  isCurating: boolean
  recommendedFrameIndex?: number
  hookTitles: string[]
  onCapture?: () => void
  onUploadFrame: (files: File[]) => void
  generatedUrl: string | null
  referenceId: StudioReferenceId
  onReference: (id: StudioReferenceId) => void
  references: string[]
  onReferences: (files: File[]) => void
  onRemoveReference: (index: number) => void
  variants: ThumbnailVariant[]
  selectedVariantId: string | null
  onVariant: (variant: ThumbnailVariant) => void
  isGenerating: boolean
  onGenerate: () => void
  onCancel: () => void
  error: string | null
  success: string | null
  onDownload: () => void
  onSave: () => void
  isSaving: boolean
  saved: boolean
  onClose: () => void
  chatMessages?: ThumbnailChatMessage[]
  onSendChatMessage?: (prompt: string) => void
  onIterateThumbnail?: (prompt: string) => void
}

function ReferenceTile({ reference, selected, index, onSelect }: { reference: typeof STUDIO_REFERENCES[number]; selected: boolean; index: number; onSelect: (id: StudioReferenceId) => void }) {
  const [revealed, setRevealed] = React.useState(false)
  const tileRef = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    const node = tileRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) { setRevealed(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setRevealed(true); observer.disconnect() }
    }, { rootMargin: '40px', threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <button ref={tileRef} type="button" className={styles.referenceTile} data-revealed={revealed} style={{ '--reveal-index': index } as React.CSSProperties} aria-pressed={selected} aria-label={'Use ' + reference.name + ' as thumbnail visual reference'} title={reference.cue} onClick={() => onSelect(reference.id)}>
    <span className={styles.referenceVisual}><img className={styles.referenceImage} src={reference.src} alt={reference.name + ' thumbnail reference'} loading={index > 3 ? 'lazy' : 'eager'} /><span className={styles.referenceGrain} aria-hidden="true" />{selected && <span className={styles.frameSelected}><Check size={9} /></span>}</span>
    <span className={styles.referenceInfo}><span className={styles.referenceName}>{reference.name}</span><span className={styles.referenceCue}>{reference.cue}</span></span>
  </button>
}

export function ThumbnailWorkspace(props: Props) {
  const [tab, setTab] = React.useState<'create' | 'chat' | 'styles' | 'brand'>('create')
  const [showAllReferences, setShowAllReferences] = React.useState(false)
  const [referenceQuery, setReferenceQuery] = React.useState('')
  const [referenceCategory, setReferenceCategory] = React.useState<StudioReferenceCategory>('All looks')
  const [chatInput, setChatInput] = React.useState('')
  const [view, setView] = React.useState<'artwork' | 'source' | 'feed'>('artwork')
  const [guides, setGuides] = React.useState(false)
  const [dimensions, setDimensions] = React.useState('')
  const [artboardSize, setArtboardSize] = React.useState({ width: 640, height: 360 })
  const [tilt, setTilt] = React.useState({ x: 0, y: 0, pointerX: 50, pointerY: 50 })
  const stageRef = React.useRef<HTMLDivElement>(null)
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const frameStripRef = React.useRef<HTMLDivElement>(null)
  const onCloseRef = React.useRef(props.onClose)
  React.useEffect(() => { onCloseRef.current = props.onClose }, [props.onClose])
  React.useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter(node => node.getClientRects().length > 0)
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => { document.removeEventListener('keydown', handleKey, true); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [])

  const source = props.candidates[props.selectedFrameIndex]
  // Until artwork has actually been generated, show the chosen source frame
  // without suggesting that the local layout mockup is the finished result.
  const image = view === 'source' ? source?.dataUrl : props.generatedUrl ?? source?.dataUrl
  const background = STUDIO_BACKGROUNDS.find(item => item.id === props.design.background)!
  const [ratioWidth, ratioHeight] = props.aspectRatio.split(':').map(Number)
  const feedScale = view === 'feed' ? Math.min(1, 320 / artboardSize.width, 270 / artboardSize.height) : 1
  React.useEffect(() => {
    const node = stageRef.current
    if (!node) return
    const update = () => {
      const bounds = node.getBoundingClientRect()
      const maxWidth = Math.max(80, bounds.width - 36)
      const maxHeight = Math.max(160, Math.min(bounds.height - 36, window.innerWidth <= 800 ? 440 : 620))
      const scale = Math.min(maxWidth / ratioWidth, maxHeight / ratioHeight)
      setArtboardSize({ width: Math.round(ratioWidth * scale), height: Math.round(ratioHeight * scale) })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ratioWidth, ratioHeight])
  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds) return
    const px = (event.clientX - bounds.left) / bounds.width
    const py = (event.clientY - bounds.top) / bounds.height
    setTilt({ x: (0.5 - py) * 5, y: (px - 0.5) * 7, pointerX: px * 100, pointerY: py * 100 })
  }
  const resetStageTilt = () => setTilt({ x: 0, y: 0, pointerX: 50, pointerY: 50 })
  const headlineWords = Array.from(new Set(props.headline.trim().split(/\s+/).filter(Boolean)))
  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>, action: (files: File[]) => void) => { action(Array.from(event.target.files ?? [])); event.target.value = '' }
  const handleSendChat = (promptText: string) => {
    const trimmed = promptText.trim()
    if (!trimmed || props.isGenerating) return
    setChatInput('')
    setView('artwork')
    if (props.onIterateThumbnail) {
      props.onIterateThumbnail(trimmed)
    } else if (props.onSendChatMessage) {
      props.onSendChatMessage(trimmed)
    } else {
      props.onCreativeDirection(trimmed)
      props.onGenerate()
    }
  }
  const title = tab === 'create' ? 'Create a thumbnail' : tab === 'chat' ? 'Conversational Art Director.' : tab === 'styles' ? 'Find your visual direction.' : 'Make it unmistakably yours.'
  const help = tab === 'create' ? 'Choose a hook. We’ll shape the image around it.' : tab === 'chat' ? 'Refine features, tweak lighting, or change style while keeping subject identity.' : tab === 'styles' ? 'Choose a cinematic reference, then refine mood and detail.' : 'Choose your accent and use reference images to guide the look.'
  const generatedLabel = props.generatedUrl ? 'Generated artwork' : 'Selected frame'
  const selectedReference = STUDIO_REFERENCES.find(reference => reference.id === props.referenceId)
  const featuredReferences = selectedReference && !STUDIO_REFERENCES.slice(0, 9).some(reference => reference.id === selectedReference.id)
    ? [selectedReference, ...STUDIO_REFERENCES.slice(0, 8)]
    : STUDIO_REFERENCES.slice(0, 9)
  const matchingReferences = STUDIO_REFERENCES.filter(reference => {
    const matchesCategory = referenceCategory === 'All looks' || reference.category === referenceCategory
    const query = referenceQuery.trim().toLocaleLowerCase()
    const matchesQuery = !query || `${reference.name} ${reference.cue} ${reference.category}`.toLocaleLowerCase().includes(query)
    return matchesCategory && matchesQuery
  })
  const displayedReferences = showAllReferences ? matchingReferences : featuredReferences

  const backgroundControl = <div className={styles.field}>
    <label className={styles.label} htmlFor="thumbnail-background">Background treatment</label>
    <div className={styles.backgroundRow}><span className={styles.backgroundSwatch} aria-hidden="true" style={{ background: 'linear-gradient(135deg,' + background.colors.join(',') + ')' }} />
      <select id="thumbnail-background" className={styles.select} value={props.design.background} onChange={event => props.onDesign({ background: event.target.value as StudioDesign['background'] })}>
        {STUDIO_BACKGROUNDS.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select>
    </div>
  </div>

  const accentControl = <div className={styles.field}>
    <div className={styles.label}>Color accent <small>{props.design.accent.toUpperCase()}</small></div>
    <div className={styles.palette}>
      {STUDIO_ACCENTS.map(item => <button type="button" key={item.color} className={styles.swatch} aria-label={item.name} aria-pressed={props.design.accent.toLowerCase() === item.color.toLowerCase()} onClick={() => props.onDesign({ accent: item.color })} style={{ background: item.color }}>{props.design.accent.toLowerCase() === item.color.toLowerCase() && <Check size={12} />}</button>)}
      <input className={styles.colorInput} type="color" aria-label="Custom accent color" value={props.design.accent} onChange={event => props.onDesign({ accent: event.target.value })} />
    </div>
  </div>

  const referenceControl = <div className={styles.field}>
    <div className={styles.label}>Style references <small>{1 + props.references.length}/4 including selected look</small></div>
    <label className={styles.upload} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); props.onReferences(Array.from(event.dataTransfer.files)) }}>
      <ImagePlus size={17} /><span>Add a reference image</span><small>Drop images here · PNG, JPG, WebP · up to 5 MB</small>
      <input className={styles.hiddenInput} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Upload style references" onChange={event => onFileInput(event, props.onReferences)} disabled={props.references.length >= 3} />
    </label>
    {props.references.length > 0 && <div className={styles.referenceStrip}>{props.references.map((url, index) => <div className={styles.reference} key={url}><img src={url} alt={'Style reference ' + (index + 1)} /><button type="button" aria-label={'Remove style reference ' + (index + 1)} onClick={() => props.onRemoveReference(index)}><X size={10} /></button></div>)}</div>}
    <p className={styles.hint}>Your selected cinematic look plus up to three uploads guide composition, lighting, color, and graphic treatment. Your video frame anchors the subject.</p>
  </div>

  return <div className={styles.studio}>
    <div className={styles.backdrop} onClick={props.onClose} aria-hidden="true" />
    <div className={styles.window} role="dialog" aria-modal="true" aria-labelledby="thumbnail-studio-title" ref={dialogRef}>
      <header className={styles.header}>
        <div className={styles.identity}><span className={styles.mark}><Frame size={19} /></span><div><h1 id="thumbnail-studio-title" className={styles.title}>Thumbnail Studio</h1><p className={styles.project}>{props.projectTitle || 'Untitled Project'}</p></div></div>
        <div className={styles.headerActions}><span className={styles.status}><span className={styles.statusDot} />{props.isGenerating ? 'Creating artwork' : props.generatedUrl ? 'Ready to export' : 'Your next first impression'}</span><button type="button" ref={closeRef} className={styles.iconButton} onClick={props.onClose} aria-label="Close Studio"><X size={17} /></button></div>
      </header>
      <div className={styles.body}>
        <section className={styles.canvasColumn} aria-label="Thumbnail preview and source frames">
          <div className={styles.canvasToolbar}><div className={styles.previewIdentity}><span className={styles.previewSparkle}><Sparkles size={14} /></span><div><span className={styles.previewEyebrow}>YOUR NEXT FIRST IMPRESSION</span><p className={styles.subtitle}>A great video deserves a great first look.</p></div></div><div className={styles.aspectGroup} aria-label="Aspect ratio">{(['16:9','3:2','1:1','2:3','9:16'] as const).map(ratio => <button type="button" className={styles.aspectButton} key={ratio} aria-pressed={props.aspectRatio === ratio} onClick={() => props.onAspectRatio(ratio)}>{ratio}</button>)}</div></div>
          <div className={styles.stage} data-ratio={props.aspectRatio} ref={stageRef} aria-busy={props.isGenerating} onPointerMove={handleStagePointerMove} onPointerLeave={resetStageTilt}>
            {image ? <div className={styles.artboard} data-testid="thumbnail-artboard" style={{ width: artboardSize.width * feedScale, height: artboardSize.height * feedScale, transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, '--pointer-x': `${tilt.pointerX}%`, '--pointer-y': `${tilt.pointerY}%` } as React.CSSProperties}>
              <img key={image} src={image} alt={view === 'source' || !props.generatedUrl ? 'Selected video frame at ' + source?.timecode : props.headline ? 'Thumbnail: ' + props.headline : 'Generated thumbnail artwork'} className={[styles.stageImage, view === 'source' || !props.generatedUrl ? styles.stageSource : ''].join(' ')} onLoad={event => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)} />
              {props.generatedUrl && <div className={styles.stageGlare} aria-hidden="true" />}
              {guides && view !== 'source' && <div className={styles.guides} aria-hidden="true" />}
            </div> : <div className={styles.empty}>{props.isExtracting ? <Loader2 size={25} className={styles.spin} /> : <Camera size={28} />}<strong>{props.isExtracting ? 'Finding your best frames' : 'Start with your subject'}</strong><p>{props.isExtracting ? 'We’re preparing frames from your video.' : 'Load a video in the editor, or add a still image to start creating.'}</p>{!props.isExtracting && <label className={styles.upload}><ImagePlus size={16} /><span>Add a source image</span><input className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload source image" onChange={event => onFileInput(event, props.onUploadFrame)} /></label>}</div>}
            {props.isGenerating && <div className={styles.generating} role="status"><Sparkles size={27} className={styles.spin} /><strong>Composing your thumbnail</strong><small>Refining the subject, lighting, and headline.</small><button className={styles.secondary} type="button" onClick={props.onCancel}>Cancel generation</button></div>}
          </div>
          <div className={styles.previewMeta}><span className={styles.metaLabel}>{props.generatedUrl ? <Check size={12} /> : <Layers size={12} />}{view === 'source' ? 'Source frame' : generatedLabel}{dimensions && ' · ' + dimensions}</span><div className={styles.viewGroup}>{props.generatedUrl && <button type="button" className={styles.refineChatButton} onClick={() => setTab('chat')} title="Refine this thumbnail in the Chat assistant"><MessageSquare size={12} />Refine in Chat</button>}{(['artwork','source','feed'] as const).map(mode => <button className={styles.viewButton} type="button" key={mode} aria-pressed={view === mode} disabled={!image && mode !== 'artwork'} onClick={() => setView(mode)}>{mode === 'artwork' ? props.generatedUrl ? 'Artwork' : 'Frame preview' : mode === 'source' ? 'Source' : 'Feed size'}</button>)}<button className={styles.viewButton} type="button" aria-pressed={guides} aria-label="Toggle safe area guides" onClick={() => setGuides(!guides)}><ScanLine size={13} /></button></div></div>
          <section aria-label="Source keyframes">
            <div className={styles.sectionHeading}><h2>Source keyframes<span className={styles.count}>{props.candidates.length} captures</span></h2><div className={styles.sectionActions}>{props.onCapture && <button type="button" className={styles.textButton} onClick={props.onCapture}><Camera size={12} />Capture playhead</button>}<button type="button" className={styles.iconButton} aria-label="Previous source frames" disabled={!props.candidates.length} onClick={() => frameStripRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}><ChevronLeft size={13} /></button><button type="button" className={styles.iconButton} aria-label="Next source frames" disabled={!props.candidates.length} onClick={() => frameStripRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}><ChevronRight size={13} /></button></div></div>
            <div className={styles.frameStrip} ref={frameStripRef}>{props.isExtracting && !props.candidates.length ? Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />) : props.candidates.map((frame, index) => <button type="button" key={index + '-' + frame.timecode} className={styles.frame} aria-label={'Use frame at ' + frame.timecode + (props.recommendedFrameIndex === index ? ', AI recommended' : '')} aria-pressed={props.selectedFrameIndex === index} onClick={() => props.onFrame(index)}><img src={frame.dataUrl} alt={'Video frame at ' + frame.timecode} /><span className={styles.frameTime}>{frame.timecode}</span>{props.selectedFrameIndex === index && <span className={styles.frameSelected}><Check size={9} /></span>}</button>)}</div>
          </section>
          <section className={styles.templates} aria-label="Thumbnail visual references">
            <div className={styles.sectionHeading}>
              <h2>Reference thumbnails<span className={styles.count}>{STUDIO_REFERENCES.length} looks</span></h2>
              <div className={styles.sectionActions}>
                <button className={styles.textButton} type="button" onClick={() => setTab('styles')}>Refine look<ArrowRight size={12} /></button>
                <button className={styles.textButton} type="button" aria-expanded={showAllReferences} aria-controls="thumbnail-reference-library" onClick={() => setShowAllReferences(value => !value)}>{showAllReferences ? 'Show featured' : `Browse all ${STUDIO_REFERENCES.length}`}</button>
              </div>
            </div>
            {showAllReferences && <div className={styles.referenceFilters}>
              <input className={styles.input} type="search" aria-label="Search thumbnail references" placeholder="Search topics or titles" value={referenceQuery} onChange={event => setReferenceQuery(event.target.value)} />
              <select className={styles.select} aria-label="Filter thumbnail references by topic" value={referenceCategory} onChange={event => setReferenceCategory(event.target.value as StudioReferenceCategory)}>
                {(['All looks', 'Hooks & Storytelling', 'Growth & Strategy', 'AI & Tools', 'Creator Business', 'Platform Trends'] as const).map(category => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>}
            <div id="thumbnail-reference-library" className={showAllReferences ? styles.referenceBrowseGrid : styles.referenceRail}>
              {displayedReferences.map((reference, index) => <ReferenceTile key={reference.id} reference={reference} index={index} selected={props.referenceId === reference.id} onSelect={props.onReference} />)}
              {showAllReferences && displayedReferences.length === 0 && <p className={styles.hint}>No references match that search. Try another title or topic.</p>}
            </div>
          </section>
          {props.variants.length > 0 && <section className={styles.variants} aria-label="Generated versions"><div className={styles.sectionHeading}><h2>Your versions<span className={styles.count}>{props.variants.length}</span></h2><span className={styles.hint}>Select a version to restore its design</span></div><div className={styles.frameStrip}>{props.variants.map((variant, index) => <button type="button" className={styles.frame + ' ' + styles.variant} key={variant.id} aria-label={'Restore version ' + (index + 1) + ': ' + variant.headline} aria-pressed={props.selectedVariantId === variant.id} onClick={() => { props.onVariant(variant); setView('artwork') }}><img src={variant.dataUrl} alt={'Generated version ' + (index + 1)} /><span className={styles.frameTime}>Version {index + 1}</span>{props.selectedVariantId === variant.id && <span className={styles.frameSelected}><Check size={9} /></span>}</button>)}</div></section>}
        </section>
        <aside className={styles.inspector} aria-label="Thumbnail controls">
          <nav className={styles.tabs} aria-label="Thumbnail settings">{([{ id: 'create', label: 'Create', icon: Sparkles },{ id: 'chat', label: 'Chat', icon: MessageSquare },{ id: 'styles', label: 'Styles', icon: Layers },{ id: 'brand', label: 'Brand', icon: Palette }] as const).map(item => <button type="button" className={styles.tab} key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}><item.icon size={14} />{item.label}</button>)}</nav>
          <div className={`${styles.panel} ${tab === 'create' ? styles.createPanel : ''}`}>
            <div className={styles.panelIntro}><h2>{title}</h2><p>{help}</p></div>
            {tab === 'create' && <>
              <div className={styles.createHeadline}>
                <label className={styles.label} htmlFor="thumbnail-headline">Headline<small>{props.headline.length}/64</small></label>
                <input id="thumbnail-headline" className={styles.input} value={props.headline} maxLength={64} placeholder="One clear hook. A few powerful words." onChange={event => props.onHeadline(event.target.value)} />
                {props.headline.trim().split(/\s+/).length > 7 && <p className={styles.hint}>A shorter headline will be easier to read in the feed.</p>}
              </div>
              <details className={styles.createDetails}>
                <summary>Fine-tune your hook <span>Optional</span></summary>
                <div className={styles.createDetailsContent}>
                  {headlineWords.length > 0 && <div className={styles.field}><div className={styles.label}>Emphasize a word</div><div className={styles.chips}>{headlineWords.map(word => <button type="button" className={styles.chip} key={word} aria-pressed={props.emphasis === word} onClick={() => props.onEmphasis(props.emphasis === word ? '' : word)}>{word}</button>)}</div></div>}
                  {(props.isCurating || props.hookTitles.length > 0) && <div className={styles.field}><div className={styles.label}>Hook ideas<small>{props.isCurating ? 'Finding ideas…' : 'From your video'}</small></div>{props.hookTitles.filter(hook => hook !== props.headline).slice(0, 2).map(hook => <button key={hook} type="button" className={styles.hook} onClick={() => props.onHeadline(hook.slice(0,64))}>{hook}</button>)}</div>}
                  <div className={styles.field}><label className={styles.label} htmlFor="thumbnail-direction">Creative direction<small>{props.creativeDirection.length}/500</small></label><textarea id="thumbnail-direction" className={styles.textarea} rows={3} maxLength={500} value={props.creativeDirection} onChange={event => props.onCreativeDirection(event.target.value)} placeholder="Describe the mood, subject placement, or an object to feature." /></div>
                </div>
              </details>
            </>}
            {tab === 'chat' && <div className={styles.chatContainer}>
              {props.generatedUrl ? (
                <div className={styles.chatContextCard}>
                  <img src={props.generatedUrl} alt="Active thumbnail base" className={styles.chatContextThumb} />
                  <div className={styles.chatContextInfo}>
                    <p className={styles.chatContextTitle}>{props.headline || 'Active Artwork'}</p>
                    <p className={styles.chatContextSubtitle}>Active artwork locked · Changes refine this base rather than starting over</p>
                  </div>
                  <span className={styles.chatRefineBadge}><Sparkles size={11} /> Iterative Mode</span>
                </div>
              ) : (
                <div className={styles.chatContextCard}>
                  <div className={styles.chatContextInfo}>
                    <p className={styles.chatContextTitle}>Draft Layout</p>
                    <p className={styles.chatContextSubtitle}>Generate initial artwork first, or describe the concept below to begin.</p>
                  </div>
                </div>
              )}
              <div className={styles.chatMessageList}>
                {(props.chatMessages && props.chatMessages.length > 0 ? props.chatMessages : [
                  {
                    id: 'welcome',
                    role: 'assistant' as const,
                    content: props.generatedUrl
                      ? "I have your active thumbnail locked as the base. What specific feature would you like to refine? (e.g. text color, background contrast, dramatic lighting, or specific props)"
                      : "Welcome to Thumbnail Studio Assistant. Select your video frame or describe the visual hook you'd like to create.",
                  }
                ]).map(msg => (
                  <div key={msg.id} className={`${styles.chatBubble} ${msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant}`}>
                    <div className={styles.chatBubbleSender}>{msg.role === 'user' ? 'You' : 'Jarvis Co-Director'}</div>
                    <div>{msg.content}</div>
                  </div>
                ))}
              </div>
              <div className={styles.field}>
                <div className={styles.label}>Suggested Refinements <small>Click to apply</small></div>
                <div className={styles.chatPromptChips}>
                  {[
                    'Make headline neon cyan and punchy',
                    'Darken background for high contrast',
                    'Add dramatic rim lighting on subject',
                    'Shorten hook to 3 words',
                    'Shift to luxury minimalist editorial look',
                    'Warm up lighting and add gold accents',
                  ].map(chip => (
                    <button key={chip} type="button" className={styles.chatPromptChip} disabled={props.isGenerating} onClick={() => handleSendChat(chip)}>{chip}</button>
                  ))}
                </div>
              </div>
              <div className={styles.chatInputBox}>
                <textarea
                  className={styles.chatTextarea}
                  placeholder={props.generatedUrl ? "Describe specific changes (e.g. 'Make headline neon cyan, darken background, preserve face')..." : "Describe the thumbnail you want to generate..."}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (chatInput.trim() && !props.isGenerating) handleSendChat(chatInput.trim())
                    }
                  }}
                  disabled={props.isGenerating}
                  rows={3}
                />
                <div className={styles.chatInputFooter}>
                  <span className={styles.hint}>Enter to submit · Preserves subject identity</span>
                  <button type="button" className={styles.chatSendBtn} disabled={!chatInput.trim() || props.isGenerating} onClick={() => { if (chatInput.trim() && !props.isGenerating) handleSendChat(chatInput.trim()) }}>
                    {props.isGenerating ? <Loader2 size={12} className={styles.spin} /> : <Send size={12} />}
                    {props.generatedUrl ? 'Refine Artwork' : 'Generate'}
                  </button>
                </div>
              </div>
              {referenceControl}
            </div>}
            {tab === 'styles' && <>
              <div className={styles.field}><div className={styles.label}>Selected visual reference</div><p className={styles.hint}>{selectedReference?.cue}</p><div className={styles.referenceRail + ' ' + styles.inspectorReferences}>{featuredReferences.map((reference, index) => <ReferenceTile key={reference.id} reference={reference} index={index} selected={props.referenceId === reference.id} onSelect={props.onReference} />)}</div><button className={styles.textButton} type="button" onClick={() => setShowAllReferences(true)}>Browse and filter all {STUDIO_REFERENCES.length} references<ArrowRight size={12} /></button></div>
              <div className={styles.field}><label className={styles.label} htmlFor="thumbnail-recipe">Visual direction</label><select id="thumbnail-recipe" className={styles.select} value={props.recipeId} onChange={event => props.onRecipe(event.target.value)}>{VIRAL_THUMBNAIL_RECIPES.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select><p className={styles.hint}>Use a direction as inspiration. Your reference image and color choices guide the result.</p></div>
              {backgroundControl}<div className={styles.field}><label className={styles.label} htmlFor="thumbnail-text-scale">Headline size<small>{Math.round(props.design.textScale * 100)}%</small></label><input className={styles.range} id="thumbnail-text-scale" type="range" min="0.7" max="1.3" step="0.05" value={props.design.textScale} onChange={event => props.onDesign({ textScale: Number(event.target.value) })} /></div>{accentControl}
              <div className={styles.field}><div className={styles.label}>Generation quality</div><div className={styles.qualityGroup}><button type="button" className={styles.quality} aria-pressed={props.design.quality === 'fast'} onClick={() => props.onDesign({ quality: 'fast' })}>Fast<small>Quicker draft generation</small></button><button type="button" className={styles.quality} aria-pressed={props.design.quality === 'pro'} onClick={() => props.onDesign({ quality: 'pro' })}>High detail<small>More room for fine detail</small></button></div></div>
            </>}
            {tab === 'brand' && <>{accentControl}{referenceControl}<div className={styles.panelIntro}><h2>A consistent first impression</h2><p>Match the lighting, colors, and typography of your best thumbnails. The subject stays anchored to your selected video frame.</p></div></>}
          </div>
          <footer className={styles.footer}>
            {props.error && <p className={styles.error} role="alert">{props.error}</p>}{props.success && <p className={styles.success} role="status"><Check size={12} />{props.success}</p>}
            <button type="button" className={styles.primary} onClick={props.isGenerating ? props.onCancel : () => { setView('artwork'); props.onGenerate() }} disabled={!props.isGenerating && (!props.candidates.length || !props.headline.trim())}>{props.isGenerating ? <><X size={15} />Cancel generation</> : <><Sparkles size={16} />{props.generatedUrl ? 'Generate another version' : 'Generate thumbnail'}<ArrowRight size={14} /></>}</button>
            {props.generatedUrl && <>
              <p className={styles.footerHint}>Choose a version, then save or download.</p>
              <div className={styles.exportRow}><button type="button" className={styles.secondary} onClick={props.onDownload}><Download size={13} />Download image</button><button type="button" className={styles.secondary} onClick={props.onSave} disabled={props.isSaving}>{props.isSaving ? <Loader2 size={13} className={styles.spin} /> : props.saved ? <Check size={13} /> : <Frame size={13} />}{props.isSaving ? 'Saving…' : props.saved ? 'Cover Saved' : 'Save Project Cover'}</button></div>
            </>}
          </footer>
        </aside>
      </div>
    </div>
  </div>
}
