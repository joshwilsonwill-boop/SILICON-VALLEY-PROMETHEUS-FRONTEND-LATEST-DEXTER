'use client'

import * as React from 'react'
import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Download, Frame, ImagePlus, Layers, Loader2, Palette, ScanLine, Sparkles, X } from 'lucide-react'
import { STUDIO_ACCENTS, STUDIO_BACKGROUNDS, STUDIO_LAYOUTS, type StudioDesign, type StudioLayout } from '@/lib/thumbnails/studio-art-direction'
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
}

type Props = {
  projectTitle: string
  aspectRatio: string
  onAspectRatio: (value: '16:9' | '1:1' | '9:16' | '2:3') => void
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
  previewUrl: string | null
  generatedUrl: string | null
  layoutPreviews: Partial<Record<StudioLayout, string>>
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
}

function LayoutTile({ id, selected, image, onSelect }: { id: StudioLayout; selected: boolean; image?: string; onSelect: (id: StudioLayout) => void }) {
  const layout = STUDIO_LAYOUTS.find(item => item.id === id)!
  return <button type="button" className={styles.layoutTile} aria-pressed={selected} aria-label={layout.name} title={layout.description} onClick={() => onSelect(id)}>
    <span className={styles.layoutPicture}>
      {image ? <img src={image} alt={layout.name + ' layout preview'} /> : <span className={styles.layoutExample}><span>YOUR<br /><b>STORY</b></span><i /></span>}
      {selected && <span className={styles.frameSelected}><Check size={9} /></span>}
    </span>
    <span className={styles.layoutName}>{layout.name}</span>
  </button>
}

