export type ThemeId =
  | 'obsidian'
  | 'midnight'
  | 'ember'
  | 'forest'
  | 'aurora'
  | 'glacier'
  | 'rose-gold'
  | 'solar'

export type FontId = 'inter' | 'sf-pro-display' | 'geist' | 'jetbrains-mono' | 'playfair-display' | 'space-grotesk'

export type ThemePreset = {
  id: ThemeId
  name: string
  background: string
  foreground: string
  accent: string
  surface: string
  elevated: string
  border: string
}

export type FontPreset = {
  id: FontId
  name: string
  stack: string
}

export const DEFAULT_THEME_ID: ThemeId = 'obsidian'
export const DEFAULT_FONT_ID: FontId = 'inter'

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    background: '#0A0A0F',
    foreground: '#E8E8ED',
    accent: '#38BDF8',
    surface: '#111118',
    elevated: '#1A1A24',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#0F172A',
    foreground: '#F1F5F9',
    accent: '#818CF8',
    surface: '#18213B',
    elevated: '#1E2940',
    border: 'rgba(129, 140, 248, 0.14)',
  },
  {
    id: 'ember',
    name: 'Ember',
    background: '#1A0F0F',
    foreground: '#FDE8E8',
    accent: '#F97316',
    surface: '#271414',
    elevated: '#361A1A',
    border: 'rgba(249, 115, 22, 0.14)',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: '#0F1A0F',
    foreground: '#E8FDE8',
    accent: '#22C55E',
    surface: '#172617',
    elevated: '#203120',
    border: 'rgba(34, 197, 94, 0.14)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    background: '#0F0A1A',
    foreground: '#F0E8FD',
    accent: '#A855F7',
    surface: '#1B1329',
    elevated: '#241936',
    border: 'rgba(168, 85, 247, 0.14)',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    background: '#0A1A1F',
    foreground: '#E8F4FD',
    accent: '#06B6D4',
    surface: '#13242A',
    elevated: '#1A3138',
    border: 'rgba(6, 182, 212, 0.14)',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    background: '#1A0F14',
    foreground: '#FDE8F0',
    accent: '#FB7185',
    surface: '#28141C',
    elevated: '#371B24',
    border: 'rgba(251, 113, 133, 0.14)',
  },
  {
    id: 'solar',
    name: 'Solar',
    background: '#1A1A0A',
    foreground: '#FDFDE8',
    accent: '#EAB308',
    surface: '#282814',
    elevated: '#36361A',
    border: 'rgba(234, 179, 8, 0.14)',
  },
]

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'inter',
    name: 'Inter',
    stack: 'var(--font-inter), Inter, system-ui, sans-serif',
  },
  {
    id: 'sf-pro-display',
    name: 'SF Pro Display',
    stack: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'geist',
    name: 'Geist',
    stack: 'var(--font-geist), Geist, system-ui, sans-serif',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    stack: 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    stack: 'var(--font-playfair-display), "Playfair Display", Georgia, serif',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    stack: 'var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif',
  },
]

export function getThemePreset(themeId: string | null | undefined) {
  return THEME_PRESETS.find((preset) => preset.id === themeId) ?? THEME_PRESETS[0]
}

export function getFontPreset(fontId: string | null | undefined) {
  return FONT_PRESETS.find((preset) => preset.id === fontId) ?? FONT_PRESETS[0]
}

export function themeCssVariables(themeId: string | null | undefined) {
  const preset = getThemePreset(themeId)

  return {
    '--theme-background': preset.background,
    '--theme-foreground': preset.foreground,
    '--theme-accent': preset.accent,
    '--theme-accent-rgb': hexToRgb(preset.accent),
    '--theme-surface': preset.surface,
    '--theme-surface-elevated': preset.elevated,
    '--theme-border': preset.border,
    '--accent-cyan': preset.accent,
    '--accent-cyan-glow': hexToRgba(preset.accent, 0.16),
    '--accent-cyan-dim': hexToRgba(preset.accent, 0.84),
    '--text-primary': preset.foreground,
    '--text-secondary': hexToRgba(preset.foreground, 0.7),
    '--text-tertiary': hexToRgba(preset.foreground, 0.5),
    '--border-subtle': preset.border,
    '--prometheus-text-primary': preset.foreground,
    '--prometheus-text-secondary': hexToRgba(preset.foreground, 0.68),
    '--prometheus-text-tertiary': hexToRgba(preset.foreground, 0.48),
    '--prometheus-border-subtle': preset.border,
  } as const
}

export function fontCssVariables(fontId: string | null | undefined) {
  const preset = getFontPreset(fontId)

  return {
    '--font-primary': preset.stack,
    '--font-display': preset.stack,
  } as const
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(expanded, 16)
  if (Number.isNaN(value)) return `rgba(255, 255, 255, ${alpha})`

  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim()
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized

  const value = Number.parseInt(expanded, 16)
  if (Number.isNaN(value)) return '255, 255, 255'

  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `${red}, ${green}, ${blue}`
}
