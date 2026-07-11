export type AnimationPhase =
  | 'rotating'
  | 'tilting'
  | 'contracting'
  | 'black'
  | 'rebuilding'
  | 'settling'

export interface AnimationState {
  phase: AnimationPhase
  phaseProgress: number
  cycleProgress: number
  rotation: number
  tilt: number
  ringRadius: number
  blobWidth: number
  blobHeight: number
  blobRoundness: number
  centerDotRadius: number
  opacity: number
  glowIntensity: number
  brightnessOffset: number
}

export interface RingParams {
  cx: number
  cy: number
  outerRadius: number
  innerRadius: number
  rotation: number
  tilt: number
  brightnessArc: number
  brightnessOffset: number
  opacity: number
}

export interface BlobParams {
  cx: number
  cy: number
  width: number
  height: number
  roundness: number
  opacity: number
}

export interface ReflectionParams {
  cx: number
  cy: number
  reflectY: number
  height: number
  opacity: number
}

export interface RingRendererOptions {
  inline?: boolean
  dpr?: number
}
