import type { ComputeQuote } from '@/lib/compute/policy'

type ResponseLike = Pick<Response, 'ok' | 'json'>

export type TranscriptionRequestDependencies = {
  restart?: boolean
  fetcher: (url: string, init?: RequestInit) => Promise<ResponseLike>
  confirm: (message: string) => boolean
  newRequestId: () => string
}

/** Request a paid transcript only after the user reviews the current credit quote. */
export async function requestConfirmedTranscription(
  sourceAssetId: string,
  { restart = false, fetcher, confirm, newRequestId }: TranscriptionRequestDependencies,
): Promise<boolean> {
  const quoteResponse = await fetcher('/api/exports/quote?operation=transcribe', { cache: 'no-store' })
  const quote = (await quoteResponse.json().catch(() => null)) as (ComputeQuote & { error?: string }) | null
  if (!quoteResponse.ok) throw new Error(quote?.error || 'Unable to check transcription credits.')
  if (quote?.operation !== 'transcribe' || !Number.isFinite(quote.cost) || !Number.isFinite(quote.balance)) {
    throw new Error('Transcription credit quote is unavailable.')
  }
  if (!quote.canAfford) throw new Error(`Insufficient credits. Transcription needs ${quote.cost}; you have ${quote.balance}. Add credits in Billing to continue.`)
  if (!confirm(`Transcribe this video for ${quote.cost} credit${quote.cost === 1 ? '' : 's'}? You have ${quote.balance} credits. A failed job is refunded.`)) return false

  const response = await fetcher(`/api/assets/${encodeURIComponent(sourceAssetId)}/transcript${restart ? '?restart=1' : ''}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmed: true, requestId: newRequestId() }),
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Video transcription could not be started.')
  }
  return true
}
