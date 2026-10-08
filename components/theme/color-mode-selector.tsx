'use client'

import { Moon, Sun } from 'lucide-react'

import { useThemePreferenceStore } from '@/lib/theme/theme-store'
import { cn } from '@/lib/utils'

const COLOR_MODES = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
] as const

export function ColorModeSelector() {
  const colorMode = useThemePreferenceStore((state) => state.colorMode)
  const setColorMode = useThemePreferenceStore((state) => state.setColorMode)

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Color mode">
      {COLOR_MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={colorMode === id}
          onClick={() => setColorMode(id)}
          className={cn(
            'inline-flex min-h-11 min-w-28 items-center justify-center gap-2 border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-surface)]',
            colorMode === id
              ? 'border-[var(--theme-accent)] bg-white/[0.09] text-white'
              : 'border-white/[0.12] text-white/68 hover:bg-white/[0.05] hover:text-white',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}
