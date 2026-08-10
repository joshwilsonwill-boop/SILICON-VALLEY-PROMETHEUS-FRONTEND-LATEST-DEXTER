import type { CreativeMetadata } from '@/lib/editorial-frame/types'

export type Id = string

export type MediaKind = 'video' | 'image' | 'audio' | 'file'

export type SourceOrientation = 'portrait' | 'landscape' | 'square' | 'unknown'

export type SourceAspectFamily =
  | 'vertical_short'
  | 'horizontal_standard'
  | 'square'
  | 'ultra_wide'
  | 'high_res_vertical'
  | 'high_res_horizontal'
  | '4k_horizontal'
  | 'unknown'
  | 'unsupported'

export type DurationBucket = 'very_short' | 'short' | 'medium' | 'long' | 'very_long' | 'unknown'

export type FileWeightBucket = 'light' | 'moderate' | 'heavy' | 'very_heavy'

export type TimeProfile = 'quick_edit' | 'standard_edit' | 'long_form_edit' | 'extended_processing' | 'unknown'

export type ProcessingClass = 'standard_job' | 'heavy_job' | 'queue_job'

export interface SourceInspection {
  mediaKind: MediaKind
  mimeType: string
  fileName: string
  fileSizeBytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  durationSec: number | null
  fps: number | null
  hasAudio: boolean | null
  orientation: SourceOrientation
  estimatedBitrateMbps: number | null
}

export interface SourceProfile {
  inspection: SourceInspection
  aspectFamily: SourceAspectFamily
  durationBucket: DurationBucket
  weightBucket: FileWeightBucket
  timeProfile: TimeProfile
  processingClass: ProcessingClass
  supported: boolean
  warnings: string[]
}

export type LeftTabKey = 'chat' | 'edit' | 'design' | 'assets'
export type HeaderNavMode = 'Editor' | 'Music' | 'Motion'
export type PreviewFitMode = 'fill' | 'fit'
export type BottomMode = 'Original' | 'Music' | 'Timeline'
export type PreviewFramePreset = OutputProfile
export type PreviewMediaKind = 'video' | 'image'

export interface SessionPreviewState {
  sourceKey: string
  url: string
  kind: PreviewMediaKind
}

export type OutputProfile = 'source' | '9:16' | '16:9' | '1:1' | '4:5'

export interface ProcessingOperations {
  pacing?: {
    mode: 'leave' | 'tighten' | 'remove'
  }
  transitions?: {
    enabled: boolean
    style: 'clean' | 'cinematic' | 'social' | 'sales' | 'podcast' | 'punchy'
    intensity: 'low' | 'balanced' | 'aggressive'
  }
  textAnimation?: {
    enabled: boolean
    preset: 'kinetic_minimal' | 'clean_subtitles' | 'social_punch' | 'editorial'
  }
  colorPolish?: {
    enabled: boolean
    preset: 'balanced' | 'clean' | 'cinematic' | 'contrast'
  }
  reframe?: {
    enabled: boolean
    mode: 'keep_as_is' | 'smart_crop' | 'pad_background' | 'center_fit'
  }
}

export type MediaJobStage =
  | 'inspect_file'
  | 'prepare_upload'
  | 'uploading_source'
  | 'ingest'
  | 'transcode_working_copy'
  | 'analyze_audio_video'
  | 'build_edit_plan'
  | 'render_outputs'
  | 'optimize_delivery'
  | 'ready'
  | 'failed'

export interface AssetUploadSessionRequest {
  fileName: string
  mimeType: string
  fileSizeBytes: number
  sourceProfile: SourceProfile
}

export interface AssetUploadSessionResponse {
  assetId: Id
  uploadUrl: string
  uploadMethod: 'PUT' | 'POST'
  uploadHeaders?: Record<string, string>
  storageKey: string
}

export interface CreateMediaJobRequest {
  assetId: Id
  sourceProfile: SourceProfile
  operations: ProcessingOperations
  outputs: OutputProfile[]
}

export interface CreateMediaJobResponse {
  jobId: Id
  stage: MediaJobStage
  statusUrl: string
}

