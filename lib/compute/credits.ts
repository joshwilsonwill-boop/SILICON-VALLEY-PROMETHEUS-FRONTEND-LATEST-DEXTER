import { createClient } from '@supabase/supabase-js'
import { COMPUTE_COSTS, type ComputeOperation, type ComputeConfirmation } from './policy'
export class ComputeError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message) }
}
export function creditClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new ComputeError('Credit service is unavailable. Please try again later.', 503, 'CREDITS_UNAVAILABLE')
  return createClient(url, key, { auth: { persistSession: false } })
}
export async function getCreditBalance(userId: string) {
  const now = new Date().toISOString()
  const { data, error } = await creditClient().from('dodo_credits').select('total_remaining').eq('user_id', userId).eq('credit_type', 'ai_generation')
    .or(`period_end.is.null,period_end.gt.${now}`).or(`period_start.is.null,period_start.lte.${now}`)
  if (error) throw new ComputeError('Unable to check your credit balance.', 503, 'CREDITS_UNAVAILABLE')
  return (data ?? []).reduce((total, row) => total + Math.max(0, Number(row.total_remaining) || 0), 0)
}
export async function reserveCompute(userId: string, operation: ComputeOperation, confirmation: ComputeConfirmation | null, resourceId: string) {
  if (!confirmation) throw new ComputeError('Review the credit cost and confirm before continuing.', 428, 'CONFIRMATION_REQUIRED')
  const { data, error } = await creditClient().rpc('reserve_compute_credits', {
    p_user_id: userId, p_request_id: confirmation.requestId, p_operation: operation, p_resource_id: resourceId, p_cost: COMPUTE_COSTS[operation],
  })
  if (error) {
    if (error.message.includes('Insufficient credits')) throw new ComputeError('Insufficient credits. Add credits in Billing to continue.', 402, 'INSUFFICIENT_CREDITS')
    if (error.message.includes('Request already used')) throw new ComputeError('This request is already running or completed.', 409, 'REQUEST_ALREADY_USED')
    throw new ComputeError('Credit reservation is unavailable. No compute was started.', 503, 'CREDITS_UNAVAILABLE')
  }
  if (!data) throw new ComputeError('Credit reservation failed. No compute was started.', 503, 'CREDITS_UNAVAILABLE')
  return confirmation.requestId
}
export async function settleCompute(userId: string, requestId: string, outcome: 'completed' | 'refunded') {
  const { error } = await creditClient().rpc('settle_compute_credits', { p_user_id: userId, p_request_id: requestId, p_outcome: outcome })
  if (error) throw new ComputeError('Credit reconciliation is pending. Contact support with your request ID.', 503, 'CREDIT_RECONCILIATION_PENDING')
}
export function computeErrorResponse(error: unknown) {
  return error instanceof ComputeError ? Response.json({ error: error.message, code: error.code }, { status: error.status }) : null
}

export async function linkComputeJob(userId: string, requestId: string, jobId: string) {
  const { error } = await creditClient().from('compute_credit_reservations').update({ external_job_id: jobId }).eq('user_id', userId).eq('request_id', requestId)
  if (error) throw new ComputeError('Job started, but tracking could not be saved. Contact support with your request ID.', 503, 'JOB_TRACKING_PENDING')
}

export async function findComputeJob(userId: string, jobId: string) {
  const { data, error } = await creditClient().from('compute_credit_reservations').select('request_id,status,operation').eq('user_id', userId).eq('external_job_id', jobId).maybeSingle()
  if (error) throw new ComputeError('Unable to check job ownership.', 503, 'CREDITS_UNAVAILABLE')
  return data
}
