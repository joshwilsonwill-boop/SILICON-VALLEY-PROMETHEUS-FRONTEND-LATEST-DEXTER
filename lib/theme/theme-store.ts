import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  DEFAULT_FONT_ID,
  DEFAULT_THEME_ID,
  type FontId,
  type ThemeId,
} from './theme-tokens'
import { hasPreferenceConsent } from '@/lib/cookies/cookie-config'

const consentAwareThemeStorage = {
  getItem: (name: string) => (hasPreferenceConsent() ? localStorage.getItem(name) : null),
  setItem: (name: string, value: string) => {
    if (hasPreferenceConsent()) localStorage.setItem(name, value)
  },
  removeItem: (name: string) => {
    if (hasPreferenceConsent()) localStorage.removeItem(name)
  },
}

type ThemePreferenceState = {
  themeId: ThemeId
  fontId: FontId
  setThemeId: (themeId: ThemeId) => void
  setFontId: (fontId: FontId) => void
  setThemeAndFont: (input: { themeId?: ThemeId; fontId?: FontId }) => void
}

export const useThemePreferenceStore = create<ThemePreferenceState>()(
  persist(
    (set) => ({
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
    },
  ),
)
