import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit'
import { burnToken } from '@/lib/crypto/token-vault'
import { getValidAccessToken } from '@/lib/oauth/refresh'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const PROVIDERS = ['google_drive', 'dropbox'] as const
type Provider = (typeof PROVIDERS)[number]
const MAX_IMPORT_BYTES = 50 * 1024 * 1024
const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'webm'])

type ConnectionRow = {
  encrypted_access_token: string
  iv: string
  key_version: string
  is_active: boolean | null
}

type RemoteMusicFile = {
  id: string
  name: string
  mimeType: string
  size: number | null
  path?: string
}

async function authorizeProvider(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, provider: Provider) {
  const { data, error } = await supabase
    .from('user_connections')
    .select('encrypted_access_token, iv, key_version, is_active')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (error) throw error
  const connection = data as ConnectionRow | null
  if (!connection || connection.is_active === false) return null
  await logAudit(userId, 'token_decrypted', provider, true)
  return getValidAccessToken(userId, provider)
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Sign in to import music.' }, { status: 401 })

  const provider = new URL(request.url).searchParams.get('provider')
  if (!PROVIDERS.includes(provider as Provider)) return NextResponse.json({ error: 'Choose Google Drive or Dropbox.' }, { status: 400 })
  const selectedProvider = provider as Provider
  const token = await authorizeProvider(supabase, user.id, selectedProvider)
  if (!token) return NextResponse.json({ error: `${selectedProvider === 'google_drive' ? 'Google Drive' : 'Dropbox'} is not connected. Connect it in Settings first.` }, { status: 409 })

  try {
    const files = selectedProvider === 'google_drive'
      ? await listGoogleDriveMusic(token)
      : await listDropboxMusic(token)
    return NextResponse.json({ files, provider: selectedProvider })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read files from this account.' }, { status: 502 })
  } finally {
    burnToken(token)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Sign in to import music.' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { provider?: string; id?: string; path?: string; name?: string; mimeType?: string }
  if (!PROVIDERS.includes(body.provider as Provider) || typeof body.id !== 'string' || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Choose a music file from a connected account.' }, { status: 400 })
  }
  const provider = body.provider as Provider
  const extension = body.name.split('.').pop()?.toLowerCase() ?? ''
  if (!AUDIO_EXTENSIONS.has(extension)) return NextResponse.json({ error: 'Only audio files can be added to the music library.' }, { status: 415 })

  const token = await authorizeProvider(supabase, user.id, provider)
  if (!token) return NextResponse.json({ error: 'Reconnect this storage account, then try again.' }, { status: 409 })

  let storagePath: string | null = null
  try {
    const download = provider === 'google_drive'
      ? await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(body.id)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } })
      : await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path: body.path || body.id }) },
        })
    if (!download.ok) return NextResponse.json({ error: 'The provider could not download that file. Reconnect the account if access expired.' }, { status: 502 })
    const declaredLength = Number(download.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMPORT_BYTES) return NextResponse.json({ error: 'Music imports are limited to 50 MB.' }, { status: 413 })
    const bytes = await readBoundedBody(download, MAX_IMPORT_BYTES)
    if (!bytes) return NextResponse.json({ error: 'Music imports are limited to 50 MB.' }, { status: 413 })

    const mimeType = normalizeAudioMime(body.mimeType || download.headers.get('content-type') || '', extension)
    storagePath = `${user.id}/${crypto.randomUUID()}`
    const { error: storageError } = await supabase.storage.from('user-music').upload(storagePath, bytes, { contentType: mimeType, upsert: false })
    if (storageError) throw storageError

    const safeName = body.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 255)
    const { data, error: insertError } = await supabase.from('user_music_tracks').insert({
      user_id: user.id,
      original_filename: safeName,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: bytes.byteLength,
      title: safeName.replace(/\.[^.]+$/, ''),
      folder_name: 'Unsorted',
    }).select('id, original_filename, storage_path, mime_type, size_bytes, title, artist, genre, folder_name').single()
    if (insertError) throw insertError
    const { data: signed, error: signedError } = await supabase.storage.from('user-music').createSignedUrl(storagePath, 3600)
    if (signedError) throw signedError
    return NextResponse.json({ track: data, previewUrl: signed.signedUrl })
  } catch (error) {
    if (storagePath) await supabase.storage.from('user-music').remove([storagePath]).catch(() => undefined)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import this audio file.' }, { status: 500 })
  } finally {
    burnToken(token)
  }
}

async function listGoogleDriveMusic(token: string): Promise<RemoteMusicFile[]> {
  const params = new URLSearchParams({
    q: "trashed = false and mimeType contains 'audio/'",
    pageSize: '100',
    orderBy: 'name',
    fields: 'files(id,name,mimeType,size)',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  const payload = await response.json().catch(() => ({})) as { files?: Array<{ id?: string; name?: string; mimeType?: string; size?: string }>; error?: { message?: string } }
  if (!response.ok) throw new Error(payload.error?.message || 'Google Drive could not list audio files.')
  return (payload.files ?? []).flatMap((file) => {
    if (!file.id || !file.name || !isAudioFile(file.name, file.mimeType ?? '')) return []
    return [{ id: file.id, name: file.name, mimeType: file.mimeType ?? 'audio/mpeg', size: file.size ? Number(file.size) : null }]
  })
}

async function listDropboxMusic(token: string): Promise<RemoteMusicFile[]> {
  const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '', recursive: true, limit: 100, include_non_downloadable_files: false }),
  })
  const payload = await response.json().catch(() => ({})) as { entries?: Array<{ '.tag'?: string; id?: string; name?: string; path_lower?: string; size?: number }>; error_summary?: string }
  if (!response.ok) throw new Error(payload.error_summary || 'Dropbox could not list audio files.')
  return (payload.entries ?? []).flatMap((file) => {
    if (file['.tag'] !== 'file' || !file.id || !file.name || !file.path_lower || !isAudioFile(file.name, '')) return []
    return [{ id: file.id, name: file.name, mimeType: audioMimeFromExtension(file.name), size: typeof file.size === 'number' ? file.size : null, path: file.path_lower }]
  })
}

function isAudioFile(name: string, mimeType: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return AUDIO_EXTENSIONS.has(extension) || mimeType.startsWith('audio/')
}

function audioMimeFromExtension(name: string) {
  const extension = name.split('.').pop()?.toLowerCase()
  return extension === 'mp3' ? 'audio/mpeg' : extension === 'wav' ? 'audio/wav' : extension === 'ogg' ? 'audio/ogg' : extension === 'flac' ? 'audio/flac' : extension === 'webm' ? 'audio/webm' : 'audio/mp4'
}

function normalizeAudioMime(mimeType: string, extension: string) {
  return mimeType.startsWith('audio/') && mimeType !== 'audio/octet-stream' ? mimeType.split(';')[0]! : audioMimeFromExtension(`track.${extension}`)
}

async function readBoundedBody(response: Response, maxBytes: number) {
  if (!response.body) return null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}
