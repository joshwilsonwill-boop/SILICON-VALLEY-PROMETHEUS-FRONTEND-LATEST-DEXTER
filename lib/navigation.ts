import { BarChart3, FolderKanban, LibraryBig, LayoutDashboard, Settings, Wand2, type LucideIcon } from 'lucide-react'

export type PrometheusNavItem = { key: string; label: string; href: string; icon: LucideIcon; badge?: number }

export const prometheusNavItems: PrometheusNavItem[] = [
  { key: 'studio', label: 'Studio', href: '/studio', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', href: '/projects', icon: FolderKanban },
  { key: 'library', label: 'Library', href: '/assets', icon: LibraryBig },
  { key: 'editor', label: 'Editor', href: '/editor', icon: Wand2 },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', href: '/settings', icon: Settings },
]
