import {
  BarChart3,
  FolderOpen,
  LayoutDashboard,
  Library,
  PenTool,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

export const mainNavItems: NavItem[] = [
  { label: 'Studio', href: '/studio', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Library', href: '/assets', icon: Library },
  { label: 'Editor', href: '/editor', icon: PenTool },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
]

export const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
]