export interface MediaJobStatusSnapshot {
  jobId: Id
  assetId: Id
  state: 'queued' | 'running' | 'ready' | 'failed'
  stage: MediaJobStage
  progress: number | null
  message?: string
  outputIds?: Id[]
  previewUrl?: string
}

export type ViralClipTargetPlatform = 'youtube' | 'instagram' | 'x' | 'tiktok' | 'linkedin'

export type ViralClipJobStage =
  | 'queued'
  | 'transcribing'
  | 'segmenting'
  | 'heuristic_scoring'
  | 'llm_scoring'
  | 'ranking'
  | 'completed'
  | 'failed'

export type ViralClipJobLifecycle = 'idle' | 'submitting' | 'submitted' | 'polling' | 'completed' | 'failed'

export interface ViralClipAssetDescriptor {
  [key: string]: unknown
}

export interface ViralClipTranscriptWord {
  text: string
  start_ms: number
  end_ms: number
  confidence?: number
}

export interface ViralClipJobRequest {
  projectId: Id
  videoId: Id
  targetPlatform: ViralClipTargetPlatform
  clipCountMin: number
  clipCountMax: number
  prompt?: string
  sourceMediaRef?: string
  creatorNiche?: string
  assets?: ViralClipAssetDescriptor[]
  metadataOverrides?: Record<string, unknown>
  providedTranscript?: ViralClipTranscriptWord[]
}

export interface ViralClipJobCreationResponse {
  jobId: Id
  status?: string
  current_stage?: ViralClipJobStage | string
  stage?: ViralClipJobStage | string
  warnings?: string[]
  warning?: string | string[]
  error_message?: string
  message?: string
  [key: string]: unknown
}

export interface ViralClipJobStatusResponse {
  jobId?: Id
  status?: string
  current_stage?: ViralClipJobStage | string
  stage?: ViralClipJobStage | string
  progress?: number | { percent?: number | null; [key: string]: unknown } | null
  warnings?: string[]
  warning?: string | string[]
  error_message?: string
  message?: string
  [key: string]: unknown
}

export interface ViralClipSelectedClip {
  id?: Id
  title?: string
  label?: string
  name?: string
  reason?: string
  description?: string
  startMs?: number
  endMs?: number
  start_ms?: number
  end_ms?: number
  startTimeMs?: number
  endTimeMs?: number
  durationSec?: number
  durationMs?: number
  score?: number
  confidence?: number
  previewUrl?: string
  thumbnailUrl?: string
  tags?: string[]
  [key: string]: unknown
}

export interface ViralClipJobResultResponse {
  selected_clips?: Array<ViralClipSelectedClip | string | number | null>
  [key: string]: unknown
}

export interface BackendHealthSnapshot {
  reachable: boolean
  status: number | null
  message: string | null
  payload?: unknown
}

export type SourceStagePhase =
  | 'empty'
  | 'staging_local_preview'
  | 'persisting'
  | 'swapping_visible_preview'
  | 'ready'
  | 'failed'

export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'exported'

export interface Project {
  id: Id
  title: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string
  previewKind?: 'video' | 'image'
  sourceProfile?: SourceProfile
  sourceAssetId?: Id
  editorState?: any
  animationPlan?: AnimationPlan
}

export interface SourceAsset {
  id: Id
  projectId: Id
  userId: Id
  storageBucket?: string
  storagePath?: string
  originalFilename?: string
  mimeType?: string
  sizeBytes?: number
  durationMs?: number
  width?: number
  height?: number
  profile: any
  createdAt: string
  transcriptStatus?: TranscriptStatus
  transcriptJobId?: string
  transcriptProvider?: string
  transcriptText?: string
  transcriptError?: string
  transcriptStartedAt?: string
  transcriptCompletedAt?: string
  transcriptR2Key?: string
  transcriptSyncedAt?: string
}

export type MusicMood = 'cinematic' | 'uplifting' | 'dark' | 'minimal' | 'playful'

export type MusicEnergy = 'low' | 'medium' | 'high'

