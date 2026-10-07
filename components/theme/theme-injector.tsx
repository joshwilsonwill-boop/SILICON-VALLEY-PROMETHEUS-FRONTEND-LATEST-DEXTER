'use client'

import * as React from 'react'

import { useThemePreferenceStore } from '@/lib/theme/theme-store'
import { fontCssVariables, getFontPreset, themeCssVariables } from '@/lib/theme/theme-tokens'

export function ThemeInjector() {
  const themeId = useThemePreferenceStore((state) => state.themeId)
  const fontId = useThemePreferenceStore((state) => state.fontId)
  const colorMode = useThemePreferenceStore((state) => state.colorMode)

  React.useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const themeVars = themeCssVariables(themeId, colorMode)
    const fontVars = fontCssVariables(fontId)
    const fontPreset = getFontPreset(fontId)

    Object.entries({ ...themeVars, ...fontVars }).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    body.style.setProperty('--font-primary', fontPreset.stack)
    body.dataset.theme = themeId
    body.dataset.font = fontId
    root.dataset.theme = themeId
    root.dataset.font = fontId
    root.dataset.colorMode = colorMode
    root.classList.toggle('dark', colorMode !== 'light')
    root.style.colorScheme = colorMode
  }, [colorMode, fontId, themeId])

  return null
}
