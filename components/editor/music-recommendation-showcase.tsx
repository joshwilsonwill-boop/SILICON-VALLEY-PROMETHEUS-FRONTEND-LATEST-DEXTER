'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Wand2,
  Cpu,
  Waves,
  Zap,
  Wind
} from 'lucide-react'

import { InlineLoadingAnimation } from '@/components/loading-animation'
import { MusicRecommendationCard } from '@/components/editor/music-recommendation-card'
import { MusicDirectionCard } from '@/components/editor/music-direction-card'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { buildRevealVariants } from '@/lib/motion'
import { inferMusicDirection } from '@/lib/music-direction'
import { cn } from '@/lib/utils'
import type {
  MusicRecommendation,
  MusicRecommendationGroup,
  MusicRecommendationPhase,
  MusicRecommendationPipelineResult,
  MusicSoundtrackProfile,
} from '@/lib/types'
import type { CreativeMetadata } from '@/lib/editorial-frame/types'

export type MusicRecommendationBlock = MusicRecommendationPipelineResult & {
  status: 'loading' | 'ready'
  query: string
  contextSummary?: string
  profileModel?: string
}

const REFINE_ACTIONS = [
  { key: 'cinematic', label: 'More cinematic', icon: Sparkles, hint: 'Pushes the lane toward score-like lift.' },
  { key: 'energetic', label: 'More energetic', icon: ArrowRight, hint: 'Raises the hook density and cut speed.' },
  { key: 'less-intense', label: 'Less intense', icon: SlidersHorizontal, hint: 'Keeps the music lighter and more restrained.' },
  { key: 'emotional', label: 'More emotional', icon: Wand2, hint: 'Adds a warmer, more reflective arc.' },
  { key: 'minimal', label: 'More minimal', icon: SlidersHorizontal, hint: 'Pulls the mix back under the dialogue.' },
  { key: 'fresh', label: 'Freshen results', icon: RefreshCw, hint: 'Keeps the profile but rotates the archive lane.' },
] as const

