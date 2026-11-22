export type OracleStage =
  | 'queued'
  | 'transcribing'
  | 'segmenting'
  | 'scoring'
  | 'ranking'
  | 'completed'
  | 'failed'

export interface UploadUrlRequest {
  filename: string
  contentType: string
}

export interface UploadUrlResponse {
  uploadUrl: string
  key: string
  bucket: string
  publicUrl?: string
  expiresInSeconds?: number
  requiredHeaders?: Record<string, string>
  method: 'PUT'
}

export interface DesignOptions {
  aspectRatio?: '9:16' | '16:9' | '1:1'
  stylePreset?: string
  captionStyle?: string
  colorTheme?: string
  targetDurationSeconds?: number
  pacing?: 'dynamic' | 'balanced' | 'fast'
}

export interface ProcessMetadata {
  creativePrompt?: string
  designOptions?: DesignOptions
  [key: string]: unknown
}

export interface ProcessRequest {
  bucket: string
  key: string
  filename: string
  contentType: string
  mediaUrl?: string
  metadata?: ProcessMetadata
}

export interface ProcessUrls {
  status: string
  preview: string
  render: string
  events: string
}

export interface ProcessResponse {
  jobId: string
  sessionId: string
  status: OracleStage
  urls: ProcessUrls
}

export interface SessionStatusResponse {
  sessionId: string
  jobId?: string
  status: OracleStage
  stage?: OracleStage
  progress?: number
  error?: string
  metadata?: ProcessMetadata
  previewUrl?: string
  renderUrl?: string
  resultUrl?: string
  downloadUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface OracleEvent {
  type: 'stage_change' | 'progress' | 'error' | 'complete' | string
  stage?: OracleStage
  progress?: number
  message?: string
  timestamp?: string
  data?: unknown
}

export interface RenderRequest {
  resolution?: '1080p' | '720p' | '4k' | string
  quality?: 'standard' | 'high' | 'ultra' | string
  format?: 'mp4' | 'mov' | 'webm' | string
  metadata?: Record<string, unknown>
}

export interface RenderStatusResponse {
  renderJobId: string
  status: 'queued' | 'rendering' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  signedUrl?: string
  error?: string
}

export interface MyVideoItem {
  id: string
  sessionId: string
  jobId?: string
  title: string
  filename: string
  status: OracleStage
  previewUrl?: string
  downloadUrl?: string
  createdAt: string
  updatedAt?: string
  metadata?: ProcessMetadata
}
