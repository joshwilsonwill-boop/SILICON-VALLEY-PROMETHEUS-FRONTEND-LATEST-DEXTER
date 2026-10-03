export type FrameTargetType = 'single' | 'range'

export type RevisionIntent =
  | 'modify_animation'
  | 'replace_asset'
  | 'remove_asset'
  | 'adjust_speed'
  | 'smooth_motion'
  | 'replicate_reference'
  | 'generic_revision'

export type RevisionRegionCategory =
  | 'animation'
  | 'overlay'
  | 'graph'
  | 'typography'
  | 'transition'
  | 'sticker'
  | 'scene'
  | 'asset'

export type RevisionRegionSource = 'backend_log' | 'inferred' | 'manual'

export interface FrameTarget {
  type: FrameTargetType
  startFrame: number
  endFrame: number
}

export interface RevisionableRegion {
  id: string
  label: string
  startFrame: number
  endFrame: number
  startTimeMs?: number | null
  endTimeMs?: number | null
  category: RevisionRegionCategory
  thumbnailUrl?: string | null
  assetNames?: string[]
  confidence?: number | null
  source: RevisionRegionSource
  isExact?: boolean
  approximate?: boolean
}

export interface FrameTargetHistoryEntry {
  id: string
  label: string
  startFrame: number
  endFrame: number
  category: RevisionRegionCategory
  thumbnailUrl?: string | null
  matchedRegionId?: string | null
  matchedRegionLabel?: string | null
  selectedAt: string
  approximate?: boolean
}

export interface FrameReferenceParseResult {
  rawText: string
  displayText: string
  cleanInstructionText: string
  triggerText: string | null
  triggerState: 'inactive' | 'partial' | 'ready' | 'invalid'
  triggerStartIndex: number | null
  triggerEndIndex: number | null
  frameTarget: FrameTarget | null
  frameText: string | null
  referenceText: string | null
  referenceStartIndex: number | null
  referenceEndIndex: number | null
  isActive: boolean
  isPartial: boolean
  isValid: boolean
  validationNote: string | null
}

export type FrameSuggestionKind = 'exact' | 'nearby' | 'recent' | 'manual'

export interface FrameSuggestion {
  id: string
  kind: FrameSuggestionKind
  label: string
  description: string
  canonicalText: string
  thumbnailUrl?: string | null
  region?: RevisionableRegion | null
  frameTarget: FrameTarget
  category: RevisionRegionCategory | 'manual'
  confidence?: number | null
  isExact: boolean
}

export interface FrameAssistAttachment {
  id: string
  type: 'reference_image' | 'graph_screenshot' | 'motion_asset' | 'frame_still'
  label: string
  url?: string | null
}

export interface CreativeMetadata {
  mood?: string
  platform?: string
  audience?: string
  goals?: string[]
  focusAreas?: string[]
  energy?: string
  styleId?: string
  intensity?: 'subtle' | 'balanced' | 'bold' | 'maximum'
  rememberPreference?: boolean
  optionalNotes?: string
  pacing?: string
  captionStyle?: string
  musicEnergy?: string
  motionIntensity?: string
  tone?: string
  bigVision?: string
  editorialQuestions?: string[]
  proTipShown?: string
}

export interface EditorialRevisionRequest {
  rawText: string
  displayText: string
  instructionText: string
  frameTarget: FrameTarget | null
  matchedRegionId: string | null
  matchedRegionLabel: string | null
  selectedRegionMetadata: RevisionableRegion | null
  previewThumbnailUrl: string | null
  attachments: FrameAssistAttachment[]
  intent: RevisionIntent
  metadata?: CreativeMetadata
}

export interface QueuedPreviewRevisionState {
  requestId: string
  request: EditorialRevisionRequest
  queuedAt: string
  etaMs: number
  status: 'queueing' | 'queued' | 'processing' | 'completed' | 'failed'
  previewUrl?: string
  error?: string
}

export interface FrameAssistSubmission {
  rawText: string
  analysis: FrameReferenceParseResult
  revisionRequest: EditorialRevisionRequest
}
