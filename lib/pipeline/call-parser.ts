/**
 * Client-side mirror of the backend call parser
 * (`mini_run_pipeline/classify.py` + `docs/mini_landscape_runs/call_parser.ts`).
 *
 * Deterministically dispatches a call to the short-form (MAUL / 9:16
 * mini-run) or long-form (Joseph / 16:9 landscape) pipeline. The backend is
 * authoritative — this mirror only decides which proxy/backend the frontend
 * should target and what metadata to attach so the backend classifies the same
 * way.
 */

export type PipelineChoice = 'maul' | 'joseph'
export type PipelineMode = 'short_form' | 'long_form'

export type CallClassification = {
  pipeline: PipelineChoice
  mode: PipelineMode
  decision: string
  reason: string
  durationSec: number | null
  aspectRatio: number | null
  confidence: number
}

export type PipelineDispatchInput = {
  durationSec?: number | null
  width?: number | null
  height?: number | null
  /** Explicit override wins over the heuristic (matches classify.py rule 1). */
  pipeline?: PipelineChoice | string | null
}

const SHORT_FORM_HINT_PATTERN = /(short|shorts|reel|reels|tiktok|9:16|portrait|hook|clip|clips|maul|viral)/i
const LONG_FORM_HINT_PATTERN = /(long|landscape|film|16:9|wide|documentary|joseph|cinematic|movie)/i

function aspectRatioOf(input: PipelineDispatchInput) {
  if (!Number.isFinite(Number(input.width)) || !Number.isFinite(Number(input.height))) return null
  const width = Number(input.width)
  const height = Number(input.height)
  if (height <= 0) return null
  return width / height
}

function promptHint(prompt?: string | null): PipelineChoice | null {
  if (!prompt) return null
  if (SHORT_FORM_HINT_PATTERN.test(prompt) && !LONG_FORM_HINT_PATTERN.test(prompt)) return 'maul'
  if (LONG_FORM_HINT_PATTERN.test(prompt) && !SHORT_FORM_HINT_PATTERN.test(prompt)) return 'joseph'
  return null
}

/**
 * Mirrors `classify_call(payload)`:
 *   1. Explicit pipeline ("maul" | "joseph") wins — confidence 1.0
 *   2. durationSec <= 90 OR portrait (aspect <= 1.0) -> maul / short_form — 0.9
 *   3. Otherwise -> joseph / long_form — 0.75
 *
 * The frontend should send `durationSec`/`width`/`height` (or an explicit
 * `pipeline`) in the render body so the backend dispatch is correct.
 */
export function classifyPipelineCall(
  input: PipelineDispatchInput,
  prompt?: string | null,
): CallClassification {
  const explicit = input.pipeline && typeof input.pipeline === 'string'
    ? input.pipeline.toLowerCase() === 'joseph'
      ? 'joseph' as PipelineChoice
      : input.pipeline.toLowerCase() === 'maul'
        ? 'maul' as PipelineChoice
        : null
    : null

  if (explicit) {
    return {
      pipeline: explicit,
      mode: explicit === 'maul' ? 'short_form' : 'long_form',
      decision: explicit === 'maul' ? 'maul / short_form' : 'joseph / long_form',
      reason: 'Explicit pipeline override.',
      durationSec: input.durationSec ?? null,
      aspectRatio: aspectRatioOf(input),
      confidence: 1,
    }
  }

  const durationSec = Number.isFinite(Number(input.durationSec)) ? Number(input.durationSec) : null
  const aspectRatio = aspectRatioOf(input)

  if (durationSec !== null && durationSec <= 90) {
    return {
      pipeline: 'maul',
      mode: 'short_form',
      decision: 'maul / short_form',
      reason: `durationSec ${durationSec} <= 90s`,
      durationSec,
      aspectRatio,
      confidence: 0.9,
    }
  }

  if (aspectRatio !== null && aspectRatio <= 1.0) {
    return {
      pipeline: 'maul',
      mode: 'short_form',
      decision: 'maul / short_form',
      reason: `portrait aspect ${aspectRatio.toFixed(3)} <= 1.0`,
      durationSec,
      aspectRatio,
      confidence: 0.9,
    }
  }

  const hint = promptHint(prompt)
  if (hint) {
    return {
      pipeline: hint,
      mode: hint === 'maul' ? 'short_form' : 'long_form',
      decision: hint === 'maul' ? 'maul / short_form' : 'joseph / long_form',
      reason: 'Prompt hint matched.',
      durationSec,
      aspectRatio,
      confidence: 0.8,
    }
  }

  return {
    pipeline: 'joseph',
    mode: 'long_form',
    decision: 'joseph / long_form',
    reason: 'fallback: long-form landscape',
    durationSec,
    aspectRatio,
    confidence: 0.75,
  }
}