export type MusicSourcePlatform = 'online' | 'local'

export type MusicVideoPace = 'fast' | 'medium' | 'slow'

export type MusicTrendPlatform = 'spotify' | 'instagram' | 'tiktok' | 'youtube' | 'generic'

export interface MusicSentimentProfile {
  mood: MusicMood
  energy: MusicEnergy
  hookStrength: number
  ctaPressure: number
  themeTags: string[]
  summary: string
  confidence: number
}

export interface MusicTrendProfile {
  platform: MusicTrendPlatform
  weight: number
  tags: string[]
  summary: string
}

export interface MusicIntent {
  sentiment: MusicSentimentProfile
  trends: MusicTrendProfile[]
  searchTerms: string[]
  summary: string
  confidence: number
}

export type MusicDirectionIntent = {
  emotion: string
  energy: 'low' | 'medium' | 'high' | 'dynamic'
  bpmRange: string
  vocalPolicy: 'instrumental_only' | 'light_vocals_allowed' | 'no_music'
  genreFamily: string[]
  instrumentation: string[]
  intensityCurve: string
  voiceoverSafe: boolean
  avoid: string[]
  providerCandidate?: 'epidemic' | 'mubert' | 'cyanite' | 'beatoven' | 'internal_mock'
}

export interface MusicVideoContext {
  pace: MusicVideoPace
  summary: string
  signals: string[]
  confidence?: number
  intent?: MusicIntent
}

export interface MusicPreference {
  mood: MusicMood
  energy: MusicEnergy
  sourcePlatform: MusicSourcePlatform
  updatedAt?: string
}

export type MusicRecommendationGroupKey =
  | 'best-fit'
  | 'safe-fit'
  | 'creative-stretch'
  | 'high-energy-alternative'
  | 'cinematic-alternative'
  | 'minimal-ambient-alternative'

export interface MusicSoundtrackProfile {
  contentCategory: string
  primaryMood: string
  secondaryMood: string
  energyLevel: number
  tempoRange: [number, number]
  genreCandidates: string[]
  instrumentationHints: string[]
  editSyncStyle: string
  emotionalArc: string
  avoid: string[]
  confidence: number
  reasoningSummary: string
  audienceFeel: string
}

export interface MusicRecommendationPhase {
  key:
    | 'analyzing-vibe'
    | 'detecting-pacing'
    | 'inferring-mood'
    | 'building-profile'
    | 'searching-archive'
    | 'ranking-matches'
    | 'balancing-diversity'
  label: string
  detail: string
  progress: number
}

export interface MusicRecommendationGroup {
  key: MusicRecommendationGroupKey
  label: string
  description: string
  accent: string
  tracks: MusicRecommendation[]
}

export interface MusicMatchBreakdown {
  mood: number
  energy: number
  tempo: number
  genre: number
  instrumentation: number
  context: number
  avoid: number
  freshness: number
  diversity: number
  usage: number
  quality: number
}

export interface MusicRecommendation {
  id: Id
  title: string
  artist: string
  producer: string
  genre: string
  bpm: number
  vibeTags: string[]
  coverArtUrl: string
  coverArtPosition?: string
  previewUrl: string
  reason: string
  mood: MusicMood
  energy: MusicEnergy
  sourcePlatform: MusicSourcePlatform
  durationSec: number
  subtitle?: string
  description?: string
  album?: string
  releaseYear?: number
  storageKey?: string
  sourceUrl?: string
  license?: 'owned' | 'licensed' | 'public-domain' | 'internal' | 'online-preview'
  matchScore?: number
  matchedTerms?: string[]
  exactMatch?: boolean
  fitReasons?: string[]
  groupKey?: MusicRecommendationGroupKey
  groupLabel?: string
  profileConfidence?: number
  tempoWindow?: [number, number]
  matchBreakdown?: Partial<MusicMatchBreakdown>
  usagePenalty?: number
  diversityPenalty?: number
  freshnessScore?: number
  qualityScore?: number
}

export interface StagedMusicTrack {
  id: Id
  projectId: Id
  recommendation: MusicRecommendation
  addedAt: string
}

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'error'

