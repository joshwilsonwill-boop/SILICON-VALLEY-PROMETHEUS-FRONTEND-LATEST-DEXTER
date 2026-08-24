import { NextResponse } from 'next/server'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
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

    const { filename, contentType } = await req.json()
    
    // Generate a secure, unique key
    const uniqueId = crypto.randomUUID()
    const key = `uploads/${user.id}/${uniqueId}-${filename}`
    const bucket = process.env.R2_BUCKET_SOURCES || 'prometheus-sources'

    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
      Metadata: {
        'user-id': user.id,
        'original-filename': filename
      }
    })

    const response = await r2Client.send(command)

    return NextResponse.json({
      uploadId: response.UploadId,
      key: response.Key,
    })
  } catch (error: any) {
    console.error('[Multipart Initiate Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
