'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { safeDynamic } from '@/lib/dynamic-safe'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  BrainCircuit,
  ChevronRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  Facebook,
  Film,
  Download,
  GitBranch,
  ImageIcon,
  Lock,
  Layers,
  MessageCircle,
  MessageSquare,
  Music4,
  Palette,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Scissors,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Instagram,
  Linkedin,
  X,
} from 'lucide-react'

import { MusicPlayNotification } from '@/components/editor/music-play-notification'
import { MusicSpotlightOrb } from '@/components/editor/music-spotlight-orb'
import { MusicRecommendationShowcase } from '@/components/editor/music-recommendation-showcase'
import { PrometheusChat, type PrometheusChatMessage } from '@/components/editor/PrometheusChat'
import { ChatStyleSelector } from '@/components/editor/chat-style-selector'
import { MusicTabPanel } from '@/components/editor/music-tab-panel'
import { MotionPropertyCanvas } from '@/components/editor/motion-property-canvas'
import { CinematicTimeline } from '@/components/editor/CinematicTimeline'
import { MediaBin } from '@/components/editor/MediaBin'
import { MotionBrainCanvas } from '@/components/editor/MotionBrainCanvas'
import { IterationModal } from '@/components/editor/IterationModal'
import { ContinueBanner } from '@/components/editor/ContinueBanner'
import gsap from 'gsap'
import { TextReveal } from '@/components/editor/text-reveal'
import { InlineLoadingAnimation } from '@/components/loading-animation'
import { LuxuryVignette } from '@/components/editor/luxury-vignette'
import { EditorNewProjectUploadDialog } from '@/components/editor/editor-new-project-upload-dialog'
import { EditorHeader } from '@/components/editor/EditorHeader'
import { PreviewCanvas } from '@/components/editor/PreviewCanvas'
import { TimelinePanel } from '@/components/editor/TimelinePanel'
import { MobileVideoPlayer } from '@/app/editor/components/mobile-video-player'
import { stopEditorMedia } from '@/app/editor/stores/audio-store'
import { setEditorSourceStatus } from '@/lib/editor/source-status-store'

// Always-Fast Lobe System
const LivingCanvas = safeDynamic(() => import('@/components/living-canvas').then((mod) => ({ default: mod.LivingCanvas })), {
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#050505] p-6">
      <InlineLoadingAnimation size={120} label="Preparing the live AI canvas" />
    </div>
  ),
})

const CinematicExportCluster = safeDynamic(() => import('@/components/editor/cinematic-export-cluster').then(mod => ({ default: mod.CinematicExportCluster })))
const ViralClipSplitPreview = safeDynamic(() => import('@/components/editor/viral-clip-split-preview').then(mod => ({ default: mod.ViralClipSplitPreview })))
const EditorialComposerFrameAssist = safeDynamic(() => import('@/components/editor/editorial-composer-frame-assist').then(mod => ({ default: mod.EditorialComposerFrameAssist })))
const FrameComposerDraftMirror = safeDynamic(() => import('@/components/editor/frame-composer-draft-mirror').then(mod => ({ default: mod.FrameComposerDraftMirror })))

import { ViralClipTrigger } from '@/components/editor/viral-clip-trigger'
import { useSourceStage } from '@/hooks/use-source-stage'
import { useViralClipJob } from '@/hooks/use-viral-clip-job'
import { clearPendingEditorNavigation, getRememberedEditorReturnPath } from '@/lib/editor-navigation'
import { useFrameTargeting } from '@/hooks/use-frame-targeting'
import { parseFrameReference } from '@/lib/editorial-frame/parse-frame-reference'
import {
  formatAspectFamily,
  formatDurationBucket,
  formatProcessingClass,
  formatSourceProfileMetric,
  formatTimeProfile,
  formatWeightBucket,
  getSourcePreviewAspectRatio,
  getOutputProfileAspectRatio,
} from '@/lib/media/source-profile'
import {
  MUSIC_CATALOG,
  createDefaultMusicPreference,
  normalizeMusicPreference,
} from '@/lib/music-catalog'
import {
  buildHeuristicSoundtrackProfile,
  buildMusicAnalysisStages,
  buildMusicRecommendationSet,
} from '@/lib/music-recommendation-core'
import { readLocalStorageJSON, writeLocalStorageJSON } from '@/lib/storage'
import { useStableReducedMotion } from '@/hooks/use-stable-reduced-motion'
import { buildRevealVariants } from '@/lib/motion'
import { useTextareaResize } from '@/hooks/use-textarea-resize'
import { buildCinematicAnimationPlan } from '@/lib/cinematic/animation-planner'
import { cn } from '@/lib/utils'
import { SELECTED_EDITOR_MUSIC_EVENT, type SelectedEditorMusicEventDetail } from '@/lib/editor-music-selection'
import { upsertProject } from '@/lib/mock'
import { projects } from '@/lib/projects'
import { analyzeMusicIntent } from '@/lib/music-intent'
import { queuePreviewRevisionRequest } from '@/lib/editorial-frame/mock-preview-api'
import { getSessionSourcePreview, setSessionSourcePreview } from '@/lib/source-preview-session'
import { createSourceAssetObjectUrl, getStoredSourceAssetFile } from '@/lib/source-asset-store'
import { STYLE_TEMPLATES, type StyleTemplate } from '@/lib/styles/style-templates'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { FrameAssistSubmission, FrameSuggestion, QueuedPreviewRevisionState } from '@/lib/editorial-frame/types'
import type {
  AnimationPlan,
  MusicPreference,
  MusicRecommendation,
  MusicRecommendationGroup,
  MusicRecommendationPhase,
  MusicRecommendationPipelineResult,
  MusicSoundtrackProfile,
  MusicVideoContext,
  ProcessingJob,
  Project,
  OutputProfile,
  StagedMusicTrack,
  ViralClipSelectedClip,
  ViralClipTargetPlatform,
  CinematicAssetRegistry,
  ProjectExport,
} from '@/lib/types'
import { EditorProvider, useEditor } from "@/components/editor/EditorContext";
import { TimelineEngine } from "@/components/editor/TimelineEngine";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { CommandBubble } from "@/components/editor/CommandBubble";
import { ExportDrawer } from "@/components/editor/ExportDrawer";
import { CircularToast } from "@/components/editor/CircularToast";

type HeaderNavMode = 'Editor' | 'Music' | 'Motion'
type PreviewMediaKind = 'video' | 'image'
type PreviewFitMode = 'fill' | 'fit'
type BottomMode = 'Original' | 'Music' | 'Timeline'
type PreviewFramePreset = OutputProfile
type MobileEditorTabKey = 'status' | 'music' | 'motion' | 'chat' | 'versions' | 'export'
type MobileExportQuality = 'draft' | 'standard' | 'max'
type MobileExportFormat = 'mp4' | 'mov'
type SessionPreviewState = {
  sourceKey: string
  url: string
  kind: PreviewMediaKind
}

type SplitPreviewAssetState = {
  sourceAssetId: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  leftUrl: string | null
  rightUrl: string | null
  errorMessage: string | null
}

const EMPTY_SPLIT_PREVIEW_ASSETS: SplitPreviewAssetState = {
  sourceAssetId: null,
  status: 'idle',
  leftUrl: null,
  rightUrl: null,
  errorMessage: null,
}

const PREVIEW_FRAME_PRESETS: PreviewFramePreset[] = ['source', '9:16', '1:1', '4:5', '16:9']

type ChatEntry = {
  id: string
  role: 'assistant' | 'user' | 'system'
  text: string
  status?: 'loading' | 'ready'
  music?: ChatMusicBlock
  task?: ChatTaskBlock
  clip?: ChatClipBlock
  posting?: SocialPostingBlock
  metadata?: {
    sources?: ChatSource[]
    toolCalls?: ChatToolCall[]
    frames?: ChatFrameReference[]
    attachments?: ChatAttachment[]
    selectedStyle?: ChatSelectedStyle
  }
}

type ChatSelectedStyle = {
  id: string
  name: string
  description?: string
}

type ChatSource = {
  url?: string
  title?: string
  type?: string
  name?: string
}

type ChatToolCall = {
  id: string
  name: string
  label: string
  status: 'completed' | 'needs_approval' | 'failed'
  summary: string
  input?: unknown
  output?: unknown
}

type ChatFrameReference = {
  id: string
  label: string
  timecode?: string
  seconds?: number
  thumbnailUrl?: string | null
  reason?: string
}

type ChatAttachment = {
  id: string
  name: string
  type: string
  dataUrl?: string
  url?: string
}

type ChatMusicBlock = MusicRecommendationPipelineResult & {
  status: 'loading' | 'ready'
  query: string
  preference: MusicPreference
  contextSummary?: string
  profileModel?: string
}

type ChatTaskStepState = 'pending' | 'active' | 'complete' | 'error'

type ChatTaskStep = {
  id: string
  label: string
  detail: string
  state: ChatTaskStepState
}

type ChatTaskBlock = {
  intent: 'reply' | 'edit' | 'music' | 'clip' | 'motion'
  complexity: 'single' | 'multi'
  title: string
  summary: string
  steps: ChatTaskStep[]
}

type ChatClipVariant = {
  id: string
  title: string
  label: string
  timeLabel: string
  durationLabel: string
  scoreLabel: string
  reason: string
  previewUrl?: string | null
  thumbnailUrl?: string | null
}

type ChatClipBlock = {
  status: 'loading' | 'ready' | 'error'
  stageLabel: string
  detail: string
  progressPercent: number
  targetPlatform: ViralClipTargetPlatform
  clipCount: number
  sourcePreviewUrl?: string | null
  variants: ChatClipVariant[]
  errorMessage?: string | null
}

type SocialPostingPlatform = 'linkedin' | 'youtube' | 'instagram' | 'tiktok' | 'x' | 'facebook'

type RecentPostingFile = {
  id: string
  title: string
  projectTitle?: string
  durationLabel: string
  updatedLabel: string
  topic: string
  thumbnailUrl?: string | null
}

type PostingProjectGroup = {
  id: string
  title: string
  videos: RecentPostingFile[]
}

type SocialCaptionDraft = {
  text: string
  variationIndex: number
  approved: boolean
}

type SocialPostingResult = {
  status: 'posting' | 'success' | 'failed'
  progress: number
  url?: string
  error?: string
}

type SocialPostingBlock = {
  status: 'browser' | 'confirm' | 'captions' | 'platforms' | 'accounts' | 'preparing' | 'success'
  files: RecentPostingFile[]
  projects: PostingProjectGroup[]
  activeFileIndex: number
  selectedVideo?: RecentPostingFile | null
  selectedFileId?: string | null
  selectedPlatforms: SocialPostingPlatform[]
  captions: Partial<Record<SocialPostingPlatform, SocialCaptionDraft>>
  captionGenerating?: boolean
  postingResults?: Partial<Record<SocialPostingPlatform, SocialPostingResult>>
  note?: string
}

type ChatApiResponse = {
  reply?: string
  answer?: string
  error?: string
  sources?: unknown
  toolCalls?: unknown
  frames?: unknown
  attachments?: unknown
}

type ComposerAutomationRequest = {
  id: number
  prompt: string
}

type ClipRelayState = {
  id: number
  userId: string
  assistantId: string
  prompt: string
  clip: ChatClipBlock
}

type MusicApiResponse = MusicRecommendationPipelineResult & {
  error?: string
  contextSummary?: string
  profileModel?: string
}

const MUSIC_PREFERENCE_STORAGE_PREFIX = 'prometheus.editor.music-preferences.v1'
const STAGED_MUSIC_STORAGE_PREFIX = 'prometheus.editor.staged-music.v1'
const CHAT_ENTRIES_STORAGE_PREFIX = 'prometheus.editor.chat-entries.v1'
const MUSIC_PREVIEW_VOLUME_STORAGE_PREFIX = 'prometheus.editor.music-preview-volume.v1'
const SELECTED_EDITOR_MUSIC_STORAGE_PREFIX = 'prometheus.editor.selected-track.v1'
const DEFAULT_MUSIC_PREVIEW_VOLUME = 0.34
const MUSIC_INTENT_KEYWORDS = [
  'add music',
  'music',
  'song',
  'songs',
  'track',
  'tracks',
  'soundtrack',
  'score',
  'cue',
  'beat',
  'beats',
  'instrumental',
  'playlist',
  'audio',
  'sound bed',
] as const

const EDIT_INTENT_KEYWORDS = [
  'edit',
  'edit this video',
  'make this video',
  'make this cut',
  'rough cut',
  'rough cuts',
  'refine',
  'tighten',
  'trim',
  'shorten',
  'extend',
  'reframe',
  'caption',
  'captions',
  'subtitle',
  'subtitle',
  'title card',
  'motion',
  'overlay',
  'overlay text',
  'timeline',
  'pacing',
  'hook',
  'intro',
  'outro',
  'remove dead air',
  'cinematic',
  'polish',
  'clean up',
] as const

function chatEntriesStorageKey(projectId: string) {
  return `${CHAT_ENTRIES_STORAGE_PREFIX}.${projectId}`
}

function musicPreferenceStorageKey(projectId: string) {
  return `${MUSIC_PREFERENCE_STORAGE_PREFIX}.${projectId}`
}

function stagedMusicStorageKey(projectId: string) {
  return `${STAGED_MUSIC_STORAGE_PREFIX}.${projectId}`
}

function musicPreviewVolumeStorageKey(projectId: string) {
  return `${MUSIC_PREVIEW_VOLUME_STORAGE_PREFIX}.${projectId}`
}

function selectedEditorMusicStorageKey(projectId: string) {
  return `${SELECTED_EDITOR_MUSIC_STORAGE_PREFIX}.${projectId}`
}

function clampMusicPreviewVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_MUSIC_PREVIEW_VOLUME
  return Math.max(0, Math.min(1, value))
}

function isMusicIntent(value: string) {
  const normalized = value.trim().toLowerCase()
  return MUSIC_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function isGenericMusicRequest(value: string) {
  const normalized = value.trim().toLowerCase()
  const exactMatches = [
    'add music',
    'music',
    'song',
    'songs',
    'track',
    'tracks',
    'soundtrack',
    'score',
    'cue',
    'beat',
    'beats',
    'instrumental',
    'playlist',
    'audio',
    'sound bed',
    'recommend music',
    'music recommendations',
    'song recommendations',
  ]

  return exactMatches.includes(normalized) || /^((add|recommend|suggest)\s+)?music(\s+.*)?$/.test(normalized) || /^[a-z\s]{1,20}$/.test(normalized)
}

function isEditIntent(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  if (EDIT_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true
  return /^(?:please\s+)?(?:can you\s+)?(?:make|edit|tighten|trim|reframe|caption|subtitle|refine|polish|cut)\b/.test(normalized)
}

function classifyChatTask({
  input,
  shouldEditRequest,
  shouldRecommendMusic,
  forceClip = false,
}: {
  input: string
  shouldEditRequest?: boolean
  shouldRecommendMusic?: boolean
  forceClip?: boolean
}): ChatTaskBlock {
  const normalized = normalizeInlineText(input)
  const wantsClip =
    forceClip ||
    hasAny(normalized, ['clip', 'clips', 'cutdown', 'cut down', 'short-form', 'short form', 'reel', 'tiktok', 'viral'])
  const wantsMotion = hasAny(normalized, ['motion', 'animate', 'animation', 'kinetic', 'camera move', 'node', 'typography'])
  const wantsMusic = Boolean(shouldRecommendMusic)
  const wantsEdit = Boolean(shouldEditRequest) || isEditIntent(input)
  const actionCount = [wantsClip, wantsMusic, wantsEdit, wantsMotion].filter(Boolean).length
  const sequenced = /\b(then|after that|also|and then|before|while|with|plus)\b/.test(normalized) || normalized.includes(',')
  const complexity: ChatTaskBlock['complexity'] =
    actionCount > 1 || sequenced || normalized.length > 118 ? 'multi' : 'single'

  if (wantsClip) {
    return {
      intent: 'clip',
      complexity: 'multi',
      title: 'Clip task parser',
      summary: 'Splitting the current source into scored short-form variants.',
      steps: [
        {
          id: 'ingest-source',
          label: 'Ingest source',
          detail: 'Lock the visible video, runtime, frame profile, and platform target.',
          state: 'complete',
        },
        {
          id: 'slice-equal',
          label: 'Slice equal candidates',
          detail: 'Build evenly spaced candidate windows before ranking hooks.',
          state: 'active',
        },
        {
          id: 'score-retention',
          label: 'Score retention',
          detail: 'Compare pacing, quote density, visual clarity, and caption potential.',
          state: 'pending',
        },
        {
          id: 'prepare-variants',
          label: 'Prepare variants',
          detail: 'Package the strongest cuts back into the relay.',
          state: 'pending',
        },
      ],
    }
  }

  if (wantsMusic) {
    return {
      intent: 'music',
      complexity,
      title: 'Music task parser',
      summary: 'Reading the cut and ranking soundtrack lanes.',
      steps: [
        {
          id: 'scene-profile',
          label: 'Read scene profile',
          detail: 'Extract pacing, mood, duration, and dialogue pressure.',
          state: 'complete',
        },
        {
          id: 'sound-vector',
          label: 'Map sound vector',
          detail: 'Convert the request into mood, energy, and texture constraints.',
          state: 'active',
        },
        {
          id: 'rank-cues',
          label: 'Rank cues',
          detail: 'Search the archive and hold back tracks that fight the edit.',
          state: complexity === 'multi' ? 'pending' : 'active',
        },
      ],
    }
  }

  if (wantsEdit || wantsMotion) {
    return {
      intent: wantsMotion ? 'motion' : 'edit',
      complexity,
      title: wantsMotion ? 'Motion task parser' : 'Edit task parser',
      summary: wantsMotion
        ? 'Resolving motion, typography, camera, and timing intent.'
        : 'Turning the instruction into a directed edit pass.',
      steps: [
        {
          id: 'parse-request',
          label: 'Parse instruction',
          detail: 'Separate task language from conversational context.',
          state: 'complete',
        },
        {
          id: 'inspect-frame',
          label: 'Inspect edit context',
          detail: 'Use source profile, current frame, and prompt history.',
          state: 'active',
        },
        {
          id: 'stage-route',
          label: wantsMotion ? 'Route motion nodes' : 'Stage edit route',
          detail: wantsMotion
            ? 'Link motion, type, camera, and timing nodes into one pass.'
            : 'Choose the edit template and queue the right lane.',
          state: complexity === 'multi' ? 'pending' : 'active',
        },
        {
          id: 'reply',
          label: 'Draft sharp reply',
          detail: 'Explain the move without turning the relay into generic chat.',
          state: 'pending',
        },
      ],
    }
  }

  return {
    intent: 'reply',
    complexity: 'single',
    title: 'Thinking',
    summary: 'Composing a concise reply grounded in the current edit.',
    steps: [
      {
        id: 'reply-think',
        label: 'Thinking',
        detail: 'Grounding the response in the current cut.',
        state: 'active',
      },
    ],
  }
}

function settleChatTask(task: ChatTaskBlock | undefined, failed = false): ChatTaskBlock | undefined {
  if (!task) return task

  return {
    ...task,
    steps: task.steps.map((step) => ({
      ...step,
      state: failed ? (step.state === 'active' ? 'error' : step.state) : 'complete',
    })),
  }
}

function pickClipNumber(clip: ViralClipSelectedClip, keys: Array<keyof ViralClipSelectedClip>) {
  for (const key of keys) {
    const value = clip[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return null
}

function pickClipString(clip: ViralClipSelectedClip, keys: Array<keyof ViralClipSelectedClip>) {
  for (const key of keys) {
    const value = clip[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function formatClipRangeLabel(startMs: number | null, endMs: number | null, fallbackIndex: number, totalDurationSec: number) {
  if (startMs !== null || endMs !== null) {
    const start = startMs !== null ? msToTime(startMs) : '0:00'
    const end = endMs !== null ? msToTime(endMs) : 'open'
    return `${start} - ${end}`
  }

  const total = totalDurationSec > 0 ? totalDurationSec : 48
  const segment = total / 4
  const start = segment * fallbackIndex
  const end = Math.min(total, start + segment)
  return `${msToTime(start * 1000)} - ${msToTime(end * 1000)}`
}

function formatClipDurationLabel(startMs: number | null, endMs: number | null, durationSec: number | null, durationMs: number | null) {
  if (durationSec !== null) return `${Math.max(1, Math.round(durationSec))}s`
  if (durationMs !== null) return `${Math.max(1, Math.round(durationMs / 1000))}s`
  if (startMs !== null && endMs !== null && endMs > startMs) return `${Math.max(1, Math.round((endMs - startMs) / 1000))}s`
  return 'Auto'
}

function formatClipScoreLabel(score: number | null, confidence: number | null, index: number) {
  const value = score ?? confidence
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value <= 1 ? Math.round(value * 100) : Math.round(value)
    return `${Math.max(1, Math.min(99, normalized))}% fit`
  }

  return `${Math.max(82, 94 - index * 3)}% fit`
}

function buildChatClipVariants({
  selectedClips,
  clipCount,
  sourcePreviewUrl,
  totalDurationSec,
}: {
  selectedClips: ViralClipSelectedClip[]
  clipCount: number
  sourcePreviewUrl?: string | null
  totalDurationSec: number
}): ChatClipVariant[] {
  if (selectedClips.length > 0) {
    return selectedClips.slice(0, Math.max(4, clipCount)).map((clip, index) => {
      const startMs = pickClipNumber(clip, ['startMs', 'start_ms', 'startTimeMs'])
      const endMs = pickClipNumber(clip, ['endMs', 'end_ms', 'endTimeMs'])
      const durationSec = pickClipNumber(clip, ['durationSec'])
      const durationMs = pickClipNumber(clip, ['durationMs'])
      const score = pickClipNumber(clip, ['score'])
      const confidence = pickClipNumber(clip, ['confidence'])

      return {
        id: String(clip.id ?? `clip-${index}`),
        title: pickClipString(clip, ['title', 'label', 'name']) ?? `Clip ${index + 1}`,
        label: `Variant ${String(index + 1).padStart(2, '0')}`,
        timeLabel: formatClipRangeLabel(startMs, endMs, index, totalDurationSec),
        durationLabel: formatClipDurationLabel(startMs, endMs, durationSec, durationMs),
        scoreLabel: formatClipScoreLabel(score, confidence, index),
        reason:
          pickClipString(clip, ['reason', 'description']) ??
          'Selected for hook density, pacing, and short-form retention.',
        previewUrl: pickClipString(clip, ['previewUrl']) ?? sourcePreviewUrl ?? null,
        thumbnailUrl: pickClipString(clip, ['thumbnailUrl']) ?? null,
      }
    })
  }

  const count = Math.max(4, Math.min(6, clipCount || 4))
  return Array.from({ length: count }, (_, index) => ({
    id: `clip-placeholder-${index + 1}`,
    title: ['Cold open hook', 'Quote compression', 'Pattern break', 'Final proof'][index] ?? `Candidate ${index + 1}`,
    label: `Variant ${String(index + 1).padStart(2, '0')}`,
    timeLabel: formatClipRangeLabel(null, null, index, totalDurationSec),
    durationLabel: 'Scoring',
    scoreLabel: `${Math.max(82, 94 - index * 3)}% fit`,
    reason: 'Candidate window staged while timing, motion, and visual clarity are ranked.',
    previewUrl: sourcePreviewUrl ?? null,
    thumbnailUrl: null,
  }))
}

function buildClipTaskBlock({
  status,
  stageLabel,
  detail,
  progressPercent,
  targetPlatform,
  clipCount,
  sourcePreviewUrl,
  variants,
  errorMessage,
}: ChatClipBlock): ChatTaskBlock {
  const failed = status === 'error'
  const ready = status === 'ready'

  return {
    intent: 'clip',
    complexity: 'multi',
    title: 'Clip task parser',
    summary: detail,
    steps: [
      {
        id: 'source-lock',
        label: 'Lock visible source',
        detail: `Targeting ${targetPlatform.toUpperCase()} with ${clipCount} candidate cuts.`,
        state: failed ? 'error' : 'complete',
      },
      {
        id: 'equal-slices',
        label: 'Equal slice pass',
        detail: 'The preview is cutting into skeletal candidate panels.',
        state: failed ? 'error' : progressPercent >= 28 ? 'complete' : 'active',
      },
      {
        id: 'backend-score',
        label: stageLabel,
        detail: errorMessage ?? detail,
        state: failed ? 'error' : ready ? 'complete' : progressPercent >= 72 ? 'active' : 'pending',
      },
      {
        id: 'relay-variants',
        label: 'Relay variants',
        detail: `${variants.length} variants are staged in the chat interface.`,
        state: failed ? 'error' : ready ? 'complete' : progressPercent >= 88 ? 'active' : 'pending',
      },
    ],
  }
}

function removeChatEntry(entries: ChatEntry[], entryId: string) {
  return entries.filter((entry) => entry.id !== entryId)
}

function toPrometheusChatMessages(entries: ChatEntry[]): PrometheusChatMessage[] {
  return entries
    .filter((entry) => entry.role !== 'system')
    .map((entry): PrometheusChatMessage => ({
      id: entry.id,
      role: entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
      status: entry.status === 'loading' ? 'thinking' : 'ready',
      pills: [
        ...(entry.metadata?.frames ?? []).map((frame) => ({
          id: `frame-${frame.id}`,
          label: frame.label,
        })),
        ...(entry.metadata?.toolCalls ?? []).map((toolCall) => ({
          id: `tool-${toolCall.id}`,
          label: toolCall.label,
        })),
        ...(entry.metadata?.sources ?? []).map((source, index) => ({
          id: `source-${index}`,
          label: source.title || source.name || `Source ${index + 1}`,
        })),
      ],
    }))
}

const WORKSPACE_TABS: Array<{ key: HeaderNavMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'Editor', label: 'Editor', icon: Film },
  { key: 'Music', label: 'Music', icon: Music4 },
  { key: 'Motion', label: 'Motion', icon: Sparkles },
]

function normalizeWorkspaceTabParam(value: string | null): HeaderNavMode | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'editor') return 'Editor'
  if (normalized === 'music') return 'Music'
  if (normalized === 'motion') return 'Motion'
  return null
}

const MOBILE_EDITOR_TABS: Array<{ key: MobileEditorTabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'status', label: 'Status', icon: Activity },
  { key: 'music', label: 'Music', icon: Music4 },
  { key: 'motion', label: 'Motion', icon: Sparkles },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'versions', label: 'Versions', icon: GitBranch },
  { key: 'export', label: 'Export', icon: Download },
]

const MUSIC_REFINEMENT_OPTIONS = [
  {
    key: 'minimal',
    label: 'More minimal',
    mood: 'minimal',
    energy: 'low',
    variantHint: 'minimal',
    hint: 'Soft, spacious, and under-dialogue.',
  },
  {
    key: 'cinematic',
    label: 'More cinematic',
    mood: 'cinematic',
    energy: 'medium',
    variantHint: 'cinematic',
    hint: 'Polished, score-like, and a little more elevated.',
  },
  {
    key: 'energetic',
    label: 'More energetic',
    mood: 'uplifting',
    energy: 'high',
    variantHint: 'energetic',
    hint: 'Forward motion for faster cuts and sharper hooks.',
  },
  {
    key: 'less-intense',
    label: 'Less intense',
    mood: 'minimal',
    energy: 'low',
    variantHint: 'less-intense',
    hint: 'Thoughtful but lighter and easier under dialogue.',
  },
  {
    key: 'emotional',
    label: 'More emotional',
    mood: 'minimal',
    energy: 'medium',
    variantHint: 'emotional',
    hint: 'Warmer, softer, and more reflective.',
  },
  {
    key: 'fresh',
    label: 'Freshen results',
    mood: 'cinematic',
    energy: 'medium',
    variantHint: 'fresh',
    hint: 'Keep the lane but rotate the archive lane.',
  },
] as const

const VIRAL_CLIP_PLATFORM_DEFAULT: ViralClipTargetPlatform = 'tiktok'

const VIRAL_CLIP_COUNT_PRESETS = [
  { min: 2, max: 3 },
  { min: 3, max: 5 },
  { min: 5, max: 8 },
] as const

const SHOULD_PREFETCH_EDITOR_SUPPORT_ROUTES = process.env.NODE_ENV === 'production'

const MUSIC_RECOMMENDATION_LIMIT = 8
const EDITOR_REQUEST_TIMEOUT_MS = 25_000

const CHAT_COMPOSER_FONT_STYLE = {
  fontFamily: '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif',
} satisfies React.CSSProperties

const CHAT_REVEAL_EASE: [number, number, number, number] = [0.18, 1, 0.28, 1]
const CHAT_LAUNCHER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const chatOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px) saturate(1)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(30px) saturate(1.75)',
    transition: { duration: 0.36, ease: CHAT_REVEAL_EASE },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(10px) saturate(1.15)',
    transition: { duration: 0.22, ease: [0.5, 0, 0.75, 0] },
  },
}

const chatLauncherVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.92,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 520, damping: 34, mass: 0.72 },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.88,
    filter: 'blur(12px)',
    transition: { duration: 0.16, ease: CHAT_LAUNCHER_EASE },
  },
}

const chatPanelVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.965,
    filter: 'blur(22px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      opacity: { duration: 0.18, ease: CHAT_REVEAL_EASE },
      y: { type: 'spring', stiffness: 185, damping: 28, mass: 0.82 },
      scale: { type: 'spring', stiffness: 210, damping: 30, mass: 0.86 },
      filter: { duration: 0.34, ease: CHAT_REVEAL_EASE },
    },
  },
  exit: {
    opacity: 0,
    y: 14,
    scale: 0.982,
    filter: 'blur(14px)',
    transition: { duration: 0.18, ease: [0.5, 0, 0.75, 0] },
  },
}

const chatInteriorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.992,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { delay: 0.1, duration: 0.34, ease: CHAT_REVEAL_EASE },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.996,
    filter: 'blur(8px)',
    transition: { duration: 0.16, ease: [0.5, 0, 0.75, 0] },
  },
}

const CHAT_QUICK_ACTIONS = [
  {
    label: 'Generate Code',
    prompt: 'Generate code-oriented notes for the next edit pass.',
    icon: Code2,
  },
  {
    label: 'Launch App',
    prompt: 'Map this edit into a launch-ready app/product story.',
    icon: Rocket,
  },
  {
    label: 'UI Components',
    prompt: 'Suggest UI component motion that matches this edit direction.',
    icon: Layers,
  },
  {
    label: 'Theme Ideas',
    prompt: 'Give me restrained theme ideas for this video treatment.',
    icon: Palette,
  },
  {
    label: 'Image Assets',
    prompt: 'Help me search for visual assets and image references for this video.',
    icon: ImageIcon,
  },
] as const

function debugEditorPreview(event: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return

  console.debug('[editor-preview]', event, detail ?? {})
}