export interface PipelineStep {
  key: 'video-analysis' | 'scene-detection' | 'audio-processing' | 'ai-enhancement'
  title: string
  status: PipelineStepStatus
  progress: number
}

export interface MusicRecommendationPipelineResult {
  profile: MusicSoundtrackProfile
  phases: MusicRecommendationPhase[]
  recommendationGroups: MusicRecommendationGroup[]
  recommendations: MusicRecommendation[]
  archiveCount: number
  source: 'groq' | 'heuristic'
  fallback: boolean
  confidence: number
  needsRefinement: boolean
  reasoningSummary: string
  variantHint?: string
  query?: string
}

export interface TranscriptSegment {
  id: Id
  startMs: number
  endMs: number
  text: string
  speaker?: string
}

export interface DetectedScene {
  id: Id
  startMs: number
  endMs: number
  label: string
}

export interface HighlightTimestamp {
  id: Id
  atMs: number
  label: string
}

export interface BRollSuggestion {
  id: Id
  startMs: number
  endMs: number
  query: string
  confidence: number
}

export type AnimationScreenRegion =
  | 'full-frame'
  | 'safe-lower-third'
  | 'center-stage'
  | 'left-panel'
  | 'right-panel'
  | 'background-wash'

export type SpeechCueVariant = 'caption' | 'heading' | 'side-call'

export type SpeechCueTreatment = 'plain' | 'highlight' | 'underline' | 'boxed'

export type SpeechCueAccentTone = 'lime' | 'rose' | 'amber' | 'ice'

export interface SpeechCue {
  id: Id
  variant: SpeechCueVariant
  startMs: number
  endMs: number
  text: string
  leadText?: string
  accentText?: string
  trailingText?: string
  treatment: SpeechCueTreatment
  tone: SpeechCueAccentTone
  region: AnimationScreenRegion
  alignment: 'left' | 'center' | 'right'
  bottomPaddingPct?: number
  maxWidthPct?: number
  transcriptId?: Id
}

export type TransitionCueType = 'line' | 'section-divider' | 'side-pan'

export interface TransitionCue {
  id: Id
  type: TransitionCueType
  startMs: number
  endMs: number
  region: AnimationScreenRegion
  direction?: 'center-out' | 'out-in' | 'left-to-right' | 'right-to-left'
  label?: string
}

export type ExplainerCueLayout = 'side-panel' | 'full-frame'

export interface ExplainerCue {
  id: Id
  startMs: number
  endMs: number
  layout: ExplainerCueLayout
  region: AnimationScreenRegion
  templateId: string
  templateType: string
  internalMotionCapable?: boolean
  textSlots: Record<string, string>
  imageSlots?: Record<string, string>
  title?: string
  concept?: string
}

export type BackgroundCueKind = 'video' | 'image'

export interface BackgroundCue {
  id: Id
  startMs: number
  endMs: number
  kind: BackgroundCueKind
  region: AnimationScreenRegion
  sourceId: string
  sourceUrl: string
  transform: 'rotateAndCover16x9' | 'softWash'
  opacity: number
  blendMode?: 'normal' | 'screen' | 'multiply' | 'overlay'
  placement?: 'full-frame' | 'left-stage' | 'right-stage'
}

export interface CounterCue {
  id: Id
  startMs: number
  endMs: number
  region: AnimationScreenRegion
  label: string
  from: number
  to: number
  prefix?: string
  suffix?: string
  format: 'number' | 'currency' | 'percent'
  icon?: 'user' | 'spark' | 'chart'
}

export interface SfxCue {
  id: Id
  startMs: number
  endMs: number
  cue: 'text-hit' | 'line-sweep' | 'counter-tick' | 'background-pop'
  intensity: 'subtle' | 'medium' | 'bold'
}

export interface AnimationPlan {
  engineVersion: string
  generatedAt: string
  registrySignature?: string
  safeZonePolicy: {
    landscapeOnly: boolean
    avoidSpeakerFace: boolean
    captionBottomPaddingPct: number
    maxCaptionWidthPct: number
  }
  speechCues: SpeechCue[]
  transitionCues: TransitionCue[]
  explainerCues: ExplainerCue[]
  backgroundCues: BackgroundCue[]
  counterCues: CounterCue[]
  sfxCues: SfxCue[]
}

