/** Existing AI-generation billing unit: one credit per requested job. */
export const COMPUTE_COSTS = { transcribe: 1, sync: 0, export: 1, enhance: 1 } as const
export type ComputeOperation = keyof typeof COMPUTE_COSTS
export type ComputeConfirmation = { confirmed: true; requestId: string }
export type ComputeQuote = { operation: ComputeOperation; cost: number; balance: number; canAfford: boolean }
export function isComputeOperation(value: string): value is ComputeOperation { return Object.hasOwn(COMPUTE_COSTS, value) }
export function parseComputeConfirmation(value: unknown): ComputeConfirmation | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  return input.confirmed === true && typeof input.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)
    ? { confirmed: true, requestId: input.requestId } : null
}
