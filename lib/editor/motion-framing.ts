export type MotionCropRect = { left: number; top: number; width: number; height: number }

/** Remap the selected normalized region to the frame without stretching media. */
export function motionCropTransform(rect: MotionCropRect): string {
  const scale = 100 / Math.max(18, Math.min(rect.width, rect.height))
  const x = (50 - rect.left - rect.width / 2) * scale
  const y = (50 - rect.top - rect.height / 2) * scale
  return `translate(${x}%, ${y}%) scale(${scale})`
}