export function MusicRecommendationShowcase({
  music,
  isPreviewing,
  previewPlaying,
  stagedTrackIds,
  onPreviewToggle,
  onAdd,
  onRefine,
  viewportRoot,
  registerCardRef,
  creativeMetadata,
}: {
  music: MusicRecommendationBlock
  isPreviewing: (trackId: string) => boolean
  previewPlaying: boolean
  stagedTrackIds: Set<string>
  onPreviewToggle: (recommendation: MusicRecommendation) => void
  onAdd: (recommendation: MusicRecommendation) => void
  onRefine: (toneKey: string) => void
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  registerCardRef?: (trackId: string, node: HTMLDivElement | null) => void
  creativeMetadata?: CreativeMetadata | null
}) {
  const reduceMotion = useStableReducedMotion()
  const [visiblePhaseCount, setVisiblePhaseCount] = React.useState(1)
  const phases = music.phases ?? buildFallbackStages(music.profile, music.archiveCount, music.contextSummary, music.variantHint)
  const recommendationGroups = music.recommendationGroups ?? []
  const profile = music.profile

  const musicIntent = React.useMemo(() => {
    return inferMusicDirection({
      profile,
      metadata: creativeMetadata
    })
  }, [profile, creativeMetadata])

  React.useEffect(() => {
    if (reduceMotion) {
      setVisiblePhaseCount(phases.length)
      return
    }

    if (music.status === 'ready') {
      setVisiblePhaseCount(phases.length)
      return
    }

    setVisiblePhaseCount(Math.min(1, phases.length))
    const timer = window.setInterval(() => {
      setVisiblePhaseCount((current) => Math.min(phases.length, current + 1))
    }, 560)

    return () => window.clearInterval(timer)
  }, [music.status, phases.length, reduceMotion, music.query])

  const visiblePhases = phases.map((phase, index) => ({
    ...phase,
    status:
      music.status === 'ready'
        ? ('completed' as const)
        : index < visiblePhaseCount - 1
          ? ('completed' as const)
          : index === visiblePhaseCount - 1
            ? ('running' as const)
            : ('pending' as const),
  }))

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {music.status === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <MusicDirectionCard
              intent={musicIntent}
              onModify={(action) => onRefine(action)}
              reasoning={profile?.reasoningSummary}
              className="mb-4"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        variants={buildRevealVariants({ delay: 0.04, distance: 14, blur: 8, duration: 0.28 })}
        initial="hidden"
        whileInView="visible"
        viewport={{ root: viewportRoot, once: false, amount: 0.3 }}
        className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,22,28,0.98)_0%,rgba(10,10,14,0.96)_100%)] shadow-[0_32px_64px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
      >
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-4 flex-1 min-w-[300px]">
              <div className="inline-flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#7ff2d4]/10 border border-[#7ff2d4]/20 shadow-[0_0_15px_rgba(127,242,212,0.1)]">
                  <Cpu className="size-5 text-[#7ff2d4]" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                  {music.status === 'loading' ? 'Analyzing Video Vibe' : 'Soundtrack Intelligence'}
                </div>
              </div>

              <div className="text-xl font-black tracking-tight text-white/95">
                {profile?.contentCategory ?? 'Synthesizing Soundtrack Lanes'}
              </div>

              <p className="max-w-2xl text-[14px] leading-relaxed text-white/50 font-medium italic">
                {music.status === 'loading'
                  ? music.contextSummary || 'The system is reading pacing, mood, and local archive signals before ranking tracks.'
                  : profile?.reasoningSummary || music.reasoningSummary || 'Scoring complete. Multiple editorial directions have been prepared.'}
              </p>
            </div>

            {profile ? (
              <div className="min-w-[16rem] rounded-[24px] border border-white/8 bg-white/[0.03] p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                  <span>Confidence</span>
                  <span className="tabular-nums text-[#7ff2d4]">{Math.round(profile.confidence * 100)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05] shadow-inner">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(127,242,212,0.6)_0%,rgba(255,255,255,0.9)_50%,rgba(127,242,212,0.4)_100%)]"
                    animate={reduceMotion ? undefined : { width: `${Math.max(18, Math.round(profile.confidence * 100))}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                    style={{ width: `${Math.max(18, Math.round(profile.confidence * 100))}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Primary Lens</span>
                  <span className="text-[12px] font-bold text-white/70">
                    {profile.primaryMood} + {profile.secondaryMood}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {profile ? (
            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoChip label="Energy" value={`${Math.round(profile.energyLevel)}/100`} />
              <InfoChip label="Tempo" value={`${profile.tempoRange[0]}-${profile.tempoRange[1]} BPM`} />
              <InfoChip label="Audience" value={profile.audienceFeel} />
              <InfoChip label="Sync style" value={profile.editSyncStyle} />
            </div>
          ) : null}

          {profile ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <TagChip tone="emerald" label={profile.primaryMood} />
              <TagChip tone="cyan" label={profile.secondaryMood} />
              <TagChip tone="amber" label={profile.contentCategory} />
              {profile.genreCandidates.slice(0, 2).map((genre) => (
                <TagChip key={genre} tone="slate" label={genre} />
              ))}
              {profile.instrumentationHints.slice(0, 2).map((hint) => (
                <TagChip key={hint} tone="ice" label={hint} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-[24px] border border-white/8 bg-black/25 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Analysis Phases</div>
                <div className="mt-1 text-[13px] font-medium text-white/50 italic">
                  {music.status === 'loading' ? 'Moving through the intelligence layers...' : 'All scoring phases finalized.'}
                </div>
              </div>
              <div className="text-[11px] font-bold text-white/30 tracking-wider">
                {music.archiveCount} SAMPLES SCANNED
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <AnimatePresence initial={false}>
                {visiblePhases.map((phase, index) => (
                  <motion.div
                    key={phase.key}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 8, filter: 'blur(8px)' }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(8px)' }}
                    transition={{ duration: reduceMotion ? 0 : 0.24, delay: index * 0.04 }}
                    className={cn(
                      'rounded-[20px] border px-4 py-3 transition-all duration-300',
                      phase.status === 'running'
                        ? 'border-[#7ff2d4]/30 bg-[#7ff2d4]/10 shadow-[0_0_15px_rgba(127,242,212,0.05)]'
                        : phase.status === 'completed'
                          ? 'border-white/10 bg-white/[0.04]'
                          : 'border-white/5 bg-white/[0.015]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{phase.label}</div>
                        <div className="mt-1 text-[12px] font-bold text-white/60 truncate max-w-[200px]">{phase.detail}</div>
                      </div>
                      <div className={cn(
                        "mt-0.5 flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest",
                        phase.status === 'running' ? "border-[#7ff2d4]/30 text-[#7ff2d4]" : "border-white/10 text-white/30"
                      )}>
                        {phase.status === 'running' ? (
                          <InlineLoadingAnimation size={14} label={`${phase.label} in progress`} />
                        ) : null}
                        {phase.status === 'running' ? 'Live' : phase.status === 'completed' ? 'Done' : 'Queued'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <AnimatePresence initial={false}>
              {music.status === 'loading' ? (
                <motion.div
                  key="music-loading"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                  className="flex min-h-36 items-center justify-center"
                >
                  <InlineLoadingAnimation size={72} label="Ranking soundtrack recommendations" />
                </motion.div>
              ) : (
                <motion.div
                  key="music-groups"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  {recommendationGroups.map((group, groupIndex) => (
                    <RecommendationGroupPanel
                      key={group.key}
                      group={group}
                      groupIndex={groupIndex}
                      previewPlaying={previewPlaying}
                      stagedTrackIds={stagedTrackIds}
                      isPreviewing={isPreviewing}
                      onPreviewToggle={onPreviewToggle}
                      onAdd={onAdd}
                      viewportRoot={viewportRoot}
                      registerCardRef={registerCardRef}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Refine Lane Bar */}
      <motion.section
        variants={buildRevealVariants({ delay: 0.16, distance: 12, blur: 8, duration: 0.26 })}
        initial="hidden"
        whileInView="visible"
        viewport={{ root: viewportRoot, once: false, amount: 0.24 }}
        className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,22,28,0.95)_0%,rgba(10,10,14,0.98)_100%)] p-5 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="size-4 text-white/30" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Refinement Layer</h3>
          </div>
          <div className="text-[11px] font-bold text-white/20 uppercase tracking-widest">
            {music.source === 'groq' ? 'LLM Intelligence Active' : 'Heuristic Engine Active'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {REFINE_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => onRefine(action.key)}
                className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-bold text-white/50 transition-all hover:border-[#7ff2d4]/30 hover:bg-[#7ff2d4]/10 hover:text-[#7ff2d4] hover:shadow-[0_0_15px_rgba(127,242,212,0.1)]"
                title={action.hint}
              >
                <Icon className="size-4 transition-colors" />
                {action.label}
              </button>
            )
          })}
        </div>
      </motion.section>
    </div>
  )
}

function RecommendationGroupPanel({
  group,
  groupIndex,
  previewPlaying,
  stagedTrackIds,
  isPreviewing,
  onPreviewToggle,
  onAdd,
  viewportRoot,
  registerCardRef,
}: {
  group: MusicRecommendationGroup
  groupIndex: number
  previewPlaying: boolean
  stagedTrackIds: Set<string>
  isPreviewing: (trackId: string) => boolean
  onPreviewToggle: (recommendation: MusicRecommendation) => void
  onAdd: (recommendation: MusicRecommendation) => void
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  registerCardRef?: (trackId: string, node: HTMLDivElement | null) => void
}) {
  const reduceMotion = useStableReducedMotion()

  return (
    <motion.section
      variants={buildRevealVariants({ delay: 0.06 * groupIndex, distance: 12, blur: 7, duration: 0.24 })}
      initial="hidden"
      whileInView="visible"
      viewport={{ root: viewportRoot, once: false, amount: 0.24 }}
      className={cn(
        'overflow-hidden rounded-[22px] border shadow-[0_14px_34px_-26px_rgba(0,0,0,0.82)]',
        group.accent === 'emerald'
          ? 'border-emerald-400/16 bg-emerald-400/[0.06]'
          : group.accent === 'cyan'
            ? 'border-cyan-400/16 bg-cyan-400/[0.06]'
            : group.accent === 'amber'
              ? 'border-amber-400/16 bg-amber-400/[0.06]'
              : group.accent === 'rose'
                ? 'border-rose-400/16 bg-rose-400/[0.06]'
                : group.accent === 'ice'
                  ? 'border-sky-300/16 bg-sky-300/[0.06]'
                  : 'border-white/8 bg-white/[0.03]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/6 px-4 py-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40">
            <span className={cn('h-2 w-2 rounded-full', group.accent === 'emerald' ? 'bg-emerald-300' : group.accent === 'cyan' ? 'bg-cyan-300' : group.accent === 'amber' ? 'bg-amber-300' : group.accent === 'rose' ? 'bg-rose-300' : group.accent === 'ice' ? 'bg-sky-200' : 'bg-white/60')} />
            {group.label}
          </div>
          <div className="mt-1 text-sm text-white/74">{group.description}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-white/52">
          {group.tracks.length} track{group.tracks.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {group.tracks.map((recommendation, trackIndex) => (
          <div
            key={recommendation.id}
            ref={(node) => {
              registerCardRef?.(recommendation.id, node)
            }}
            className="rounded-[20px]"
          >
            <MusicRecommendationCard
              recommendation={recommendation}
              isPreviewing={isPreviewing(recommendation.id) && previewPlaying}
              isStaged={stagedTrackIds.has(recommendation.id)}
              onPreviewToggle={onPreviewToggle}
              onAdd={onAdd}
              viewportRoot={viewportRoot}
              revealDelay={groupIndex * 0.08 + trackIndex * 0.04}
            />
          </div>
        ))}
      </div>
    </motion.section>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.28em] text-white/34">{label}</div>
      <div className="mt-1 text-sm text-white/74">{value}</div>
    </div>
  )
}

function TagChip({
  label,
  tone,
}: {
  label: string
  tone: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'ice'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-100'
      : tone === 'cyan'
        ? 'border-cyan-400/18 bg-cyan-400/10 text-cyan-100'
        : tone === 'amber'
          ? 'border-amber-400/18 bg-amber-400/10 text-amber-100'
          : tone === 'rose'
            ? 'border-rose-400/18 bg-rose-400/10 text-rose-100'
            : tone === 'ice'
              ? 'border-sky-300/18 bg-sky-300/10 text-sky-100'
              : 'border-white/10 bg-white/[0.04] text-white/70'

  return <span className={cn('rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em]', toneClass)}>{label}</span>
}

function buildFallbackStages(
  profile?: MusicSoundtrackProfile,
  archiveCount?: number,
  contextSummary?: string,
  variantHint?: string,
): MusicRecommendationPhase[] {
  return [
    {
      key: 'analyzing-vibe',
      label: 'Analyzing video vibe',
      detail: contextSummary || 'Reading the cut before ranking tracks.',
      progress: 0.12,
    },
    {
      key: 'detecting-pacing',
      label: 'Detecting pacing',
      detail: profile ? `Aiming near ${profile.tempoRange[0]}-${profile.tempoRange[1]} BPM.` : 'Mapping pacing to the local archive.',
      progress: 0.28,
    },
    {
      key: 'inferring-mood',
      label: 'Inferring mood',
      detail: profile ? `${profile.primaryMood} with ${profile.secondaryMood} support.` : 'Selecting a lane that fits the emotion.',
      progress: 0.46,
    },
    {
      key: 'building-profile',
      label: 'Building soundtrack profile',
      detail: profile ? profile.reasoningSummary : 'Writing a profile before any ranking starts.',
      progress: 0.62,
    },
    {
      key: 'searching-archive',
      label: 'Searching archive',
      detail: `${archiveCount ?? 0} local tracks scanned.${variantHint ? ` Refine mode: ${variantHint}.` : ''}`,
      progress: 0.8,
    },
    {
      key: 'ranking-matches',
      label: 'Ranking best matches',
      detail: 'Sorting by fit, freshness, and repetition risk.',
      progress: 0.92,
    },
    {
      key: 'balancing-diversity',
      label: 'Balancing diversity',
      detail: 'Preparing alternate lanes so the result does not feel repetitive.',
      progress: 1,
    },
  ]
}
