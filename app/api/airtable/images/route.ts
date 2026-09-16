import { NextResponse } from 'next/server'
import {
  AIRTABLE_IMAGE_FIELD_ID,
  AIRTABLE_NAME_FIELD_ID,
  getAirtableEnv,
  readAirtableErrorMessage,
} from '@/app/api/airtable/_utils'

export const runtime = 'nodejs'

type AirtableAttachment = {
  url?: string
  filename?: string
  type?: string
  size?: number
}

type AirtableRecord = {
  id: string
  fields?: Record<string, unknown>
}

type AirtableListResponse = {
  records: AirtableRecord[]
  offset?: string
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function asAttachmentArray(value: unknown): AirtableAttachment[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is AirtableAttachment => !!x && typeof x === 'object')
}

export async function GET(req: Request) {
  const envResult = getAirtableEnv()
  if (!envResult.ok) {
    return NextResponse.json(
      { ok: false, where: 'env', missing: envResult.missing },
      { status: 500 }
    )
  }

  const { token, baseId, tableId } = envResult.env
  console.log('[Airtable] config', { baseId, tableId })

  const { searchParams } = new URL(req.url)
  const parsedLimit = Number(searchParams.get('limit') ?? '50')
  const limit = clamp(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1, 200)

  const items: Array<{
    id: string
    name: string | null
    images: Array<{ url: string; filename: string; type: string; size: number }>
  }> = []

  let offset: string | undefined

  while (items.length < limit) {
    const pageSize = Math.min(100, limit - items.length)

    const params = new URLSearchParams()
    params.set('pageSize', String(pageSize))
    params.append('fields[]', AIRTABLE_NAME_FIELD_ID)
    params.append('fields[]', AIRTABLE_IMAGE_FIELD_ID)
    if (offset) params.set('offset', offset)

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const message = await readAirtableErrorMessage(res)
      console.error('[Airtable] images fetch failed', {
        baseId,
        tableId,
        status: res.status,
        error: message,
      })

      return NextResponse.json(
        { ok: false, where: 'airtable', status: res.status, error: message },
        { status: res.status === 403 ? 403 : res.status }
      )
    }

    const data = (await res.json()) as AirtableListResponse
    for (const record of data.records ?? []) {
      const fields = record.fields ?? {}
      const name = asStringOrNull(fields[AIRTABLE_NAME_FIELD_ID]) ?? null
      const attachments = asAttachmentArray(fields[AIRTABLE_IMAGE_FIELD_ID])

      const images = attachments
        .map((att) => {
          const url = typeof att.url === 'string' ? att.url : null
          if (!url) return null
          return {
            url,
            filename: typeof att.filename === 'string' ? att.filename : '',
            type: typeof att.type === 'string' ? att.type : '',
            size: typeof att.size === 'number' ? att.size : 0,
          }
        })
        .filter((x): x is NonNullable<typeof x> => !!x)

      items.push({ id: record.id, name, images })
      if (items.length >= limit) break
    }

    offset = data.offset
    if (!offset) break
  }

  return NextResponse.json(
    { ok: true, items },
    {
      status: 200,
      // Public preset imagery — edge-cache with long background refresh.
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' },
    },
  )
}
