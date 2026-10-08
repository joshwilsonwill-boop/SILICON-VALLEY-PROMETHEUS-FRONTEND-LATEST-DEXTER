'use client'

import { Moon, Sun } from 'lucide-react'

import { useThemePreferenceStore } from '@/lib/theme/theme-store'
import { cn } from '@/lib/utils'

export function ColorModeSelector() {
  const colorMode = useThemePreferenceStore((state) => state.colorMode)
  const setColorMode = useThemePreferenceStore((state) => state.setColorMode)
  const isDark = colorMode === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setColorMode(isDark ? 'light' : 'dark')}
      className="inline-flex h-11 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
    >
      <span
        aria-hidden="true"
        className="relative flex h-8 w-16 items-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] transition-colors duration-300 motion-reduce:transition-none"
      >
        <span
          className={cn(
            'absolute left-[3px] top-[3px] size-6 rounded-full bg-[var(--theme-surface-elevated)] transition-transform duration-300 ease-in-out motion-reduce:transition-none',
            isDark ? 'translate-x-0' : 'translate-x-8',
          )}
        />
        <span className="relative grid w-full grid-cols-2 place-items-center">
          <Moon
            strokeWidth={1.5}
            className={cn(
              'size-4 transition-colors duration-300 motion-reduce:transition-none',
              isDark ? 'text-[var(--theme-foreground)]' : 'text-[var(--text-secondary)]',
            )}
          />
          <Sun
            strokeWidth={1.5}
            className={cn(
              'size-4 transition-colors duration-300 motion-reduce:transition-none',
              isDark ? 'text-[var(--text-secondary)]' : 'text-[var(--theme-foreground)]',
            )}
          />
        </span>
      </span>
    </button>
  )
}
