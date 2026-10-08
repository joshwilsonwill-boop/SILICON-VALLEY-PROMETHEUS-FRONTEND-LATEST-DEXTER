import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  DEFAULT_FONT_ID,
  DEFAULT_THEME_ID,
  DEFAULT_COLOR_MODE,
  type ColorMode,
  type FontId,
  type ThemeId,
} from './theme-tokens'
import { hasPreferenceConsent } from '@/lib/cookies/cookie-config'

const consentAwareThemeStorage = {
  getItem: (name: string) => {
    try {
      return hasPreferenceConsent() ? localStorage.getItem(name) : null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (hasPreferenceConsent()) localStorage.setItem(name, value)
    } catch {
      // Apply the choice for this visit when storage is unavailable.
    }
  },
  removeItem: (name: string) => {
    try {
      if (hasPreferenceConsent()) localStorage.removeItem(name)
    } catch {
      // Storage may be disabled.
    }
  },
}

type ThemePreferenceState = {
  colorMode: ColorMode
  setColorMode: (colorMode: ColorMode) => void
  themeId: ThemeId
  fontId: FontId
  setThemeId: (themeId: ThemeId) => void
  setFontId: (fontId: FontId) => void
  setThemeAndFont: (input: { themeId?: ThemeId; fontId?: FontId }) => void
}

export const useThemePreferenceStore = create<ThemePreferenceState>()(
  persist(
    (set) => ({
      colorMode: DEFAULT_COLOR_MODE,
      setColorMode: (colorMode) => set({ colorMode }),
      themeId: DEFAULT_THEME_ID,
      fontId: DEFAULT_FONT_ID,
      setThemeId: (themeId) => set({ themeId }),
      setFontId: (fontId) => set({ fontId }),
      setThemeAndFont: (input) =>
        set((state) => ({
          themeId: input.themeId ?? state.themeId,
          fontId: input.fontId ?? state.fontId,
        })),
    }),
    {
      name: 'prometheus.theme.preferences.v1',
      storage: createJSONStorage(() => consentAwareThemeStorage),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ThemePreferenceState> | undefined
        return { ...current, ...saved, colorMode: saved?.colorMode === 'light' ? 'light' : DEFAULT_COLOR_MODE }
      },
    },
  ),
)
