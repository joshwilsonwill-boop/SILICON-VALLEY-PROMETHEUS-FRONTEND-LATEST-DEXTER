import type { HeaderNavMode, BottomMode, ViralClipTargetPlatform } from './types'

export const VIRAL_CLIP_PLATFORM_DEFAULT: ViralClipTargetPlatform = 'tiktok'

export const VIRAL_CLIP_COUNT_PRESETS = [
  { min: 2, max: 3 },
  { min: 3, max: 5 },
  { min: 5, max: 8 },
] as const

export const SHOULD_PREFETCH_EDITOR_SUPPORT_ROUTES = process.env.NODE_ENV === 'production'

export const BOTTOM_MODES: BottomMode[] = ['Original', 'Music', 'Timeline']
export const MUSIC_RECOMMENDATION_LIMIT = 8
export const EDITOR_REQUEST_TIMEOUT_MS = 25_000

export const HEADER_NAV_ITEMS = [
  { name: 'Editor', icon: 'film' },
  { name: 'Music', icon: 'music' },
]

export const LEFT_TABS = [
  { key: 'chat', label: 'Chat', icon: 'message-square' },
  { key: 'edit', label: 'Edit', icon: 'pen-square' },
  { key: 'design', label: 'Design', icon: 'palette' },
  { key: 'assets', label: 'Assets', icon: 'folder-open' },
]

export const PREVIEW_FRAME_PRESETS = ['16:9', '9:16', '1:1', 'source'] as const

export const MS_PER_DAY = 24 * 60 * 60 * 1000