function msToTime(ms: number) {
  const safe = Math.max(0, ms)
  const seconds = Math.floor(safe / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${`${seconds % 60}`.padStart(2, '0')}`
}

function formatRelativeThreadTime(timestamp: number | null, now: number) {
  if (!timestamp) return 'just now'

  const diffMinutes = Math.floor((now - timestamp) / 60000)
  if (!Number.isFinite(diffMinutes) || diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return `${Math.floor(diffHours / 24)}d ago`
}

function isPostingIntent(value: string) {
  return /\b(post|publish|share|upload|send to|schedule)\b/i.test(value)
}

function hasPostingTemporalReference(value: string) {
  return /\b(last video|latest|first video|video before last|recent project|my last two videos|last two videos|recent video|newest)\b/i.test(value)
}

function isPostingConfirm(value: string) {
  return /\b(yes|yep|yeah|that's it|that is it|correct|right one|use this|confirm)\b/i.test(value)
}

function isPostingReject(value: string) {
  return /\b(no|nope|not that|wrong|next|different)\b/i.test(value)
}

function formatRecentFileTime(value?: string | null) {
  const updatedAt = value ? Date.parse(value) : NaN
  if (!Number.isFinite(updatedAt)) return 'Recently edited'

  const diffMinutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60000))
  if (diffMinutes < 1) return 'Edited just now'
  if (diffMinutes < 60) return `Edited ${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Edited ${diffHours}h ago`

  return `Edited ${Math.floor(diffHours / 24)}d ago`
}

function normalizeChatSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return []

  const sources: ChatSource[] = []

  for (const source of value) {
    if (!source || typeof source !== 'object') continue
    const record = source as Record<string, unknown>
    const url = typeof record.url === 'string' ? record.url.trim() : ''
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    const type = typeof record.type === 'string' ? record.type.trim() : ''
    const name = typeof record.name === 'string' ? record.name.trim() : ''

    if (!url && !title && !name) continue

    sources.push({
      url: url || undefined,
      title: title || undefined,
      type: type || undefined,
      name: name || undefined,
    })
  }

  return sources.slice(0, 8)
}

function normalizeChatToolCalls(value: unknown): ChatToolCall[] {
  if (!Array.isArray(value)) return []

  return value
    .map((toolCall, index): ChatToolCall | null => {
      if (!toolCall || typeof toolCall !== 'object') return null
      const record = toolCall as Record<string, unknown>
      const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `tool-${index + 1}`
      const name = typeof record.name === 'string' ? record.name.trim() : ''
      const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : name || `Tool ${index + 1}`
      const summary = typeof record.summary === 'string' ? record.summary.trim() : ''
      const status: ChatToolCall['status'] =
        record.status === 'needs_approval' || record.status === 'failed' || record.status === 'completed'
          ? record.status
          : 'completed'

      if (!name && !summary) return null
      return {
        id,
        name,
        label,
        status,
        summary,
        input: record.input,
        output: record.output,
      }
    })
    .filter((toolCall): toolCall is ChatToolCall => Boolean(toolCall))
    .slice(0, 6)
}

function normalizeChatFrames(value: unknown): ChatFrameReference[] {
  if (!Array.isArray(value)) return []

  return value
    .map((frame, index): ChatFrameReference | null => {
      if (!frame || typeof frame !== 'object') return null
      const record = frame as Record<string, unknown>
      const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : `Frame ${index + 1}`
      const thumbnailUrl = typeof record.thumbnailUrl === 'string' && record.thumbnailUrl.trim() ? record.thumbnailUrl.trim() : null
      const timecode = typeof record.timecode === 'string' && record.timecode.trim() ? record.timecode.trim() : undefined
      const reason = typeof record.reason === 'string' && record.reason.trim() ? record.reason.trim() : undefined
      const seconds = typeof record.seconds === 'number' && Number.isFinite(record.seconds) ? record.seconds : undefined

      if (!label && !thumbnailUrl && !timecode) return null
      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `frame-${index + 1}`,
        label,
        timecode,
        seconds,
        thumbnailUrl,
        reason,
      }
    })
    .filter((frame): frame is ChatFrameReference => Boolean(frame))
    .slice(0, 8)
}

function normalizeChatAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return []

  return value
    .map((attachment, index): ChatAttachment | null => {
      if (!attachment || typeof attachment !== 'object') return null
      const record = attachment as Record<string, unknown>
      const dataUrl = typeof record.dataUrl === 'string' ? record.dataUrl : ''
      const url = typeof record.url === 'string' ? record.url : ''
      const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : `Visual reference ${index + 1}`
      const type = typeof record.type === 'string' && record.type.trim() ? record.type.trim() : 'image'

      if (!dataUrl && !url && !name) return null
      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `attachment-${index + 1}`,
        name,
        type,
        dataUrl,
        url,
      }
    })
    .filter((attachment): attachment is ChatAttachment => Boolean(attachment))
    .slice(0, 4)
}

function buildChatFrameReferences(revisionRequest?: FrameAssistSubmission['revisionRequest'] | null): ChatFrameReference[] {
  if (!revisionRequest?.frameTarget && !revisionRequest?.selectedRegionMetadata) return []

  const target = revisionRequest.frameTarget
  const selectedRegion = revisionRequest.selectedRegionMetadata
  const label =
    revisionRequest.matchedRegionLabel ??
    selectedRegion?.label ??
    (target ? `Frame ${target.startFrame}${target.type === 'range' ? `-${target.endFrame}` : ''}` : 'Current frame')

  const startMs = selectedRegion?.startTimeMs ?? null
  const endMs = selectedRegion?.endTimeMs ?? null
  const timecode =
    startMs !== null && endMs !== null
      ? `${formatFrameSeconds(startMs / 1000)}-${formatFrameSeconds(endMs / 1000)}`
      : startMs !== null
        ? formatFrameSeconds(startMs / 1000)
        : target
          ? `f${target.startFrame}${target.type === 'range' ? `-f${target.endFrame}` : ''}`
          : undefined

  return [
    {
      id: revisionRequest.matchedRegionId ?? `${target?.startFrame ?? 'current'}-${target?.endFrame ?? 'frame'}`,
      label,
      timecode,
      seconds: startMs !== null ? startMs / 1000 : undefined,
      thumbnailUrl: revisionRequest.previewThumbnailUrl,
      reason: revisionRequest.instructionText,
    },
  ]
}

function formatFrameSeconds(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const safeSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function readImageAttachment(file: File): Promise<ChatAttachment | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null)

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve({
        id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type,
        dataUrl: result,
      })
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

function stringifyToolPreview(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function toStoredChatEntries(entries: ChatEntry[]): ChatEntry[] {
  return entries.map((entry) => ({
    ...entry,
    metadata: entry.metadata
      ? {
          ...entry.metadata,
          sources: entry.metadata.sources?.slice(0, 8),
          toolCalls: entry.metadata.toolCalls?.slice(0, 6),
          frames: entry.metadata.frames?.slice(0, 8),
          attachments: entry.metadata.attachments?.slice(0, 4),
          selectedStyle: entry.metadata.selectedStyle,
        }
      : undefined,
  }))
}

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined') return () => undefined
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onStoreChange)
      return () => mediaQueryList.removeEventListener('change', onStoreChange)
    },
    [query],
  )
  const getSnapshot = React.useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }, [query])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

function formatMobileBytes(bytes: number | undefined | null) {
  if (!bytes || bytes <= 0) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatMobileDate(value: string | undefined | null) {
  if (!value) return 'Not finished yet'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getMobileEditorStatus({
  hasSourceAsset,
  job,
}: {
  hasSourceAsset: boolean
  job: ProcessingJob | null
}) {
  if (!hasSourceAsset) return 'Waiting for video'
  if (job?.status === 'running') return 'Processing'
  if (job?.status === 'failed') return 'Needs attention'
  if (job?.status === 'completed') return 'Ready'
  return 'Ready to edit'
}

function getActiveJobStep(job: ProcessingJob | null) {
  if (!job?.steps.length) return null
  return job.steps.find((step) => step.progress < 1) ?? job.steps[job.steps.length - 1] ?? null
}

function buildAssistantReply({
  projectTitle,
  originalPrompt,
  sourceCount,
  input,
}: {
  projectTitle: string
  originalPrompt: string
  sourceCount: number
  input: string
}) {
  const normalized = input.trim().toLowerCase()
  const original = originalPrompt.trim() || 'shape the clip into a clearer final edit'
  const sourceNote = sourceCount > 0 ? ` I'm also holding ${sourceCount} staged source reference${sourceCount > 1 ? 's' : ''}.` : ''

  if (normalized.includes('rough cuts')) {
    return `Starting with rough cuts makes sense. I'd open with the strongest hook from "${original}", trim hesitation, and build a first pass around the cleanest beat changes.${sourceNote}`
  }

  if (normalized.includes('music')) {
    return `For music, I'd keep it supportive rather than dominant. Based on "${original}", I'd aim for a restrained bed that lifts momentum without crowding the voice.${sourceNote}`
  }

  if (normalized.includes('title')) {
    return `Title cards can work here if they stay spare. I'd use one typographic system, let the project name carry authority, and avoid over-decorating the message from "${original}".`
  }

  if (normalized.includes('caption')) {
    return `Captions should feel editorial, not noisy. I'd highlight only the strongest phrases from "${original}" and keep the pacing readable rather than hyperactive.`
  }

  if (normalized.includes('motion')) {
    return `Motion graphics should stay in service of the edit. For ${projectTitle}, I'd keep transitions minimal and reserve motion accents for moments that reinforce the original idea: "${original}".`
  }

  if (
    normalized.includes('viral')
    || normalized.includes('short-form')
    || normalized.includes('9:16')
    || normalized.includes('hook in the first 2 seconds')
  ) {
    return `For a viral clipping pass, I'd collapse the long-form source into a hook-first 9:16 sequence, trim every hesitation beat, and build around the most quotable moments from "${original}".${sourceNote} I'd also treat captions and reframes as retention tools, not decoration.`
  }

  return `Working from your original direction "${original}", I'd treat "${input.trim()}" as the next refinement pass and keep the system focused, paced, and uncluttered.${sourceNote}`
}

function buildMusicReply({
  projectTitle,
  sourceCount,
  videoContext,
}: {
  projectTitle: string
  sourceCount: number
  videoContext: MusicVideoContext
}) {
  const summary = videoContext.summary ? ` I'm reading the cut as ${videoContext.summary}.` : ''
  const paceLine =
    videoContext.pace === 'fast'
      ? 'keep the cue fast, upbeat, and forward-driving'
      : videoContext.pace === 'slow'
        ? 'keep the cue spacious and reflective'
        : 'keep the cue balanced and editorial'
  const sourceLine = sourceCount > 0 ? ` I'm also holding ${sourceCount} staged source${sourceCount > 1 ? 's' : ''} in view.` : ''

  return `For ${projectTitle}, I'd ${paceLine}.${summary}${sourceLine} I've lined up a few options below, and if you want me to narrow it, use the intensity selector so I can lock onto atmospheric, balanced, or driving.`
}

function selectEditStyleTemplate(prompt: string, videoContext: MusicVideoContext) {
  const contextText = normalizeInlineText([prompt, videoContext.summary, ...videoContext.signals].filter(Boolean).join(' '))
  const ranked = STYLE_TEMPLATES.map((template) => ({
    template,
    score: scoreEditStyleTemplate(template, contextText, videoContext),
  })).sort((left, right) => right.score - left.score)

  return ranked[0]?.template ?? STYLE_TEMPLATES[2] ?? STYLE_TEMPLATES[0]
}

function scoreEditStyleTemplate(template: StyleTemplate, contextText: string, videoContext: MusicVideoContext) {
  const tokens = `${template.name} ${template.description} ${template.tags.join(' ')}`.toLowerCase()
  let score = 0

  if (template.id === 'style_podcast_dynamic') {
    if (hasAny(contextText, ['caption', 'subtitle', 'typographic', 'voice', 'talking', 'podcast', 'long form', 'longform'])) score += 8
    if (hasAny(tokens, ['typography', 'caption'])) score += 3
  }

  if (template.id === 'style_reels_heat') {
    if (hasAny(contextText, ['fast', 'viral', 'hook', 'retention', 'short', 'reel', 'punchy', 'snappy'])) score += 8
  }

  if (template.id === 'style_docs_story') {
    if (hasAny(contextText, ['cinematic', 'documentary', 'story', 'reflective', 'calm', 'breathing', 'smooth'])) score += 8
  }

  if (template.id === 'style_iman_clean') {
    if (hasAny(contextText, ['clean', 'premium', 'minimal', 'polish', 'simple', 'precise'])) score += 7
  }

  if (template.id === 'style_iman_punchy') {
    if (hasAny(contextText, ['bold', 'impact', 'aggressive', 'strong', 'sharp'])) score += 7
  }

  if (template.id === 'style_cinematic_noir') {
    if (hasAny(contextText, ['moody', 'dark', 'shadow', 'slow', 'dramatic'])) score += 7
  }

  if (template.id === 'style_minimal_subtle') {
    if (hasAny(contextText, ['subtle', 'bare', 'minimal', 'quiet'])) score += 7
  }

  if (videoContext.pace === 'fast' && hasAny(tokens, ['snappy', 'aggressive', 'punchy', 'heavy'])) score += 2
  if (videoContext.pace === 'slow' && hasAny(tokens, ['smooth', 'cinematic', 'minimal'])) score += 2

  score += Math.min(template.previewImages.length, 2)
  return score
}

function buildEditQuickActionPrompt(projectTitle: string, videoContext: MusicVideoContext, styleTemplate: StyleTemplate) {
  const summary = videoContext.summary || 'the current cut'
  const pace =
    videoContext.pace === 'fast'
      ? 'fast and punchy'
      : videoContext.pace === 'slow'
        ? 'slower and more reflective'
        : 'balanced and editorial'

  return [
    `Edit this video for ${projectTitle}.`,
    `Keep the cut ${pace}.`,
    `Treat ${summary} as the main read.`,
    `Use ${styleTemplate.name} as the overlay lane.`,
    'Render the first pass directly on top of the imported media.',
  ].join(' ')
}

function buildEditAssistantReply({
  projectTitle,
  sourceCount,
  styleTemplate,
  prompt,
  videoContext,
}: {
  projectTitle: string
  sourceCount: number
  styleTemplate: StyleTemplate
  prompt: string
  videoContext: MusicVideoContext
}) {
  const sourceLine = sourceCount > 0 ? ` I still have ${sourceCount} staged source${sourceCount > 1 ? 's' : ''} in the chamber.` : ''
  const summary = videoContext.summary ? ` The cut reads as ${videoContext.summary}.` : ''
  const promptLine = prompt.trim().length > 0 ? ` You asked for "${prompt.trim()}".` : ''

  return `The edit pass is live for ${projectTitle}.${summary} I'm using ${styleTemplate.name} so the overlay stays faithful to the style lane.${sourceLine}${promptLine} The backend stream can keep adding text while the preview renders the same treatment on the imported video.`
}

function buildFallbackEditAnimationPlan({
  projectId,
  projectTitle,
  prompt,
  jobId,
  sourceLabel,
  styleTemplate,
}: {
  projectId: string
  projectTitle: string
  prompt: string
  jobId: string
  sourceLabel: string | null
  styleTemplate: StyleTemplate
}): AnimationPlan {
  const promptCopy = prompt.trim().length > 0 ? prompt.trim() : 'Edit this video.'
  const trimmedPrompt = promptCopy.length > 76 ? `${promptCopy.slice(0, 73)}...` : promptCopy
  const previewImage = styleTemplate.previewImages[0] ?? null
  const styleSignal = styleTemplate.tags[0] ?? 'Captions: High'

  const speechCues: AnimationPlan['speechCues'] = [
    {
      id: `${projectId}_edit_caption_0`,
      variant: 'heading',
      startMs: 0,
      endMs: 2200,
      text: projectTitle,
      leadText: 'Edit job live',
      accentText: styleTemplate.name,
      trailingText: `Job ${jobId.slice(0, 8)}`,
      treatment: 'boxed',
      tone: 'ice',
      region: 'center-stage',
      alignment: 'left',
      maxWidthPct: 66,
    },
    {
      id: `${projectId}_edit_caption_1`,
      variant: 'caption',
      startMs: 1200,
      endMs: 3600,
      text: trimmedPrompt,
      leadText: 'Prompt lane',
      accentText: trimmedPrompt,
      trailingText: sourceLabel ? `Rendering on ${sourceLabel}.` : 'Rendering on the imported media.',
      treatment: 'highlight',
      tone: 'amber',
      region: 'safe-lower-third',
      alignment: 'center',
      bottomPaddingPct: 13,
      maxWidthPct: 72,
    },
    {
      id: `${projectId}_edit_caption_2`,
      variant: 'caption',
      startMs: 2800,
      endMs: 5200,
      text: styleSignal,
      leadText: 'Style lane',
      accentText: styleTemplate.name,
      trailingText: styleTemplate.description,
      treatment: 'boxed',
      tone: 'lime',
      region: 'safe-lower-third',
      alignment: 'center',
      bottomPaddingPct: 13,
      maxWidthPct: 70,
    },
  ]

  const transitionCues: AnimationPlan['transitionCues'] = [
    {
      id: `${projectId}_edit_line_0`,
      type: 'line',
      startMs: 0,
      endMs: 1800,
      region: 'center-stage',
      direction: 'center-out',
      label: 'Edit pass',
    },
  ]

  const backgroundCues: AnimationPlan['backgroundCues'] = previewImage
    ? [
        {
          id: `${projectId}_edit_bg_0`,
          startMs: 0,
          endMs: 5400,
          kind: 'image',
          region: 'right-panel',
          sourceId: styleTemplate.id,
          sourceUrl: previewImage,
          transform: 'softWash',
          opacity: 0.68,
          blendMode: 'screen',
          placement: 'right-stage',
        },
      ]
    : []

  return {
    engineVersion: 'edit-preview-v1',
    generatedAt: new Date().toISOString(),
    safeZonePolicy: {
      landscapeOnly: false,
      avoidSpeakerFace: false,
      captionBottomPaddingPct: 13,
      maxCaptionWidthPct: 72,
    },
    speechCues,
    transitionCues,
    explainerCues: [],
    backgroundCues,
    counterCues: [],
    sfxCues: [],
  }
}

function buildMusicQuickActionPrompt(projectTitle: string, videoContext: MusicVideoContext) {
  const summary = videoContext.summary || 'the current cut'
  const pace =
    videoContext.pace === 'fast'
      ? 'fast-paced, upbeat, and driving'
      : videoContext.pace === 'slow'
        ? 'slower, spacious, and reflective'
        : 'balanced, editorial, and cinematic'
  const signals = videoContext.signals.length > 0 ? ` Signals: ${videoContext.signals.slice(0, 5).join(', ')}.` : ''

  return [
    `Recommend up to 3 music options for ${projectTitle}.`,
    `The current cut feels ${pace}.`,
    `Context: ${summary}.${signals}`,
    'Show tracks that fit the edit itself, not generic music suggestions.',
    'If the choice is broad, invite refinement with intensity options.',
  ].join(' ')
}

function buildViralClipQuickActionPrompt({
  projectTitle,
  originalPrompt,
  sourceCount,
  transportTime,
  videoContext,
}: {
  projectTitle: string
  originalPrompt: string
  sourceCount: number
  transportTime: string
  videoContext: MusicVideoContext
}) {
  const summary = videoContext.summary || 'the current cut'
  const signals = videoContext.signals.length > 0 ? ` Signals: ${videoContext.signals.slice(0, 5).join(', ')}.` : ''
  const sourceLine = sourceCount > 0 ? `Work from the ${sourceCount} staged source reference${sourceCount > 1 ? 's' : ''}.` : ''

  return [
    `Clip the current long-form source for ${projectTitle} into viral-ready short-form cuts.`,
    'Reframe the strongest moments for 9:16, cut all dead air, and prioritize a hook in the first 2 seconds.',
    'Suggest the first 3 clip angles or excerpts, the pacing shift for each, and the caption treatment that would keep retention high.',
    `Current runtime is about ${transportTime}.`,
    `Original direction: "${originalPrompt}".`,
    `Context: ${summary}.${signals}`,
    sourceLine,
    'Keep the advice grounded in this footage instead of generic short-form tips.',
  ]
    .filter(Boolean)
    .join(' ')
}

function buildProvidedTranscript(job: ProcessingJob | null) {
  const transcript = job?.artifacts.transcript
    ?.map((segment) => segment.text.trim())
    .filter((segment) => segment.length > 0)
    .join(' ')

  return transcript && transcript.length > 0 ? transcript : null
}

function buildVideoMusicContext({
  projectTitle,
  promptText,
  sourceProfile,
  job,
  sourceList,
}: {
  projectTitle: string
  promptText: string
  sourceProfile: Project['sourceProfile'] | null
  job: ProcessingJob | null
  sourceList: string[]
}): MusicVideoContext {
  const combinedText = normalizeInlineText([projectTitle, promptText, ...sourceList].join(' '))
  const signals = new Set<string>()

  if (hasAny(combinedText, ['coach', 'training', 'trainer', 'motivation', 'motivational'])) {
    signals.add('coach-led')
  }
  if (hasAny(combinedText, ['tiktok', 'reel', 'shorts', 'short-form', 'short form', 'instagram'])) {
    signals.add('short-form')
  }
  if (hasAny(combinedText, ['upbeat', 'energetic', 'fast', 'snappy', 'punchy', 'fun', 'funk'])) {
    signals.add('upbeat')
  }
  if (hasAny(combinedText, ['calm', 'reflective', 'documentary', 'interview', 'talking', 'voice'])) {
    signals.add('voice-led')
  }
  if (job?.artifacts.highlights?.length) {
    signals.add('hook-driven')
  }
  if (job?.artifacts.scenes?.length && job.artifacts.scenes.length > 5) {
    signals.add('scene-changes')
  }
  if (sourceProfile?.aspectFamily === 'vertical_short' || sourceProfile?.aspectFamily === 'high_res_vertical') {
    signals.add('vertical')
  }

  const pace = inferVideoPace(sourceProfile, combinedText, job)
  const summaryParts = [
    pace === 'fast' ? 'fast-paced' : pace === 'slow' ? 'slow-moving' : 'balanced',
    signals.has('coach-led') ? 'coach-led' : null,
    signals.has('short-form') ? 'short-form' : null,
    signals.has('vertical') ? 'vertical framing' : null,
    signals.has('voice-led') ? 'voice-first' : null,
    signals.has('hook-driven') ? 'hook-driven' : null,
  ].filter(Boolean)

  const confidenceBase = 0.4 + Math.min(0.25, signals.size * 0.05) + (sourceProfile ? 0.1 : 0)
  const confidence = Math.max(0, Math.min(1, confidenceBase))
  const intent = analyzeMusicIntent({
    projectTitle,
    promptText,
    sourceList,
    sourceProfile,
    job,
    pace,
  })

  return {
    pace,
    summary: summaryParts.join(', '),
    signals: [...signals],
    confidence,
    intent,
  }
}

function buildMusicSourceLabel(sourceUrl: string) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, '').toLowerCase()
    if (host.includes('spotify')) return 'Open Spotify'
    if (host.includes('apple') || host.includes('itunes')) return 'Open Apple Music'
    return 'Open source'
  } catch {
    return 'Open source'
  }
}

function inferVideoPace(
  sourceProfile: Project['sourceProfile'] | null,
  text: string,
  job: ProcessingJob | null,
): MusicVideoContext['pace'] {
  const normalized = normalizeInlineText(text)
  if (sourceProfile?.timeProfile === 'quick_edit') return 'fast'
  if (sourceProfile?.timeProfile === 'long_form_edit' || sourceProfile?.timeProfile === 'extended_processing') return 'slow'
  if (sourceProfile?.durationBucket === 'very_short' || sourceProfile?.durationBucket === 'short') return 'fast'
  if (sourceProfile?.durationBucket === 'long' || sourceProfile?.durationBucket === 'very_long') return 'slow'
  if (hasAny(normalized, ['fast-paced', 'fast paced', 'reel', 'tiktok', 'short-form', 'short form', 'coach', 'training'])) return 'fast'
  if (hasAny(normalized, ['documentary', 'reflective', 'interview', 'calm', 'slow'])) return 'slow'
  if ((job?.artifacts.highlights?.length ?? 0) >= 4 && (job?.artifacts.scenes?.length ?? 0) >= 5) return 'fast'
  return 'medium'
}

function normalizeInlineText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle))
}

function sanitizeAssistantReply(value: string) {
  return value
    .replace(/^\s*[*-]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()
}

type ChatStreamChoice = {
  delta?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
  message?: {
    content?: string | Array<{ type?: string; text?: string }>
  }
}

type ChatStreamPayload = {
  choices?: ChatStreamChoice[]
}

function extractChatStreamText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''

  const choices = (payload as ChatStreamPayload).choices
  const firstChoice = choices?.[0]
  if (!firstChoice) return ''

  const content = firstChoice.delta?.content ?? firstChoice.message?.content
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('')
  }

  return ''
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

async function readChatStreamText(
  response: Response,
  signal: AbortSignal,
  onText: (text: string) => void,
) {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Chat stream was empty.')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let finished = false

  const consumeDataLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return

    const data = trimmed.slice(5).trim()
    if (!data) return
    if (data === '[DONE]') {
      finished = true
      return
    }

    const parsed = safeJsonParse(data)
    const delta = sanitizeAssistantReply(extractChatStreamText(parsed))
    if (!delta) return

    accumulated += delta
    onText(sanitizeAssistantReply(accumulated))
  }

  try {
    while (!finished) {
      if (signal.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        consumeDataLine(line)
        if (finished || signal.aborted) break
      }
    }

    if (!finished && buffer.trim()) {
      consumeDataLine(buffer)
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }

  return sanitizeAssistantReply(accumulated)
}

function EyeOrb({
  target,
  reduceMotion,
}: {
  target: { x: number; y: number } | null
  reduceMotion: boolean
}) {
  const eyeRef = React.useRef<HTMLDivElement | null>(null)
  const [pupilOffset, setPupilOffset] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const eye = eyeRef.current
    if (!eye || !target) {
      setPupilOffset({ x: 0, y: 0 })
      return
    }

    const rect = eye.getBoundingClientRect()
    const eyeCenterX = rect.left + rect.width / 2
    const eyeCenterY = rect.top + rect.height / 2
    const dx = target.x - eyeCenterX
    const dy = target.y - eyeCenterY
    const angle = Math.atan2(dy, dx)
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = rect.width / 2 - 8
    const moveDistance = Math.min(maxDistance, distance / 8)

    setPupilOffset({
      x: Math.cos(angle) * moveDistance,
      y: Math.sin(angle) * moveDistance,
    })
  }, [target])

  return (
    <div
      ref={eyeRef}
      className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.96)_48%,rgba(196,206,224,0.9)_100%)] shadow-[0_8px_20px_-14px_rgba(255,255,255,0.52),inset_0_1px_0_rgba(255,255,255,0.82)]"
    >
      <motion.div
        className="absolute h-2.5 w-2.5 rounded-full bg-[#0b0e14] shadow-[0_0_10px_rgba(0,0,0,0.28)]"
        animate={{ x: pupilOffset.x, y: pupilOffset.y }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                type: 'spring',
                stiffness: 380,
                damping: 26,
                mass: 0.32,
              }
        }
      />
    </div>
  )
}

function TypingEyes({
  target,
  reduceMotion,
}: {
  target: { x: number; y: number } | null
  reduceMotion: boolean
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <EyeOrb target={target} reduceMotion={reduceMotion} />
      <EyeOrb target={target} reduceMotion={reduceMotion} />
    </div>
  )
}

