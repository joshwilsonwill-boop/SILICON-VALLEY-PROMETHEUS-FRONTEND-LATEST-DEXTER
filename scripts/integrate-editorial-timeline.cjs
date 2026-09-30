const fs = require('node:fs')
const path = 'components/editor/motion-edit-workspace.tsx'
let source = fs.readFileSync(path, 'utf8')
const replace = (needle, replacement) => {
  if (!source.includes(needle)) throw new Error(`Editorial integration anchor missing: ${needle.slice(0, 100)}`)
  source = source.replace(needle, replacement)
}
replace("import { EditorialTimelineTracks } from '@/components/editor/editorial-timeline-tracks'", "import { EditorialTimelineTracks } from '@/components/editor/editorial-timeline-tracks'\nimport { EditorialTimelineViewport } from '@/components/editor/editorial-timeline-viewport'\nimport { EditorialAudioPreview } from '@/components/editor/editorial-audio-preview'\nimport { EditorialSyncStatus } from '@/components/editor/editorial-sync-status'\nimport { useEditorialTimeline } from '@/hooks/use-editorial-timeline'")
replace('const DEFAULT_TIMELINE_HEIGHT = 248', 'const DEFAULT_TIMELINE_HEIGHT = 292')
replace('selectedMusicTrack = null, onSelectMusicTrack, onOpenMusicCatalog, soundtrackVolume = 0.5, onSoundtrackVolumeChange, soundtrackMuted = false, onSoundtrackMutedChange,', 'selectedMusicTrack: parentSelectedMusicTrack = null, onSelectMusicTrack, onOpenMusicCatalog, soundtrackVolume: parentSoundtrackVolume = 0.5, onSoundtrackVolumeChange: parentVolumeChange, soundtrackMuted: parentSoundtrackMuted = false, onSoundtrackMutedChange: parentMutedChange,')
replace('  const resolvedSegments = React.useMemo(() => {', `  const editorial = useEditorialTimeline()
  const selectedMusicTrack = editorial.timeline?.music?.track ?? parentSelectedMusicTrack
  const soundtrackVolume = editorial.timeline?.music?.volume ?? parentSoundtrackVolume
  const soundtrackMuted = editorial.timeline?.music?.muted ?? parentSoundtrackMuted
  const [audioError, setAudioError] = React.useState<string | null>(null)
  const onSoundtrackVolumeChange = React.useCallback((volume: number) => {
    parentVolumeChange?.(volume)
    editorial.patch({ type: 'mix', volume })
  }, [editorial.patch, parentVolumeChange])
  const onSoundtrackMutedChange = React.useCallback((muted: boolean) => {
    parentMutedChange?.(muted)
    editorial.patch({ type: 'mix', muted })
  }, [editorial.patch, parentMutedChange])
  React.useEffect(() => {
    if (editorial.timeline?.music) {
      if (parentSoundtrackVolume !== soundtrackVolume) parentVolumeChange?.(soundtrackVolume)
      if (parentSoundtrackMuted !== soundtrackMuted) parentMutedChange?.(soundtrackMuted)
    }
  }, [editorial.timeline?.music, parentSoundtrackVolume, parentSoundtrackMuted, soundtrackVolume, soundtrackMuted, parentVolumeChange, parentMutedChange])
  const audioEffects = React.useMemo(() => editorial.timeline?.effects ?? [], [editorial.timeline?.effects])
  const resolvedSegments = React.useMemo(() => {`)
replace('<span className="text-xs font-semibold tracking-wide text-white/88">Editorial timeline</span>', '<span className="text-xs font-semibold tracking-wide text-white/88">Editorial timeline</span><span className="hidden md:inline-flex"><EditorialSyncStatus /></span>')
const line = source.split('\n').find(line => line.includes('{showTimeline ? <section'))
if (!line) throw new Error('Missing timeline panel')
const beginning = line.indexOf('<div className="flex min-h-0"><div className="hidden w-24')
const ending = line.indexOf('</section> :', beginning)
if (beginning < 0 || ending < 0) throw new Error('Missing timeline canvas boundary')
const canvas = '<EditorialTimelineViewport previewUrl={previewKind === "video" ? previewUrl : ""} playing={previewPlaying} zoom={zoom} effectiveDuration={effectiveDuration} sourceLabel={sourceLabel ?? projectTitle} transcriptSegments={resolvedSegments} captionsVisible={captionsVisible} currentTime={currentTimeSec} textPlacements={textPlacements} cutRanges={effectiveCutRanges} selectedMusicTrack={selectedMusicTrack} soundtrackVolume={soundtrackVolume} soundtrackMuted={soundtrackMuted} onSoundtrackVolumeChange={onSoundtrackVolumeChange} onSoundtrackMutedChange={onSoundtrackMutedChange} onOpenMusicCatalog={onOpenMusicCatalog} onSeek={onSeek} />'
replace(line, (line.slice(0, beginning) + canvas + line.slice(ending)).replace('className="relative shrink-0 border-t', 'className="relative flex shrink-0 flex-col border-t'))
replace('      {showTimeline ? <section', `      <EditorialAudioPreview track={parentSelectedMusicTrack?.id === selectedMusicTrack?.id ? null : selectedMusicTrack} volume={soundtrackVolume} muted={soundtrackMuted} effects={audioEffects} videoRef={videoRef} playing={previewPlaying} currentTime={currentTimeSec} onError={setAudioError} />
      {audioError ? <p role="status" className="shrink-0 border-t border-amber-200/15 bg-[#15130d] px-4 py-1 text-[10px] text-amber-100">{audioError}</p> : null}
      {showTimeline ? <section`)
fs.writeFileSync(path, source)
