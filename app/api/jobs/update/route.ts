import { NextResponse } from 'next/server'

export async function PATCH() {
  // Browsers may observe jobs, but may never assert worker progress/completion.
  // MAUL writes through Supabase with its server-only service role and must fence
  // completion against projects.source_asset_id before publishing results.
  return NextResponse.json(
    { error: 'Job mutation is worker-only.', code: 'WORKER_AUTH_REQUIRED', retryable: false },
    { status: 403 },
  )
}
