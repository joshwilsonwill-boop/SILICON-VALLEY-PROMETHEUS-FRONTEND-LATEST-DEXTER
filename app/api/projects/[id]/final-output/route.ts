import { NextResponse } from 'next/server'

import { reconcileProjectFinalOutput } from '@/lib/final-output'
import {
  getLatestEligibleRenderReceipt,
  updateProjectRenderReceipt,
} from '@/lib/server/project-render-receipts'
import { resolveMiniRunConfig } from '@/lib/server/mini-run-proxy'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id,source_asset_id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.source_asset_id) {
    return NextResponse.json({ finalOutput: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const receipt = await getLatestEligibleRenderReceipt(supabase, {
      projectId,
      sourceAssetId: project.source_asset_id,
      userId: user.id,
    })
    if (!receipt) {
      return NextResponse.json({ finalOutput: null }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (receipt.status === 'completed' || receipt.status === 'failed') {
      return NextResponse.json({ finalOutput: receipt }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const config = resolveMiniRunConfig({
      MINI_RUN_BACKEND_URL: process.env.MINI_RUN_BACKEND_URL,
      MODAL_PROXY_KEY: process.env.MODAL_PROXY_KEY,
      MODAL_PROXY_SECRET: process.env.MODAL_PROXY_SECRET,
    })
    const reconciled = await reconcileProjectFinalOutput(receipt, async (jobId) => {
      const response = await fetch(`${config.baseUrl}/api/pipeline/job/${encodeURIComponent(jobId)}`, {
        headers: {
          Accept: 'application/json',
          'Modal-Key': config.proxyKey,
          'Modal-Secret': config.proxySecret,
        },
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : `Mini-Run status returned HTTP ${response.status}.`,
        )
      }
      return payload
    })

    const hasChanged =
      reconciled.status !== receipt.status
      || reconciled.outputUrl !== receipt.outputUrl
      || reconciled.r2Key !== receipt.r2Key
      || reconciled.errorMessage !== receipt.errorMessage
    const finalOutput = hasChanged
      ? await updateProjectRenderReceipt(supabase, receipt.id, user.id, {
          status: reconciled.status,
          outputUrl: reconciled.outputUrl,
          r2Key: reconciled.r2Key,
          errorMessage: reconciled.errorMessage,
        })
      : receipt

    return NextResponse.json({ finalOutput }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/projects/[id]/final-output] reconciliation failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Final output reconciliation failed.',
      retryable: true,
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
