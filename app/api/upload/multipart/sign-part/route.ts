import { NextResponse } from 'next/server'
import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Client } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key, uploadId, partNumber } = await req.json()
    
    // Security check: ensure the key belongs to the user
    if (!key.startsWith(`uploads/${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'

    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    })

    const url = await getSignedUrl(r2Client as any, command, { expiresIn: 3600 })

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('[Multipart Sign Part Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
