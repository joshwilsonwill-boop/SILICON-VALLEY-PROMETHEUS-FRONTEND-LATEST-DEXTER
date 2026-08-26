/**
 * "What qualifies a video to get edited" — the long-form→short-form eligibility
 * heuristic used by the upload auto-dispatch.
 *
 * It mirrors the Mini-Runs dispatch decision (see
 * `mini_run_pipeline/classify.py`): a source is treated as short-form when it is
 * (a) <= 90s long OR (b) portrait (width/height <= 1.0). Anything else — i.e. a
 * landscape video longer than 90s — qualifies as long-form and is eligible for
 * automatic chunk/processor/render reduction to short-form.
 *
 * When a dimension is unknown it cannot disqualify as short-form, so the video
 * is conservatively treated as long-form (same as the backend heuristic).
 */

export const SHORT_FORM_MAX_SECONDS = 90
export const SHORT_FORM_MIN_ASPECT_RATIO = 1.0

export type SourceDimensions = {
  durationMs?: number | null
  width?: number | null
  height?: number | null
}

function finite(value: number | null | undefined): number {
  return value != null && Number.isFinite(value) ? value : Number.NaN
}

export function isLongFormSource(dimensions: SourceDimensions): boolean {
  const durationSec = finite(dimensions.durationMs) / 1000
  const width = finite(dimensions.width)
  const height = finite(dimensions.height)
  const aspect = height > 0 ? width / height : Number.NaN

  const isShortForm =
    (Number.isFinite(durationSec) && durationSec <= SHORT_FORM_MAX_SECONDS) ||
    (Number.isFinite(aspect) && aspect <= SHORT_FORM_MIN_ASPECT_RATIO)

  return !isShortForm
}
