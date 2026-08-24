import { NextResponse } from 'next/server'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
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

    const { key, uploadId, parts } = await req.json()
    
    // Security check: ensure the key belongs to the user
    if (!key.startsWith(`uploads/${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part: any) => ({
          ETag: part.eTag || part.ETag,
          PartNumber: part.partNumber || part.PartNumber,
        })),
      },
    })

    const response = await r2Client.send(command)

    return NextResponse.json({
      location: response.Location,
      key: response.Key,
    })
  } catch (error: any) {
    console.error('[Multipart Complete Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
