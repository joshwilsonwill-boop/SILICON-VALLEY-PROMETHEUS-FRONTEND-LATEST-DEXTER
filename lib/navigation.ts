import { BarChart3, FolderKanban, LibraryBig, Settings, Wand2, type LucideIcon } from 'lucide-react'

export type PrometheusNavItem = { key: string; label: string; href: string; icon: LucideIcon; badge?: number }

export const prometheusNavItems: PrometheusNavItem[] = [
  { key: 'projects', label: 'Projects', href: '/projects', icon: FolderKanban },
  { key: 'library', label: 'Brand', href: '/assets', icon: LibraryBig },
  { key: 'editor', label: 'Editor', href: '/editor', icon: Wand2 },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', href: '/settings', icon: Settings },
]
