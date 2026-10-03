import { creditClient, getCreditBalance } from '@/lib/compute/credits'

export async function checkCredits(userId: string, cost: number): Promise<boolean> {
  if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error('Invalid credit cost')
  return await getCreditBalance(userId) >= cost
}

export async function deductCredits(userId: string, cost: number): Promise<void> {
  if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error('Invalid credit cost')
  const supabase = creditClient()
  const { error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_cost: cost })
  if (error) throw error
}