function ChatTaskProcess({
  task,
  reduceMotion,
  loading,
}: {
  task: ChatTaskBlock
  reduceMotion: boolean
  loading: boolean
}) {
  const isSimpleReply = task.intent === 'reply' && task.complexity === 'single'

  if (isSimpleReply) {
    return (
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] not-italic tracking-[0.01em] text-white/62">
        <BrainCircuit className="size-3.5 text-[#9ff6e3] opacity-70" />
        <span>{loading ? 'Thinking inside the current cut' : 'Reply shaped from the current cut'}</span>
      </div>
    )
  }

  return (
    <div className="mb-3 overflow-hidden rounded-[18px] border border-white/10 bg-black/24 p-2.5 not-italic shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="inline-flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#9ff6e3]/18 bg-[#9ff6e3]/[0.075] text-[#bffff5]">
            {task.intent === 'clip' ? (
              <Scissors className="size-3.5" />
            ) : task.intent === 'music' ? (
              <Music4 className="size-3.5" />
            ) : task.intent === 'motion' ? (
              <GitBranch className="size-3.5" />
            ) : (
              <Activity className="size-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
              {task.title}
            </div>
            <div className="truncate text-[11px] text-white/38">{task.summary}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.035] px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-white/42">
          {task.complexity}
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {task.steps.map((step, index) => {
          const active = step.state === 'active'
          const complete = step.state === 'complete'
          const error = step.state === 'error'
          return (
            <motion.div
              key={step.id}
              className={cn(
                'relative overflow-hidden rounded-[14px] border px-2.5 py-2',
                error
                  ? 'border-rose-300/22 bg-rose-400/[0.065]'
                  : active
                    ? 'border-[#9ff6e3]/24 bg-[#9ff6e3]/[0.075]'
                    : complete
                      ? 'border-white/10 bg-white/[0.05]'
                      : 'border-white/7 bg-white/[0.025]',
              )}
              initial={reduceMotion ? false : { opacity: 0, y: 5, filter: 'blur(5px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: reduceMotion ? 0 : 0.24, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              {active && !reduceMotion ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(159,246,227,0)_0%,rgba(159,246,227,0.1)_50%,rgba(159,246,227,0)_100%)] opacity-70"
                />
              ) : null}
              <span className="relative flex items-start gap-2">
                <span
                  className={cn(
                    'mt-1 size-1.5 rounded-full',
                    error ? 'bg-rose-200' : active ? 'bg-[#9ff6e3]' : complete ? 'bg-white/72' : 'bg-white/22',
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-semibold text-white/78">{step.label}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[10px] leading-4 text-white/40">{step.detail}</span>
                </span>
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function ChatClipProcessingCard({
  clip,
  reduceMotion,
}: {
  clip: ChatClipBlock
  reduceMotion: boolean
}) {
  const loading = clip.status === 'loading'
  const failed = clip.status === 'error'

  return (
    <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0.018)_100%)] p-3 not-italic shadow-[0_24px_54px_-40px_rgba(0,0,0,0.94),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9ff6e3]/18 bg-[#9ff6e3]/[0.06] px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-[#d7fff8]/70">
            <Scissors className="size-3" />
            Clip forge
          </div>
          <div className="mt-2 truncate text-sm font-semibold text-white/88">{clip.stageLabel}</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/42">
            {failed ? clip.errorMessage ?? clip.detail : clip.detail}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[1.25rem] font-semibold tabular-nums text-white/88">{clip.progressPercent}%</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/34">{clip.targetPlatform}</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-3">
          <InlineLoadingAnimation size={32} label={`Processing clips: ${clip.stageLabel}`} />
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {clip.variants.slice(0, 4).map((variant, index) => (
          <motion.div
            key={variant.id}
            className="group relative overflow-hidden rounded-[16px] border border-white/9 bg-black/42"
            initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative aspect-video overflow-hidden bg-[#05070a]">
              {variant.thumbnailUrl ? (
                <img src={variant.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-86" />
              ) : variant.previewUrl ? (
                <video
                  src={variant.previewUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover opacity-74"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_34%,rgba(0,0,0,0.72)_100%)]" />
              {loading ? (
                <div className="absolute inset-0">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-45"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(90deg, rgba(159,246,227,0.18) 0 1px, transparent 1px 18%), repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 24px)',
                    }}
                  />
                  <motion.div
                    aria-hidden
                    className="absolute inset-y-0 w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0)_100%)]"
                    initial={reduceMotion ? false : { x: '-120%' }}
                    animate={reduceMotion ? undefined : { x: '240%' }}
                    transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
                  />
                </div>
              ) : null}
              <div className="absolute left-2 top-2 rounded-full border border-white/12 bg-black/48 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/68 backdrop-blur-md">
                {variant.label}
              </div>
              <div className="absolute bottom-2 right-2 rounded-full border border-white/12 bg-black/54 px-2 py-1 text-[9px] text-white/70 backdrop-blur-md">
                {variant.scoreLabel}
              </div>
            </div>
            <div className="p-2.5">
              <div className="truncate text-xs font-semibold text-white/86">{variant.title}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/42">
                <span className="truncate">{variant.timeLabel}</span>
                <span className="shrink-0">{variant.durationLabel}</span>
              </div>
              <div className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/36">{variant.reason}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const POSTING_PLATFORMS: Array<{
  id: SocialPostingPlatform
  label: string
  className: string
  icon: React.ComponentType<{ className?: string }>
  limit: number
  connected: boolean
  mockUrl: string
}> = [
  { id: 'linkedin', label: 'LinkedIn', className: 'data-[selected=true]:border-[#0A66C2] data-[selected=true]:text-[#93c5fd]', icon: Linkedin, limit: 3000, connected: true, mockUrl: 'https://linkedin.com/feed/update/mock-prometheus' },
  { id: 'youtube', label: 'YouTube', className: 'data-[selected=true]:border-[#FF0000] data-[selected=true]:text-[#fca5a5]', icon: Play, limit: 5000, connected: false, mockUrl: 'https://youtube.com/watch?v=mock-prometheus' },
  { id: 'instagram', label: 'Instagram', className: 'data-[selected=true]:border-[#d946ef] data-[selected=true]:text-[#f0abfc]', icon: Instagram, limit: 2200, connected: false, mockUrl: 'https://instagram.com/p/mock-prometheus' },
  { id: 'tiktok', label: 'TikTok', className: 'data-[selected=true]:border-[#22d3ee] data-[selected=true]:text-[#67e8f9]', icon: Music4, limit: 2200, connected: false, mockUrl: 'https://tiktok.com/@prometheus/video/mock' },
  { id: 'x', label: 'Twitter/X', className: 'data-[selected=true]:border-white data-[selected=true]:text-white', icon: X, limit: 280, connected: false, mockUrl: 'https://x.com/prometheus/status/mock' },
  { id: 'facebook', label: 'Facebook', className: 'data-[selected=true]:border-[#1877F2] data-[selected=true]:text-[#bfdbfe]', icon: Facebook, limit: 63206, connected: false, mockUrl: 'https://facebook.com/prometheus/posts/mock' },
]

const MOCK_CAPTION_VARIATIONS: Record<SocialPostingPlatform, string[]> = {
  instagram: [
    'This is a mock Instagram caption for your video about {topic}. Built for visual rhythm, audience energy, and a polished release. #filmmaking #motiondesign #creatorworkflow',
    'A new cut from the studio: {topic}. Clean pacing, sharp timing, and a final frame built for the feed. #videoediting #cinematic',
    'Fresh from Prometheus Studio. {topic} with tighter motion, caption timing, and an edit ready to share. ✨ #editors',
  ],
  linkedin: [
    'This is a mock LinkedIn caption for your video about {topic}.\n\nThe edit focuses on clear narrative structure, polished pacing, and production-ready delivery for a professional audience.',
    'Sharing a new production workflow note: {topic}.\n\nThis cut was prepared with attention to timing, structure, and brand-safe presentation.',
    'A concise production update from Prometheus Studio: {topic}.\n\nThe final video emphasizes clarity, visual discipline, and a professional viewing experience.',
  ],
  tiktok: [
    'This is a mock TikTok caption for your video about {topic}. Quick hook, clean cut, strong finish. #videotok #editingtips #fyp',
    'POV: the edit finally clicks. {topic}. #filmmaker #motiondesign #creator',
    'Fast cut. Clear hook. {topic}. #postproduction #viraledit',
  ],
  youtube: [
    'Title: This is a mock YouTube title for {topic}\n\nDescription: This video explores {topic} with a polished edit, caption timing, and production-ready pacing.\n\nTags: filmmaking, video editing, motion design, Prometheus Studio',
    'Title: {topic} | Prometheus Studio Edit\n\nDescription: A refined production cut built for clarity, retention, and clean delivery.\n\nTags: editing workflow, video production, captions',
    'Title: How This Cut Came Together\n\nDescription: A behind-the-scenes style description for {topic}, ready for YouTube publishing.\n\nTags: filmmakers, editors, studio workflow',
  ],
  x: [
    'This is a mock X/Twitter caption for your video about {topic}. Clean cut, tight pacing, ready to ship.',
    'New edit ready: {topic}. Built with sharper timing and a cleaner final pass.',
    'Cut locked. Caption pass done. {topic}.',
  ],
  facebook: [
    'This is a mock Facebook caption for your video about {topic}. Sharing the finished cut with a community-focused note and a clear reason to watch.',
    'New from Prometheus Studio: {topic}. A polished video update prepared for viewers who want the full story.',
    'We finished a new production pass around {topic}. Watch the cut, share your thoughts, and tell us what you want to see next.',
  ],
}

function getPostingPlatform(platformId: SocialPostingPlatform) {
  return POSTING_PLATFORMS.find((platform) => platform.id === platformId) ?? POSTING_PLATFORMS[0]!
}

function buildMockCaption(platformId: SocialPostingPlatform, topic: string, variationIndex: number) {
  const variations = MOCK_CAPTION_VARIATIONS[platformId]
  const template = variations[variationIndex % variations.length] ?? variations[0]!
  return template.replaceAll('{topic}', topic || 'your project')
}

function buildCaptionDrafts(video: RecentPostingFile): Partial<Record<SocialPostingPlatform, SocialCaptionDraft>> {
  return POSTING_PLATFORMS.reduce<Partial<Record<SocialPostingPlatform, SocialCaptionDraft>>>((drafts, platform) => {
    drafts[platform.id] = {
      text: buildMockCaption(platform.id, video.topic, 0),
      variationIndex: 0,
      approved: false,
    }
    return drafts
  }, {})
}

function normalizePostingVideo(file: RecentPostingFile): RecentPostingFile {
  return {
    ...file,
    durationLabel: file.durationLabel || '0:45',
    topic: file.topic || file.title || 'your project',
  }
}

function SocialPostingCard({
  entryId,
  posting,
  onConfirmFile,
  onRejectFile,
  onTogglePlatform,
  onSelectVideo,
  onConfirmVideo,
  onChangeVideo,
  onGenerateCaptions,
  onUpdateCaption,
  onRegenerateCaption,
  onToggleCaptionApproval,
  onProceedToPlatforms,
  onReviewAccounts,
  onOpenSocialSettings,
  onDonePosting,
  onPostNow,
}: {
  entryId: string
  posting: SocialPostingBlock
  onConfirmFile?: (entryId: string, fileId: string) => void
  onRejectFile?: (entryId: string) => void
  onTogglePlatform?: (entryId: string, platform: SocialPostingPlatform | 'all') => void
  onSelectVideo?: (entryId: string, video: RecentPostingFile) => void
  onConfirmVideo?: (entryId: string) => void
  onChangeVideo?: (entryId: string) => void
  onGenerateCaptions?: (entryId: string) => void
  onUpdateCaption?: (entryId: string, platform: SocialPostingPlatform, value: string) => void
  onRegenerateCaption?: (entryId: string, platform: SocialPostingPlatform) => void
  onToggleCaptionApproval?: (entryId: string, platform: SocialPostingPlatform) => void
  onProceedToPlatforms?: (entryId: string) => void
  onReviewAccounts?: (entryId: string) => void
  onOpenSocialSettings?: () => void
  onDonePosting?: (entryId: string) => void
  onPostNow?: (entryId: string) => void
}) {
  const [browserTab, setBrowserTab] = React.useState<'recent' | 'projects'>('recent')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedProjectId, setExpandedProjectId] = React.useState<string | null>(posting.projects[0]?.id ?? null)
  const [editingCaption, setEditingCaption] = React.useState<SocialPostingPlatform | null>(null)

  const activeFile = posting.files[posting.activeFileIndex] ?? posting.files[0]
  const selectedFile = posting.selectedVideo ?? posting.files.find((file) => file.id === posting.selectedFileId) ?? activeFile
  const selectedLabels = posting.selectedPlatforms
    .map((platform) => POSTING_PLATFORMS.find((item) => item.id === platform)?.label)
    .filter(Boolean)
    .join(', ')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredRecentFiles = posting.files.filter((file) => {
    if (!normalizedQuery) return true
    return `${file.title} ${file.projectTitle ?? ''}`.toLowerCase().includes(normalizedQuery)
  })
  const filteredProjects = posting.projects.filter((project) => {
    if (!normalizedQuery) return true
    return (
      project.title.toLowerCase().includes(normalizedQuery) ||
      project.videos.some((video) => video.title.toLowerCase().includes(normalizedQuery))
    )
  })
  const captionPlatforms = POSTING_PLATFORMS
  const captionsReady = captionPlatforms.every((platform) => posting.captions[platform.id]?.approved)
  const unconnectedPlatforms = posting.selectedPlatforms.filter((platformId) => !getPostingPlatform(platformId).connected)
  const allAccountsReady = posting.selectedPlatforms.length > 0 && unconnectedPlatforms.length === 0
  const averagePostingProgress =
    posting.selectedPlatforms.length > 0
      ? posting.selectedPlatforms.reduce((total, platformId) => total + (posting.postingResults?.[platformId]?.progress ?? 0), 0) /
        posting.selectedPlatforms.length
      : 0

  const renderVideoCard = (video: RecentPostingFile, compact = false) => (
    <div
      key={video.id}
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.035] p-2',
        compact ? 'min-w-44' : 'min-w-48',
      )}
    >
      <div
        className="h-20 rounded-lg border border-white/8 bg-[#111] bg-cover bg-center"
        style={video.thumbnailUrl ? { backgroundImage: `url(${video.thumbnailUrl})` } : undefined}
      >
        {!video.thumbnailUrl ? (
          <div className="grid h-full place-items-center text-white/30">
            <Film className="size-5" />
          </div>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">
        <div className="truncate text-xs font-medium text-white/90">{video.title}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-white/42">
          <span>{video.durationLabel}</span>
          <span className="truncate">{video.updatedLabel}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelectVideo?.(entryId, normalizePostingVideo(video))}
        className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/74 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        Select
      </button>
    </div>
  )

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 p-3 text-white/86 shadow-[0_18px_38px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-white">Social publishing</div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-400/8 px-2.5 py-1 text-[10px] text-emerald-100">
          <Lock className="size-3" />
          OAuth ready
        </div>
      </div>

      {posting.status === 'browser' ? (
        <div className="max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[80] max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:rounded-t-3xl max-sm:border max-sm:border-white/12 max-sm:bg-[#0a0a0a] max-sm:p-4 md:w-[400px]">
          <div className="text-sm font-medium text-white">Pick the video to post</div>
          <div className="mt-2 text-xs leading-5 text-white/52">
            Use recent edits or search across mock projects without leaving the chat.
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">
            <Search className="size-3.5 text-white/42" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects or videos"
              className="min-w-0 flex-1 bg-transparent text-sm text-white/84 outline-none placeholder:text-white/28"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.025] p-1 text-xs">
            {(['recent', 'projects'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setBrowserTab(tab)}
                className={cn(
                  'rounded-full px-3 py-2 capitalize transition-colors',
                  browserTab === tab ? 'bg-white text-black' : 'text-white/54 hover:text-white',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {browserTab === 'recent' ? (
            <div className="premium-scroll-hide mt-3 flex gap-2 overflow-x-auto pb-1">
              {filteredRecentFiles.map((file) => renderVideoCard(file, true))}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {filteredProjects.map((project) => {
                const expanded = expandedProjectId === project.id
                return (
                  <div key={project.id} className="rounded-xl border border-white/10 bg-white/[0.025]">
                    <button
                      type="button"
                      onClick={() => setExpandedProjectId(expanded ? null : project.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-white/82"
                    >
                      <span className="truncate">{project.title}</span>
                      <ChevronRight className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-90')} />
                    </button>
                    {expanded ? (
                      <div className="grid gap-2 border-t border-white/8 p-2 sm:grid-cols-2">
                        {project.videos.map((video) => renderVideoCard(video))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {posting.status === 'confirm' && selectedFile ? (
        <>
          <div className="text-sm font-medium text-white">Post this video?</div>
          <div className="mt-3 flex gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-2">
            <div
              className="h-20 w-28 shrink-0 rounded-lg border border-white/8 bg-[#111] bg-cover bg-center"
              style={selectedFile.thumbnailUrl ? { backgroundImage: `url(${selectedFile.thumbnailUrl})` } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{selectedFile.title}</div>
              <div className="mt-1 text-xs text-white/46">{selectedFile.durationLabel}</div>
              <div className="mt-1 truncate text-xs text-white/36">{selectedFile.projectTitle ?? 'Recent project'}</div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onConfirmVideo?.(entryId)}
              className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-medium text-white"
            >
              Yes, proceed
            </button>
            <button
              type="button"
              onClick={() => onChangeVideo?.(entryId)}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/62"
            >
              No, pick another
            </button>
            <button
              type="button"
              onClick={() => onConfirmVideo?.(entryId)}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/62"
            >
              Change caption
            </button>
          </div>
        </>
      ) : null}

      {posting.status === 'captions' ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Caption previews</div>
              <div className="mt-1 text-xs text-white/46">Approve each caption before platform selection.</div>
            </div>
            <button
              type="button"
              onClick={() => onGenerateCaptions?.(entryId)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/76"
            >
              {posting.captionGenerating ? (
                <InlineLoadingAnimation size={14} label="Generating all captions" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Generate All
            </button>
          </div>
          <div className="premium-scroll-hide mt-3 grid gap-2 md:grid-cols-2">
            {captionPlatforms.map((platform) => {
              const Icon = platform.icon
              const draft = posting.captions[platform.id]
              const count = draft?.text.length ?? 0
              return (
                <div
                  key={platform.id}
                  className={cn(
                    'rounded-xl border bg-white/[0.025] p-3',
                    draft?.approved ? 'border-emerald-300/24' : 'border-white/10',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Icon className="size-4" />
                      {platform.label}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleCaptionApproval?.(entryId, platform.id)}
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px]',
                        draft?.approved
                          ? 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100'
                          : 'border-white/10 text-white/46',
                      )}
                    >
                      {draft?.approved ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                  {posting.captionGenerating ? (
                    <div className="mt-3 space-y-2">
                      <div className="h-3 rounded-full bg-white/10" />
                      <div className="h-3 w-2/3 rounded-full bg-white/10" />
                    </div>
                  ) : editingCaption === platform.id ? (
                    <textarea
                      value={draft?.text ?? ''}
                      onChange={(event) => onUpdateCaption?.(entryId, platform.id, event.target.value)}
                      className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/24 px-3 py-2 text-xs leading-5 text-white/78 outline-none"
                    />
                  ) : (
                    <div className="mt-3 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-white/62">
                      {draft?.text ?? `This is a mock ${platform.label} caption for your video about ${selectedFile?.topic ?? 'your project'}.`}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={cn('text-[10px] tabular-nums', count > platform.limit ? 'text-rose-300' : 'text-white/36')}>
                      {count}/{platform.limit.toLocaleString()}
                    </span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setEditingCaption(editingCaption === platform.id ? null : platform.id)} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/58">
                        Edit
                      </button>
                      <button type="button" onClick={() => onRegenerateCaption?.(entryId, platform.id)} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/58">
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className={cn('mt-3 rounded-xl border px-3 py-2 text-xs', captionsReady ? 'border-emerald-300/18 bg-emerald-400/8 text-emerald-100' : 'border-amber-300/18 bg-amber-400/8 text-amber-100')}>
            {captionsReady ? 'All captions ready. Proceed to posting?' : 'Approve every caption to continue.'}
          </div>
          <button
            type="button"
            disabled={!captionsReady}
            onClick={() => onProceedToPlatforms?.(entryId)}
            className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Proceed to platform selection
          </button>
        </div>
      ) : null}

      {posting.status === 'platforms' ? (
        <>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
            <CheckCircle2 className="size-3.5" />
            <span className="truncate">Selected: {selectedFile?.title ?? 'Recent file'}</span>
          </div>
          <div className="mt-3 text-sm font-medium text-white">Which platforms would you like to post to?</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {POSTING_PLATFORMS.map((platform) => {
              const Icon = platform.icon
              const selected = posting.selectedPlatforms.includes(platform.id)
              return (
                <button
                  key={platform.id}
                  type="button"
                  data-selected={selected}
                  onClick={() => onTogglePlatform?.(entryId, platform.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60 transition-colors hover:text-white',
                    platform.className,
                  )}
                >
                  <Icon className="size-4" />
                  {platform.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => onTogglePlatform?.(entryId, 'all')}
              className="col-span-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/78"
            >
              All Channels
            </button>
          </div>
          <button
            type="button"
            onClick={() => onReviewAccounts?.(entryId)}
            disabled={posting.selectedPlatforms.length === 0}
            className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Review accounts
          </button>
        </>
      ) : null}

      {posting.status === 'accounts' ? (
        <div>
          <div className="text-sm font-medium text-white">Account readiness</div>
          <div className="mt-3 space-y-2">
            {posting.selectedPlatforms.map((platformId) => {
              const platform = getPostingPlatform(platformId)
              const Icon = platform.icon
              return platform.connected ? (
                <div key={platform.id} className="flex items-center gap-2 rounded-xl border border-emerald-300/18 bg-emerald-400/8 px-3 py-2 text-xs text-emerald-100">
                  <CheckCircle2 className="size-4" />
                  <Icon className="size-4" />
                  {platform.label} account ready
                </div>
              ) : (
                <div key={platform.id} className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4" />
                    {platform.label} account not connected.
                  </div>
                  <div className="mt-1 text-rose-100/70">Connect in Settings → Social Accounts.</div>
                  <button type="button" onClick={onOpenSocialSettings} className="mt-2 rounded-full border border-rose-200/20 px-3 py-1.5 text-[11px] text-rose-50">
                    Go to Settings
                  </button>
                </div>
              )
            })}
          </div>
          {allAccountsReady ? (
            <div className="mt-3 rounded-xl border border-emerald-300/18 bg-emerald-400/8 px-3 py-2 text-xs text-emerald-100">
              All accounts ready
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onPostNow?.(entryId)}
            disabled={!allAccountsReady}
            className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Post Now
          </button>
        </div>
      ) : null}

      {posting.status === 'preparing' ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm font-medium text-white">Posting to {selectedLabels || 'selected platforms'}...</div>
          <div className="mt-3 space-y-3">
            {posting.selectedPlatforms.map((platformId) => {
              const platform = getPostingPlatform(platformId)
              const Icon = platform.icon
              const result = posting.postingResults?.[platformId]
              return (
                <div key={platformId}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/62">
                    <span className="inline-flex items-center gap-2"><Icon className="size-3.5" />{platform.label}</span>
                    <span>{Math.round(result?.progress ?? 0)}%</span>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    <InlineLoadingAnimation size={16} label={`Posting to ${platform.label}`} />
                    <span>{Math.round(result?.progress ?? 0)}%</span>
                  </span>
                </div>
              )
            })}
          </div>
          <button type="button" disabled={averagePostingProgress >= 50} className="mt-3 rounded-full border border-white/10 px-3 py-2 text-xs text-white/58 disabled:opacity-40">
            Cancel
          </button>
        </div>
      ) : null}

      {posting.status === 'success' ? (
        <div>
          <div className="text-sm font-medium text-white">Posting complete</div>
          <div className="mt-3 space-y-2">
            {posting.selectedPlatforms.map((platformId) => {
              const platform = getPostingPlatform(platformId)
              const Icon = platform.icon
              const result = posting.postingResults?.[platformId]
              const failed = result?.status === 'failed'
              return (
                <div key={platformId} className={cn('rounded-xl border px-3 py-2 text-xs', failed ? 'border-rose-300/20 bg-rose-500/10 text-rose-100' : 'border-emerald-300/18 bg-emerald-400/8 text-emerald-100')}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      {failed ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                      <Icon className="size-4" />
                      {platform.label}
                    </span>
                    {failed ? (
                      <button type="button" onClick={() => onPostNow?.(entryId)} className="rounded-full border border-rose-200/20 px-2 py-1 text-[10px]">Retry</button>
                    ) : (
                      <a href={result?.url ?? platform.mockUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px]">
                        View <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  {failed ? <div className="mt-1 text-rose-100/72">{result?.error ?? 'LinkedIn API rate limited. Retry in 5 minutes.'}</div> : null}
                  {!failed ? <button type="button" className="mt-2 rounded-full border border-emerald-200/20 px-2 py-1 text-[10px]">Copy share link</button> : null}
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => onDonePosting?.(entryId)} className="mt-3 rounded-full border border-white/10 px-3 py-2 text-xs text-white/68">
            Done
          </button>
        </div>
      ) : null}

      {posting.note ? <div className="mt-2 text-xs text-white/42">{posting.note}</div> : null}
    </div>
  )
}

function ChatAttachmentStrip({
  attachments,
  editable = false,
  onRemove,
}: {
  attachments: ChatAttachment[]
  editable?: boolean
  onRemove?: (id: string) => void
}) {
  if (!attachments.length) return null

  return (
    <div className="premium-scroll-hide mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
      {attachments.map((attachment) => {
        const previewUrl = attachment.dataUrl || attachment.url
        return (
          <div
            key={attachment.id}
            className="group/attachment relative flex min-h-16 min-w-16 max-w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
            title={attachment.name}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={attachment.name} className="h-16 w-24 object-cover" />
            ) : (
              <div className="grid h-16 w-20 place-items-center text-white/42">
                <ImageIcon className="size-4" />
              </div>
            )}
            {editable && onRemove ? (
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => onRemove(attachment.id)}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full border border-white/10 bg-black/60 text-white/70 opacity-100 transition hover:bg-white/12 hover:text-white sm:opacity-0 sm:group-hover/attachment:opacity-100"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ChatSelectedStylePill({ style }: { style: ChatSelectedStyle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#9ff6e3]/18 bg-[#9ff6e3]/[0.055] px-3 py-2 text-[11px] text-white/74 shadow-[0_12px_34px_-28px_rgba(159,246,227,0.58)]"
    >
      <Sparkles className="size-3.5 shrink-0 text-[#9ff6e3]/88" />
      <span className="shrink-0 uppercase tracking-[0.16em] text-white/38">Animation</span>
      <span className="min-w-0 truncate font-medium text-white/84">{style.name}</span>
    </motion.div>
  )
}

function MaybeChatSelectedStylePill({ style }: { style: ChatSelectedStyle | null }) {
  if (!style) return null
  return <ChatSelectedStylePill key={style.id} style={style} />
}

function ChatFrameReferenceStrip({ frames }: { frames: ChatFrameReference[] }) {
  if (!frames.length) return null

  return (
    <div className="premium-scroll-hide mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
      {frames.map((frame) => (
        <div
          key={frame.id}
          className="min-w-[9rem] max-w-[12rem] shrink-0 overflow-hidden rounded-2xl border border-[#7ff2d4]/14 bg-[#7ff2d4]/[0.045]"
        >
          {frame.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frame.thumbnailUrl} alt={frame.label} className="h-20 w-full object-cover" />
          ) : (
            <div className="grid h-20 place-items-center bg-black/20 text-white/36">
              <Film className="size-4" />
            </div>
          )}
          <div className="space-y-1 px-3 py-2">
            <div className="truncate text-[11px] font-semibold text-white/78">{frame.label}</div>
            {frame.timecode ? <div className="text-[10px] text-[#b7fff1]/58">{frame.timecode}</div> : null}
            {frame.reason ? <div className="line-clamp-2 text-[10px] leading-4 text-white/42">{frame.reason}</div> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChatToolCallGroup({ toolCalls }: { toolCalls: ChatToolCall[] }) {
  if (!toolCalls.length) return null

  const approvalCount = toolCalls.filter((toolCall) => toolCall.status === 'needs_approval').length

  return (
    <details className="group/tool mt-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold text-white/72 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Code2 className="size-3.5 text-[#7ff2d4]/78" />
          {toolCalls.length} tool call{toolCalls.length === 1 ? '' : 's'}
          {approvalCount ? <span className="text-amber-200/78">approval needed</span> : null}
        </span>
        <ChevronRight className="size-3.5 transition-transform group-open/tool:rotate-90" />
      </summary>
      <div className="mt-2 space-y-2">
        {toolCalls.map((toolCall) => {
          const preview = stringifyToolPreview(toolCall.input || toolCall.output)
          return (
            <div
              key={toolCall.id}
              className={cn(
                'rounded-xl border px-3 py-2 text-[11px] leading-5',
                toolCall.status === 'needs_approval'
                  ? 'border-amber-300/24 bg-amber-300/8 text-amber-50/82'
                  : toolCall.status === 'failed'
                    ? 'border-rose-300/20 bg-rose-500/10 text-rose-50/76'
                    : 'border-white/8 bg-white/[0.035] text-white/62',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white/82">{toolCall.label}</span>
                <span className="uppercase tracking-[0.18em] text-white/36">{toolCall.status.replace('_', ' ')}</span>
              </div>
              {toolCall.summary ? <div className="mt-1 text-white/52">{toolCall.summary}</div> : null}
              {preview ? (
                <code className="mt-2 block truncate rounded-lg bg-black/22 px-2 py-1 font-mono text-[10px] text-[#d6fff7]/58">
                  {preview}
                </code>
              ) : null}
            </div>
          )
        })}
      </div>
    </details>
  )
}

function CurvedThreadPill({
  entry,
  index,
  reduceMotion,
  onConfirmPostingFile,
  onRejectPostingFile,
  onTogglePostingPlatform,
  onSelectPostingVideo,
  onConfirmPostingVideo,
  onChangePostingVideo,
  onGeneratePostingCaptions,
  onUpdatePostingCaption,
  onRegeneratePostingCaption,
  onTogglePostingCaptionApproval,
  onProceedPostingPlatforms,
  onReviewPostingAccounts,
  onOpenSocialSettings,
  onDonePosting,
  onPostNow,
}: {
  entry: ChatEntry
  index: number
  reduceMotion: boolean
  onConfirmPostingFile?: (entryId: string, fileId: string) => void
  onRejectPostingFile?: (entryId: string) => void
  onTogglePostingPlatform?: (entryId: string, platform: SocialPostingPlatform | 'all') => void
  onSelectPostingVideo?: (entryId: string, video: RecentPostingFile) => void
  onConfirmPostingVideo?: (entryId: string) => void
  onChangePostingVideo?: (entryId: string) => void
  onGeneratePostingCaptions?: (entryId: string) => void
  onUpdatePostingCaption?: (entryId: string, platform: SocialPostingPlatform, value: string) => void
  onRegeneratePostingCaption?: (entryId: string, platform: SocialPostingPlatform) => void
  onTogglePostingCaptionApproval?: (entryId: string, platform: SocialPostingPlatform) => void
  onProceedPostingPlatforms?: (entryId: string) => void
  onReviewPostingAccounts?: (entryId: string) => void
  onOpenSocialSettings?: () => void
  onDonePosting?: (entryId: string) => void
  onPostNow?: (entryId: string) => void
}) {
  const isUser = entry.role === 'user'
  const isAssistant = entry.role === 'assistant'
  const isLoading = entry.status === 'loading'

  const entryTimestamp = React.useMemo(() => {
    const timestampMatch = entry.id.match(/(\d{10,})/)
    if (!timestampMatch) return null

    const timestamp = Number(timestampMatch[1])
    return Number.isFinite(timestamp) ? timestamp : null
  }, [entry.id])
  const [timeLabel, setTimeLabel] = React.useState('just now')

  React.useEffect(() => {
    setTimeLabel(formatRelativeThreadTime(entryTimestamp, Date.now()))
  }, [entryTimestamp])

  if (entry.role === 'system') {
    return (
      <div className="flex w-full justify-center px-4 py-2">
        <span className="text-[11px] text-white/40">{entry.text}</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : Math.min(index, 8) * 0.05, ease: 'easeOut' }}
      className={cn('group relative flex w-full flex-col gap-1', isUser ? 'items-end' : 'items-start')}
    >
      <div
        className={cn(
          'relative max-w-[85%] px-4 py-3 text-sm leading-relaxed transition-colors',
          isUser
            ? 'rounded-2xl rounded-br-none bg-emerald-500/20 text-white'
            : 'rounded-2xl rounded-bl-none bg-white/5 text-white/90',
        )}
      >
        <div className="relative z-10">
          {isAssistant && entry.task ? (
            <ChatTaskProcess task={entry.task} reduceMotion={reduceMotion} loading={isLoading} />
          ) : null}
          {isLoading && !entry.clip ? (
            <div className="min-w-[min(22rem,72vw)] py-1">
              <InlineLoadingAnimation size={40} label="Prometheus is responding" />
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{entry.text}</span>
          )}
          {entry.clip ? <ChatClipProcessingCard clip={entry.clip} reduceMotion={reduceMotion} /> : null}
          {entry.posting ? (
            <SocialPostingCard
              entryId={entry.id}
              posting={entry.posting}
              onConfirmFile={onConfirmPostingFile}
              onRejectFile={onRejectPostingFile}
              onTogglePlatform={onTogglePostingPlatform}
              onSelectVideo={onSelectPostingVideo}
              onConfirmVideo={onConfirmPostingVideo}
              onChangeVideo={onChangePostingVideo}
              onGenerateCaptions={onGeneratePostingCaptions}
              onUpdateCaption={onUpdatePostingCaption}
              onRegenerateCaption={onRegeneratePostingCaption}
              onToggleCaptionApproval={onTogglePostingCaptionApproval}
              onProceedToPlatforms={onProceedPostingPlatforms}
              onReviewAccounts={onReviewPostingAccounts}
              onOpenSocialSettings={onOpenSocialSettings}
              onDonePosting={onDonePosting}
              onPostNow={onPostNow}
            />
          ) : null}
          {entry.metadata?.attachments?.length ? (
            <ChatAttachmentStrip attachments={entry.metadata.attachments} />
          ) : null}
          {entry.metadata?.selectedStyle ? (
            <ChatSelectedStylePill style={entry.metadata.selectedStyle} />
          ) : null}
          {entry.metadata?.frames?.length ? (
            <ChatFrameReferenceStrip frames={entry.metadata.frames} />
          ) : null}
          {isAssistant && entry.metadata?.toolCalls?.length ? (
            <ChatToolCallGroup toolCalls={entry.metadata.toolCalls} />
          ) : null}

          {isAssistant && entry.metadata?.sources?.length ? (
            <div className="premium-scroll-hide mt-3 flex gap-2 overflow-x-auto pb-1">
              {entry.metadata.sources.map((source, i) => {
                const label = source.title || source.name || `Source ${i + 1}`
                const className =
                  'inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[11px] leading-none text-white/68 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20'

                return source.url ? (
                  <a
                    key={`${source.url}-${i}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {label}
                  </a>
                ) : (
                  <button
                    key={i}
                    type="button"
                    className={className}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className={cn(
        'px-1 text-[10px] text-white/30 transition-opacity',
        'md:opacity-0 md:group-hover:opacity-100',
        'max-md:opacity-100',
      )}>
        {timeLabel}
      </div>
    </motion.div>
  )
}

function FloatingChatComposer({
  projectId,
  draft,
  onDraftChange,
  onSubmit,
  onStop,
  loading,
  reduceMotion,
  isOpen,
  onOpenChange,
  queuedPreviewRevision,
  onClearQueuedPreview,
  conversationEntries = [],
  threadOpen,
  onThreadOpenChange,
  onConfirmPostingFile,
  onRejectPostingFile,
  onTogglePostingPlatform,
  onSelectPostingVideo,
  onConfirmPostingVideo,
  onChangePostingVideo,
  onGeneratePostingCaptions,
  onUpdatePostingCaption,
  onRegeneratePostingCaption,
  onTogglePostingCaptionApproval,
  onProceedPostingPlatforms,
  onReviewPostingAccounts,
  onOpenSocialSettings,
  onDonePosting,
  onPostNow,
  attachments = [],
  activeStyleTemplate = null,
  onSelectStyleTemplate,
  onAttachImages,
  onRemoveAttachment,
}: {
  projectId: string
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (submission: FrameAssistSubmission) => void | Promise<void>
  onStop: () => void
  loading: boolean
  reduceMotion: boolean
  isOpen: boolean
  onOpenChange: (nextOpen: boolean) => void
  queuedPreviewRevision?: QueuedPreviewRevisionState | null
  onClearQueuedPreview?: () => void
  conversationEntries?: ChatEntry[]
  threadOpen: boolean
  onThreadOpenChange: (nextOpen: boolean) => void
  onConfirmPostingFile?: (entryId: string, fileId: string) => void
  onRejectPostingFile?: (entryId: string) => void
  onTogglePostingPlatform?: (entryId: string, platform: SocialPostingPlatform | 'all') => void
  onSelectPostingVideo?: (entryId: string, video: RecentPostingFile) => void
  onConfirmPostingVideo?: (entryId: string) => void
  onChangePostingVideo?: (entryId: string) => void
  onGeneratePostingCaptions?: (entryId: string) => void
  onUpdatePostingCaption?: (entryId: string, platform: SocialPostingPlatform, value: string) => void
  onRegeneratePostingCaption?: (entryId: string, platform: SocialPostingPlatform) => void
  onTogglePostingCaptionApproval?: (entryId: string, platform: SocialPostingPlatform) => void
  onProceedPostingPlatforms?: (entryId: string) => void
  onReviewPostingAccounts?: (entryId: string) => void
  onOpenSocialSettings?: () => void
  onDonePosting?: (entryId: string) => void
  onPostNow?: (entryId: string) => void
  attachments?: ChatAttachment[]
  activeStyleTemplate?: StyleTemplate | null
  onSelectStyleTemplate?: (template: StyleTemplate) => void
  onAttachImages?: (files: FileList | null) => void
  onRemoveAttachment?: (id: string) => void
}) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const responsivePlaceholderText = 'Ask about editing, color, sound...'
  const composerId = React.useId()
  const hasDraft = draft.trim().length > 0
  const composerInputRef = useTextareaResize(draft, 1, 4)
  const composerMeasureRef = React.useRef<HTMLSpanElement | null>(null)
  const composerPlaceholderMeasureRef = React.useRef<HTMLSpanElement | null>(null)
  const mouseMoveFrameRef = React.useRef<number | null>(null)
  const pointerResetTimeoutRef = React.useRef<number | null>(null)
  const draftRef = React.useRef(draft)
  const placeholderTextRef = React.useRef('')
  const eyeSourceRef = React.useRef<'placeholder' | 'caret' | 'pointer'>(hasDraft ? 'caret' : 'placeholder')
  const [eyeTarget, setEyeTarget] = React.useState<{ x: number; y: number } | null>(null)
  const [placeholderText, setPlaceholderText] = React.useState('')
  const [caretIndex, setCaretIndex] = React.useState(0)
  const [pendingSelectionRange, setPendingSelectionRange] = React.useState<{ start: number; end: number } | null>(null)
  const [suppressedAssistKey, setSuppressedAssistKey] = React.useState<string | null>(null)
  const [draftScrollLeft, setDraftScrollLeft] = React.useState(0)
  const expandedThreadEndRef = React.useRef<HTMLDivElement | null>(null)
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null)
  const isThreadOpen = isOpen || threadOpen
  const frameAssist = useFrameTargeting({ projectId, draft, caretIndex })
  const draftMirrorAnalysis = React.useMemo(() => parseFrameReference(draft, draft.length), [draft])
  const visibleThreadEntries = React.useMemo(
    () => conversationEntries.slice(-12),
    [conversationEntries],
  )
  const queuedPreviewRawText = queuedPreviewRevision?.request.rawText ?? null
  const latestThreadEntry = visibleThreadEntries[visibleThreadEntries.length - 1]
  const activeChatStyle = React.useMemo<ChatSelectedStyle | null>(
    () =>
      activeStyleTemplate
        ? {
            id: activeStyleTemplate.id,
            name: activeStyleTemplate.name,
            description: activeStyleTemplate.description,
          }
        : null,
    [activeStyleTemplate],
  )
  const editorOverlayMessages = React.useMemo(
    () => toPrometheusChatMessages(visibleThreadEntries),
    [visibleThreadEntries],
  )

  React.useEffect(() => {
    if (!isThreadOpen) return
    const rafId = window.requestAnimationFrame(() => {
      expandedThreadEndRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'end',
      })
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [isThreadOpen, latestThreadEntry?.id, latestThreadEntry?.text, reduceMotion])
  const frameAssistKey = React.useMemo(() => {
    if (!frameAssist.analysis.referenceText) return null
    return `${caretIndex}:${frameAssist.analysis.referenceStartIndex ?? 'na'}:${frameAssist.analysis.referenceEndIndex ?? 'na'}:${frameAssist.analysis.referenceText}`
  }, [
    caretIndex,
    frameAssist.analysis.referenceEndIndex,
    frameAssist.analysis.referenceStartIndex,
    frameAssist.analysis.referenceText,
  ])
  const isFrameAssistSuppressed = suppressedAssistKey !== null && suppressedAssistKey === frameAssistKey

  const updateCaretTarget = React.useCallback((activate = true) => {
    const input = composerInputRef.current
    const measure = composerMeasureRef.current
    if (!input || !measure) return

    const selectionIndex = input.selectionStart ?? input.value.length
    setCaretIndex(selectionIndex)
    setDraftScrollLeft(input.scrollLeft)
    const beforeCaret = input.value.slice(0, selectionIndex).replaceAll(' ', '\u00a0') || '\u200b'
    measure.textContent = beforeCaret

    const rect = input.getBoundingClientRect()
    const computed = window.getComputedStyle(input)
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0
    const measureWidth = measure.getBoundingClientRect().width
    const minX = rect.left + paddingLeft
    const maxX = rect.right - 18

    if (activate) {
      eyeSourceRef.current = 'caret'
    }
    setEyeTarget({
      x: Math.min(maxX, Math.max(minX, rect.left + paddingLeft + measureWidth - input.scrollLeft)),
      y: rect.top + rect.height / 2,
    })
  }, [composerInputRef])

  const updatePlaceholderTarget = React.useCallback((text: string) => {
    const input = composerInputRef.current
    const measure = composerPlaceholderMeasureRef.current
    if (!input || !measure) return

    measure.textContent = text.replaceAll(' ', '\u00a0') || '\u200b'

    const rect = input.getBoundingClientRect()
    const computed = window.getComputedStyle(input)
    const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0
    const measureWidth = measure.getBoundingClientRect().width
    const minX = rect.left + paddingLeft
    const maxX = rect.right - 18

    setEyeTarget({
      x: Math.min(maxX, Math.max(minX, rect.left + paddingLeft + measureWidth)),
      y: rect.top + rect.height / 2,
    })
  }, [composerInputRef])

  React.useEffect(() => {
    draftRef.current = draft
  }, [draft])

  React.useEffect(() => {
    placeholderTextRef.current = placeholderText
  }, [placeholderText])

  React.useEffect(() => {
    if (!isOpen) return

    const rafId = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus()
      if (draftRef.current.trim().length > 0) {
        updateCaretTarget(false)
      } else {
        updatePlaceholderTarget(placeholderTextRef.current)
      }
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [composerInputRef, isOpen, isThreadOpen, updateCaretTarget, updatePlaceholderTarget])

  React.useEffect(() => {
    if (isThreadOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isThreadOpen, isMobile])

  React.useEffect(() => {
    if (!isOpen) {
      onThreadOpenChange(false)
    }
  }, [isOpen, onThreadOpenChange])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onThreadOpenChange(false)
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onOpenChange, onThreadOpenChange])

  React.useEffect(() => {
    if (!isOpen || !hasDraft) return

    const rafId = window.requestAnimationFrame(() => {
      updateCaretTarget()
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [draft, hasDraft, isOpen, updateCaretTarget])

  React.useEffect(() => {
    if (hasDraft) {
      eyeSourceRef.current = 'caret'
      return
    }

    eyeSourceRef.current = 'placeholder'
  }, [hasDraft])

  React.useEffect(() => {
    if (!isOpen || hasDraft) return
    setPlaceholderText(responsivePlaceholderText)
  }, [hasDraft, isOpen, responsivePlaceholderText])

  React.useEffect(() => {
    if (!hasDraft) {
      setDraftScrollLeft(0)
    }
  }, [hasDraft])

  React.useEffect(() => {
    if (!isOpen || hasDraft) return
    if (eyeSourceRef.current === 'pointer') return

    const rafId = window.requestAnimationFrame(() => {
      updatePlaceholderTarget(placeholderText)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [hasDraft, isOpen, placeholderText, updatePlaceholderTarget])

  React.useEffect(() => {
    if (!isOpen) return

    const handleMouseMove = (event: MouseEvent) => {
      if (mouseMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(mouseMoveFrameRef.current)
      }

      mouseMoveFrameRef.current = window.requestAnimationFrame(() => {
        eyeSourceRef.current = 'pointer'
        setEyeTarget({
          x: event.clientX,
          y: event.clientY,
        })
        mouseMoveFrameRef.current = null
      })

      if (pointerResetTimeoutRef.current !== null) {
        window.clearTimeout(pointerResetTimeoutRef.current)
      }

      pointerResetTimeoutRef.current = window.setTimeout(() => {
        pointerResetTimeoutRef.current = null
        if (draftRef.current.trim().length > 0) {
          updateCaretTarget(false)
          eyeSourceRef.current = 'caret'
        } else {
          updatePlaceholderTarget(placeholderTextRef.current)
          eyeSourceRef.current = 'placeholder'
        }
      }, 900)
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (mouseMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(mouseMoveFrameRef.current)
        mouseMoveFrameRef.current = null
      }
      if (pointerResetTimeoutRef.current !== null) {
        window.clearTimeout(pointerResetTimeoutRef.current)
        pointerResetTimeoutRef.current = null
      }
    }
  }, [isOpen, updateCaretTarget, updatePlaceholderTarget])

  React.useEffect(() => {
    if (suppressedAssistKey && suppressedAssistKey !== frameAssistKey) {
      setSuppressedAssistKey(null)
    }
  }, [frameAssistKey, suppressedAssistKey])

  React.useEffect(() => {
    const nextSelection = pendingSelectionRange
    if (!nextSelection) return

    const input = composerInputRef.current
    if (!input) return

    const rafId = window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextSelection.start, nextSelection.end)
      setPendingSelectionRange(null)
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [composerInputRef, pendingSelectionRange])

  const handleFrameAssistRetarget = React.useCallback(() => {
    setSuppressedAssistKey(null)
    const input = composerInputRef.current
    if (input && frameAssist.analysis.referenceStartIndex !== null && frameAssist.analysis.referenceEndIndex !== null) {
      input.focus()
      input.setSelectionRange(frameAssist.analysis.referenceStartIndex, frameAssist.analysis.referenceEndIndex)
      setCaretIndex(frameAssist.analysis.referenceStartIndex)
      return
    }

    if (queuedPreviewRawText) {
      const restoredDraft = queuedPreviewRawText
      const restoredAnalysis = parseFrameReference(restoredDraft, restoredDraft.length)
      onDraftChange(restoredDraft)
      const nextCaretIndex = restoredAnalysis.referenceEndIndex ?? restoredDraft.length
      setCaretIndex(nextCaretIndex)
      setPendingSelectionRange({
        start: restoredAnalysis.referenceStartIndex ?? nextCaretIndex,
        end: nextCaretIndex,
      })
      return
    }

    composerInputRef.current?.focus()
    updateCaretTarget()
  }, [
    frameAssist.analysis.referenceEndIndex,
    frameAssist.analysis.referenceStartIndex,
    composerInputRef,
    onDraftChange,
    queuedPreviewRawText,
    updateCaretTarget,
  ])

  const handleFrameAssistClear = React.useCallback(() => {
    const nextDraft = frameAssist.clearFrameTarget()
    onDraftChange(nextDraft)
    setCaretIndex(nextDraft.length)
    setPendingSelectionRange({ start: nextDraft.length, end: nextDraft.length })
    setSuppressedAssistKey(null)
    onClearQueuedPreview?.()
  }, [frameAssist, onClearQueuedPreview, onDraftChange])

  const handleFrameAssistSelect = React.useCallback(
    (suggestion: FrameSuggestion) => {
      const next = frameAssist.confirmSuggestion(suggestion)
      const nextAnalysis = parseFrameReference(next.nextDraft, next.nextCaretIndex)
      onDraftChange(next.nextDraft)
      setCaretIndex(next.nextCaretIndex)
      setPendingSelectionRange({ start: next.nextCaretIndex, end: next.nextCaretIndex })
      setSuppressedAssistKey(
        nextAnalysis.referenceText
          ? `${next.nextCaretIndex}:${nextAnalysis.referenceStartIndex ?? 'na'}:${nextAnalysis.referenceEndIndex ?? 'na'}:${nextAnalysis.referenceText}`
          : null,
      )
    },
    [frameAssist, onDraftChange],
  )

  const activeFrameSuggestion =
    frameAssist.suggestions.length > 0
      ? frameAssist.suggestions[
          frameAssist.clampSuggestionIndex(frameAssist.activeSuggestionIndex >= 0 ? frameAssist.activeSuggestionIndex : 0)
        ] ?? frameAssist.suggestions[0]
      : null

  const handleComposerSubmit = React.useCallback(async () => {
    const nextValue = draft.trim()
      || (attachments.length ? 'Use these visual references for the next response.' : '')
      || (activeChatStyle ? `Use the ${activeChatStyle.name} animation style for the next recommendation.` : '')
    if (!nextValue) return
    onThreadOpenChange(true)

    const revisionRequest = frameAssist.buildRevisionRequest()
    if (revisionRequest.frameTarget) {
      frameAssist.recordRecentTarget(revisionRequest)
    }

    await onSubmit({
      rawText: nextValue,
      analysis: frameAssist.analysis,
      revisionRequest,
    })
  }, [activeChatStyle, attachments.length, draft, frameAssist, onSubmit, onThreadOpenChange])

  const handleQuickAction = React.useCallback(
    (prompt: string) => {
      const nextDraft = draft.trim() ? `${draft.trim()}\n${prompt}` : prompt
      onDraftChange(nextDraft)
      setCaretIndex(nextDraft.length)
      window.requestAnimationFrame(() => {
        composerInputRef.current?.focus()
        composerInputRef.current?.setSelectionRange(nextDraft.length, nextDraft.length)
        updateCaretTarget(false)
      })
    },
    [composerInputRef, draft, onDraftChange, updateCaretTarget],
  )

  const handleComposerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const hasVisibleSuggestions = frameAssist.isPopoverOpen && !isFrameAssistSuppressed && frameAssist.suggestions.length > 0

      if (event.key === 'Escape' && hasVisibleSuggestions) {
        event.preventDefault()
        if (frameAssistKey) {
          setSuppressedAssistKey(frameAssistKey)
        }
        return
      }

      if (event.key === 'Escape' && isThreadOpen) {
        event.preventDefault()
        onThreadOpenChange(false)
        onOpenChange(false)
        return
      }

      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && hasVisibleSuggestions) {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        frameAssist.setActiveSuggestionIndex((current) =>
          frameAssist.clampSuggestionIndex((current < 0 ? 0 : current) + delta),
        )
        return
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        if (hasVisibleSuggestions && activeFrameSuggestion) {
          event.preventDefault()
          handleFrameAssistSelect(activeFrameSuggestion)
          return
        }

        if (!hasDraft && attachments.length === 0 && !activeChatStyle) return
        event.preventDefault()
        void handleComposerSubmit()
      }
    },
    [
      activeFrameSuggestion,
      activeChatStyle,
      frameAssist,
      frameAssistKey,
      handleComposerSubmit,
      handleFrameAssistSelect,
      hasDraft,
      attachments.length,
      isFrameAssistSuppressed,
      isThreadOpen,
      onOpenChange,
      onThreadOpenChange,
    ],
  )

  return (
    <div
      data-editorial-chat={isThreadOpen ? 'moon-expanded' : 'launcher'}
      className={cn(
      'pointer-events-none fixed inset-0 z-[120] flex overflow-visible transition-[transform,opacity] duration-300 ease-out',
      isThreadOpen ? 'items-stretch justify-stretch p-2 sm:p-3 md:p-4' : 'items-end justify-end p-6',
    )}
    >
      <AnimatePresence initial={false}>
        {isThreadOpen ? (
          <motion.div
            variants={chatOverlayVariants}
            initial={reduceMotion ? false : 'hidden'}
            animate={reduceMotion ? undefined : 'visible'}
            exit={reduceMotion ? undefined : 'exit'}
            onClick={() => {
              onThreadOpenChange(false)
              onOpenChange(false)
            }}
            className="pointer-events-auto fixed inset-0 -z-10 bg-black/88 backdrop-blur-2xl"
          />
        ) : null}
      </AnimatePresence>
      <motion.div
        key={isThreadOpen ? 'editorial-chat-chamber' : 'editorial-chat-launcher'}
        layout={false}
        drag={isMobile && isThreadOpen ? "y" : false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onThreadOpenChange(false)
            onOpenChange(false)
          }
        }}
        className={cn(
          'pointer-events-auto relative will-change-[transform,opacity,filter]',
          isThreadOpen
            ? [
                'premium-motion-surface premium-telemetry-panel origin-center h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_42px_120px_rgba(0,0,0,0.78),0_0_0_1px_rgba(255,255,255,0.035)] backdrop-blur-2xl',
                'md:h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-2rem)] md:w-[calc(100vw-2rem)] md:rounded-[34px]',
              ]
            : 'origin-bottom-right overflow-visible border border-transparent bg-transparent shadow-none',
        )}
        style={{ ...CHAT_COMPOSER_FONT_STYLE, transformOrigin: isThreadOpen ? '50% 52%' : 'bottom right' }}
        variants={isThreadOpen ? chatPanelVariants : chatLauncherVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? undefined : 'visible'}
        exit={reduceMotion ? undefined : 'exit'}
        whileHover={!isThreadOpen && !reduceMotion ? { y: -2, scale: 1.025 } : undefined}
        whileTap={!isThreadOpen && !reduceMotion ? { scale: 0.96 } : undefined}
      >
        {!isThreadOpen ? (
          <button
            type="button"
            aria-label="Open editorial chat"
            onClick={() => {
              onOpenChange(true)
              onThreadOpenChange(true)
            }}
            className="group/editorial-chat relative flex h-12 items-center gap-2.5 overflow-hidden rounded-full border border-white/12 bg-black/72 py-1.5 pl-2 pr-4 text-white/86 shadow-[0_18px_52px_-34px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl transition-[border-color,color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/22 hover:text-white hover:shadow-[0_22px_62px_-38px_rgba(0,0,0,1),0_0_28px_-22px_rgba(156,134,255,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/24"
          >
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-300 group-hover/editorial-chat:border-white/18 group-hover/editorial-chat:text-white">
              <MessageCircle className="size-4" strokeWidth={1.75} />
            </span>
            <span className="relative text-[13px] font-semibold tracking-[0.01em]">Chat</span>
          </button>
        ) : null}

        <div className={cn('relative h-full w-full overflow-hidden rounded-[inherit] bg-transparent', !isThreadOpen && 'hidden')}>
          {isThreadOpen ? <div aria-hidden className="absolute inset-0 -z-10 bg-black" /> : null}
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              onAttachImages?.(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <AnimatePresence initial={false} mode="wait">
            {isThreadOpen ? (
              <motion.div
                key="thread-prometheus-chat"
                className="relative h-full min-h-0"
                variants={chatInteriorVariants}
                initial={reduceMotion ? false : 'hidden'}
                animate={reduceMotion ? undefined : 'visible'}
                exit={reduceMotion ? undefined : 'exit'}
              >
                <PrometheusChat
                  projectId={projectId}
                  title="Current Chat"
                  messages={editorOverlayMessages}
                  draft={draft}
                  onDraftChange={onDraftChange}
                  thinking={loading}
                  onSend={async () => {
                    await handleComposerSubmit()
                  }}
                  onAttachImage={() => attachmentInputRef.current?.click()}
                  actions={CHAT_QUICK_ACTIONS.map((action) => ({
                    id: action.label,
                    label: action.label,
                    icon: action.icon,
                  }))}
                  className="min-h-full"
                  onClose={() => {
                    onThreadOpenChange(false)
                    onOpenChange(false)
                  }}
                />
              </motion.div>
            ) : false ? (
              <motion.div
                key="thread-composer"
                className="relative flex h-full min-h-0 flex-col px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-4"
                initial={reduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(12px)' }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 10, filter: 'blur(8px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex h-5 shrink-0 items-center justify-center md:hidden">
                  <span className="h-1 w-10 rounded-full bg-white/18" aria-hidden />
                </div>

                  <div className="relative flex min-h-14 items-center justify-between gap-3 border-b border-white/5 px-1 pb-3 md:min-h-[60px] md:px-1">
                  <div className="premium-liquid-pill inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">
                    <motion.span
                      aria-hidden
                      className="size-1.5 rounded-full bg-emerald-400"
                      initial={reduceMotion ? false : { scale: 1 }}
                      animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
                    />
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                      EDITORIAL THREAD
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      aria-label="Close chat interface"
                      onClick={() => {
                        onThreadOpenChange(false)
                        onOpenChange(false)
                      }}
                      className="premium-icon-orbit grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/58 transition-colors hover:bg-white/[0.07] hover:text-white/90"
                      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    >
                      <X className="size-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="premium-scroll-mask relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-4 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin] [will-change:transform] max-md:[scrollbar-width:none] md:py-5 [&::-webkit-scrollbar]:w-1.5 max-md:[&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
                  <div className="flex flex-col gap-2">
                    {visibleThreadEntries.length ? (
                      visibleThreadEntries.map((entry, index) => (
                        <CurvedThreadPill
                          key={entry.id}
                          entry={entry}
                          index={index}
                          reduceMotion={reduceMotion}
                          onConfirmPostingFile={onConfirmPostingFile}
                          onRejectPostingFile={onRejectPostingFile}
                          onTogglePostingPlatform={onTogglePostingPlatform}
                          onSelectPostingVideo={onSelectPostingVideo}
                          onConfirmPostingVideo={onConfirmPostingVideo}
                          onChangePostingVideo={onChangePostingVideo}
                          onGeneratePostingCaptions={onGeneratePostingCaptions}
                          onUpdatePostingCaption={onUpdatePostingCaption}
                          onRegeneratePostingCaption={onRegeneratePostingCaption}
                          onTogglePostingCaptionApproval={onTogglePostingCaptionApproval}
                          onProceedPostingPlatforms={onProceedPostingPlatforms}
                          onReviewPostingAccounts={onReviewPostingAccounts}
                          onOpenSocialSettings={onOpenSocialSettings}
                          onDonePosting={onDonePosting}
                          onPostNow={onPostNow}
                        />
                      ))
                    ) : (
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 14, filter: 'blur(10px)' }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-[42dvh] flex-col items-center justify-center px-4 text-center"
                      >
                        <p
                          className="text-[clamp(2.5rem,7vw,5.8rem)] font-extralight leading-[0.9] text-white"
                          style={{ fontFamily: 'var(--font-migra), var(--font-playfair-display), Georgia, serif' }}
                        >
                          Current Chat
                        </p>
                        <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/58">
                          Ask Prometheus...
                        </p>
                      </motion.div>
                    )}
                    <div ref={expandedThreadEndRef} className="h-1" />
                  </div>
                </div>

                <form
                  className="relative shrink-0 border-t border-white/5 px-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] pt-3 md:pt-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (loading) {
                      onStop()
                      return
                    }
                    void handleComposerSubmit()
                  }}
                >
                  <EditorialComposerFrameAssist
                    suggestions={frameAssist.suggestions}
                    activeSuggestionIndex={frameAssist.activeSuggestionIndex}
                    isPopoverOpen={frameAssist.isPopoverOpen && !isFrameAssistSuppressed}
                    previewRegion={frameAssist.previewRegion}
                    queuedPreviewRevision={queuedPreviewRevision}
                    validationNote={frameAssist.analysis.validationNote}
                    onMoveActiveSuggestion={(delta) => {
                      frameAssist.setActiveSuggestionIndex((current) =>
                        frameAssist.clampSuggestionIndex((current < 0 ? 0 : current) + delta),
                      )
                    }}
                    onSelectSuggestion={handleFrameAssistSelect}
                    onDismissSuggestions={() => {
                      if (frameAssistKey) {
                        setSuppressedAssistKey(frameAssistKey)
                      }
                    }}
                    onClearFrameTarget={handleFrameAssistClear}
                    onRetargetFrameTarget={handleFrameAssistRetarget}
                    className="relative z-30 mb-3"
                  />

                  <ChatAttachmentStrip
                    attachments={attachments}
                    editable
                    onRemove={onRemoveAttachment}
                  />
                  <AnimatePresence>
                    <MaybeChatSelectedStylePill style={activeChatStyle} />
                  </AnimatePresence>

                  <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {CHAT_QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleQuickAction(action.prompt)}
                          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 text-[11px] font-medium text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.065] hover:text-white/86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        >
                          <Icon className="size-3.5" />
                          {action.label}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    id={`${composerId}-thread`}
                    ref={composerInputRef}
                    value={draft}
                    rows={1}
                    placeholder={responsivePlaceholderText}
                    onChange={(event) => {
                      onDraftChange(event.target.value)
                      setCaretIndex(event.target.selectionStart ?? event.target.value.length)
                    }}
                    onClick={() => updateCaretTarget()}
                    onFocus={() => updateCaretTarget(false)}
                    onScroll={(event) => {
                      setDraftScrollLeft(event.currentTarget.scrollLeft)
                    }}
                    onKeyUp={() => updateCaretTarget()}
                    onSelect={() => updateCaretTarget()}
                    onKeyDown={handleComposerKeyDown}
                    className="max-h-[calc(1.4em*4)] min-h-16 w-full resize-none overflow-y-auto bg-transparent text-sm leading-[1.4] text-white outline-none placeholder:italic placeholder:text-white/30"
                    style={{
                      caretColor: 'rgba(52,211,153,0.95)',
                    }}
                  />

                  <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 pt-3 md:gap-4">
                    <motion.button
                      type="button"
                      aria-label="Attach image"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="premium-icon-orbit grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/52 transition-colors hover:bg-white/[0.06] hover:text-white/82 md:h-12 md:w-12"
                      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.03 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    >
                      <ImageIcon className="size-4" />
                    </motion.button>
                    <ChatStyleSelector
                      activeStyleId={activeStyleTemplate?.id ?? null}
                      compact
                      disabled={!onSelectStyleTemplate}
                      onSelectStyle={(template) => onSelectStyleTemplate?.(template)}
                      className="shrink-0"
                    />
                    <div aria-hidden />
                    <motion.button
                      type="submit"
                      aria-label={loading ? 'Stop response' : 'Send message'}
                      disabled={!loading && !hasDraft && attachments.length === 0 && !activeChatStyle}
                      className="premium-liquid-pill grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-500 text-white shadow-[0_12px_26px_rgba(16,185,129,0.26)] transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-45 md:h-12 md:w-12"
                      whileHover={reduceMotion ? undefined : { y: -1, scale: 1.04 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    >
                      {loading ? (
                        <InlineLoadingAnimation size={18} label="Prometheus is responding" />
                      ) : (
                        <ArrowUp className="size-5" />
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            ) : isOpen ? (
              <motion.div
                key="open-composer"
                className="relative flex h-full flex-col px-4 py-3"
                initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(10px)' }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 8, filter: 'blur(6px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <span
                  ref={composerMeasureRef}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-11 invisible whitespace-pre text-[20px] italic tracking-[0.01em]"
                  style={{
                    fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                  }}
                />
                <span
                  ref={composerPlaceholderMeasureRef}
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-11 invisible whitespace-pre text-[20px] italic tracking-[0.01em]"
                  style={{
                    fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                  }}
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="premium-liquid-pill inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[10px] uppercase tracking-[0.28em] text-white/38">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-[#7ff2d4]"
                    />
                    Editor Relay
                  </div>

                  <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                    <TypingEyes target={eyeTarget} reduceMotion={reduceMotion} />
                  </div>

                  <motion.button
                    type="button"
                    aria-label={hasDraft ? 'Collapse chat composer' : 'Close chat composer'}
                    onClick={() => {
                      onThreadOpenChange(false)
                      onOpenChange(false)
                    }}
                    className="premium-icon-orbit grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/54 transition-colors hover:text-white/82"
                    whileHover={reduceMotion ? undefined : { y: -1, scale: 1.05 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  >
                    <X className="size-3" />
                  </motion.button>
                </div>

                <EditorialComposerFrameAssist
                  suggestions={frameAssist.suggestions}
                  activeSuggestionIndex={frameAssist.activeSuggestionIndex}
                  isPopoverOpen={frameAssist.isPopoverOpen && !isFrameAssistSuppressed}
                  previewRegion={frameAssist.previewRegion}
                  queuedPreviewRevision={queuedPreviewRevision}
                  validationNote={frameAssist.analysis.validationNote}
                  onMoveActiveSuggestion={(delta) => {
                    frameAssist.setActiveSuggestionIndex((current) =>
                      frameAssist.clampSuggestionIndex((current < 0 ? 0 : current) + delta),
                    )
                  }}
                  onSelectSuggestion={handleFrameAssistSelect}
                  onDismissSuggestions={() => {
                    if (frameAssistKey) {
                      setSuppressedAssistKey(frameAssistKey)
                    }
                  }}
                  onClearFrameTarget={handleFrameAssistClear}
                  onRetargetFrameTarget={handleFrameAssistRetarget}
                  className="relative z-30 mt-2"
                />

                <ChatAttachmentStrip
                  attachments={attachments}
                  editable
                  onRemove={onRemoveAttachment}
                />
                <AnimatePresence>
                  <MaybeChatSelectedStylePill style={activeChatStyle} />
                </AnimatePresence>

                <div className="relative mt-2 flex-1 overflow-visible">
                  {!hasDraft ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
                      <div
                        className="flex items-center whitespace-nowrap text-[20px] italic leading-[1.35] tracking-[0.01em] text-white/40"
                        style={{
                          fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                        }}
                      >
                        <span>{placeholderText}</span>
                        <span
                          aria-hidden
                          className="ml-1 inline-block h-6 w-px bg-white/42 opacity-70"
                        />
                      </div>
                    </div>
                  ) : null}
                  {hasDraft ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
                      <FrameComposerDraftMirror
                        draft={draft}
                        analysis={draftMirrorAnalysis}
                        scrollLeft={draftScrollLeft}
                      />
                    </div>
                  ) : null}
                  <textarea
                    id={composerId}
                    ref={composerInputRef}
                    value={draft}
                    rows={1}
                    onChange={(event) => {
                      onDraftChange(event.target.value)
                      setCaretIndex(event.target.selectionStart ?? event.target.value.length)
                    }}
                    onClick={() => updateCaretTarget()}
                    onFocus={() => {
                      if (draftRef.current.trim().length > 0) {
                        updateCaretTarget(false)
                      }
                    }}
                    onScroll={(event) => {
                      setDraftScrollLeft(event.currentTarget.scrollLeft)
                    }}
                    onKeyUp={() => updateCaretTarget()}
                    onSelect={() => updateCaretTarget()}
                    onKeyDown={handleComposerKeyDown}
                    className={cn(
                      'relative z-10 max-h-[calc(1.35em*4)] w-full resize-none overflow-y-auto bg-transparent px-0 py-0 text-[20px] italic leading-[1.35] tracking-[0.01em] text-transparent outline-none',
                    )}
                    style={{
                      fontFamily: 'var(--font-newsreader), "Iowan Old Style", "Palatino Linotype", serif',
                      caretColor: 'rgba(255,255,255,0.78)',
                    }}
                  />
                </div>

                <div className="mt-2 grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 md:gap-4">
                  <motion.button
                    type="button"
                    aria-label="Attach image"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="premium-icon-orbit grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/52 transition-colors hover:bg-white/[0.06] hover:text-white/82 md:h-12 md:w-12"
                    whileHover={reduceMotion ? undefined : { y: -1, scale: 1.03 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  >
                    <ImageIcon className="size-4" />
                  </motion.button>
                  <ChatStyleSelector
                    activeStyleId={activeStyleTemplate?.id ?? null}
                    compact
                    disabled={!onSelectStyleTemplate}
                    onSelectStyle={(template) => onSelectStyleTemplate?.(template)}
                    className="shrink-0"
                  />
                  <div aria-hidden />
                  <motion.button
                    type="button"
                    onClick={loading ? onStop : () => void handleComposerSubmit()}
                    disabled={!loading && !hasDraft && attachments.length === 0 && !activeChatStyle}
                    className="premium-liquid-pill grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-300/20 bg-emerald-500 p-0 text-white shadow-[0_12px_26px_rgba(16,185,129,0.26)] transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-45 md:h-12 md:w-12"
                    whileHover={reduceMotion ? undefined : { y: -1, scale: 1.04 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  >
                    {loading ? (
                      <InlineLoadingAnimation size={18} label="Prometheus is responding" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed-composer-icon"
                className="premium-icon-orbit relative grid h-full w-full place-items-center rounded-full border border-white/16 bg-[radial-gradient(circle_at_34%_26%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_32%),linear-gradient(145deg,rgba(18,18,22,0.98)_0%,rgba(4,4,6,0.98)_100%)] text-white shadow-[0_18px_42px_-20px_rgba(0,0,0,0.95),0_0_34px_-22px_rgba(127,242,212,0.82)]"
                initial={reduceMotion ? false : { opacity: 0.92, scale: 0.94 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0.95, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 22, mass: 0.5 }
                }
                whileHover={reduceMotion ? undefined : { scale: 1.05, boxShadow: '0 18px 42px rgba(0,0,0,0.42)' }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <span
                  aria-hidden
                  className="absolute inset-[7px] rounded-full border border-[#7ff2d4]/18"
                />
                <MessageSquare className="relative size-5 drop-shadow-[0_0_10px_rgba(127,242,212,0.22)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

const ChatWorkspacePanel = React.memo(function ChatWorkspacePanel({
  projectId,
  projectTitle,
  initialPrompt,
  initialSources,
  videoContext,
  composerPortalTarget,
  automationRequest,
  clipRelayState,
  musicSpotlightPortalTarget,
  onEditRequest,
  initialEditorState,
  onSave,
}: {
  projectId: string
  projectTitle: string
  initialPrompt: string
  initialSources: string[]
  videoContext: MusicVideoContext
  composerPortalTarget: HTMLElement | null
  automationRequest?: ComposerAutomationRequest | null
  clipRelayState?: ClipRelayState | null
  musicSpotlightPortalTarget?: HTMLDivElement | null
  onEditRequest?: (request: { prompt: string; styleTemplate: StyleTemplate }) => void | Promise<void>
  initialEditorState?: any
  onSave?: (editorState: any) => void
}) {
  const reduceMotion = useStableReducedMotion()
  const [entries, setEntries] = React.useState<ChatEntry[]>(() => [])
  const [draft, setDraft] = React.useState('')
  const [pendingReplies, setPendingReplies] = React.useState(0)
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isComposerThreadOpen, setIsComposerThreadOpen] = React.useState(false)
  const [composerFallbackPortalTarget, setComposerFallbackPortalTarget] = React.useState<HTMLElement | null>(null)
  const [pendingChatAttachments, setPendingChatAttachments] = React.useState<ChatAttachment[]>([])
  const [selectedChatStyleId, setSelectedChatStyleId] = React.useState<string | null>(null)
  const [queuedPreviewRevision, setQueuedPreviewRevision] = React.useState<QueuedPreviewRevisionState | null>(null)
  const [musicPreference, setMusicPreference] = React.useState<MusicPreference>(() =>
    createDefaultMusicPreference(),
  )
  const [stagedTracks, setStagedTracks] = React.useState<StagedMusicTrack[]>([])
  const [musicStorageReady, setMusicStorageReady] = React.useState(false)
  const [musicPreviewVolume, setMusicPreviewVolume] = React.useState(DEFAULT_MUSIC_PREVIEW_VOLUME)
  const musicPreviewVolumeRef = React.useRef(DEFAULT_MUSIC_PREVIEW_VOLUME)
  const [activePreviewTrack, setActivePreviewTrack] = React.useState<MusicRecommendation | null>(null)
  const [previewPlaying, setPreviewPlaying] = React.useState(false)
  const [dismissedSpotlightTrackId, setDismissedSpotlightTrackId] = React.useState<string | null>(null)
  const entriesRef = React.useRef(entries)
  const selectedChatStyleTemplate = React.useMemo(
    () => STYLE_TEMPLATES.find((template) => template.id === selectedChatStyleId) ?? null,
    [selectedChatStyleId],
  )
  const resolvedComposerPortalTarget = composerPortalTarget ?? composerFallbackPortalTarget

  React.useEffect(() => {
    setComposerFallbackPortalTarget(document.body)
  }, [])

  const requestControllersRef = React.useRef<AbortController[]>([])
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null)
  const musicPreviewToggleCooldownRef = React.useRef<number | null>(null)
  const threadViewportRef = React.useRef<HTMLDivElement | null>(null)
  const threadContentRef = React.useRef<HTMLDivElement | null>(null)
  const threadEndRef = React.useRef<HTMLDivElement | null>(null)
  const chatEntryRefs = React.useRef(new Map<string, HTMLDivElement>())
  const musicCardRefs = React.useRef(new Map<string, HTMLDivElement>())
  const pendingReplyScrollEntryIdRef = React.useRef<string | null>(null)
  const followLatestRef = React.useRef(false)
  const replyHighlightTimerRef = React.useRef<number | null>(null)
  const announcedMusicToastKeysRef = React.useRef(new Set<string>())
  const handledAutomationRequestIdRef = React.useRef<number | null>(null)
  const [highlightedEntryId, setHighlightedEntryId] = React.useState<string | null>(null)
  const queuedPreviewRequestTokenRef = React.useRef<string | null>(null)
  const stagedTrackIdSet = React.useMemo(
    () => new Set(stagedTracks.map((track) => track.recommendation.id)),
    [stagedTracks],
  )

  React.useEffect(() => {
    const viewport = threadViewportRef.current
    if (!viewport) return

    const updateFollowLatest = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      followLatestRef.current = distanceFromBottom < 120
    }

    updateFollowLatest()
    viewport.addEventListener('scroll', updateFollowLatest, { passive: true })

    return () => viewport.removeEventListener('scroll', updateFollowLatest)
  }, [])

  React.useEffect(() => {
    const viewport = threadViewportRef.current
    const content = threadContentRef.current
    if (!viewport || !content) return

    const scrollToBottom = (behavior: ScrollBehavior) => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      })
    }

    if (followLatestRef.current) {
      scrollToBottom(reduceMotion ? 'auto' : 'smooth')
    }

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      if (!followLatestRef.current) return
      scrollToBottom('auto')
    })

    observer.observe(content)

    return () => observer.disconnect()
  }, [pendingReplies, reduceMotion, entries])

  React.useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  React.useEffect(() => {
    const readyEntries = entries.filter((entry) => entry.music?.status === 'ready' && entry.music.recommendations.length > 0)

    readyEntries.forEach((entry) => {
      const topRecommendation = entry.music?.recommendations[0]
      if (!topRecommendation) return

      const toastKey = `${entry.id}:${topRecommendation.id}`
      if (announcedMusicToastKeysRef.current.has(toastKey)) return
      announcedMusicToastKeysRef.current.add(toastKey)

      const sourceUrl = topRecommendation.sourceUrl ?? null
      const sourceLabel = sourceUrl ? buildMusicSourceLabel(sourceUrl) : 'Open source'

      toast.custom(
        (toastId) => (
          <MusicPlayNotification
            recommendation={topRecommendation}
            sourceLabel={sourceLabel}
            onPlayPreview={() => {
              if (typeof window !== 'undefined') {
                window.open(topRecommendation.previewUrl, '_blank', 'noopener,noreferrer')
              }
              toast.dismiss(toastId)
            }}
            onOpenSource={
              sourceUrl
                ? () => {
                    if (typeof window !== 'undefined') {
                      window.open(sourceUrl, '_blank', 'noopener,noreferrer')
                    }
                    toast.dismiss(toastId)
                  }
                : undefined
            }
          />
        ),
        {
          duration: 12000,
        },
      )
    })
  }, [entries])

  React.useEffect(() => {
    return () => {
      requestControllersRef.current.forEach((controller) => controller.abort())
      requestControllersRef.current = []
    }
  }, [])

  React.useEffect(() => {
    if (!projectId) return

    const savedEntries = initialEditorState?.entries || readLocalStorageJSON<ChatEntry[]>(chatEntriesStorageKey(projectId)) || []
    const savedPreference = initialEditorState?.musicPreference || readLocalStorageJSON<MusicPreference>(musicPreferenceStorageKey(projectId))
    const savedQueue = initialEditorState?.stagedTracks || readLocalStorageJSON<StagedMusicTrack[]>(stagedMusicStorageKey(projectId))
    const savedPreviewVolume = readLocalStorageJSON<number>(musicPreviewVolumeStorageKey(projectId))
    const nextPreference = normalizeMusicPreference(savedPreference, initialPrompt)

    setEntries(savedEntries)
    setMusicPreference(nextPreference)
    setStagedTracks(Array.isArray(savedQueue) ? savedQueue : [])
    const nextPreviewVolume = clampMusicPreviewVolume(
      typeof savedPreviewVolume === 'number' ? savedPreviewVolume : DEFAULT_MUSIC_PREVIEW_VOLUME,
    )
    musicPreviewVolumeRef.current = nextPreviewVolume
    setMusicPreviewVolume(nextPreviewVolume)
    setMusicStorageReady(true)
  }, [initialPrompt, projectId, initialEditorState])

  React.useEffect(() => {
    if (!musicStorageReady) return
    writeLocalStorageJSON(musicPreferenceStorageKey(projectId), musicPreference)
  }, [musicPreference, musicStorageReady, projectId])

  React.useEffect(() => {
    if (!musicStorageReady) return
    writeLocalStorageJSON(chatEntriesStorageKey(projectId), toStoredChatEntries(entries))
  }, [entries, musicStorageReady, projectId])

  React.useEffect(() => {
    if (!musicStorageReady || !onSave) return

    const timeoutId = window.setTimeout(() => {
      onSave({
        entries,
        musicPreference,
        stagedTracks,
      })
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [entries, musicPreference, stagedTracks, musicStorageReady, onSave])

  React.useEffect(() => {
    if (!musicStorageReady) return
    writeLocalStorageJSON(stagedMusicStorageKey(projectId), stagedTracks)
  }, [musicStorageReady, projectId, stagedTracks])

  React.useEffect(() => {
    if (!musicStorageReady) return
    writeLocalStorageJSON(musicPreviewVolumeStorageKey(projectId), musicPreviewVolume)
  }, [musicPreviewVolume, musicStorageReady, projectId])

  React.useEffect(() => {
    if (!queuedPreviewRevision) return

    const timeoutId = window.setTimeout(() => {
      queuedPreviewRequestTokenRef.current = null
      setQueuedPreviewRevision(null)
    }, 8500)

    return () => window.clearTimeout(timeoutId)
  }, [queuedPreviewRevision])

  React.useEffect(() => {
    return () => {
      previewAudioRef.current?.pause()
      previewAudioRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio()
    }

    const audio = previewAudioRef.current
    if (!activePreviewTrack) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      return
    }

    audio.loop = true
    audio.preload = 'auto'
    audio.volume = musicPreviewVolumeRef.current
    audio.src = activePreviewTrack.previewUrl
    audio.load()

    if (previewPlaying) {
      void audio.play().catch(() => {
        setPreviewPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [activePreviewTrack, previewPlaying])

  React.useEffect(() => {
    return () => {
      if (musicPreviewToggleCooldownRef.current !== null) {
        window.clearTimeout(musicPreviewToggleCooldownRef.current)
        musicPreviewToggleCooldownRef.current = null
      }
    }
  }, [])

  const armMusicPreviewToggleCooldown = React.useCallback(() => {
    if (musicPreviewToggleCooldownRef.current !== null) {
      window.clearTimeout(musicPreviewToggleCooldownRef.current)
    }

    musicPreviewToggleCooldownRef.current = window.setTimeout(() => {
      musicPreviewToggleCooldownRef.current = null
    }, 220)
  }, [])

  React.useEffect(() => {
    musicPreviewVolumeRef.current = musicPreviewVolume
    if (!previewAudioRef.current) return
    previewAudioRef.current.volume = musicPreviewVolume
  }, [musicPreviewVolume])

  const flashReplyHighlight = React.useCallback((entryId: string) => {
    if (replyHighlightTimerRef.current) {
      window.clearTimeout(replyHighlightTimerRef.current)
      replyHighlightTimerRef.current = null
    }

    setHighlightedEntryId(entryId)
    replyHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEntryId((current) => (current === entryId ? null : current))
      replyHighlightTimerRef.current = null
    }, 1600)
  }, [])

  React.useEffect(() => {
    return () => {
      if (replyHighlightTimerRef.current) {
        window.clearTimeout(replyHighlightTimerRef.current)
        replyHighlightTimerRef.current = null
      }
    }
  }, [])

  React.useEffect(() => {
    if (!activePreviewTrack) return

    const cardNode = musicCardRefs.current.get(activePreviewTrack.id)
    if (!cardNode) return

    cardNode.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }, [activePreviewTrack, reduceMotion])

  React.useEffect(() => {
    const pendingEntryId = pendingReplyScrollEntryIdRef.current
    if (!pendingEntryId) return
    if (isComposerThreadOpen) {
      pendingReplyScrollEntryIdRef.current = null
      return
    }

    const entryNode = chatEntryRefs.current.get(pendingEntryId)
    if (!entryNode) return

    entryNode.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    })
    flashReplyHighlight(pendingEntryId)
    pendingReplyScrollEntryIdRef.current = null
  }, [entries, flashReplyHighlight, isComposerThreadOpen, reduceMotion])

  const stopPendingReplies = React.useCallback(() => {
    requestControllersRef.current.forEach((controller) => controller.abort())
    requestControllersRef.current = []
    setPendingReplies(0)
  }, [])

  const mergeEntryInState = React.useCallback((entryId: string, updater: (entry: ChatEntry) => ChatEntry) => {
    setEntries((current) => {
      const next = current.map((entry) => (entry.id === entryId ? updater(entry) : entry))
      entriesRef.current = next
      return next
    })
  }, [])

  const removeEntryInState = React.useCallback((entryId: string) => {
    setEntries((current) => {
      const next = removeChatEntry(current, entryId)
      entriesRef.current = next
      return next
    })
  }, [])

  const addPendingChatAttachments = React.useCallback((files: FileList | null) => {
    const nextFiles = Array.from(files ?? []).filter((file) => file.type.startsWith('image/')).slice(0, 4)
    if (!nextFiles.length) return

    void Promise.all(nextFiles.map(readImageAttachment))
      .then((nextAttachments) => {
        const cleanAttachments = nextAttachments.filter((attachment): attachment is ChatAttachment => Boolean(attachment))
        if (!cleanAttachments.length) return
        setPendingChatAttachments((current) => [...current, ...cleanAttachments].slice(-4))
      })
      .catch(() => {
        toast.error('That image could not be attached. Try a smaller visual reference.')
      })
  }, [])

  const removePendingChatAttachment = React.useCallback((id: string) => {
    setPendingChatAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }, [])

  const recentPostingFiles = React.useMemo<RecentPostingFile[]>(() => {
    const storedProjects = typeof window === 'undefined' ? [] : projects.list()
    // TODO: Backend — Fetch real projects and videos from Supabase
    const mapped = storedProjects.slice(0, 8).map((item, index) => ({
      id: item.id,
      title: item.title || 'Untitled Project',
      projectTitle: item.title || 'Untitled Project',
      durationLabel: ['0:42', '1:18', '2:04', '0:56'][index % 4] ?? '0:45',
      updatedLabel: formatRecentFileTime(item.updatedAt),
      topic: item.title || projectTitle || 'your project',
      thumbnailUrl: item.thumbnailUrl || null,
    }))

    if (!mapped.some((item) => item.id === projectId)) {
      mapped.unshift({
        id: projectId,
        title: projectTitle || 'Current edit',
        projectTitle: projectTitle || 'Current edit',
        durationLabel: '0:58',
        updatedLabel: 'Current edit',
        topic: projectTitle || 'your current edit',
        thumbnailUrl: null,
      })
    }

    return mapped.slice(0, 6)
  }, [projectId, projectTitle])

  const postingProjectGroups = React.useMemo<PostingProjectGroup[]>(() => {
    // TODO: Backend — Fetch real projects and videos from Supabase
    const baseVideos = recentPostingFiles.length > 0 ? recentPostingFiles : [
      {
        id: `${projectId}-fallback`,
        title: projectTitle || 'Current edit',
        projectTitle: projectTitle || 'Current edit',
        durationLabel: '0:58',
        updatedLabel: 'Current edit',
        topic: projectTitle || 'your current edit',
        thumbnailUrl: null,
      },
    ]

    return [
      {
        id: 'current-project',
        title: projectTitle || 'Current project',
        videos: baseVideos.slice(0, 3).map((video, index) => ({
          ...video,
          id: `${video.id}-current-${index}`,
          projectTitle: projectTitle || 'Current project',
        })),
      },
      {
        id: 'launch-cuts',
        title: 'Launch Cuts',
        videos: [0, 1, 2, 3].map((index) => ({
          id: `launch-cut-${index}`,
          title: ['Founder story reel', 'Product teaser', 'Motion breakdown', 'Client proof'][index] ?? 'Launch cut',
          projectTitle: 'Launch Cuts',
          durationLabel: ['0:36', '1:04', '0:48', '1:22'][index] ?? '0:45',
          updatedLabel: [`Edited ${index + 1}h ago`][0],
          topic: ['founder story', 'product teaser', 'motion design workflow', 'client proof'][index] ?? 'launch cut',
          thumbnailUrl: baseVideos[index % baseVideos.length]?.thumbnailUrl ?? null,
        })),
      },
      {
        id: 'client-social',
        title: 'Client Social Package',
        videos: [0, 1, 2].map((index) => ({
          id: `client-social-${index}`,
          title: ['Vertical hero cut', 'Behind the scenes', 'Caption-first short'][index] ?? 'Client social video',
          projectTitle: 'Client Social Package',
          durationLabel: ['0:29', '0:52', '0:41'][index] ?? '0:45',
          updatedLabel: [`Edited ${index + 2}d ago`][0],
          topic: ['vertical launch video', 'behind the scenes', 'caption-first short'][index] ?? 'client video',
          thumbnailUrl: baseVideos[(index + 1) % baseVideos.length]?.thumbnailUrl ?? null,
        })),
      },
    ]
  }, [projectId, projectTitle, recentPostingFiles])

  const findActivePostingEntry = React.useCallback(() => {
    return [...entriesRef.current]
      .reverse()
      .find((entry) => entry.posting && entry.posting.status !== 'success')
  }, [])

  const confirmPostingFile = React.useCallback((entryId: string, fileId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const selectedVideo = entry.posting.files.find((file) => file.id === fileId) ?? entry.posting.files[0] ?? null
      return {
        ...entry,
        status: 'ready',
        text: 'Post this video?',
        posting: {
          ...entry.posting,
          status: 'confirm',
          selectedFileId: fileId,
          selectedVideo,
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const rejectPostingFile = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const nextIndex = entry.posting.activeFileIndex + 1
      if (nextIndex >= entry.posting.files.length) {
        return {
          ...entry,
          status: 'ready',
          text: 'Please tell me which project you would like to post.',
          posting: {
            ...entry.posting,
            note: 'Please tell me which project you would like to post.',
          },
        }
      }
      return {
        ...entry,
        posting: {
          ...entry.posting,
          activeFileIndex: nextIndex,
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const selectPostingVideo = React.useCallback((entryId: string, video: RecentPostingFile) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const selectedVideo = normalizePostingVideo(video)
      return {
        ...entry,
        status: 'ready',
        text: 'Post this video?',
        posting: {
          ...entry.posting,
          status: 'confirm',
          selectedFileId: selectedVideo.id,
          selectedVideo,
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const changePostingVideo = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      return {
        ...entry,
        status: 'ready',
        text: 'Choose the video you want to post.',
        posting: {
          ...entry.posting,
          status: 'browser',
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const confirmPostingVideo = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const selectedVideo = entry.posting.selectedVideo ?? entry.posting.files[0] ?? null
      return {
        ...entry,
        status: 'ready',
        text: 'I generated platform-specific caption previews. Approve each one before posting.',
        posting: {
          ...entry.posting,
          status: 'captions',
          selectedVideo,
          captions: selectedVideo ? buildCaptionDrafts(selectedVideo) : entry.posting.captions,
          captionGenerating: false,
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const generatePostingCaptions = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      return {
        ...entry,
        posting: {
          ...entry.posting,
          captionGenerating: true,
        },
      }
    })

    window.setTimeout(() => {
      mergeEntryInState(entryId, (entry) => {
        if (!entry.posting?.selectedVideo) return entry
        // TODO: Backend — AI caption generation per platform
        return {
          ...entry,
          posting: {
            ...entry.posting,
            captions: buildCaptionDrafts(entry.posting.selectedVideo),
            captionGenerating: false,
          },
        }
      })
    }, 650)
  }, [mergeEntryInState])

  const updatePostingCaption = React.useCallback((entryId: string, platform: SocialPostingPlatform, value: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const currentDraft = entry.posting.captions[platform] ?? {
        text: '',
        variationIndex: 0,
        approved: false,
      }
      return {
        ...entry,
        posting: {
          ...entry.posting,
          captions: {
            ...entry.posting.captions,
            [platform]: {
              ...currentDraft,
              text: value,
              approved: false,
            },
          },
        },
      }
    })
  }, [mergeEntryInState])

  const regeneratePostingCaption = React.useCallback((entryId: string, platform: SocialPostingPlatform) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting?.selectedVideo) return entry
      const currentDraft = entry.posting.captions[platform] ?? {
        text: '',
        variationIndex: 0,
        approved: false,
      }
      const nextVariationIndex = currentDraft.variationIndex + 1
      // TODO: Backend — AI caption generation per platform
      return {
        ...entry,
        posting: {
          ...entry.posting,
          captions: {
            ...entry.posting.captions,
            [platform]: {
              text: buildMockCaption(platform, entry.posting.selectedVideo.topic, nextVariationIndex),
              variationIndex: nextVariationIndex,
              approved: false,
            },
          },
        },
      }
    })
  }, [mergeEntryInState])

  const togglePostingCaptionApproval = React.useCallback((entryId: string, platform: SocialPostingPlatform) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const currentDraft = entry.posting.captions[platform]
      if (!currentDraft) return entry
      return {
        ...entry,
        posting: {
          ...entry.posting,
          captions: {
            ...entry.posting.captions,
            [platform]: {
              ...currentDraft,
              approved: !currentDraft.approved,
            },
          },
        },
      }
    })
  }, [mergeEntryInState])

  const proceedPostingPlatforms = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      return {
        ...entry,
        status: 'ready',
        text: 'Which platforms would you like to post to?',
        posting: {
          ...entry.posting,
          status: 'platforms',
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const reviewPostingAccounts = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      return {
        ...entry,
        status: 'ready',
        text: 'Checking account connections before posting.',
        posting: {
          ...entry.posting,
          status: 'accounts',
          note: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const openSocialSettings = React.useCallback(() => {
    window.open('/settings/social-accounts', '_blank', 'noopener,noreferrer')
  }, [])

  const togglePostingPlatform = React.useCallback((entryId: string, platform: SocialPostingPlatform | 'all') => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      const allPlatforms = POSTING_PLATFORMS.map((item) => item.id)
      const selectedPlatforms =
        platform === 'all'
          ? entry.posting.selectedPlatforms.length === allPlatforms.length
            ? []
            : allPlatforms
          : entry.posting.selectedPlatforms.includes(platform)
            ? entry.posting.selectedPlatforms.filter((item) => item !== platform)
            : [...entry.posting.selectedPlatforms, platform]

      return {
        ...entry,
        posting: {
          ...entry.posting,
          selectedPlatforms,
        },
      }
    })
  }, [mergeEntryInState])

  const completePostingMock = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting || entry.posting.selectedPlatforms.length === 0) return entry
      const postingResults = entry.posting.selectedPlatforms.reduce<Partial<Record<SocialPostingPlatform, SocialPostingResult>>>((results, platformId) => {
        results[platformId] = {
          status: 'posting',
          progress: 0,
        }
        return results
      }, {})
      return {
        ...entry,
        status: 'loading',
        text: 'Preparing your post...',
        posting: {
          ...entry.posting,
          status: 'preparing',
          postingResults,
        },
      }
    })

    const selectedPlatforms =
      entriesRef.current.find((entry) => entry.id === entryId)?.posting?.selectedPlatforms ?? []

    selectedPlatforms.forEach((platformId, index) => {
      window.setTimeout(() => {
        mergeEntryInState(entryId, (entry) => {
          if (!entry.posting) return entry
          return {
            ...entry,
            posting: {
              ...entry.posting,
              postingResults: {
                ...entry.posting.postingResults,
                [platformId]: {
                  ...(entry.posting.postingResults?.[platformId] ?? { status: 'posting' as const }),
                  status: 'posting',
                  progress: 55,
                },
              },
            },
          }
        })
      }, 900 + index * 450)

      window.setTimeout(() => {
        mergeEntryInState(entryId, (entry) => {
          if (!entry.posting) return entry
          const platform = getPostingPlatform(platformId)
          // TODO: Backend — Actual social media API posting
          const failed = Math.random() > 0.8
          return {
            ...entry,
            posting: {
              ...entry.posting,
              postingResults: {
                ...entry.posting.postingResults,
                [platformId]: failed
                  ? {
                      status: 'failed',
                      progress: 100,
                      error: `${platform.label} API rate limited. Retry in 5 minutes.`,
                    }
                  : {
                      status: 'success',
                      progress: 100,
                      url: platform.mockUrl,
                    },
              },
            },
          }
        })
      }, 3000 + index * 550)
    })

    window.setTimeout(() => {
      mergeEntryInState(entryId, (entry) => {
        if (!entry.posting) return entry
        return {
          ...entry,
          status: 'ready',
          text: 'Posting finished.',
          posting: {
            ...entry.posting,
            status: 'success',
          },
        }
      })
    }, 3500 + selectedPlatforms.length * 650)
  }, [mergeEntryInState])

  const donePostingMock = React.useCallback((entryId: string) => {
    mergeEntryInState(entryId, (entry) => {
      if (!entry.posting) return entry
      return {
        ...entry,
        status: 'ready',
        text: 'Posting workflow complete.',
        posting: {
          ...entry.posting,
          note: 'Posting workflow complete.',
          postingResults: undefined,
        },
      }
    })
  }, [mergeEntryInState])

  const collectRecentMusicTrackIds = React.useCallback(() => {
    const trackIds = new Set<string>()

    stagedTracks.forEach((track) => {
      if (track.recommendation.id) {
        trackIds.add(track.recommendation.id)
      }
    })

    entriesRef.current.forEach((entry) => {
      entry.music?.recommendations.slice(0, 3).forEach((recommendation) => {
        if (recommendation.id) {
          trackIds.add(recommendation.id)
        }
      })
    })

    return [...trackIds]
  }, [stagedTracks])

  const fetchMusicRecommendations = React.useCallback(
    async (
      query: string,
      signal: AbortSignal,
      musicPreferenceOverride?: Partial<MusicPreference> | null,
      variantHint?: string,
      recentlyUsedTrackIds?: string[],
    ) => {
      const response = await fetch('/api/music/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal,
        body: JSON.stringify({
          query,
          projectTitle,
          initialPrompt,
          musicPreference: musicPreferenceOverride ?? musicPreference,
          videoContext,
          variantHint,
          recentlyUsedTrackIds,
        }),
      })

      const payload = (await response.json().catch(() => null)) as MusicApiResponse | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to build music recommendations right now.')
      }

      return payload
    },
    [initialPrompt, musicPreference, projectTitle, videoContext],
  )

  const resolveMusicRecommendations = React.useCallback(
    async (
      query: string,
      signal: AbortSignal,
      musicPreferenceOverride?: Partial<MusicPreference> | null,
      variantHint?: string,
    ): Promise<{
      recommendations: MusicRecommendation[]
      preference: MusicPreference
      fallback: boolean
      confidence: number
      needsRefinement: boolean
      source: 'groq' | 'heuristic'
      contextSummary: string
      recommendationGroups: MusicRecommendationGroup[]
      profile: MusicSoundtrackProfile
      phases: MusicRecommendationPhase[]
      archiveCount: number
      profileModel?: string
      variantHint?: string
      reasoningSummary: string
    }> => {
      const contextConfidence = videoContext.confidence ?? 0.5
      const recentlyUsedTrackIds = collectRecentMusicTrackIds()
      const resolvedPreference = normalizeMusicPreference(
        musicPreferenceOverride ?? musicPreference,
        [query, projectTitle, initialPrompt].filter(Boolean).join(' '),
        videoContext,
      )
      const fallbackProfile = buildHeuristicSoundtrackProfile({
        query,
        projectTitle,
        initialPrompt,
        preference: musicPreferenceOverride ?? musicPreference,
        videoContext,
        variantHint,
      })
      try {
        const remoteResult = await fetchMusicRecommendations(query, signal, musicPreferenceOverride, variantHint, recentlyUsedTrackIds)
        return {
          recommendations: remoteResult?.recommendations ?? [],
          preference: resolvedPreference,
          fallback: remoteResult?.fallback ?? false,
          confidence: remoteResult?.confidence ?? contextConfidence,
          needsRefinement: remoteResult?.needsRefinement ?? contextConfidence < 0.55,
          source: remoteResult?.source ?? 'heuristic',
          contextSummary: remoteResult?.contextSummary ?? remoteResult?.reasoningSummary ?? fallbackProfile.reasoningSummary,
          recommendationGroups: remoteResult?.recommendationGroups ?? [],
          profile: remoteResult?.profile ?? fallbackProfile,
          phases: remoteResult?.phases ?? buildMusicAnalysisStages({
            profile: remoteResult?.profile ?? fallbackProfile,
            archiveCount: remoteResult?.archiveCount ?? MUSIC_CATALOG.length,
            videoContext,
            variantHint,
          }),
          archiveCount: remoteResult?.archiveCount ?? MUSIC_CATALOG.length,
          profileModel: remoteResult?.profileModel,
          variantHint: remoteResult?.variantHint ?? variantHint,
          reasoningSummary: remoteResult?.reasoningSummary ?? fallbackProfile.reasoningSummary,
        }
      } catch {
        const fallbackBundle = buildMusicRecommendationSet({
          query,
          projectTitle,
          initialPrompt,
          preference: musicPreferenceOverride ?? musicPreference,
          videoContext,
          variantHint,
          recentlyUsedTrackIds,
          catalog: MUSIC_CATALOG,
          limit: MUSIC_RECOMMENDATION_LIMIT,
        })

        return {
          recommendations: fallbackBundle.recommendations,
          preference: resolvedPreference,
          fallback: true,
          confidence: fallbackBundle.confidence ?? contextConfidence,
          needsRefinement: fallbackBundle.needsRefinement ?? contextConfidence < 0.55,
          source: fallbackBundle.source,
          contextSummary: fallbackBundle.reasoningSummary,
          recommendationGroups: fallbackBundle.recommendationGroups,
          profile: fallbackBundle.profile,
          phases: fallbackBundle.phases,
          archiveCount: fallbackBundle.archiveCount,
          variantHint: fallbackBundle.variantHint,
          reasoningSummary: fallbackBundle.reasoningSummary,
        }
      }
    },
    [collectRecentMusicTrackIds, fetchMusicRecommendations, initialPrompt, musicPreference, projectTitle, videoContext],
  )

  const togglePreviewTrack = React.useCallback((recommendation: MusicRecommendation) => {
    if (musicPreviewToggleCooldownRef.current !== null) return
    armMusicPreviewToggleCooldown()

    if (activePreviewTrack?.id === recommendation.id) {
      setPreviewPlaying((current) => !current)
      return
    }

    setActivePreviewTrack(recommendation)
    setPreviewPlaying(true)
  }, [activePreviewTrack, armMusicPreviewToggleCooldown])

  const stageTrack = React.useCallback((recommendation: MusicRecommendation) => {
    const isAlreadyStaged = stagedTracks.some((track) => track.recommendation.id === recommendation.id)
    if (isAlreadyStaged) {
      setStagedTracks((current) => current.filter((track) => track.recommendation.id !== recommendation.id))
      return
    }

    const nextStage: StagedMusicTrack = {
      id: `stage-${projectId}-${recommendation.id}`,
      projectId,
      recommendation,
      addedAt: new Date().toISOString(),
    }

    setStagedTracks((current) => {
      const next = [nextStage, ...current.filter((track) => track.recommendation.id !== recommendation.id)]
      return next
    })

    setMusicPreference({
      mood: recommendation.mood,
      energy: recommendation.energy,
      sourcePlatform: recommendation.sourcePlatform,
      updatedAt: new Date().toISOString(),
    })
  }, [projectId, stagedTracks])

  const handleDismissSpotlightTrack = React.useCallback((trackId: string) => {
    setDismissedSpotlightTrackId(trackId)

    if (activePreviewTrack?.id === trackId) {
      setPreviewPlaying(false)
      setActivePreviewTrack(null)
    }
  }, [activePreviewTrack])

  const refineMusicTrack = React.useCallback(
    async (entryId: string, toneKey: string) => {
      const preset = MUSIC_REFINEMENT_OPTIONS.find((option) => option.key === toneKey)
      if (!preset) return

      const entry = entriesRef.current.find((item) => item.id === entryId && item.music)
      if (!entry?.music) return

      const previousMusic = entry.music
      const controller = new AbortController()
      let requestTimedOut = false
      const requestTimeoutId = window.setTimeout(() => {
        requestTimedOut = true
        controller.abort()
      }, EDITOR_REQUEST_TIMEOUT_MS)
      requestControllersRef.current = [...requestControllersRef.current, controller]
      setPendingReplies((current) => current + 1)

      const nextPreference: Partial<MusicPreference> = {
        ...entry.music.preference,
        mood: toneKey === 'fresh' ? entry.music.preference.mood : preset.mood,
        energy: toneKey === 'fresh' ? entry.music.preference.energy : preset.energy,
        updatedAt: new Date().toISOString(),
      }

      mergeEntryInState(entryId, (currentEntry) => ({
        ...currentEntry,
        music: currentEntry.music
          ? {
              ...currentEntry.music,
              status: 'loading',
              preference: {
                ...currentEntry.music.preference,
                mood: toneKey === 'fresh' ? currentEntry.music.preference.mood : preset.mood,
                energy: toneKey === 'fresh' ? currentEntry.music.preference.energy : preset.energy,
                updatedAt: new Date().toISOString(),
              },
            }
          : currentEntry.music,
      }))

      pendingReplyScrollEntryIdRef.current = entryId

      try {
        const result = await resolveMusicRecommendations(entry.music.query, controller.signal, nextPreference, preset.variantHint ?? toneKey)
        if (controller.signal.aborted) {
          if (requestTimedOut) {
            toast.error('Music refinement timed out. Restored the previous recommendation.')
          }

          mergeEntryInState(entryId, (currentEntry) => ({
            ...currentEntry,
            music: previousMusic,
          }))
          return
        }

        setMusicPreference(result.preference)
        mergeEntryInState(entryId, (currentEntry) => ({
          ...currentEntry,
          status: 'ready',
          music: currentEntry.music
            ? {
                ...currentEntry.music,
                status: 'ready',
                preference: result.preference,
                recommendations: result.recommendations,
                fallback: result.fallback,
                confidence: result.confidence,
                needsRefinement: result.needsRefinement,
                source: result.source,
                contextSummary: result.contextSummary,
                reasoningSummary: result.reasoningSummary,
                recommendationGroups: result.recommendationGroups,
                profile: result.profile,
                phases: result.phases,
                archiveCount: result.archiveCount,
                profileModel: result.profileModel,
                variantHint: result.variantHint,
              }
            : currentEntry.music,
        }))
      } finally {
        window.clearTimeout(requestTimeoutId)
        requestControllersRef.current = requestControllersRef.current.filter(
          (activeController) => activeController !== controller,
        )
        setPendingReplies((current) => Math.max(0, current - 1))
      }
    },
    [mergeEntryInState, resolveMusicRecommendations, setMusicPreference],
  )

  const submitMessage = React.useCallback(
    async (
      rawValue: string,
      options?: {
        forceMusic?: boolean
        musicQuickAction?: boolean
        scrollToReply?: boolean
        showUserMessage?: boolean
        revisionRequest?: FrameAssistSubmission['revisionRequest'] | null
        attachments?: ChatAttachment[]
      },
    ) => {
      const nextValue = rawValue.trim()
      if (!nextValue) return

      const requestFrameReferences = buildChatFrameReferences(options?.revisionRequest ?? null)
      const requestAttachments = options?.attachments ?? []
      const shouldScrollToReply = options?.scrollToReply ?? true
      const shouldRecommendMusicCandidate = options?.forceMusic ?? isMusicIntent(nextValue)
      const shouldEditRequest = !options?.forceMusic && (isEditIntent(nextValue) || Boolean(options?.revisionRequest?.frameTarget))
      const shouldRecommendMusic = shouldEditRequest ? false : shouldRecommendMusicCandidate
      const taskBlock = classifyChatTask({
        input: nextValue,
        shouldEditRequest,
        shouldRecommendMusic,
      })
      const shouldShowUserMessage = options?.showUserMessage ?? true
      const musicContextConfidence = videoContext.confidence ?? 0.5
      const editPromptBasis = options?.revisionRequest?.instructionText?.trim() || nextValue
      const editStyleTemplate = shouldEditRequest
        ? selectedChatStyleTemplate ?? selectEditStyleTemplate(editPromptBasis, videoContext)
        : null
      const isBroadMusicRequest =
        shouldRecommendMusic &&
        (options?.musicQuickAction === true || isGenericMusicRequest(nextValue) || nextValue.length < 20)
      const assistantId = shouldRecommendMusic
        ? `assistant-music-${Date.now()}`
        : shouldEditRequest
          ? `assistant-edit-${Date.now()}`
          : `assistant-${Date.now()}`
      const loadingText = shouldRecommendMusic
        ? 'Pulling a few cues that match the current cut...'
        : shouldEditRequest
          ? `Starting ${editStyleTemplate?.name ?? 'the edit pass'} on the imported video...`
          : 'Shaping the next pass from the original direction...'
      const musicReply = shouldRecommendMusic
        ? buildMusicReply({
            projectTitle,
            sourceCount: initialSources.length,
            videoContext,
          })
        : ''
      const editReplyFallback =
        shouldEditRequest && editStyleTemplate
          ? buildEditAssistantReply({
              projectTitle,
              sourceCount: initialSources.length,
              styleTemplate: editStyleTemplate,
              prompt: editPromptBasis,
              videoContext,
            })
          : ''
      const loadingMusicProfile = shouldRecommendMusic
        ? buildHeuristicSoundtrackProfile({
            query: nextValue,
            projectTitle,
            initialPrompt,
            preference: musicPreference,
            videoContext,
            variantHint: isBroadMusicRequest ? 'fresh' : undefined,
          })
        : null
      const loadingMusicPhases = shouldRecommendMusic && loadingMusicProfile
        ? buildMusicAnalysisStages({
            profile: loadingMusicProfile,
            archiveCount: MUSIC_CATALOG.length,
            videoContext,
            variantHint: isBroadMusicRequest ? 'fresh' : undefined,
          })
        : []

      const baseEntries = entriesRef.current.filter((entry) => entry.status !== 'loading')
      const userMetadata =
        requestAttachments.length || requestFrameReferences.length || selectedChatStyleTemplate
          ? {
              ...(requestAttachments.length ? { attachments: requestAttachments } : {}),
              ...(requestFrameReferences.length ? { frames: requestFrameReferences } : {}),
              ...(selectedChatStyleTemplate
                ? {
                    selectedStyle: {
                      id: selectedChatStyleTemplate.id,
                      name: selectedChatStyleTemplate.name,
                      description: selectedChatStyleTemplate.description,
                    },
                  }
                : {}),
            }
          : undefined
      const userEntry: ChatEntry | null = shouldShowUserMessage
        ? {
            id: `user-${Date.now()}`,
            role: 'user',
            text: nextValue,
            metadata: userMetadata,
          }
        : null
      const displayEntries = userEntry ? [...baseEntries, userEntry] : baseEntries
      const activePostingEntry = findActivePostingEntry()

      if (activePostingEntry?.posting?.status === 'confirm' && shouldShowUserMessage) {
        entriesRef.current = displayEntries
        setEntries(displayEntries)
        pendingReplyScrollEntryIdRef.current = activePostingEntry.id

        if (isPostingConfirm(nextValue)) {
          confirmPostingVideo(activePostingEntry.id)
          return
        }

        if (isPostingReject(nextValue)) {
          changePostingVideo(activePostingEntry.id)
          return
        }
      }

      if (!shouldEditRequest && !shouldRecommendMusic && isPostingIntent(nextValue)) {
        const temporalReference = hasPostingTemporalReference(nextValue)
        const postingAssistant: ChatEntry = {
          id: `assistant-posting-${Date.now()}`,
          role: 'assistant',
          text: temporalReference
            ? 'I found a temporal reference. Pick the exact video from your recent edits or project library.'
            : 'I can help you publish your work. Pick the video you want to post.',
          status: 'ready',
          posting: {
            status: 'browser',
            files: recentPostingFiles,
            projects: postingProjectGroups,
            activeFileIndex: 0,
            selectedFileId: null,
            selectedVideo: null,
            selectedPlatforms: [],
            captions: {},
          },
        }
        const nextEntries = [...displayEntries, postingAssistant]
        entriesRef.current = nextEntries
        setEntries(nextEntries)
        pendingReplyScrollEntryIdRef.current = postingAssistant.id
        return
      }

      const messageHistory = [
        ...baseEntries.map((entry) => ({
          role: entry.role,
          text: entry.text,
        })),
        { role: 'user' as const, text: nextValue },
      ]
      const loadingAssistant: ChatEntry = {
        id: assistantId,
        role: 'assistant',
        text: shouldRecommendMusic ? musicReply : loadingText,
        status: 'loading',
        task: taskBlock,
        music: shouldRecommendMusic
          ? {
              status: 'loading',
              query: nextValue,
              preference: musicPreference,
              recommendations: [],
              recommendationGroups: [],
              phases: loadingMusicPhases,
              profile: loadingMusicProfile ?? buildHeuristicSoundtrackProfile({
                query: nextValue,
                projectTitle,
                initialPrompt,
                preference: musicPreference,
                videoContext,
                variantHint: isBroadMusicRequest ? 'fresh' : undefined,
              }),
              archiveCount: MUSIC_CATALOG.length,
              source: 'heuristic',
              fallback: true,
              variantHint: isBroadMusicRequest ? 'fresh' : undefined,
              confidence: musicContextConfidence,
              needsRefinement: isBroadMusicRequest || musicContextConfidence < 0.55,
              contextSummary: loadingMusicProfile?.reasoningSummary ?? videoContext.summary,
              reasoningSummary: loadingMusicProfile?.reasoningSummary ?? videoContext.summary,
            }
          : undefined,
      }

      const nextEntries = [...displayEntries, loadingAssistant]
      entriesRef.current = nextEntries
      setEntries(nextEntries)
      if (shouldRecommendMusic || shouldScrollToReply) {
        pendingReplyScrollEntryIdRef.current = assistantId
      }

      setPendingReplies((current) => current + 1)

      if (shouldEditRequest && editStyleTemplate) {
        try {
          void onEditRequest?.({
            prompt: editPromptBasis,
            styleTemplate: editStyleTemplate,
          })
        } catch {
          // The edit reply can still stream even if the job staging signal fails.
        }
      }

      const controller = new AbortController()
      let requestTimedOut = false
      let chatTaskCompleted = shouldRecommendMusic
      let musicTaskCompleted = !shouldRecommendMusic
      const requestTimeoutId = window.setTimeout(() => {
        requestTimedOut = true
        controller.abort()
      }, EDITOR_REQUEST_TIMEOUT_MS)
      requestControllersRef.current = [...requestControllersRef.current, controller]
      let replyResolved = shouldRecommendMusic
      let latestReplyText = shouldRecommendMusic ? musicReply : loadingText

      try {
        const chatTask = shouldRecommendMusic
          ? Promise.resolve()
          : (async () => {
            try {
              const endpoint = shouldEditRequest ? '/api/chat' : '/api/prometheus-chat'
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                cache: 'no-store',
                signal: controller.signal,
                body: JSON.stringify(
                  shouldEditRequest
                    ? {
                        projectTitle,
                        originalPrompt: initialPrompt,
                        initialSources,
                        videoContext,
                        stream: true,
                        workflow: 'edit',
                        messages: messageHistory,
                        revisionRequest: options?.revisionRequest ?? null,
                        frameReferences: requestFrameReferences,
                        attachments: requestAttachments,
                        selectedStyleTemplate: selectedChatStyleTemplate
                          ? {
                              id: selectedChatStyleTemplate.id,
                              name: selectedChatStyleTemplate.name,
                              description: selectedChatStyleTemplate.description,
                              tags: selectedChatStyleTemplate.tags,
                            }
                          : null,
                      }
                    : {
                        message: nextValue,
                        messages: messageHistory,
                        projectId,
                        projectTitle,
                        originalPrompt: initialPrompt,
                        initialSources,
                        videoContext,
                        frameReferences: requestFrameReferences,
                        attachments: requestAttachments,
                        selectedStyleTemplate: selectedChatStyleTemplate
                          ? {
                              id: selectedChatStyleTemplate.id,
                              name: selectedChatStyleTemplate.name,
                              description: selectedChatStyleTemplate.description,
                              tags: selectedChatStyleTemplate.tags,
                            }
                          : null,
                        verbosity: 'brief',
                      },
                ),
              })

              if (shouldEditRequest) {
                if (!response.ok) {
                  const payload = (await response.json().catch(() => null)) as ChatApiResponse | null
                  throw new Error(
                    payload?.error?.trim() ||
                      `Chat request failed with ${response.status} ${response.statusText}.`,
                  )
                }

                if (!response.body) {
                  throw new Error('Chat stream was empty.')
                }

                const streamedReply = await readChatStreamText(response, controller.signal, (partialText) => {
                  latestReplyText = partialText || loadingText
                  mergeEntryInState(assistantId, (entry) => ({
                    ...entry,
                    text: latestReplyText,
                    status: 'loading',
                  }))
                })

                if (controller.signal.aborted) return

                const finalReply = sanitizeAssistantReply(streamedReply) || editReplyFallback || loadingText
                latestReplyText = finalReply
                replyResolved = Boolean(finalReply)
                chatTaskCompleted = true
                mergeEntryInState(assistantId, (entry) => ({
                  ...entry,
                  text: finalReply,
                  status: 'ready',
                  task: settleChatTask(entry.task),
                }))
                return
              }

              const payload = (await response.json().catch(() => null)) as ChatApiResponse | null
              const nextReply =
                typeof payload?.answer === 'string'
                  ? payload.answer.trim()
                  : typeof payload?.reply === 'string'
                    ? payload.reply.trim()
                    : ''
              const nextError = typeof payload?.error === 'string' ? payload.error.trim() : ''
              const nextSources = normalizeChatSources(payload?.sources)
              const nextToolCalls = normalizeChatToolCalls(payload?.toolCalls)
              const nextFrames = normalizeChatFrames(payload?.frames)
              const nextAttachments = normalizeChatAttachments(payload?.attachments)
              const responseMetadata =
                nextSources.length || nextToolCalls.length || nextFrames.length || nextAttachments.length
                  ? {
                      ...(nextSources.length ? { sources: nextSources } : {}),
                      ...(nextToolCalls.length ? { toolCalls: nextToolCalls } : {}),
                      ...(nextFrames.length ? { frames: nextFrames } : {}),
                      ...(nextAttachments.length ? { attachments: nextAttachments } : {}),
                    }
                  : undefined

              if (controller.signal.aborted) return

              if (response.ok && nextReply) {
                latestReplyText = nextReply
                replyResolved = true
                chatTaskCompleted = true
                mergeEntryInState(assistantId, (entry) => ({
                  ...entry,
                  text: nextReply,
                  status: 'ready',
                  task: settleChatTask(entry.task),
                  metadata: responseMetadata ? { ...entry.metadata, ...responseMetadata } : entry.metadata,
                }))
                return
              }

              const chatErrorText = nextError || 'Assistant could not answer right now.'
              latestReplyText = chatErrorText
              replyResolved = true
              chatTaskCompleted = true
              mergeEntryInState(assistantId, (entry) => ({
                ...entry,
                text: chatErrorText,
                status: 'ready',
                task: settleChatTask(entry.task, true),
              }))
            } catch (error) {
              if (controller.signal.aborted) return

              const chatErrorText =
                error instanceof Error
                  ? error.message
                  : 'The assistant reply could not be completed right now.'

              if (shouldEditRequest) {
                const fallbackReply = sanitizeAssistantReply(editReplyFallback || chatErrorText || loadingText)
                latestReplyText = fallbackReply
                replyResolved = true
                chatTaskCompleted = true
                mergeEntryInState(assistantId, (entry) => ({
                  ...entry,
                  text: fallbackReply,
                  status: 'ready',
                  task: settleChatTask(entry.task),
                }))
                return
              }

              latestReplyText = chatErrorText
              replyResolved = true
              chatTaskCompleted = true
              mergeEntryInState(assistantId, (entry) => ({
                ...entry,
                text: chatErrorText,
                status: 'ready',
                task: settleChatTask(entry.task, true),
              }))
            }
          })()

        const musicTask = shouldRecommendMusic
            ? (async () => {
              const result = await resolveMusicRecommendations(
                nextValue,
                controller.signal,
                undefined,
                isBroadMusicRequest ? 'fresh' : undefined,
              )
              if (controller.signal.aborted) return

              setMusicPreference(result.preference)
              musicTaskCompleted = true
              mergeEntryInState(assistantId, (entry) => ({
                ...entry,
                status: 'ready',
                task: settleChatTask(entry.task),
                music: {
                  status: 'ready',
                  query: nextValue,
                  preference: result.preference,
                  recommendations: result.recommendations,
                  recommendationGroups: result.recommendationGroups ?? [],
                  phases: result.phases ?? [],
                  profile: result.profile,
                  archiveCount: result.archiveCount ?? MUSIC_CATALOG.length,
                  source: result.source,
                  fallback: result.fallback,
                  confidence: result.confidence,
                  needsRefinement: isBroadMusicRequest || result.needsRefinement,
                  contextSummary: result.contextSummary,
                  reasoningSummary: result.reasoningSummary,
                  profileModel: result.profileModel,
                  variantHint: result.variantHint,
                },
              }))
            })()
          : Promise.resolve()

        await Promise.allSettled([chatTask, musicTask])

        if (controller.signal.aborted) {
          if (!(chatTaskCompleted && musicTaskCompleted)) {
            if (requestTimedOut) {
              toast.error(
                shouldRecommendMusic
                  ? 'Music lookup timed out. Please try again.'
                  : 'That send request timed out. Please try again.',
              )
            }
            removeEntryInState(assistantId)
          }
          return
        }

        if (shouldEditRequest && !replyResolved) {
          const fallbackReply = sanitizeAssistantReply(editReplyFallback || latestReplyText || loadingText)
          latestReplyText = fallbackReply
          replyResolved = true
          chatTaskCompleted = true
          mergeEntryInState(assistantId, (entry) => ({
            ...entry,
            text: fallbackReply,
            status: 'ready',
            task: settleChatTask(entry.task),
          }))
          return
        }

        if (shouldRecommendMusic && !replyResolved) {
          latestReplyText = buildAssistantReply({
            projectTitle,
            originalPrompt: initialPrompt,
            sourceCount: initialSources.length,
            input: nextValue,
          })
          mergeEntryInState(assistantId, (entry) => ({
            ...entry,
            text: latestReplyText,
            status: 'ready',
            task: settleChatTask(entry.task),
          }))
        }
      } catch (error) {
        if (controller.signal.aborted) {
          removeEntryInState(assistantId)
          return
        }

        const assistantEntry: ChatEntry = {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'The assistant reply could not be completed right now.',
        }
        const withAssistantError = [...entriesRef.current, assistantEntry]
        entriesRef.current = withAssistantError
        setEntries(withAssistantError)
      } finally {
        window.clearTimeout(requestTimeoutId)
        requestControllersRef.current = requestControllersRef.current.filter(
          (activeController) => activeController !== controller,
        )
        setPendingReplies((current) => Math.max(0, current - 1))
      }
    },
    [
      initialPrompt,
      initialSources,
      changePostingVideo,
      confirmPostingVideo,
      findActivePostingEntry,
      onEditRequest,
      musicPreference,
      postingProjectGroups,
      projectId,
      projectTitle,
      mergeEntryInState,
      removeEntryInState,
      recentPostingFiles,
      resolveMusicRecommendations,
      selectedChatStyleTemplate,
      videoContext,
    ],
  )

  const handleSubmit = React.useCallback(
    async (submission: FrameAssistSubmission) => {
      const nextValue = submission.rawText.trim()
      if (!nextValue) return

      const enrichedRevisionRequest = submission.revisionRequest

      if (enrichedRevisionRequest.frameTarget) {
        const previewRequestToken = `preview-queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        queuedPreviewRequestTokenRef.current = previewRequestToken
        setQueuedPreviewRevision({
          requestId: previewRequestToken,
          request: enrichedRevisionRequest,
          queuedAt: new Date().toISOString(),
          etaMs: 2200,
          status: 'queueing',
        })

        void queuePreviewRevisionRequest(enrichedRevisionRequest)
          .then((queuedState) => {
            if (queuedPreviewRequestTokenRef.current !== previewRequestToken) return
            setQueuedPreviewRevision(queuedState)
          })
          .catch(() => {
            if (queuedPreviewRequestTokenRef.current !== previewRequestToken) return
            setQueuedPreviewRevision({
              requestId: `${previewRequestToken}-fallback`,
              request: enrichedRevisionRequest,
              queuedAt: new Date().toISOString(),
              etaMs: 2200,
              status: 'queued',
            })
          })
      }

      const outgoingAttachments = pendingChatAttachments
      void submitMessage(nextValue, {
        revisionRequest: enrichedRevisionRequest,
        attachments: outgoingAttachments,
      })
      setPendingChatAttachments([])
      setDraft('')
    },
    [pendingChatAttachments, submitMessage],
  )

  const clearQueuedPreviewRevision = React.useCallback(() => {
    queuedPreviewRequestTokenRef.current = null
    setQueuedPreviewRevision(null)
  }, [])

  React.useEffect(() => {
    if (!automationRequest) return
    if (handledAutomationRequestIdRef.current === automationRequest.id) return

    handledAutomationRequestIdRef.current = automationRequest.id
    setIsComposerOpen(true)
    setIsComposerThreadOpen(true)
    setDraft('')
    void submitMessage(automationRequest.prompt, {
      forceMusic: false,
      scrollToReply: true,
      showUserMessage: false,
    })
  }, [automationRequest, submitMessage])

  React.useEffect(() => {
    if (!clipRelayState) return

    setIsComposerOpen(true)
    setIsComposerThreadOpen(true)
    pendingReplyScrollEntryIdRef.current = clipRelayState.assistantId

    const nextAssistant: ChatEntry = {
      id: clipRelayState.assistantId,
      role: 'assistant',
      text:
        clipRelayState.clip.status === 'ready'
          ? 'The clipping pass is ready. I staged the strongest variants below.'
          : clipRelayState.clip.status === 'error'
            ? 'The clipping pass hit a backend issue, but I kept the visible source analysis here.'
            : 'I am clipping the current video into equal candidate windows and ranking the strongest cuts.',
      status: clipRelayState.clip.status === 'loading' ? 'loading' : 'ready',
      task: buildClipTaskBlock(clipRelayState.clip),
      clip: clipRelayState.clip,
    }

    setEntries((current) => {
      const existingAssistant = current.some((entry) => entry.id === clipRelayState.assistantId)
      const nextUser: ChatEntry = {
        id: clipRelayState.userId,
        role: 'user',
        text: clipRelayState.prompt,
      }

      const next = existingAssistant
        ? current.map((entry) => (entry.id === clipRelayState.assistantId ? nextAssistant : entry))
        : [...current.filter((entry) => entry.status !== 'loading'), nextUser, nextAssistant]

      entriesRef.current = next
      return next
    })
  }, [clipRelayState])

  const spotlightCandidateTrack = stagedTracks[0] ?? null
  const spotlightCandidateTrackId = spotlightCandidateTrack?.recommendation.id ?? null

  React.useEffect(() => {
    if (dismissedSpotlightTrackId && dismissedSpotlightTrackId !== spotlightCandidateTrackId) {
      setDismissedSpotlightTrackId(null)
    }
  }, [dismissedSpotlightTrackId, spotlightCandidateTrackId])

  const spotlightTrack =
    spotlightCandidateTrack && dismissedSpotlightTrackId !== spotlightCandidateTrackId
      ? spotlightCandidateTrack
      : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <LuxuryVignette tone="neutral" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-3 z-20 h-px bg-[linear-gradient(90deg,rgba(127,242,212,0)_0%,rgba(127,242,212,0.56)_24%,rgba(255,255,255,0.16)_50%,rgba(127,242,212,0.32)_76%,rgba(127,242,212,0)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-[linear-gradient(180deg,rgba(19,19,23,0.98)_0%,rgba(19,19,23,0.92)_38%,rgba(19,19,23,0)_100%)] blur-sm"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-[linear-gradient(180deg,rgba(19,19,23,0)_0%,rgba(19,19,23,0.9)_62%,rgba(19,19,23,1)_100%)] blur-sm"
        />
        <div ref={threadViewportRef} className="premium-scroll-mask h-full overflow-y-auto overscroll-contain px-4 py-4 pb-32">
          <div ref={threadContentRef} className="space-y-4 pr-2">
        <motion.div className="space-y-3">
          {isComposerThreadOpen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10, filter: 'blur(8px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[20px] border border-[#7ff2d4]/16 bg-[#7ff2d4]/[0.045] px-4 py-4 text-sm leading-6 text-white/62"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7ff2d4]/16 bg-black/24 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#d6fff7]/58">
                <span className="size-1.5 rounded-full bg-[#7ff2d4] shadow-[0_0_12px_rgba(127,242,212,0.7)]" />
                Expanded relay active
              </div>
              <p className="mt-3 text-white/52">
                Replies are streaming into the curved chat interface. The left rail is keeping the session controls available.
              </p>
            </motion.div>
          ) : entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              ref={(node) => {
                if (node) {
                  chatEntryRefs.current.set(entry.id, node)
                } else {
                  chatEntryRefs.current.delete(entry.id)
                }
              }}
              initial={reduceMotion ? false : 'hidden'}
              whileInView={reduceMotion ? undefined : 'visible'}
              exit={reduceMotion ? undefined : 'exit'}
              viewport={reduceMotion ? undefined : { root: threadViewportRef, once: false, amount: 0.35 }}
              variants={
                reduceMotion
                  ? undefined
                  : buildRevealVariants({
                      delay: 0.04 + index * 0.03,
                      distance: 22,
                      blur: 10,
                      scale: 0.98,
                      duration: 0.34,
                    })
              }
              className={cn(
                'relative scroll-mt-20 max-w-[94%] rounded-[18px] border px-4 py-3 text-sm leading-6 shadow-[0_24px_36px_-32px_rgba(0,0,0,0.72)]',
                entry.role === 'assistant'
                  ? 'border-white/8 bg-white/[0.03] text-white/74'
                  : 'ml-auto border-white/12 bg-white/[0.06] text-white',
              )}
            >
              <AnimatePresence initial={false}>
                {highlightedEntryId === entry.id ? (
                  <motion.div
                    aria-hidden
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            opacity: [0, 1, 0],
                            scale: [0.985, 1, 1.005],
                          }
                    }
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 1.55, ease: 'easeOut' }}
                    className="pointer-events-none absolute -inset-2 rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(127,242,212,0.24)_0%,rgba(127,242,212,0.12)_28%,rgba(127,242,212,0)_72%)] blur-2xl"
                  />
                ) : null}
              </AnimatePresence>
              {entry.role === 'assistant' ? (
                <div className="space-y-3">
                  {entry.status === 'loading' && !entry.music ? (
                    <InlineLoadingAnimation className="justify-start py-1" size={40} label="Prometheus is responding" />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 tracking-[0.01em] text-white/74">
                      {entry.text}
                    </p>
                  )}

                  {entry.music ? (
                    <div className="space-y-3 pt-1">
                      <MusicRecommendationShowcase
                        music={entry.music}
                        isPreviewing={(trackId) => activePreviewTrack?.id === trackId}
                        previewPlaying={previewPlaying}
                        stagedTrackIds={stagedTrackIdSet}
                        onPreviewToggle={togglePreviewTrack}
                        onAdd={stageTrack}
                        onRefine={(toneKey) => void refineMusicTrack(entry.id, toneKey)}
                        viewportRoot={threadViewportRef}
                        registerCardRef={(trackId, node) => {
                          if (node) {
                            musicCardRefs.current.set(trackId, node)
                          } else {
                            musicCardRefs.current.delete(trackId)
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                entry.text
              )}
            </motion.div>
          ))}
          <div ref={threadEndRef} className="h-1" />
        </motion.div>
        </div>
      </div>
      </div>

      {musicSpotlightPortalTarget && spotlightTrack
        ? createPortal(
            <AnimatePresence mode="wait" initial={false}>
              <MusicSpotlightOrb
                key={spotlightTrack.recommendation.id}
                recommendation={spotlightTrack.recommendation}
                status={
                  activePreviewTrack?.id === spotlightTrack.recommendation.id && previewPlaying
                    ? 'previewing'
                    : 'staged'
                }
                onDismiss={() => handleDismissSpotlightTrack(spotlightTrack.recommendation.id)}
              />
            </AnimatePresence>,
            musicSpotlightPortalTarget,
          )
        : null}

      {resolvedComposerPortalTarget
           ? createPortal(
              <>
                <FloatingChatComposer
                  projectId={projectId}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSubmit={handleSubmit}
                  onStop={stopPendingReplies}
                  loading={pendingReplies > 0}
                  reduceMotion={reduceMotion}
                  isOpen={isComposerOpen}
                  onOpenChange={setIsComposerOpen}
                  queuedPreviewRevision={queuedPreviewRevision}
                  onClearQueuedPreview={clearQueuedPreviewRevision}
                  conversationEntries={entries}
                  threadOpen={isComposerThreadOpen}
                  onThreadOpenChange={setIsComposerThreadOpen}
                  onConfirmPostingFile={confirmPostingFile}
                  onRejectPostingFile={rejectPostingFile}
                  onTogglePostingPlatform={togglePostingPlatform}
                  onSelectPostingVideo={selectPostingVideo}
                  onConfirmPostingVideo={confirmPostingVideo}
                  onChangePostingVideo={changePostingVideo}
                  onGeneratePostingCaptions={generatePostingCaptions}
                  onUpdatePostingCaption={updatePostingCaption}
                  onRegeneratePostingCaption={regeneratePostingCaption}
                  onTogglePostingCaptionApproval={togglePostingCaptionApproval}
                  onProceedPostingPlatforms={proceedPostingPlatforms}
                  onReviewPostingAccounts={reviewPostingAccounts}
                  onOpenSocialSettings={openSocialSettings}
                  onDonePosting={donePostingMock}
                  onPostNow={completePostingMock}
                  attachments={pendingChatAttachments}
                  activeStyleTemplate={selectedChatStyleTemplate}
                  onSelectStyleTemplate={(template) => setSelectedChatStyleId(template.id)}
                  onAttachImages={addPendingChatAttachments}
                  onRemoveAttachment={removePendingChatAttachment}
                />
              </>,
              resolvedComposerPortalTarget,
            )
          : null}    </div>
  )
})

type MobileEditorViewProps = {
  project: Project | null
  projectId: string
  projectTitle: string
  statusLabel: string
  saveStatus: 'saved' | 'saving' | 'error'
  job: ProcessingJob | null
  progressPercent: number
  sourceMetrics: ReturnType<typeof formatSourceProfileMetric> | null
  previewUrl: string
  previewKind: PreviewMediaKind
  hasPreviewMedia: boolean
  sourceLabel: string
  objectFit: 'cover' | 'contain'
  mediaTransformStyle?: React.CSSProperties
  currentTimeLabel: string
  durationLabel: string
  currentTimeSec: number
  durationSec: number
  previewPlaying: boolean
  previewMuted: boolean
  motionVideoRef: React.Ref<HTMLVideoElement>
  musicTracks: MusicRecommendation[]
  selectedMusicTrackId: string | null
  videoContext: MusicVideoContext
  initialPrompt: string
  initialSources: string[]
  latestExport: ProjectExport | null
  isExporting: boolean
  isDownloading: boolean
  clipRelayState: ClipRelayState | null
  automationRequest: ComposerAutomationRequest | null
  onBack: () => void
  onOpenUploadNewProject: () => void
  onTogglePlayback: () => void
  onSeekPreview: (timeSec: number) => void
  onVideoLoadedMetadata: React.ReactEventHandler<HTMLVideoElement>
  onVideoLoadedData: React.ReactEventHandler<HTMLVideoElement>
  onVideoCanPlay: React.ReactEventHandler<HTMLVideoElement>
  onVideoTimeUpdate: React.ReactEventHandler<HTMLVideoElement>
  onVideoEnded: React.ReactEventHandler<HTMLVideoElement>
  onVideoPlay: React.ReactEventHandler<HTMLVideoElement>
  onVideoPause: React.ReactEventHandler<HTMLVideoElement>
  onVideoError: React.ReactEventHandler<HTMLVideoElement>
  onImageLoaded: React.ReactEventHandler<HTMLImageElement>
  onApplyMotionPrompt: (prompt: string) => void
  onSelectMusicTrack: (track: MusicRecommendation) => void
  onEditRequest: (request: { prompt: string; styleTemplate: StyleTemplate }) => void
  onSave: (editorState: any) => Promise<void>
  onStartExport: (options?: { quality: MobileExportQuality; format: MobileExportFormat }) => void
  onDownloadLatest: () => void
}

function MobileEditorView({
  project,
  projectId,
  projectTitle,
  statusLabel,
  saveStatus,
  job,
  progressPercent,
  sourceMetrics,
  previewUrl,
  previewKind,
  hasPreviewMedia,
  sourceLabel,
  objectFit,
  mediaTransformStyle,
  currentTimeLabel,
  durationLabel,
  currentTimeSec,
  durationSec,
  previewPlaying,
  previewMuted,
  motionVideoRef,
  musicTracks,
  selectedMusicTrackId,
  videoContext,
  initialPrompt,
  initialSources,
  latestExport,
  isExporting,
  isDownloading,
  clipRelayState,
  automationRequest,
  onBack,
  onTogglePlayback,
  onSeekPreview,
  onVideoLoadedMetadata,
  onVideoLoadedData,
  onVideoCanPlay,
  onVideoTimeUpdate,
  onVideoEnded,
  onVideoPlay,
  onVideoPause,
  onVideoError,
  onImageLoaded,
  onApplyMotionPrompt,
  onSelectMusicTrack,
  onEditRequest,
  onSave,
  onStartExport,
  onDownloadLatest,
  onOpenUploadNewProject,
}: MobileEditorViewProps) {
  const activeTab = 'status' as MobileEditorTabKey
  const [chatComposerPortal, setChatComposerPortal] = React.useState<HTMLDivElement | null>(null)
  const [exportQuality, setExportQuality] = React.useState<MobileExportQuality>('standard')
  const [exportFormat, setExportFormat] = React.useState<MobileExportFormat>('mp4')
  const activeJobStep = getActiveJobStep(job)
  const isJobRunning = job?.status === 'running'
  const exportDate = formatMobileDate(latestExport?.completedAt ?? latestExport?.updatedAt ?? latestExport?.createdAt)
  const exportSize = formatMobileBytes(latestExport?.fileSizeBytes)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'music':
        return (
          <div className="h-full min-h-0">
            <MusicTabPanel
              tracks={musicTracks}
              projectTitle={projectTitle}
              selectedTrackId={selectedMusicTrackId}
              onSelectTrack={onSelectMusicTrack}
              variant="mobile"
            />
          </div>
        )
      case 'motion':
        return (
          <div className="relative h-full min-h-0">
            <MotionPropertyCanvas
              projectTitle={projectTitle}
              previewUrl={previewUrl}
              previewKind={previewKind}
              hasPreviewMedia={hasPreviewMedia}
              sourceLabel={sourceLabel}
              objectFit={objectFit}
              mediaTransformStyle={mediaTransformStyle}
              currentTimeLabel={currentTimeLabel}
              durationLabel={durationLabel}
              currentTimeSec={currentTimeSec}
              durationSec={durationSec}
              previewPlaying={previewPlaying}
              previewMuted={previewMuted}
              videoRef={motionVideoRef}
              onTogglePlayback={onTogglePlayback}
              onPickSource={onOpenUploadNewProject}
              onSeek={onSeekPreview}
              onVideoLoadedMetadata={onVideoLoadedMetadata}
              onVideoLoadedData={onVideoLoadedData}
              onVideoCanPlay={onVideoCanPlay}
              onVideoTimeUpdate={onVideoTimeUpdate}
              onVideoEnded={onVideoEnded}
              onVideoPlay={onVideoPlay}
              onVideoPause={onVideoPause}
              onVideoError={onVideoError}
              onImageLoaded={onImageLoaded}
              onApplyPrompt={onApplyMotionPrompt}
            />
          </div>
        )
      case 'chat':
        return (
          <div className="mobile-chat-panel relative h-full min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#101116]">
            <style>{`
              .mobile-chat-panel .whitespace-pre-wrap {
                background: linear-gradient(135deg, #ffffff 0%, #d6fff7 42%, #c7d2fe 100%);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
              }
            `}</style>
            <ChatWorkspacePanel
              key={`mobile-chat-${projectId}`}
              projectId={projectId}
              projectTitle={projectTitle}
              initialPrompt={initialPrompt}
              initialSources={initialSources}
              videoContext={videoContext}
              composerPortalTarget={chatComposerPortal}
              automationRequest={automationRequest}
              clipRelayState={clipRelayState}
              musicSpotlightPortalTarget={null}
              onEditRequest={onEditRequest}
              initialEditorState={project?.editorState}
              onSave={onSave}
            />
            <div ref={setChatComposerPortal} className="absolute inset-x-3 bottom-3 z-40" />
          </div>
        )
      case 'versions':
        return (
          <div className="h-full overflow-y-auto rounded-[24px] border border-white/8 bg-[#101116] p-3">
            {latestExport ? (
              <div className="flex min-h-[96px] gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] p-3">
                <div
                  className="h-20 w-28 shrink-0 rounded-[14px] border border-white/10 bg-black bg-cover bg-center"
                  style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{latestExport.preset || 'Latest export'}</div>
                  <div className="mt-1 text-xs text-white/48">{exportDate}</div>
                  <div className="mt-1 text-xs text-white/48">{exportSize}</div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={latestExport.status !== 'completed' || isDownloading}
                    onClick={onDownloadLatest}
                  >
                    {isDownloading ? <Sparkles className="size-4" /> : <Download className="size-4" />}
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[18rem] items-center justify-center text-center">
                <div>
                  <div className="text-base font-medium text-white/78">No exports yet</div>
                  <div className="mt-2 text-sm leading-6 text-white/44">Start an export when this cut is ready to share.</div>
                </div>
              </div>
            )}
          </div>
        )
      case 'export':
        return (
          <div className="h-full overflow-y-auto rounded-[24px] border border-white/8 bg-[#101116] p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">Quality</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['draft', 'standard', 'max'] as const).map((quality) => (
                <button
                  key={quality}
                  type="button"
                  onClick={() => setExportQuality(quality)}
                  className={cn(
                    'h-11 rounded-[16px] border text-sm capitalize transition-colors',
                    exportQuality === quality
                      ? 'border-[#6366f1]/60 bg-[#6366f1]/18 text-white'
                      : 'border-white/10 bg-white/[0.035] text-white/56',
                  )}
                >
                  {quality}
                </button>
              ))}
            </div>

            <div className="mt-6 text-[11px] uppercase tracking-[0.24em] text-white/40">Format</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(['mp4', 'mov'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setExportFormat(format)}
                  className={cn(
                    'h-11 rounded-[16px] border text-sm uppercase transition-colors',
                    exportFormat === format
                      ? 'border-[#6366f1]/60 bg-[#6366f1]/18 text-white'
                      : 'border-white/10 bg-white/[0.035] text-white/56',
                  )}
                >
                  {format}
                </button>
              ))}
            </div>

            <Button
              type="button"
              disabled={isExporting}
              onClick={() => onStartExport({ quality: exportQuality, format: exportFormat })}
              className="mt-6 h-12 w-full border-[#6366f1]/80 bg-[#6366f1] text-white shadow-[0_18px_54px_-24px_rgba(99,102,241,0.95)]"
            >
              {isExporting ? (
                <InlineLoadingAnimation size={16} label="Starting export" />
              ) : (
                <Download className="size-4" />
              )}
              {isExporting ? 'Starting export' : 'Start Export'}
            </Button>

            {(isExporting || latestExport?.status === 'processing' || latestExport?.status === 'pending') ? (
              <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Export progress</span>
                  <span>{latestExport?.status ?? 'queued'}</span>
                </div>
                <div className="mt-3">
                  <InlineLoadingAnimation
                    size={40}
                    label={`Export ${latestExport?.status ?? 'queued'}`}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      case 'status':
      default:
        return (
          <div className="h-full overflow-y-auto rounded-[24px] border border-white/8 bg-[#101116] p-4">
            {isJobRunning ? (
              <div className="rounded-[20px] border border-[#6366f1]/28 bg-[#6366f1]/12 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{activeJobStep?.title ?? activeJobStep?.key ?? 'AI task running'}</div>
                    <div className="mt-1 truncate text-xs text-white/52">{activeJobStep?.status ?? 'Processing'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <InlineLoadingAnimation size={24} label="AI task running" />
                    <div className="text-sm text-white/72">{progressPercent}%</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2">
              {[
                ['Duration', sourceMetrics?.duration ?? 'Unknown duration'],
                ['Resolution', sourceMetrics?.resolution ?? 'Unknown resolution'],
                ['File size', sourceMetrics?.fileSize ?? 'Unknown file size'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3">
                  <span className="text-xs text-white/42">{label}</span>
                  <span className="truncate text-sm text-white/78">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.025] p-4">
              <div className="text-sm font-medium text-white/82">Open on Desktop</div>
              <p className="mt-2 text-sm leading-6 text-white/46">For full editing power, switch to a desktop device.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#07070a] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(84,69,126,0.22)_0%,rgba(84,69,126,0.08)_26%,rgba(7,7,10,0)_58%),linear-gradient(180deg,rgba(16,14,24,0.78)_0%,rgba(7,7,10,1)_44%)]"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to projects"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/76"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-white">{projectTitle}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/42">
                {saveStatus === 'saving' ? (
                  <InlineLoadingAnimation size={14} label="Saving project" />
                ) : (
                  <CheckCircle2 className="size-3" />
                )}
                {saveStatus === 'saving' ? 'Saving' : saveStatus === 'error' ? 'Save issue' : 'Saved'}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenUploadNewProject}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-white/76"
              aria-label="Upload new video"
            >
              <Upload className="size-4" />
            </button>
            <div className="max-w-[8rem] truncate rounded-full border border-emerald-400/18 bg-emerald-400/8 px-3 py-1.5 text-[11px] text-emerald-100">
              {statusLabel}
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <section className="shrink-0 py-3">
            <div className="relative aspect-video max-h-[40vh] w-full overflow-hidden bg-black">
              {hasPreviewMedia && previewKind === 'video' ? (
                <MobileVideoPlayer
                  src={previewUrl}
                  poster={project?.thumbnailUrl ?? undefined}
                  className="h-full w-full"
                />
              ) : hasPreviewMedia ? (
                <div
                  className="h-full w-full bg-black bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${previewUrl})` }}
                  role="img"
                  aria-label={`${projectTitle} preview`}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenUploadNewProject}
                  aria-label="Upload a source video"
                  className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] border border-dashed border-white/12 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_42%),linear-gradient(180deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0.012)_100%)] px-6 text-center transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/24 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ff6e3]/55"
                >
                  <span className="pointer-events-none absolute inset-[14%] rounded-[18px] border border-white/8 opacity-70" />
                  <span className="relative grid size-14 place-items-center rounded-[20px] border border-white/12 bg-white/[0.06] text-white shadow-[0_18px_50px_-28px_rgba(159,246,227,0.55)] backdrop-blur-xl transition duration-300 group-hover:scale-[1.035]">
                    <Upload className="size-5" />
                  </span>
                </button>
              )}
            </div>
          </section>

        </main>

        <ContinueBanner />
      </div>
    </div>
  )
}

function OriginalEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedWorkspaceTab = normalizeWorkspaceTabParam(searchParams.get('tab'))
  const projectId = params.id
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const { setShowExport } = useEditor()

  const [project, setProject] = React.useState<Project | null>(null)
  const [job, setJob] = React.useState<ProcessingJob | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving' | 'error'>('saved')
  const [fitMode, setFitMode] = React.useState<PreviewFitMode>('fill')
  const [scale, setScale] = React.useState(100)
  const [offsetX, setOffsetX] = React.useState(0)
  const [offsetY, setOffsetY] = React.useState(0)
  const [previewPlaying, setPreviewPlaying] = React.useState(false)
  const [previewDurationSec, setPreviewDurationSec] = React.useState(0)
  const [previewCurrentTimeSec, setPreviewCurrentTimeSec] = React.useState(0)
  const [previewIntrinsicAspectRatio, setPreviewIntrinsicAspectRatio] = React.useState<number | null>(null)
  const [persistedPreviewUrl, setPersistedPreviewUrl] = React.useState<string | null>(null)
  const [handoffPreview, setHandoffPreview] = React.useState<SessionPreviewState | null>(null)
  const [sourceAssetLabel, setSourceAssetLabel] = React.useState<string | null>(null)
  const [isPreviewMediaReady, setIsPreviewMediaReady] = React.useState(false)
  const [isPreviewLoadingVisible, setIsPreviewLoadingVisible] = React.useState(false)
  const [isPreviewMuted, setIsPreviewMuted] = React.useState(true)
  const [isInlineSourceDragOver, setIsInlineSourceDragOver] = React.useState(false)
  const [previewFramePreset, setPreviewFramePreset] = React.useState<PreviewFramePreset>('source')
  const [bottomMode, setBottomMode] = React.useState<BottomMode>('Original')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<HeaderNavMode>(
    () => (requestedWorkspaceTab && requestedWorkspaceTab !== 'Motion' ? requestedWorkspaceTab : 'Editor'),
  )
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = React.useState(false)
  const [isNewProjectUploadOpen, setIsNewProjectUploadOpen] = React.useState(false)
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [tempTitle, setTempTitle] = React.useState('')
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const [latestExport, setLatestExport] = React.useState<ProjectExport | null>(null)

  React.useEffect(() => {
    if (!requestedWorkspaceTab) return

    if (requestedWorkspaceTab === 'Motion') {
      router.replace('/editor/motion')
      return
    }

    setActiveWorkspaceTab(requestedWorkspaceTab)
    setBottomMode(requestedWorkspaceTab === 'Music' ? 'Music' : 'Original')
  }, [requestedWorkspaceTab, router])

  React.useEffect(() => {
    const handleEditorCommand = (event: Event) => {
      const command = (event as CustomEvent<{ command?: string }>).detail?.command

      if (command === 'upload') {
        setIsNewProjectUploadOpen(true)
        return
      }

      if (command === 'ai' || command === 'enhance') {
        return
      }

      if (command === 'export') {
        setShowExport(true)
      }
    }

    window.addEventListener('prometheus:editor-command', handleEditorCommand)
    return () => window.removeEventListener('prometheus:editor-command', handleEditorCommand)
  }, [setShowExport])

  const handleTitleStartEdit = () => {
    setTempTitle(project?.title || '')
    setIsEditingTitle(true)
  }

  const handleTitleSave = async () => {
    if (!project) return
    const nextTitle = tempTitle.trim()
    if (!nextTitle || nextTitle === project.title) {
      setIsEditingTitle(false)
      return
    }

    // Small validation
    if (nextTitle.length > 100) {
      toast.error('Title is too long')
      return
    }

    try {
      setSaveStatus('saving')
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      })

      if (!res.ok) throw new Error('Failed to update title')

      const { project: updatedProject } = await res.json()
      setProject(updatedProject)
      upsertProject(updatedProject)
      setSaveStatus('saved')
      toast.success('Project renamed')
    } catch (err) {
      console.error('Title update failed:', err)
      setSaveStatus('error')
      toast.error('Failed to rename project')
    } finally {
      setIsEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setIsEditingTitle(false)
  }
  const [selectedEditorMusicTrackId, setSelectedEditorMusicTrackId] = React.useState<string | null>(null)
  const [viralClipTargetPlatform, setViralClipTargetPlatform] =
    React.useState<ViralClipTargetPlatform>(VIRAL_CLIP_PLATFORM_DEFAULT)
  const [viralClipClipPresetIndex, setViralClipClipPresetIndex] = React.useState(1)
  const [viralClipSplitPreviewActive, setViralClipSplitPreviewActive] = React.useState(false)
  const [viralClipSplitAnimationKey, setViralClipSplitAnimationKey] = React.useState(0)
  const [viralClipSplitPreviewAssets, setViralClipSplitPreviewAssets] =
    React.useState<SplitPreviewAssetState>(EMPTY_SPLIT_PREVIEW_ASSETS)
  const [isLockedViralClipTriggerHovered, setIsLockedViralClipTriggerHovered] = React.useState(false)
  const [clipRelayState, setClipRelayState] = React.useState<ClipRelayState | null>(null)
  const splitPreviewAssetCacheRef = React.useRef<Map<string, { leftUrl: string; rightUrl: string }>>(new Map())
  const previousPreviewFramePresetRef = React.useRef<PreviewFramePreset>(previewFramePreset)
  const previousFitModeRef = React.useRef<PreviewFitMode>(fitMode)
  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null)
  const previewPlaybackIntentRef = React.useRef<'playing' | 'paused'>('paused')
  const previewPlaybackCommandRef = React.useRef(0)
  const previewToggleCooldownRef = React.useRef<number | null>(null)
  const sourceFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [chatComposerPortal, setChatComposerPortal] = React.useState<HTMLDivElement | null>(null)
  const [musicSpotlightPortalTarget, setMusicSpotlightPortalTarget] = React.useState<HTMLDivElement | null>(null)
  const [composerAutomationRequest, setComposerAutomationRequest] = React.useState<ComposerAutomationRequest | null>(null)
  const inspectorViewportRef = React.useRef<HTMLDivElement | null>(null)
  const [isDeferredChromeReady, setIsDeferredChromeReady] = React.useState(false)
  const [isPreviewBriefGenerating, setIsPreviewBriefGenerating] = React.useState(false)
  const [showPreviewFeedback, setShowPreviewFeedback] = React.useState(false)
  const [cinematicRegistry, setCinematicRegistry] = React.useState<CinematicAssetRegistry | null>(null)
  const [inlinePreviewStatusVariant, setInlinePreviewStatusVariant] = React.useState<'hidden' | 'expanded' | 'icon'>('hidden')
  const [inlinePreviewStatusHovered, setInlinePreviewStatusHovered] = React.useState(false)
  const inlinePreviewStatusTimeoutRef = React.useRef<number | null>(null)
  const inlinePreviewStatusHasShownRef = React.useRef(false)
  const projectPreviewSourceKey = project?.sourceAssetId ?? projectId
  const handoffPreviewForCurrentSource =
    handoffPreview?.sourceKey === projectPreviewSourceKey ? handoffPreview : null
  const stableProjectPreviewUrl =
    handoffPreviewForCurrentSource?.url
    ?? (project?.sourceAssetId ? persistedPreviewUrl ?? project?.thumbnailUrl ?? null : project?.thumbnailUrl ?? null)
  const stableProjectPreviewKind = (handoffPreviewForCurrentSource?.kind ?? project?.previewKind ?? null) as PreviewMediaKind | null
  const {
    visiblePreviewUrl: sourceStageVisiblePreviewUrl,
    previewKind: stagedPreviewKind,
    phase: sourceStagePhase,
    error: sourceStageError,
    stageSource: stageSourceFile,
  } = useSourceStage({
    currentPreviewUrl: stableProjectPreviewUrl,
    currentPreviewKind: stableProjectPreviewKind,
  })
  const viralClipJob = useViralClipJob({
    projectId,
    videoId: project?.sourceAssetId ?? null,
  })
  const {
    health: viralClipBackendHealth,
    lifecycle: viralClipLifecycle,
    jobId: viralClipJobId,
    backendStage: viralClipBackendStage,
    stageLabel: viralClipStageLabel,
    stageDetail: viralClipStageDetail,
    progressPercent: viralClipProgressPercent,
    warnings: viralClipWarnings,
    statusMessage: viralClipStatusMessage,
    errorMessage: viralClipErrorMessage,
    resultError: viralClipResultError,
    selectedClips: viralClipSelectedClips,
    startJob: startViralClipJob,
    refreshBackendHealth: refreshViralClipBackendHealth,
    refreshResult: refreshViralClipResult,
  } = viralClipJob

  React.useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [isEditingTitle])

  React.useEffect(() => {
    clearPendingEditorNavigation(`/editor/${projectId}`)
  }, [projectId])

  React.useEffect(() => {
    let active = true
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (res.ok) {
          const { project: apiProject } = await res.json()
          if (active && apiProject) {
            setProject(apiProject)
            upsertProject(apiProject)
          }
        }
      } catch (err) {
        console.error('Failed to fetch project from API:', err)
      }
    }
    fetchProject()
    return () => { active = false }
  }, [projectId])

  React.useEffect(() => {
    const savedTrackId = readLocalStorageJSON<string | null>(selectedEditorMusicStorageKey(projectId))
    setSelectedEditorMusicTrackId(typeof savedTrackId === 'string' ? savedTrackId : null)
  }, [projectId])

  React.useEffect(() => {
    const handleSelectedMusicTrack = (event: Event) => {
      const detail = (event as CustomEvent<SelectedEditorMusicEventDetail>).detail
      if (detail?.projectId !== projectId || typeof detail.trackId !== 'string') return
      setSelectedEditorMusicTrackId(detail.trackId)
    }

    window.addEventListener(SELECTED_EDITOR_MUSIC_EVENT, handleSelectedMusicTrack)
    return () => window.removeEventListener(SELECTED_EDITOR_MUSIC_EVENT, handleSelectedMusicTrack)
  }, [projectId])

  React.useEffect(() => {
    const loadLatestExport = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/exports/latest`)
        const data = await res.json()
        if (res.ok && data.export) {
          setLatestExport(data.export)
        }
      } catch (err) {
        console.warn('Failed to load latest export:', err)
      }
    }
    void loadLatestExport()
  }, [projectId])

  React.useEffect(() => {
    writeLocalStorageJSON(selectedEditorMusicStorageKey(projectId), selectedEditorMusicTrackId)
  }, [projectId, selectedEditorMusicTrackId])

  React.useEffect(() => {
    const sessionSourcePreview = getSessionSourcePreview(projectId, project?.sourceAssetId ?? null)

    if (!sessionSourcePreview) return

    debugEditorPreview('session-handoff-preview', {
      projectId,
      sourceAssetId: sessionSourcePreview.sourceAssetId,
      previewUrl: sessionSourcePreview.url,
      previewKind: sessionSourcePreview.kind,
    })
    setHandoffPreview({
      sourceKey: sessionSourcePreview.sourceAssetId ?? projectPreviewSourceKey,
      url: sessionSourcePreview.url,
      kind: sessionSourcePreview.kind,
    })
  }, [project?.sourceAssetId, projectId, projectPreviewSourceKey])

  React.useEffect(() => {
    let active = true
    let intervalId: number | null = null

    const syncState = () => {
      if (!active) return

      // getJob already internally updates the project status if needed
      const nextJob = projects.getJob(projectId)
      const nextProject = projects.get(projectId)

      setProject(nextProject)
      setJob(nextJob)
      if (nextJob?.status === 'completed' && intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    syncState()
    intervalId = window.setInterval(syncState, 900)

    return () => {
      active = false
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [projectId])

  React.useEffect(() => {
    let active = true
    let nextObjectUrl: string | null = null

    setPersistedPreviewUrl(null)

    const recoverPersistedSource = async () => {
      if (!project?.sourceAssetId) return

      try {
        const localUrl = await createSourceAssetObjectUrl(project.sourceAssetId)

        if (!active) {
          if (localUrl) URL.revokeObjectURL(localUrl)
          return
        }

        if (localUrl) {
          nextObjectUrl = localUrl
          debugEditorPreview('restored-local-preview-url', {
            projectId,
            sourceAssetId: project.sourceAssetId,
            localUrl,
          })
          setPersistedPreviewUrl(localUrl)
          return
        }

        // Local recovery failed, try cloud recovery
        debugEditorPreview('local-recovery-failed-trying-cloud', {
          projectId,
          sourceAssetId: project.sourceAssetId,
        })

        const res = await fetch(`/api/projects/${projectId}/assets`)
        if (!res.ok) throw new Error('Cloud recovery failed')

        const data = await res.json()
        const cloudUrl = data.source?.url

        if (!active) return

        if (cloudUrl) {
          debugEditorPreview('restored-cloud-preview-url', {
            projectId,
            sourceAssetId: project.sourceAssetId,
            cloudUrl,
          })
          setPersistedPreviewUrl(cloudUrl)
        } else {
          throw new Error('No cloud URL returned')
        }
      } catch (err) {
        if (!active) return
        console.error('Source recovery failed:', err)
        debugEditorPreview('source-recovery-failed', {
          projectId,
          sourceAssetId: project.sourceAssetId,
          error: err instanceof Error ? err.message : String(err),
        })
        setPersistedPreviewUrl(null)
        // If we have an asset ID but can't find it locally or in the cloud, it's an error
        if (project?.sourceAssetId) {
          setIsPreviewMediaReady(false) // Force stop loading
        }
      }
    }

    void recoverPersistedSource()

    return () => {
      active = false
      if (nextObjectUrl) {
        URL.revokeObjectURL(nextObjectUrl)
      }
    }
  }, [project?.sourceAssetId, projectId])

  React.useEffect(() => {
    let active = true

    setSourceAssetLabel(null)

    if (!project?.sourceAssetId) return

    void getStoredSourceAssetFile(project.sourceAssetId)
      .then((file) => {
        if (!active) return
        if (!file) {
          setSourceAssetLabel(null)
          return
        }
        const nextLabel = file.name?.trim().replace(/\.[^/.]+$/, '') || file.name?.trim() || 'Source video'
        setSourceAssetLabel(nextLabel)
      })
      .catch(() => {
        if (!active) return
        setSourceAssetLabel(null)
      })

    return () => {
      active = false
    }
  }, [project?.sourceAssetId])

  React.useEffect(() => {
    if (!project?.sourceAssetId || !persistedPreviewUrl) return
    if (!project.thumbnailUrl || !project.thumbnailUrl.startsWith('blob:')) return

    const nextProject = projects.update(project.id, { thumbnailUrl: '' })
    if (nextProject) setProject(nextProject)
  }, [persistedPreviewUrl, project])

  React.useEffect(() => {
    let rafId = 0
    let timeoutId = 0

    rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        setIsDeferredChromeReady(true)
      }, 140)
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
    }
  }, [])

  React.useEffect(() => {
    let active = true

    void fetch('/api/cinematic/assets', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load cinematic assets (${response.status}).`)
        }
        return (await response.json()) as CinematicAssetRegistry
      })
      .then((registry) => {
        if (!active) return
        setCinematicRegistry(registry)
      })
      .catch(() => {
        if (!active) return
        setCinematicRegistry(null)
      })

    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (!SHOULD_PREFETCH_EDITOR_SUPPORT_ROUTES) return

    void router.prefetch('/projects')
  }, [projectId, router])

  const handleBackNavigation = React.useCallback(() => {
    const rememberedPath = getRememberedEditorReturnPath()

    if (rememberedPath && rememberedPath !== `/editor/${projectId}` && !rememberedPath.startsWith('/editor/')) {
      router.push(rememberedPath)
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }, [projectId, router])

  const handleMobileBackNavigation = React.useCallback(() => {
    router.push('/projects')
  }, [router])

  const handleEditorHistoryKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return

    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('input, textarea, [contenteditable="true"]')) return

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handleBackNavigation()
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      router.forward()
    }
  }, [handleBackNavigation, router])

  React.useEffect(() => {
    window.addEventListener('keydown', handleEditorHistoryKeyDown)
    return () => window.removeEventListener('keydown', handleEditorHistoryKeyDown)
  }, [handleEditorHistoryKeyDown])

  const totalDurationMs = React.useMemo(() => {
    const scenes = job?.artifacts.scenes ?? []
    return scenes.length > 0 ? scenes[scenes.length - 1]!.endMs : 48_000
  }, [job])

  const progressPercent = React.useMemo(() => {
    if (!job?.steps.length) return 0
    return Math.round((job.steps.reduce((sum, step) => sum + step.progress, 0) / job.steps.length) * 100)
  }, [job])

  const incomingPreviewKind = ((sourceStageVisiblePreviewUrl ? stagedPreviewKind : null) ?? stableProjectPreviewKind ?? 'video') as PreviewMediaKind
  const previewSourceKey = projectPreviewSourceKey

  React.useEffect(() => {
    debugEditorPreview('session-preview-state', {
      projectId,
      previewSourceKey,
      sourceAssetId: project?.sourceAssetId ?? null,
      stagedPreviewKind,
      sourceStageVisiblePreviewUrl,
      stableProjectPreviewUrl,
      handoffPreviewUrl: handoffPreviewForCurrentSource?.url ?? null,
      handoffPreviewKind: handoffPreviewForCurrentSource?.kind ?? null,
      sourceStagePhase,
    })
  }, [handoffPreviewForCurrentSource, project?.sourceAssetId, projectId, previewSourceKey, sourceStagePhase, sourceStageVisiblePreviewUrl, stableProjectPreviewUrl, stagedPreviewKind])

  const transportDurationSec = previewDurationSec > 0 ? previewDurationSec : totalDurationMs / 1000
  const transportProgress = transportDurationSec > 0 ? (previewCurrentTimeSec / transportDurationSec) * 100 : 0
  const transportCurrentTime = msToTime(previewCurrentTimeSec * 1000)
  const transportTime = msToTime(transportDurationSec * 1000)
  const previewUrl = sourceStageVisiblePreviewUrl ?? stableProjectPreviewUrl ?? ''
  const previewKind = incomingPreviewKind
  const shouldUseLegacySessionPreviewSurface = handoffPreviewForCurrentSource?.url === previewUrl && previewKind === 'video'
  const hasPreviewMedia = Boolean(previewUrl)
  const isSourceStageActivelyLoading =
    sourceStagePhase === 'staging_local_preview' || sourceStagePhase === 'persisting'
  const clipModeActive = previewFramePreset === '9:16'
  const viralClipTriggerBusy =
    viralClipLifecycle === 'submitting' || viralClipLifecycle === 'submitted' || viralClipLifecycle === 'polling'
  const showViralClipSplitPreview = viralClipSplitPreviewActive && clipModeActive && hasPreviewMedia
  React.useEffect(() => {
    if (!showViralClipSplitPreview) {
      setIsLockedViralClipTriggerHovered(false)
    }
  }, [showViralClipSplitPreview])

  React.useEffect(() => {
    return () => {
      if (inlinePreviewStatusTimeoutRef.current !== null) {
        window.clearTimeout(inlinePreviewStatusTimeoutRef.current)
        inlinePreviewStatusTimeoutRef.current = null
      }
    }
  }, [])

  React.useEffect(() => {
    const isInlinePreviewStatusActive =
      Boolean(hasPreviewMedia) &&
      (sourceStageError || isSourceStageActivelyLoading)

    if (!isInlinePreviewStatusActive) {
      inlinePreviewStatusHasShownRef.current = false
      setInlinePreviewStatusHovered(false)
      if (inlinePreviewStatusTimeoutRef.current !== null) {
        window.clearTimeout(inlinePreviewStatusTimeoutRef.current)
        inlinePreviewStatusTimeoutRef.current = null
      }
      setInlinePreviewStatusVariant('hidden')
      return
    }

    if (inlinePreviewStatusHasShownRef.current) {
      return
    }

    inlinePreviewStatusHasShownRef.current = true
    setInlinePreviewStatusVariant('expanded')
    if (inlinePreviewStatusTimeoutRef.current !== null) {
      window.clearTimeout(inlinePreviewStatusTimeoutRef.current)
    }
    inlinePreviewStatusTimeoutRef.current = window.setTimeout(() => {
      setInlinePreviewStatusVariant('icon')
      inlinePreviewStatusTimeoutRef.current = null
    }, 2200)
  }, [hasPreviewMedia, isSourceStageActivelyLoading, sourceStageError])

  const hasPreviewFrameAdjustment = scale !== 100 || offsetX !== 0 || offsetY !== 0
  const showInlinePreviewStatus = Boolean(hasPreviewMedia) && inlinePreviewStatusVariant !== 'hidden'
  const isInlinePreviewStatusExpanded =
    inlinePreviewStatusVariant === 'expanded' || inlinePreviewStatusHovered
  const inlinePreviewStatusLabel = sourceStageError
    ? sourceStageError
    : sourceStagePhase === 'staging_local_preview'
      ? 'Preparing the new source preview'
      : sourceStagePhase === 'persisting'
        ? 'Saving the source in the background'
        : null
  const sourceMetrics = project?.sourceProfile ? formatSourceProfileMetric(project.sourceProfile) : null
  const previewAspectRatio = getSourcePreviewAspectRatio(
    project?.sourceProfile ?? null,
    previewKind === 'image' ? 1 : 16 / 9,
  )
  const resolvedPreviewAspectRatio =
    previewFramePreset === 'source'
      ? previewIntrinsicAspectRatio ?? previewAspectRatio
      : getOutputProfileAspectRatio(previewFramePreset, project?.sourceProfile ?? null)
  const visiblePreviewAspectRatio = showViralClipSplitPreview ? 2.24 : resolvedPreviewAspectRatio
  const previewFrameWidth = `min(100%, calc((clamp(250px, 40vh, 460px) - 2rem) * ${visiblePreviewAspectRatio.toFixed(4)}))`
  const previewFrameTransformStyle = hasPreviewFrameAdjustment
    ? {
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale / 100})`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }
    : undefined

  const promptText = job?.input.prompt?.trim() || 'Your clip is staged and ready for refinement.'
  const sourceList = React.useMemo(() => job?.input.sources ?? [], [job?.input.sources])
  const videoContext = React.useMemo(
    () =>
      buildVideoMusicContext({
        projectTitle: project?.title ?? 'Untitled Project',
        promptText,
        sourceProfile: project?.sourceProfile ?? null,
        job,
        sourceList,
      }),
    [job, project?.sourceProfile, project?.title, promptText, sourceList],
  )
  const editorMusicShelf = React.useMemo(
    () =>
      buildMusicRecommendationSet({
        query: promptText,
        projectTitle: project?.title ?? 'Untitled Project',
        initialPrompt: promptText,
        videoContext,
        limit: 5,
        catalog: MUSIC_CATALOG,
      }),
    [project?.title, promptText, videoContext],
  )
  const editorMusicRecommendations = React.useMemo(
    () => editorMusicShelf.recommendations.slice(0, 5),
    [editorMusicShelf],
  )
  const selectedEditorMusicTrack = React.useMemo(
    () => editorMusicRecommendations.find((track) => track.id === selectedEditorMusicTrackId) ?? null,
    [editorMusicRecommendations, selectedEditorMusicTrackId],
  )
  const viralClipClipPreset = VIRAL_CLIP_COUNT_PRESETS[viralClipClipPresetIndex] ?? VIRAL_CLIP_COUNT_PRESETS[1]!
  const viralClipProvidedTranscript = buildProvidedTranscript(job)
  const viralClipPrompt = React.useMemo(
    () =>
      buildViralClipQuickActionPrompt({
        projectTitle: project?.title ?? 'Untitled Project',
        originalPrompt: promptText,
        sourceCount: sourceList.length,
        transportTime,
        videoContext,
      }),
    [project?.title, promptText, sourceList.length, transportTime, videoContext],
  )

  const previewOverlayPlan = job?.artifacts.animationPlan ?? null

  const handleAutoSave = React.useCallback(async (editorState: any) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorState }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveStatus('error')
    }
  }, [projectId])

  const handleAutoSaveAnimationPlan = React.useCallback(async (animationPlan: AnimationPlan) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animationPlan }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch (err) {
      console.error('Auto-save animation plan failed:', err)
      setSaveStatus('error')
    }
  }, [projectId])

  const handleEditorMusicTrackSelect = React.useCallback((track: MusicRecommendation) => {
    setSelectedEditorMusicTrackId(track.id)
  }, [])

  React.useEffect(() => {
    if (!cinematicRegistry || !previewOverlayPlan || !job?.input.prompt) return
    if (previewOverlayPlan.registrySignature === cinematicRegistry.signature) return

    const nextPlan = buildCinematicAnimationPlan({
      projectId,
      input: job.input,
      transcript: job.artifacts.transcript,
      scenes: job.artifacts.scenes,
      highlights: job.artifacts.highlights,
      brollSuggestions: job.artifacts.brollSuggestions,
      registry: cinematicRegistry,
    })

    projects.setAnimationPlan(projectId, nextPlan)
    const updatedJob = projects.getJob(projectId)
    if (updatedJob) {
      setJob(updatedJob)
    }
    void handleAutoSaveAnimationPlan(nextPlan)
  }, [cinematicRegistry, job, previewOverlayPlan, projectId, handleAutoSaveAnimationPlan])

  const currentSplitPreviewAssets =
    viralClipSplitPreviewAssets.sourceAssetId === (project?.sourceAssetId ?? null)
      ? viralClipSplitPreviewAssets
      : EMPTY_SPLIT_PREVIEW_ASSETS

  const ensureViralClipSplitPreviewAssets = React.useCallback(
    async (sourceAssetId: string, sourceVideoFile: File | null) => {
      const cached = splitPreviewAssetCacheRef.current.get(sourceAssetId)
      if (cached) {
        setViralClipSplitPreviewAssets({
          sourceAssetId,
          status: 'ready',
          leftUrl: cached.leftUrl,
          rightUrl: cached.rightUrl,
          errorMessage: null,
        })
        return cached
      }

      let splitSourceFile = sourceVideoFile
      if (!splitSourceFile && previewKind === 'video' && previewUrl) {
        const previewResponse = await fetch(previewUrl)
        if (!previewResponse.ok) {
          throw new Error('Unable to restore the visible preview for split reel generation.')
        }

        const previewBlob = await previewResponse.blob()
        splitSourceFile = new File([previewBlob], 'split-preview-source.mp4', {
          type: previewBlob.type || 'video/mp4',
        })
      }

      if (!splitSourceFile) {
        throw new Error('Unable to access the source video file for split reel generation.')
      }

      setViralClipSplitPreviewAssets({
        sourceAssetId,
        status: 'loading',
        leftUrl: null,
        rightUrl: null,
        errorMessage: null,
      })

      const formData = new FormData()
      formData.append('source_video', splitSourceFile, splitSourceFile.name || 'source.mp4')

      const response = await fetch('/api/cinematic/split-preview', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as
        | { leftUrl?: string; rightUrl?: string; error?: string }
        | null

      if (!response.ok || !payload?.leftUrl || !payload?.rightUrl) {
        throw new Error(payload?.error || 'Failed to build split reel previews.')
      }

      const nextAssets = {
        leftUrl: payload.leftUrl,
        rightUrl: payload.rightUrl,
      }
      splitPreviewAssetCacheRef.current.set(sourceAssetId, nextAssets)
      setViralClipSplitPreviewAssets({
        sourceAssetId,
        status: 'ready',
        leftUrl: nextAssets.leftUrl,
        rightUrl: nextAssets.rightUrl,
        errorMessage: null,
      })

      return nextAssets
    },
    [previewKind, previewUrl],
  )

  const handleGenerateViralClips = React.useCallback(async () => {
    if (!project?.sourceAssetId) {
      setViralClipSplitPreviewActive(false)
      setPreviewFramePreset('source')
      toast.error('Add a source video first so the clip workflow has something to analyze.')
      return
    }

    const relayId = Date.now()
    const clipCount = Math.max(4, viralClipClipPreset.max)
    const sourcePreviewUrl = previewUrl || stableProjectPreviewUrl
    const initialClipBlock: ChatClipBlock = {
      status: 'loading',
      stageLabel: 'Equal slice pass',
      detail: `Cutting ${transportTime} of visible source into ${clipCount} candidate windows before backend scoring.`,
      progressPercent: 12,
      targetPlatform: viralClipTargetPlatform,
      clipCount,
      sourcePreviewUrl,
      variants: buildChatClipVariants({
        selectedClips: [],
        clipCount,
        sourcePreviewUrl,
        totalDurationSec: transportDurationSec,
      }),
      errorMessage: null,
    }

    setActiveWorkspaceTab('Editor')
    setClipRelayState({
      id: relayId,
      userId: `user-clip-${relayId}`,
      assistantId: `assistant-clip-${relayId}`,
      prompt: 'Clip this source into high-retention short-form variants.',
      clip: initialClipBlock,
    })

    try {
      if (!viralClipSplitPreviewActive) {
        previousFitModeRef.current = fitMode
        previousPreviewFramePresetRef.current = previewFramePreset
      }
      setFitMode('fill')
      setPreviewFramePreset('9:16')
      setViralClipSplitPreviewActive(true)
      setViralClipSplitAnimationKey((current) => current + 1)

      const sourceVideoFile = await getStoredSourceAssetFile(project.sourceAssetId).catch(() => null)
      const splitPreviewPromise = ensureViralClipSplitPreviewAssets(project.sourceAssetId, sourceVideoFile)

      const [viralClipJobResult, splitPreviewResult] = await Promise.allSettled([
        startViralClipJob(
          {
            projectId,
            videoId: project.sourceAssetId,
            targetPlatform: viralClipTargetPlatform,
            clipCountMin: viralClipClipPreset.min,
            clipCountMax: viralClipClipPreset.max,
            prompt: viralClipPrompt,
            sourceMediaRef: project.sourceAssetId,
            creatorNiche: videoContext.summary || undefined,
            metadataOverrides: {
              projectTitle: project?.title ?? 'Untitled Project',
              sourceAssetId: project.sourceAssetId,
              previewKind: project?.previewKind ?? null,
              sourceProfileMetric: sourceMetrics,
              sourceProfile: project?.sourceProfile ?? null,
              clipMode: 'viral',
              targetPlatform: viralClipTargetPlatform,
              clipCountMin: viralClipClipPreset.min,
              clipCountMax: viralClipClipPreset.max,
            },
            providedTranscript: viralClipProvidedTranscript ?? undefined,
          },
          {
            sourceVideoFile,
          },
        ),
        splitPreviewPromise,
      ])

      if (viralClipJobResult.status === 'rejected') {
        throw viralClipJobResult.reason
      }

      if (splitPreviewResult.status === 'rejected') {
        const splitPreviewError =
          splitPreviewResult.reason instanceof Error
            ? splitPreviewResult.reason.message
            : 'Split reel generation failed.'

        setViralClipSplitPreviewAssets({
          sourceAssetId: project.sourceAssetId,
          status: 'error',
          leftUrl: null,
          rightUrl: null,
          errorMessage: splitPreviewError,
        })
        toast.error(splitPreviewError)
      }

      toast.success('Viral clip job submitted. Watching backend stages now.')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to launch the viral clip job.'
      setClipRelayState((current) => {
        if (!current || current.id !== relayId) return current
        const nextClip: ChatClipBlock = {
          ...current.clip,
          status: 'error',
          stageLabel: 'Clip launch failed',
          detail: errorMessage,
          progressPercent: Math.max(current.clip.progressPercent, 18),
          errorMessage,
        }
        return { ...current, clip: nextClip }
      })
      toast.error(error instanceof Error ? error.message : 'Failed to launch the viral clip job.')
    }
  }, [
    fitMode,
    project,
    projectId,
    previewFramePreset,
    sourceMetrics,
    stableProjectPreviewUrl,
    previewUrl,
    transportDurationSec,
    transportTime,
    viralClipClipPreset.max,
    viralClipClipPreset.min,
    viralClipPrompt,
    viralClipProvidedTranscript,
    viralClipTargetPlatform,
    viralClipSplitPreviewActive,
    ensureViralClipSplitPreviewAssets,
    startViralClipJob,
    videoContext.summary,
  ])

  React.useEffect(() => {
    if (!clipRelayState) return
    if (viralClipLifecycle === 'idle' && !viralClipJobId) return

    const failed = viralClipLifecycle === 'failed'
    const ready = viralClipLifecycle === 'completed'
    const progressFromLifecycle =
      viralClipProgressPercent ??
      (ready
        ? 100
        : failed
          ? Math.max(clipRelayState.clip.progressPercent, 82)
          : viralClipLifecycle === 'polling'
            ? 68
            : viralClipLifecycle === 'submitted'
              ? 36
              : viralClipLifecycle === 'submitting'
                ? 24
                : clipRelayState.clip.progressPercent)
    const nextStatus: ChatClipBlock['status'] = failed ? 'error' : ready ? 'ready' : 'loading'
    const variants = buildChatClipVariants({
      selectedClips: viralClipSelectedClips,
      clipCount: clipRelayState.clip.clipCount,
      sourcePreviewUrl: clipRelayState.clip.sourcePreviewUrl ?? previewUrl,
      totalDurationSec: transportDurationSec,
    })

    setClipRelayState((current) => {
      if (!current || current.id !== clipRelayState.id) return current
      const nextStageLabel =
        failed
          ? 'Clip backend failed'
          : ready
            ? 'Variants ready'
            : viralClipStageLabel || current.clip.stageLabel
      const nextDetail =
        failed
          ? viralClipErrorMessage || viralClipResultError || 'The clipping backend could not finish this pass.'
          : ready
            ? 'The strongest clips are staged below with timing, fit score, and rationale.'
            : viralClipStageDetail || viralClipStatusMessage || current.clip.detail
      const nextProgress = Math.max(current.clip.progressPercent, Math.min(100, progressFromLifecycle))
      const sameVariants =
        current.clip.variants.length === variants.length &&
        current.clip.variants.every((variant, index) => variant.id === variants[index]?.id && variant.scoreLabel === variants[index]?.scoreLabel)
      if (
        current.clip.status === nextStatus &&
        current.clip.stageLabel === nextStageLabel &&
        current.clip.detail === nextDetail &&
        current.clip.progressPercent === nextProgress &&
        sameVariants
      ) {
        return current
      }

      return {
        ...current,
        clip: {
          ...current.clip,
          status: nextStatus,
          stageLabel: nextStageLabel,
          detail: nextDetail,
          progressPercent: nextProgress,
          variants,
          errorMessage: failed ? viralClipErrorMessage || viralClipResultError || null : null,
        },
      }
    })
  }, [
    clipRelayState?.clip.clipCount,
    clipRelayState?.clip.progressPercent,
    clipRelayState?.clip.sourcePreviewUrl,
    clipRelayState?.id,
    previewUrl,
    transportDurationSec,
    viralClipErrorMessage,
    viralClipJobId,
    viralClipLifecycle,
    viralClipProgressPercent,
    viralClipResultError,
    viralClipSelectedClips,
    viralClipStageDetail,
    viralClipStageLabel,
    viralClipStatusMessage,
  ])

  const handlePrepareExport = React.useCallback(async (options?: { quality: MobileExportQuality; format: MobileExportFormat }) => {
    setShowExport(true)
  }, [setShowExport])

  const handleDownload = React.useCallback(() => {
    if (!latestExport) return
    setIsDownloadDialogOpen(true)
  }, [latestExport])

  const handleConfirmDownload = React.useCallback(async () => {
    if (!latestExport || isDownloading) return

    setIsDownloadDialogOpen(false)
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/exports/${latestExport.id}/download-url`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get download URL')
      }

      const downloadUrl = data.download?.url || data.downloadUrl
      const filename = data.download?.filename || latestExport.storagePath?.split('/').pop() || `export-${latestExport.id.slice(0, 8)}.mp4`

      // Create a temporary link to trigger the download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Download started', {
        description: 'Your cinematic export is being delivered to your browser.',
      })
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error('Could not download file', {
        description: err.message || 'An unexpected error occurred.',
      })
    } finally {
      setIsDownloading(false)
    }
  }, [latestExport, isDownloading])

  const handleRestoreLandscapePreview = React.useCallback(() => {
    setIsLockedViralClipTriggerHovered(false)
    setViralClipSplitPreviewActive(false)
    setPreviewFramePreset(previousPreviewFramePresetRef.current)
    setFitMode(previousFitModeRef.current)
  }, [])

  const startPreviewPlayback = React.useCallback(() => {
    if (previewKind !== 'video' || !previewUrl) return
    const video = previewVideoRef.current
    if (!video) return

    previewPlaybackIntentRef.current = 'playing'
    const commandId = ++previewPlaybackCommandRef.current
    const playPromise = video.play()
    setPreviewPlaying(true)

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (previewPlaybackCommandRef.current !== commandId) return
        if (previewPlaybackIntentRef.current !== 'playing') return
        debugEditorPreview('video-play-rejected', {
          projectId,
          previewUrl,
        })
        previewPlaybackIntentRef.current = 'paused'
        setPreviewPlaying(false)
      })
    }
  }, [previewKind, previewUrl, projectId])

  const clearPreviewToggleCooldown = React.useCallback(() => {
    if (previewToggleCooldownRef.current === null) return
    window.clearTimeout(previewToggleCooldownRef.current)
    previewToggleCooldownRef.current = null
  }, [])

  const armPreviewToggleCooldown = React.useCallback(() => {
    clearPreviewToggleCooldown()
    previewToggleCooldownRef.current = window.setTimeout(() => {
      previewToggleCooldownRef.current = null
    }, 220)
  }, [clearPreviewToggleCooldown])

  const handleEditRequest = React.useCallback(
    (request: { prompt: string; styleTemplate: StyleTemplate }) => {
      if (!project?.sourceAssetId) {
        toast.error('Add a source video first so the edit pass has something to render.')
        return
      }

      const prompt = request.prompt.trim()
      if (!prompt) return

      const startedJob = projects.process(projectId, {
        prompt,
        sources: sourceList,
        styleId: request.styleTemplate.id,
      })
      const nextJob = startedJob
      const fallbackPlan = buildFallbackEditAnimationPlan({
        projectId,
        projectTitle: project?.title ?? 'Untitled Project',
        prompt,
        jobId: nextJob!.id,
        sourceLabel: sourceAssetLabel ?? project?.title ?? null,
        styleTemplate: request.styleTemplate,
      })
      projects.setAnimationPlan(projectId, fallbackPlan)
      const jobWithFallbackPlan = projects.getJob(projectId) ?? startedJob

      setJob(jobWithFallbackPlan)
      previewPlaybackIntentRef.current = 'paused'
      previewPlaybackCommandRef.current += 1
      clearPreviewToggleCooldown()
      setPreviewPlaying(false)
      if (previewKind === 'video' && previewUrl) {
        void startPreviewPlayback()
      }

      toast.success(`Edit job ${nextJob!.id.slice(0, 6)} started.`)

      if (cinematicRegistry) {
        const refinedPlan = buildCinematicAnimationPlan({
          projectId,
          input: nextJob!.input,
          transcript: jobWithFallbackPlan!.artifacts.transcript,
          scenes: jobWithFallbackPlan!.artifacts.scenes,
          highlights: jobWithFallbackPlan!.artifacts.highlights,
          brollSuggestions: jobWithFallbackPlan!.artifacts.brollSuggestions,
          registry: cinematicRegistry,
        })

        projects.setAnimationPlan(projectId, refinedPlan)
        const refinedJob = projects.getJob(projectId)
        if (refinedJob) {
          setJob(refinedJob)
        }
      }
    },
    [
      cinematicRegistry,
      clearPreviewToggleCooldown,
      previewKind,
      previewUrl,
      project?.sourceAssetId,
      project?.title,
      projectId,
      sourceAssetLabel,
      sourceList,
      startPreviewPlayback,
    ],
  )

  const handleMotionCanvasPrompt = React.useCallback((prompt: string) => {
    setActiveWorkspaceTab('Editor')
    setComposerAutomationRequest({
      id: Date.now(),
      prompt,
    })
  }, [])

  React.useEffect(() => {
    setPreviewPlaying(false)
    setPreviewCurrentTimeSec(0)
    setPreviewDurationSec(0)
    setPreviewIntrinsicAspectRatio(null)
    setIsPreviewMediaReady(false)
    setViralClipSplitPreviewActive(false)
    previewPlaybackIntentRef.current = 'paused'
    previewPlaybackCommandRef.current += 1
    clearPreviewToggleCooldown()
    debugEditorPreview('preview-url-reset', {
      projectId,
      previewKind,
      previewUrl,
    })
  }, [clearPreviewToggleCooldown, previewKind, previewUrl, projectId])

  React.useEffect(() => {
    if (previewKind !== 'video' || !previewUrl || isPreviewMediaReady) {
      setIsPreviewLoadingVisible(false)
      return
    }

    setIsPreviewLoadingVisible(true)
    const timeoutId = window.setTimeout(() => {
      setIsPreviewLoadingVisible(false)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isPreviewMediaReady, previewKind, previewUrl])

  const handlePreviewMetadataLoaded = React.useCallback(() => {
    const video = previewVideoRef.current
    if (!video) return
    setPreviewDurationSec(Number.isFinite(video.duration) ? video.duration : 0)
    setEditorSourceStatus({
      duration: Number.isFinite(video.duration) ? video.duration : null,
      height: video.videoHeight,
      width: video.videoWidth,
    })
    if (Number.isFinite(video.videoWidth) && Number.isFinite(video.videoHeight) && video.videoWidth > 0 && video.videoHeight > 0) {
      setPreviewIntrinsicAspectRatio(video.videoWidth / video.videoHeight)
    }
    debugEditorPreview('video-loaded-metadata', {
      projectId,
      previewUrl,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
    })
  }, [previewUrl, projectId])

  const handlePreviewVideoReady = React.useCallback(() => {
    handlePreviewMetadataLoaded()
    setIsPreviewMediaReady(true)
    debugEditorPreview('video-ready', {
      projectId,
      previewUrl,
    })
  }, [handlePreviewMetadataLoaded, previewUrl, projectId])

  React.useEffect(() => {
    const video = previewVideoRef.current
    if (!video || previewKind !== 'video' || !previewUrl) return

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handlePreviewVideoReady()
    }
  }, [handlePreviewVideoReady, previewKind, previewUrl])

  const handlePreviewImageLoaded = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setPreviewIntrinsicAspectRatio(image.naturalWidth / image.naturalHeight)
      }
      setIsPreviewMediaReady(true)
      debugEditorPreview('image-ready', {
        projectId,
        previewUrl,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
      })
    },
    [previewUrl, projectId],
  )

  const handlePreviewTimeUpdate = React.useCallback(() => {
    const video = previewVideoRef.current
    if (!video) return
    setPreviewCurrentTimeSec(video.currentTime)
  }, [])

  const handlePreviewEnded = React.useCallback(() => {
    previewPlaybackIntentRef.current = 'paused'
    debugEditorPreview('video-ended', {
      projectId,
      previewUrl,
    })
    setPreviewPlaying(false)
  }, [previewUrl, projectId])

  const handlePreviewVideoPlay = React.useCallback(() => {
    if (previewPlaybackIntentRef.current !== 'playing') return
    debugEditorPreview('video-play', {
      projectId,
      previewUrl,
    })
    setPreviewPlaying(true)
  }, [previewUrl, projectId])

  const handlePreviewVideoPause = React.useCallback(() => {
    if (previewPlaybackIntentRef.current !== 'paused') return
    debugEditorPreview('video-pause', {
      projectId,
      previewUrl,
    })
    setPreviewPlaying(false)
  }, [previewUrl, projectId])

  const handlePreviewVideoError = React.useCallback(() => {
    const video = previewVideoRef.current
    debugEditorPreview('video-error', {
      projectId,
      previewUrl,
      currentSrc: video?.currentSrc ?? null,
      networkState: video?.networkState ?? null,
      readyState: video?.readyState ?? null,
      errorCode: video?.error?.code ?? null,
      errorMessage: video?.error?.message ?? null,
    })
  }, [previewUrl, projectId])

  const previewFrameLabel = React.useCallback((framePreset: PreviewFramePreset) => {
    if (framePreset === 'source') return 'Source'
    return framePreset
  }, [])

  const handlePreviewSeek = React.useCallback((nextValue: number) => {
    const video = previewVideoRef.current
    if (!video || !transportDurationSec) return
    const nextTime = (nextValue / 100) * transportDurationSec
    video.currentTime = nextTime
    setPreviewCurrentTimeSec(nextTime)
  }, [transportDurationSec])

  const handlePreviewSeekSeconds = React.useCallback((nextTimeSec: number) => {
    if (!transportDurationSec) return
    const nextTime = Math.min(transportDurationSec, Math.max(0, nextTimeSec))
    const video = previewVideoRef.current
    if (video) {
      video.currentTime = nextTime
    }
    setPreviewCurrentTimeSec(nextTime)
  }, [transportDurationSec])

  const pausePreviewPlayback = React.useCallback(() => {
    const video = previewVideoRef.current
    previewPlaybackIntentRef.current = 'paused'
    previewPlaybackCommandRef.current += 1
    if (video) {
      video.pause()
    }
    setPreviewPlaying(false)
  }, [])

  React.useEffect(() => {
    const stopMedia = () => {
      previewVideoRef.current?.pause()
      stopEditorMedia()
    }

    window.addEventListener('pagehide', stopMedia)
    return () => {
      window.removeEventListener('pagehide', stopMedia)
      stopMedia()
    }
  }, [])

  const togglePreviewPlayback = React.useCallback(() => {
    if (previewKind !== 'video' || !previewUrl) return
    if (previewToggleCooldownRef.current !== null) return
    armPreviewToggleCooldown()
    if (previewPlaybackIntentRef.current === 'paused') {
      startPreviewPlayback()
      return
    }

    pausePreviewPlayback()
  }, [armPreviewToggleCooldown, pausePreviewPlayback, previewKind, previewUrl, startPreviewPlayback])

  const handlePreviewPlayRequest = React.useCallback(() => {
    if (previewKind !== 'video' || !previewUrl) return
    if (previewToggleCooldownRef.current !== null) return
    armPreviewToggleCooldown()
    startPreviewPlayback()
  }, [armPreviewToggleCooldown, previewKind, previewUrl, startPreviewPlayback])

  React.useEffect(() => {
    return () => {
      clearPreviewToggleCooldown()
    }
  }, [clearPreviewToggleCooldown])

  const openInlineSourcePicker = React.useCallback(() => {
    sourceFileInputRef.current?.click()
  }, [])

  const handleInlineSourceSelection = React.useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return

      if (!project) {
        toast.error('The project is still loading. Please try again in a moment.')
        return
      }

      try {
        const stagedSource = await stageSourceFile(file, {
          allowedMediaKinds: ['video'],
        })

        if (!stagedSource) return

        const sessionSourcePreview = setSessionSourcePreview({
          projectId,
          file,
          previewKind: stagedSource.previewKind ?? 'video',
          sourceAssetId: stagedSource.assetId,
        })

        if (sessionSourcePreview) {
          setHandoffPreview({
            sourceKey: stagedSource.assetId,
            url: sessionSourcePreview.url,
            kind: sessionSourcePreview.kind,
          })
        }

        const nextProject = projects.update(project.id, {
          sourceAssetId: stagedSource.assetId,
          previewKind: stagedSource.previewKind ?? 'video',
          thumbnailUrl: '',
          sourceProfile: stagedSource.sourceProfile ?? project.sourceProfile,
        })

        if (nextProject) setProject(nextProject)

        setPreviewPlaying(false)
        previewPlaybackIntentRef.current = 'paused'
        previewPlaybackCommandRef.current += 1
        setPreviewCurrentTimeSec(0)
        setPreviewDurationSec(0)
        setPreviewIntrinsicAspectRatio(null)
        setPreviewFramePreset('source')
        setViralClipSplitPreviewActive(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to stage that source video right now.')
      }
    },
    [project, projectId, stageSourceFile],
  )

  const handleInlineSourceFileInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.currentTarget.files ?? [])
      event.currentTarget.value = ''
      void handleInlineSourceSelection(files)
    },
    [handleInlineSourceSelection],
  )

  const handleInlineSourceDrop = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      setIsInlineSourceDragOver(false)
      void handleInlineSourceSelection(Array.from(event.dataTransfer.files ?? []))
    },
    [handleInlineSourceSelection],
  )

  const handleInlineSourceDragOver = React.useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsInlineSourceDragOver(true)
  }, [])

  const handleInlineSourceDragLeave = React.useCallback(() => {
    setIsInlineSourceDragOver(false)
  }, [])

  const hasSourceAsset = Boolean(project?.sourceAssetId)

  const [isIterationModalOpen, setIsIterationModalOpen] = React.useState(false)

  // GSAP Load Sequence
  React.useEffect(() => {
    if (isDeferredChromeReady && !isMobile) {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".glass-panel", { 
        y: 20, 
        opacity: 0, 
        duration: 0.8, 
        stagger: 0.1 
      })
      .from(".timeline-container", {
        y: 40,
        opacity: 0,
        duration: 0.6
      }, "-=0.4")
      .from(".node-canvas", {
        x: 40,
        opacity: 0,
        duration: 0.6
      }, "-=0.4");
    }
  }, [isDeferredChromeReady, isMobile])

  if (isMobile) {
    return (
      <>
        <MobileEditorView
          project={project}
          projectId={projectId}
          projectTitle={project?.title ?? 'Untitled Project'}
          statusLabel={getMobileEditorStatus({ hasSourceAsset, job })}
          saveStatus={saveStatus}
          job={job}
          progressPercent={progressPercent}
          sourceMetrics={sourceMetrics}
          previewUrl={previewUrl}
          previewKind={previewKind}
          hasPreviewMedia={hasPreviewMedia}
          sourceLabel={sourceAssetLabel ?? project?.title ?? 'Source video'}
          objectFit={fitMode === 'fill' ? 'cover' : 'contain'}
          mediaTransformStyle={shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle}
          currentTimeLabel={transportCurrentTime}
          durationLabel={transportTime}
          currentTimeSec={previewCurrentTimeSec}
          durationSec={transportDurationSec}
          previewPlaying={previewPlaying}
          previewMuted={isPreviewMuted}
          motionVideoRef={previewVideoRef}
          musicTracks={editorMusicRecommendations}
          selectedMusicTrackId={selectedEditorMusicTrackId}
          videoContext={videoContext}
          initialPrompt={promptText}
          initialSources={sourceList}
          latestExport={latestExport}
          isExporting={isExporting}
          isDownloading={isDownloading}
          clipRelayState={clipRelayState}
          automationRequest={composerAutomationRequest}
          onTogglePlayback={togglePreviewPlayback}
          onSeekPreview={handlePreviewSeekSeconds}
          onVideoLoadedMetadata={handlePreviewMetadataLoaded}
          onVideoLoadedData={handlePreviewVideoReady}
          onVideoCanPlay={handlePreviewVideoReady}
          onVideoTimeUpdate={handlePreviewTimeUpdate}
          onVideoEnded={handlePreviewEnded}
          onVideoPlay={handlePreviewVideoPlay}
          onVideoPause={handlePreviewVideoPause}
          onVideoError={handlePreviewVideoError}
          onImageLoaded={handlePreviewImageLoaded}
          onApplyMotionPrompt={handleMotionCanvasPrompt}
          onBack={handleMobileBackNavigation}
          onOpenUploadNewProject={() => setIsNewProjectUploadOpen(true)}
          onSelectMusicTrack={handleEditorMusicTrackSelect}
          onEditRequest={handleEditRequest}
          onSave={handleAutoSave}
          onStartExport={handlePrepareExport}
          onDownloadLatest={handleConfirmDownload}
        />
        <EditorNewProjectUploadDialog open={isNewProjectUploadOpen} onOpenChange={setIsNewProjectUploadOpen} />
      </>
    )
  }

  return (
    <>
      <div className="relative h-[100dvh] overflow-hidden bg-black text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_-12%,rgba(255,255,255,0.055)_0%,rgba(255,255,255,0)_34%),linear-gradient(180deg,#000_0%,#030304_44%,#000_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.035)_0_1px,transparent_1.2px)] bg-[length:7px_7px] opacity-[0.24]"
      />

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <EditorHeader
          project={project}
          job={job}
          saveStatus={saveStatus}
          progressPercent={progressPercent}
          isEditingTitle={isEditingTitle}
          tempTitle={tempTitle}
          setTempTitle={setTempTitle}
          titleInputRef={titleInputRef}
          activeWorkspaceTab={activeWorkspaceTab}
          isDeferredChromeReady={isDeferredChromeReady}
          isExporting={isExporting}
          isDownloading={isDownloading}
          latestExport={latestExport}
          hasSourceAsset={hasSourceAsset}
          headerNavItems={WORKSPACE_TABS.map(tab => ({
            name: tab.key,
            icon: tab.icon
          }))}
          onTitleSave={handleTitleSave}
          onTitleKeyDown={handleTitleKeyDown}
          onTitleStartEdit={handleTitleStartEdit}
          onWorkspaceTabChange={(tab) => {
            if (tab === 'Motion') {
              router.push('/editor/motion')
              return
            }

            setActiveWorkspaceTab(tab as HeaderNavMode)
          }}
          onPrepareExport={handlePrepareExport}
          onDownload={handleDownload}
        />

        <main
          className={cn(
            'relative z-20 mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden lg:overflow-hidden',
            activeWorkspaceTab === 'Motion'
              ? 'max-w-none px-0 py-0 pb-0 lg:px-0 lg:pb-0'
              : 'max-w-[1580px] px-3 py-3 pb-24 lg:pb-4 lg:px-5 xl:px-6',
          )}
        >
          <div
            className={cn(
              'grid min-h-0 w-full items-stretch gap-[clamp(0.75rem,1vw,1rem)] lg:h-full lg:overflow-hidden lg:grid-rows-[minmax(0,1fr)]',
              activeWorkspaceTab === 'Motion'
                ? 'gap-0 lg:grid-cols-[minmax(0,1fr)]'
                : 'lg:grid-cols-[minmax(0,1fr)]',
            )}
          >
            <section
              className={cn(
                'editorial-chamber-shell relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-black',
                'rounded-none',
              )}
            >
              <motion.div
                variants={buildRevealVariants({ delay: 0.08, distance: 12, blur: 8, duration: 0.26 })}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.45 }}
                className="shrink-0 bg-black px-4 py-3"
              >
                <div className="flex justify-end">
                  <div className="inline-flex items-center gap-2 text-white/48">
                    {activeWorkspaceTab === 'Editor' ? (
                      <ViralClipTrigger
                        active={clipModeActive || viralClipTriggerBusy}
                        processing={viralClipTriggerBusy}
                        disabled={clipModeActive || viralClipTriggerBusy}
                        onLockedHoverChange={setIsLockedViralClipTriggerHovered}
                        onActivate={() => {
                          void handleGenerateViralClips()
                        }}
                      />
                    ) : null}
                    <MagneticSparkleButton />
                  </div>
                </div>
              </motion.div>

              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  activeWorkspaceTab === 'Motion'
                    ? 'overflow-hidden px-0 py-0'
                    : activeWorkspaceTab === 'Music'
                      ? 'overflow-hidden px-4 py-4'
                    : 'overflow-y-auto overscroll-contain bg-black py-3',
                  activeWorkspaceTab === 'Editor' && 'px-4 gap-6 justify-center',
                )}
              >
                {activeWorkspaceTab === 'Music' ? (
                  <MusicTabPanel
                    tracks={editorMusicRecommendations}
                    projectTitle={project?.title ?? 'Untitled Project'}
                    selectedTrackId={selectedEditorMusicTrackId}
                    onSelectTrack={handleEditorMusicTrackSelect}
                  />
                ) : null}

                {activeWorkspaceTab === 'Motion' ? (
                  <div className="flex flex-col flex-1 min-h-0 bg-[#050608]">
                    <div className="flex-1 min-h-0 relative">
                      <MotionPropertyCanvas
                        projectTitle={project?.title ?? 'Untitled Project'}
                        previewUrl={previewUrl}
                        previewKind={previewKind}
                        hasPreviewMedia={hasPreviewMedia}
                        sourceLabel={sourceAssetLabel ?? project?.title ?? 'Source video'}
                        objectFit={fitMode === 'fill' ? 'cover' : 'contain'}
                        mediaTransformStyle={shouldUseLegacySessionPreviewSurface ? undefined : previewFrameTransformStyle}
                        currentTimeLabel={transportCurrentTime}
                        durationLabel={transportTime}
                        currentTimeSec={previewCurrentTimeSec}
                        durationSec={transportDurationSec}
                        previewPlaying={previewPlaying}
                        previewMuted={isPreviewMuted}
                        videoRef={previewVideoRef}
                        onTogglePlayback={togglePreviewPlayback}
                        onPickSource={openInlineSourcePicker}
                        onSeek={handlePreviewSeekSeconds}
                        onVideoLoadedMetadata={handlePreviewMetadataLoaded}
                        onVideoLoadedData={handlePreviewVideoReady}
                        onVideoCanPlay={handlePreviewVideoReady}
                        onVideoTimeUpdate={handlePreviewTimeUpdate}
                        onVideoEnded={handlePreviewEnded}
                        onVideoPlay={handlePreviewVideoPlay}
                        onVideoPause={handlePreviewVideoPause}
                        onVideoError={handlePreviewVideoError}
                        onImageLoaded={handlePreviewImageLoaded}
                        onApplyPrompt={handleMotionCanvasPrompt}
                      />
                    </div>
                    <TimelineEngine />
                    <SceneEditor />
                  </div>
                ) : null}

                {activeWorkspaceTab === 'Editor' && (
                  <>
                    <PreviewCanvas
                      projectId={projectId}
                      project={project}
                      job={job}
                      activeWorkspaceTab={activeWorkspaceTab}
                      hasSourceAsset={hasSourceAsset}
                      hasPreviewMedia={hasPreviewMedia}
                      clipModeActive={clipModeActive}
                      sourceAssetLabel={sourceAssetLabel}
                      previewOverlayPlan={previewOverlayPlan}
                      previewCurrentTimeSec={previewCurrentTimeSec}
                      transportCurrentTime={transportCurrentTime}
                      transportTime={transportTime}
                      showViralClipSplitPreview={showViralClipSplitPreview}
                      viralClipSplitAnimationKey={viralClipSplitAnimationKey}
                      previewUrl={previewUrl}
                      previewKind={previewKind}
                      previewPlaying={previewPlaying}
                      shouldUseLegacySessionPreviewSurface={shouldUseLegacySessionPreviewSurface}
                      previewFrameTransformStyle={previewFrameTransformStyle}
                      fitMode={fitMode}
                      currentSplitPreviewAssets={currentSplitPreviewAssets}
                      isLockedViralClipTriggerHovered={isLockedViralClipTriggerHovered}
                      isPreviewMuted={isPreviewMuted}
                      isPreviewMediaReady={isPreviewMediaReady}
                      isSourceStageActivelyLoading={isSourceStageActivelyLoading}
                      isPreviewBriefGenerating={isPreviewBriefGenerating}
                      showPreviewFeedback={showPreviewFeedback}
                      showInlinePreviewStatus={showInlinePreviewStatus}
                      sourceStageError={sourceStageError}
                      inlinePreviewStatusLabel={inlinePreviewStatusLabel}
                      isInlinePreviewStatusExpanded={isInlinePreviewStatusExpanded}
                      isInlineSourceDragOver={isInlineSourceDragOver}
                      visiblePreviewAspectRatio={visiblePreviewAspectRatio}
                      previewFrameWidth={previewFrameWidth}
                      musicSpotlightPortalRef={setMusicSpotlightPortalTarget}
                      sourceFileInputRef={sourceFileInputRef}
                      previewVideoRef={previewVideoRef}
                      onInlineSourceFileInputChange={handleInlineSourceFileInputChange}
                      onRestoreLandscape={handleRestoreLandscapePreview}
                      onPreviewImageLoaded={handlePreviewImageLoaded}
                      onPreviewMetadataLoaded={handlePreviewMetadataLoaded}
                      onPreviewVideoReady={handlePreviewVideoReady}
                      onPreviewTimeUpdate={handlePreviewTimeUpdate}
                      onPreviewEnded={handlePreviewEnded}
                      onPreviewVideoPlay={handlePreviewVideoPlay}
                      onPreviewVideoPause={handlePreviewVideoPause}
                      onPreviewVideoError={handlePreviewVideoError}
                      onTogglePreviewPlayback={togglePreviewPlayback}
                      onSetIsPreviewBriefGenerating={setIsPreviewBriefGenerating}
                      onSetShowPreviewFeedback={setShowPreviewFeedback}
                      onSetInlinePreviewStatusHovered={setInlinePreviewStatusHovered}
                      onPickSource={openInlineSourcePicker}
                      onInlineSourceDragOver={handleInlineSourceDragOver}
                      onInlineSourceDragLeave={handleInlineSourceDragLeave}
                      onInlineSourceDrop={handleInlineSourceDrop}
                    />

                    <TimelinePanel
                      activeWorkspaceTab={activeWorkspaceTab}
                      previewKind={previewKind}
                      previewUrl={previewUrl}
                      previewPlaying={previewPlaying}
                      transportCurrentTime={transportCurrentTime}
                      transportTime={transportTime}
                      transportProgress={transportProgress}
                      isPreviewMuted={isPreviewMuted}
                      project={project}
                      bottomMode={bottomMode}
                      onTogglePlayback={togglePreviewPlayback}
                      onSeek={handlePreviewSeek}
                      onToggleMute={() => setIsPreviewMuted((prev) => !prev)}
                      onSetBottomMode={setBottomMode}
                    />
                  </>
                )}
              </div>
            </section>

          </div>
        </main>
      </div>
      </div>

      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="max-w-[480px] border-white/12 bg-[#0e1016]/95 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(circle_at_32%_22%,rgba(155,142,255,0.14)_0%,rgba(155,142,255,0)_42%)]" />

          <DialogHeader className="relative">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Download className="size-6 text-[#9ff6e3]" />
            </div>
            <DialogTitle className="text-2xl font-medium tracking-tight">Prepare final download?</DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-white/60">
              Your export is ready. This prototype download uses the current source-backed export proof. Real rendered edits will replace this in the render worker phase.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mx-6 mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Project</span>
              <span className="font-medium text-white/90">{project?.title ?? 'Untitled'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Completed
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Type</span>
              <span className="text-white/80">MP4 Video</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">Security</span>
              <span className="text-white/50">Signed R2 Link</span>
            </div>
          </div>

          <DialogFooter className="relative mt-6 gap-3 px-6 pb-6">
            <Button
              variant="ghost"
              onClick={() => setIsDownloadDialogOpen(false)}
              className="h-11 flex-1 rounded-xl border border-white/8 bg-white/5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDownload}
              className="h-11 flex-1 rounded-xl bg-white text-sm font-medium text-black transition-all hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            >
              Download MP4
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden"
      >
        <ChatWorkspacePanel
          key={`desktop-chat-${projectId}`}
          projectId={projectId}
          projectTitle={project?.title ?? 'Untitled Project'}
          initialPrompt={promptText}
          initialSources={sourceList}
          videoContext={videoContext}
          composerPortalTarget={chatComposerPortal}
          automationRequest={composerAutomationRequest}
          clipRelayState={clipRelayState}
          musicSpotlightPortalTarget={musicSpotlightPortalTarget}
          onEditRequest={handleEditRequest}
          initialEditorState={project?.editorState}
          onSave={handleAutoSave}
        />
      </div>
      <EditorNewProjectUploadDialog open={isNewProjectUploadOpen} onOpenChange={setIsNewProjectUploadOpen} />
      <div
        ref={setChatComposerPortal}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[120] h-0 w-0 overflow-visible"
      />
    </>
  )
}

function MagneticSparkleButton() {
  const reduceMotion = useStableReducedMotion()
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 9
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 9
    setOffset({ x, y })
  }, [reduceMotion])

  const resetOffset = React.useCallback(() => {
    setOffset({ x: 0, y: 0 })
  }, [])

  return (
    <motion.button
      type="button"
      aria-label="AI direction control inactive"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetOffset}
      onBlur={resetOffset}
      className="group relative grid size-9 place-items-center rounded-full border border-white/10 bg-black text-white/58 shadow-[0_18px_34px_-26px_rgba(0,0,0,0.98),0_0_0_1px_rgba(156,134,255,0.04),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,color,box-shadow] duration-300 hover:border-[#9c86ff]/32 hover:text-white hover:shadow-[0_18px_38px_-24px_rgba(0,0,0,1),0_0_24px_-16px_rgba(156,134,255,0.65),inset_0_1px_0_rgba(255,255,255,0.14)]"
      animate={reduceMotion ? undefined : { x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, mass: 0.55 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
    >
      <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_42%),radial-gradient(circle_at_75%_88%,rgba(156,134,255,0.18)_0%,rgba(156,134,255,0)_46%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <Sparkles className="relative size-4" />
    </motion.button>
  )
}
function InspectorField({
  label,
  value,
  children,
  viewportRoot,
  revealDelay = 0,
}: {
  label: string
  value: string
  children: React.ReactNode
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  revealDelay?: number
}) {
  const reduceMotion = useStableReducedMotion()
  return (
    <motion.div
      variants={buildRevealVariants({ delay: revealDelay, distance: 12, blur: 8, duration: 0.26 })}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={reduceMotion ? undefined : { root: viewportRoot, once: false, amount: 0.4 }}
      className="mt-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-white/42">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
    </motion.div>
  )
}

function InspectorNumberField({
  label,
  value,
  onChange,
  viewportRoot,
  revealDelay = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  revealDelay?: number
}) {
  const reduceMotion = useStableReducedMotion()
  return (
    <motion.label
      variants={buildRevealVariants({ delay: revealDelay, distance: 12, blur: 8, duration: 0.26 })}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={reduceMotion ? undefined : { root: viewportRoot, once: false, amount: 0.4 }}
      className="block"
    >
      <div className="mb-2 text-xs text-white/42">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-[14px] border border-white/8 bg-[#0d0d12] px-3 text-sm text-white outline-none transition-colors focus:border-white/16"
      />
    </motion.label>
  )
}

function InspectorMeta({
  label,
  value,
  viewportRoot,
  revealDelay = 0,
}: {
  label: string
  value: string
  viewportRoot?: React.RefObject<HTMLDivElement | null>
  revealDelay?: number
}) {
  const reduceMotion = useStableReducedMotion()
  return (
    <motion.div
      variants={buildRevealVariants({ delay: revealDelay, distance: 10, blur: 6, duration: 0.24 })}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'visible'}
      viewport={reduceMotion ? undefined : { root: viewportRoot, once: false, amount: 0.4 }}
      className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-[#0d0d12] px-3 py-3"
    >
      <span className="text-white/42">{label}</span>
      <span className="max-w-[60%] truncate text-right text-white/78">{value}</span>
    </motion.div>
  )
}

function EditorShell({ children }: { children: React.ReactNode }) {
  const { selection, setShowCommandBubble } = useEditor()
  
  return (
    <>
      {children}
      {selection && (
        <button
          onClick={() => setShowCommandBubble(true)}
          className="lg:hidden fixed bottom-6 right-6 z-50 
            size-14 rounded-full bg-accent-cyan text-void 
            shadow-lg shadow-accent-cyan/20 
            active:scale-95 transition-transform
            flex items-center justify-center"
          aria-label="Open command palette"
        >
          <Sparkles className="size-6" />
        </button>
      )}
      <CommandBubble />
      <ExportDrawer />
      <CircularToast />
    </>
  )
}

export default function EditorPageWrapper(props: any) {
  return (
    <EditorProvider>
      <EditorShell>
        <OriginalEditorPage {...props} />
      </EditorShell>
    </EditorProvider>
  )
}
