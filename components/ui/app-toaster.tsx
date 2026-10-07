'use client'

import { Toaster } from 'sonner'
import { useThemePreferenceStore } from '@/lib/theme/theme-store'

export function AppToaster() {
  const colorMode = useThemePreferenceStore((state) => state.colorMode)
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      theme={colorMode}
      duration={4200}
      toastOptions={{
        style: {
          background: 'var(--light-ui-surface, linear-gradient(180deg, rgba(17, 17, 23, 0.98) 0%, rgba(8, 8, 12, 0.98) 100%))',
          border: '1px solid var(--light-ui-border, rgba(255, 255, 255, 0.12))',
          color: 'var(--light-ui-text, #fff)',
          boxShadow: 'var(--light-ui-menu-shadow, 0 24px 70px -34px rgba(0, 0, 0, 0.92), inset 0 1px 0 rgba(255, 255, 255, 0.12))',
          backdropFilter: 'blur(18px)',
        },
      }}
    />
  )
}
