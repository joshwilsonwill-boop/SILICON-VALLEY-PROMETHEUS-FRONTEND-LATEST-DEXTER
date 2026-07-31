import type { OAuthProvider } from '@/lib/oauth/types'

export type ProviderStatus = 'active' | 'expiring_soon' | 'expired' | 'disconnected'

export type ProviderMetadata = {
  id: OAuthProvider
  name: string
  iconName: string
  color: string
  scopes: string[]
}

export const PROVIDER_METADATA: ProviderMetadata[] = [
  { id: 'youtube', name: 'YouTube', iconName: 'Youtube', color: '#FF0000', scopes: ['Upload videos', 'Read video analytics'] },
  { id: 'tiktok', name: 'TikTok', iconName: 'Music2', color: '#000000', scopes: ['Post videos', 'Analytics'] },
  { id: 'instagram', name: 'Instagram', iconName: 'Instagram', color: '#E4405F', scopes: ['Post reels', 'Stories'] },
  { id: 'x', name: 'X', iconName: 'Twitter', color: '#000000', scopes: ['Post tweets', 'Media upload'] },
  { id: 'facebook', name: 'Facebook', iconName: 'Facebook', color: '#1877F2', scopes: ['Post to page', 'Groups'] },
  { id: 'linkedin', name: 'LinkedIn', iconName: 'Linkedin', color: '#0A66C2', scopes: ['Share articles', 'Company posts'] },
  { id: 'google_drive', name: 'Google Drive', iconName: 'HardDrive', color: '#4285F4', scopes: ['Export to Drive', 'Read files'] },
  { id: 'dropbox', name: 'Dropbox', iconName: 'Cloud', color: '#0061FF', scopes: ['Export to Dropbox', 'Read files'] },
]

export function getProviderMetadata(provider: string | null | undefined) {
  return PROVIDER_METADATA.find((entry) => entry.id === provider) ?? null
}

export function parseConnectionScopes(scope: string | string[] | null | undefined) {
  if (Array.isArray(scope)) return scope.filter(Boolean)
  if (!scope) return []
  return scope
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}