export interface CinematicTemplateTextArtifact {
  id: string
  role: string
  category?: string
  slot?: string
  text: string
  charCount: number
}

export interface CinematicTemplateAsset {
  id: string
  displayName: string
  filename: string
  type: string
  macro?: string
  keywords: string[]
  imageSlotNames: string[]
  imageSlotRoles: string[]
  textSlotNames: string[]
  textSlotRoles: string[]
  textArtifacts: CinematicTemplateTextArtifact[]
  format?: string
  preferredLayout: ExplainerCueLayout
  internalMotionCapable: boolean
}

export interface CinematicBackgroundAsset {
  id: string
  displayName: string
  url: string
  width: number
  height: number
  orientation: SourceOrientation
  transform: 'rotateAndCover16x9'
}

export interface CinematicAssetRegistry {
  signature: string
  templates: CinematicTemplateAsset[]
  backgrounds: CinematicBackgroundAsset[]
}

export interface TemplateStyle {
  id: Id
  name: string
  description: string
  category: 'Iman' | 'Podcast' | 'Docs' | 'Reels' | 'Minimal'
  tags: {
    captionIntensity: 'Low' | 'Medium' | 'High'
    pacing: 'Smooth' | 'Snappy' | 'Aggressive'
    broll: 'Rare' | 'Balanced' | 'Heavy'
  }
}

export type TranscriptStatus = 'idle' | 'queued' | 'transcribing' | 'completed' | 'failed'

export interface CompiledEditBrief {
  title: string
  summary: string
  fullPrompt: string
  previewPrompt: string
  previewDurationSeconds: number
  transcriptStatus: TranscriptStatus
  transcriptUsed: boolean
  progressSteps: string[]
  renderInstructions: {
    pacing: string
    captions: string
    motion: string
    broll: string
    music: string
    color: string
    transitions: string
    typography: string
  }
  avoid: string[]
  viewerPsychology: string
}

export type ProcessingJobStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface ProcessingArtifacts {
  transcript: TranscriptSegment[]
  scenes: DetectedScene[]
  highlights: HighlightTimestamp[]
  brollSuggestions: BRollSuggestion[]
  animationPlan?: AnimationPlan
  styleId?: Id
}

export type { CreativeMetadata } from '@/lib/editorial-frame/types'
export type { StyleTemplate } from '@/lib/styles/style-templates'
import type { EditDNAProfile } from '@/lib/editorial-frame/edit-dna-router'

export interface ProcessingJobInput {
  prompt: string
  sources: string[]
  styleId?: Id
  metadata?: CreativeMetadata
  editDNA?: EditDNAProfile
}

export interface ProcessingJob {
  id: Id
  projectId: Id
  status: ProcessingJobStatus
  createdAt: string
  startedAt: string
  steps: PipelineStep[]
  input: ProcessingJobInput
  artifacts: ProcessingArtifacts
  transcriptStatus?: TranscriptStatus
  transcriptText?: string
  transcriptProvider?: 'mock' | 'assemblyai'
  transcriptJobId?: string
  editBrief?: CompiledEditBrief
  previewProgressSteps?: string[]
}

export type AssetKind = 'upload' | 'music' | 'broll' | 'font' | 'logo'

export interface AssetItem {
  id: Id
  kind: AssetKind
  name: string
  createdAt: string
  url?: string
  sizeBytes?: number
  tags?: string[]
}

export type ProjectExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ProjectExport {
  id: Id
  projectId: Id
  userId: Id
  status: ProjectExportStatus
  storageProvider: string
  storageBucket?: string
  storagePath?: string
  mimeType?: string
  fileSizeBytes?: number
  durationMs?: number
  width?: number
  height?: number
  fps?: number
  preset: string
  metadata: Record<string, any>
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
  createdAt: string
  updatedAt: string
}