export function ThumbnailWorkspace(props: Props) {
  const [tab, setTab] = React.useState<'create' | 'styles' | 'brand'>('create')
  const [view, setView] = React.useState<'artwork' | 'source' | 'feed'>('artwork')
  const [guides, setGuides] = React.useState(false)
  const [dimensions, setDimensions] = React.useState('')
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
  const image = view === 'source' ? source?.dataUrl : props.generatedUrl ?? props.previewUrl
  const background = STUDIO_BACKGROUNDS.find(item => item.id === props.design.background)!
  const aspect = props.aspectRatio.replace(':', ' / ')
  const portrait = props.aspectRatio === '9:16' || props.aspectRatio === '2:3'
  const headlineWords = Array.from(new Set(props.headline.trim().split(/\s+/).filter(Boolean)))
  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>, action: (files: File[]) => void) => { action(Array.from(event.target.files ?? [])); event.target.value = '' }
  const title = tab === 'create' ? 'Make the first impression count.' : tab === 'styles' ? 'Find your visual direction.' : 'Make it unmistakably yours.'
  const help = tab === 'create' ? 'Start with your frame. Shape the hook. Create the final artwork.' : tab === 'styles' ? 'Choose a composition, then refine the mood and detail.' : 'Choose your accent and use reference images to guide the look.'
  const generatedLabel = props.generatedUrl ? 'Generated artwork' : 'Layout preview'

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
    <div className={styles.label}>Style references <small>{props.references.length}/4 · optional</small></div>
    <label className={styles.upload} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); props.onReferences(Array.from(event.dataTransfer.files)) }}>
      <ImagePlus size={17} /><span>Add a reference image</span><small>Drop images here · PNG, JPG, WebP · up to 5 MB</small>
      <input className={styles.hiddenInput} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Upload style references" onChange={event => onFileInput(event, props.onReferences)} disabled={props.references.length >= 4} />
    </label>
    {props.references.length > 0 && <div className={styles.referenceStrip}>{props.references.map((url, index) => <div className={styles.reference} key={url}><img src={url} alt={'Style reference ' + (index + 1)} /><button type="button" aria-label={'Remove style reference ' + (index + 1)} onClick={() => props.onRemoveReference(index)}><X size={10} /></button></div>)}</div>}
    <p className={styles.hint}>References guide color, lighting, and type. Your video frame anchors the subject.</p>
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
          <div className={styles.canvasToolbar}><p className={styles.subtitle}>A great video deserves a great first look.</p><div className={styles.aspectGroup} aria-label="Aspect ratio">{(['16:9','1:1','9:16','2:3'] as const).map(ratio => <button type="button" className={styles.aspectButton} key={ratio} aria-pressed={props.aspectRatio === ratio} onClick={() => props.onAspectRatio(ratio)}>{ratio}</button>)}</div></div>
          <div className={styles.stage} aria-busy={props.isGenerating}>
            {image ? <div style={{ position: 'relative', maxWidth: '100%', display: 'grid', placeItems: 'center' }}>
              <img key={image} src={image} alt={view === 'source' ? 'Selected video frame at ' + source?.timecode : props.headline ? 'Thumbnail: ' + props.headline : 'Video frame layout preview'} className={[styles.stageImage, portrait ? styles.portrait : styles.landscape, view === 'feed' ? styles.feedImage : ''].join(' ')} style={{ aspectRatio: aspect }} onLoad={event => setDimensions(event.currentTarget.naturalWidth + ' × ' + event.currentTarget.naturalHeight)} />
              {guides && view !== 'source' && <div className={styles.guides} aria-hidden="true" />}
            </div> : <div className={styles.empty}>{props.isExtracting ? <Loader2 size={25} className={styles.spin} /> : <Camera size={28} />}<strong>{props.isExtracting ? 'Finding your best frames' : 'Start with your subject'}</strong><p>{props.isExtracting ? 'We’re preparing frames from your video.' : 'Load a video in the editor, or add a still image to start creating.'}</p>{!props.isExtracting && <label className={styles.upload}><ImagePlus size={16} /><span>Add a source image</span><input className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload source image" onChange={event => onFileInput(event, props.onUploadFrame)} /></label>}</div>}
            {props.isGenerating && <div className={styles.generating} role="status"><Sparkles size={27} className={styles.spin} /><strong>Composing your thumbnail</strong><small>Refining the subject, lighting, and headline.</small><button className={styles.secondary} type="button" onClick={props.onCancel}>Cancel generation</button></div>}
          </div>
          <div className={styles.previewMeta}><span className={styles.metaLabel}>{props.generatedUrl ? <Check size={12} /> : <Layers size={12} />}{view === 'source' ? 'Source frame' : generatedLabel}{dimensions && ' · ' + dimensions}</span><div className={styles.viewGroup}>{(['artwork','source','feed'] as const).map(mode => <button className={styles.viewButton} type="button" key={mode} aria-pressed={view === mode} disabled={!image && mode !== 'artwork'} onClick={() => setView(mode)}>{mode === 'artwork' ? 'Artwork' : mode === 'source' ? 'Source' : 'Feed size'}</button>)}<button className={styles.viewButton} type="button" aria-pressed={guides} aria-label="Toggle safe area guides" onClick={() => setGuides(!guides)}><ScanLine size={13} /></button></div></div>
          <section aria-label="Source keyframes">
            <div className={styles.sectionHeading}><h2>Source keyframes<span className={styles.count}>{props.candidates.length} captures</span></h2><div className={styles.sectionActions}>{props.onCapture && <button type="button" className={styles.textButton} onClick={props.onCapture}><Camera size={12} />Capture playhead</button>}<button type="button" className={styles.iconButton} aria-label="Previous source frames" disabled={!props.candidates.length} onClick={() => frameStripRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}><ChevronLeft size={13} /></button><button type="button" className={styles.iconButton} aria-label="Next source frames" disabled={!props.candidates.length} onClick={() => frameStripRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}><ChevronRight size={13} /></button></div></div>
            <div className={styles.frameStrip} ref={frameStripRef}>{props.isExtracting && !props.candidates.length ? Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />) : props.candidates.map((frame, index) => <button type="button" key={index + '-' + frame.timecode} className={styles.frame} aria-label={'Use frame at ' + frame.timecode + (props.recommendedFrameIndex === index ? ', AI recommended' : '')} aria-pressed={props.selectedFrameIndex === index} onClick={() => props.onFrame(index)}><img src={frame.dataUrl} alt={'Video frame at ' + frame.timecode} /><span className={styles.frameTime}>{frame.timecode}</span>{props.selectedFrameIndex === index && <span className={styles.frameSelected}><Check size={9} /></span>}</button>)}</div>
          </section>
          <section className={styles.templates} aria-label="Thumbnail layouts"><div className={styles.sectionHeading}><h2>Thumbnail layouts</h2><button className={styles.textButton} type="button" onClick={() => setTab('styles')}>Explore styles<ArrowRight size={12} /></button></div><div className={styles.layoutRail}>{STUDIO_LAYOUTS.map(layout => <LayoutTile key={layout.id} id={layout.id} selected={props.design.layout === layout.id} image={props.layoutPreviews[layout.id]} onSelect={id => props.onDesign({ layout: id })} />)}</div></section>
          {props.variants.length > 0 && <section className={styles.variants} aria-label="Generated versions"><div className={styles.sectionHeading}><h2>Your versions<span className={styles.count}>{props.variants.length}</span></h2><span className={styles.hint}>Select a version to restore its design</span></div><div className={styles.frameStrip}>{props.variants.map((variant, index) => <button type="button" className={styles.frame + ' ' + styles.variant} key={variant.id} aria-label={'Restore version ' + (index + 1) + ': ' + variant.headline} aria-pressed={props.selectedVariantId === variant.id} onClick={() => { props.onVariant(variant); setView('artwork') }}><img src={variant.dataUrl} alt={'Generated version ' + (index + 1)} /><span className={styles.frameTime}>Version {index + 1}</span>{props.selectedVariantId === variant.id && <span className={styles.frameSelected}><Check size={9} /></span>}</button>)}</div></section>}
        </section>
        <aside className={styles.inspector} aria-label="Thumbnail controls">
          <nav className={styles.tabs} aria-label="Thumbnail settings">{([{ id: 'create', label: 'Create', icon: Sparkles },{ id: 'styles', label: 'Styles', icon: Layers },{ id: 'brand', label: 'Brand', icon: Palette }] as const).map(item => <button type="button" className={styles.tab} key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}><item.icon size={14} />{item.label}</button>)}</nav>
          <div className={styles.panel}>
            <div className={styles.panelIntro}><h2>{title}</h2><p>{help}</p></div>
            {tab === 'create' && <>
              <div className={styles.field}><label className={styles.label} htmlFor="thumbnail-headline">Headline<small>{props.headline.length}/64</small></label><input id="thumbnail-headline" className={styles.input} value={props.headline} maxLength={64} placeholder="One clear hook. A few powerful words." onChange={event => props.onHeadline(event.target.value)} />{props.headline.trim().split(/\s+/).length > 7 && <p className={styles.hint}>A shorter headline will be easier to read in the feed.</p>}</div>
              {headlineWords.length > 0 && <div className={styles.field}><div className={styles.label}>Emphasize a keyword<small>Tap to toggle</small></div><div className={styles.chips}>{headlineWords.map(word => <button type="button" className={styles.chip} key={word} aria-pressed={props.emphasis === word} onClick={() => props.onEmphasis(props.emphasis === word ? '' : word)}>{word}</button>)}</div></div>}
              {(props.isCurating || props.hookTitles.length > 0) && <div className={styles.field}><div className={styles.label}>Hook ideas<small>{props.isCurating ? 'Finding ideas…' : 'From your video'}</small></div>{props.hookTitles.filter(hook => hook !== props.headline).slice(0, 2).map(hook => <button key={hook} type="button" className={styles.hook} onClick={() => props.onHeadline(hook.slice(0,64))}>{hook}</button>)}</div>}
              <div className={styles.field}><label className={styles.label} htmlFor="thumbnail-direction">Creative direction<small>Optional · {props.creativeDirection.length}/500</small></label><textarea id="thumbnail-direction" className={styles.textarea} rows={3} maxLength={500} value={props.creativeDirection} onChange={event => props.onCreativeDirection(event.target.value)} placeholder="Describe the mood, subject placement, or an object to feature." /></div>
              {backgroundControl}{accentControl}{referenceControl}
            </>}
            {tab === 'styles' && <>
              <div className={styles.field}><div className={styles.label}>Layout style</div><div className={styles.inspectorLayouts}>{STUDIO_LAYOUTS.map(layout => <LayoutTile key={layout.id} id={layout.id} selected={props.design.layout === layout.id} image={props.layoutPreviews[layout.id]} onSelect={id => props.onDesign({ layout: id })} />)}</div><p className={styles.hint}>{STUDIO_LAYOUTS.find(layout => layout.id === props.design.layout)?.description}</p></div>
              <div className={styles.field}><label className={styles.label} htmlFor="thumbnail-recipe">Visual direction</label><select id="thumbnail-recipe" className={styles.select} value={props.recipeId} onChange={event => props.onRecipe(event.target.value)}>{VIRAL_THUMBNAIL_RECIPES.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select><p className={styles.hint}>Use a direction as inspiration. Your layout and color choices take priority.</p></div>
              {backgroundControl}<div className={styles.field}><label className={styles.label} htmlFor="thumbnail-text-scale">Headline size<small>{Math.round(props.design.textScale * 100)}%</small></label><input className={styles.range} id="thumbnail-text-scale" type="range" min="0.7" max="1.3" step="0.05" value={props.design.textScale} onChange={event => props.onDesign({ textScale: Number(event.target.value) })} /></div>{accentControl}
            </>}
            {tab === 'brand' && <>{accentControl}{referenceControl}<div className={styles.panelIntro}><h2>A consistent first impression</h2><p>Match the lighting, colors, and typography of your best thumbnails. The subject stays anchored to your selected video frame.</p></div></>}
            <div className={styles.field}><div className={styles.label}>Generation quality</div><div className={styles.qualityGroup}><button type="button" className={styles.quality} aria-pressed={props.design.quality === 'fast'} onClick={() => props.onDesign({ quality: 'fast' })}>Nano Banana 2<small>2K artwork · faster</small></button><button type="button" className={styles.quality} aria-pressed={props.design.quality === 'pro'} onClick={() => props.onDesign({ quality: 'pro' })}>Nano Banana Pro<small>2K artwork · finer control</small></button></div></div>
          </div>
          <footer className={styles.footer}>
            {props.error && <p className={styles.error} role="alert">{props.error}</p>}{props.success && <p className={styles.success} role="status"><Check size={12} />{props.success}</p>}
            <button type="button" className={styles.primary} onClick={props.isGenerating ? props.onCancel : () => { setView('artwork'); props.onGenerate() }} disabled={!props.isGenerating && (!props.candidates.length || !props.headline.trim())}>{props.isGenerating ? <><X size={15} />Cancel generation</> : <><Sparkles size={16} />{props.generatedUrl ? 'Generate another version' : 'Generate thumbnail'}<ArrowRight size={14} /></>}</button>
            <p className={styles.footerHint}>{props.isGenerating ? 'You can keep editing. Changes cancel the current generation.' : props.generatedUrl ? 'Choose your favorite version, then save or download.' : 'Layout preview now. Finished artwork after generation.'}</p>
            <div className={styles.exportRow}><button type="button" className={styles.secondary} onClick={props.onDownload} disabled={!props.generatedUrl}><Download size={13} />Download image</button><button type="button" className={styles.secondary} onClick={props.onSave} disabled={!props.generatedUrl || props.isSaving}>{props.isSaving ? <Loader2 size={13} className={styles.spin} /> : props.saved ? <Check size={13} /> : <Frame size={13} />}{props.isSaving ? 'Saving…' : props.saved ? 'Cover Saved' : 'Save Project Cover'}</button></div>
          </footer>
        </aside>
      </div>
    </div>
  </div>
}
