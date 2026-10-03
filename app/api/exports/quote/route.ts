import { createClient } from '@/lib/supabase/server'
import { getCreditBalance, computeErrorResponse } from '@/lib/compute/credits'
import { COMPUTE_COSTS, isComputeOperation } from '@/lib/compute/policy'
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const operation = new URL(request.url).searchParams.get('operation') ?? ''
  if (!isComputeOperation(operation)) return Response.json({ error: 'Unknown operation' }, { status: 400 })
  try {
    const balance = await getCreditBalance(user.id)
    const cost = COMPUTE_COSTS[operation]
    return Response.json({ operation, cost, balance, canAfford: balance >= cost }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return computeErrorResponse(error) ?? Response.json({ error: 'Unable to check credits.' }, { status: 503 }) }
}
