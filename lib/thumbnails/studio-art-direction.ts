export const STUDIO_LAYOUTS = [
  { id: 'hero', name: 'Creator spotlight', description: 'A bold headline, a clear face, one striking accent.', subject: 'right', text: 'left', treatment: 'Oversized condensed white headline on the left, with a painterly accent stroke behind the emphasized word. A crisp, naturally lit subject on the right fills 55% of the frame height. Keep the eyes unobstructed.' },
  { id: 'split', name: 'Split comparison', description: 'Two opposing ideas. One unmistakable contrast.', subject: 'center', text: 'split', treatment: 'Two contrasting background fields with the source subject bridging the center. Divide the supplied headline into two balanced reading blocks. Use only comparisons or numbers supplied by the user; do not invent statistics, currency, or outcomes.' },
  { id: 'badge', name: 'Side badge', description: 'A compact statement beside a powerful portrait.', subject: 'left', text: 'right', treatment: 'Subject on the left and a large slightly tilted rectangular headline badge on the right. The badge uses the selected accent color with dark lettering and a restrained realistic shadow.' },
  { id: 'reaction', name: 'Big statement', description: 'An oversized hook with a tight, expressive crop.', subject: 'right', text: 'left', treatment: 'Tight portrait crop from the source on the right with extremely bold, tightly stacked headline on the left. Preserve the real expression; do not exaggerate or fabricate emotion. Emphasize one word with the accent color.' },
  { id: 'clean', name: 'Clean brand', description: 'Considered type. Natural light. Room to breathe.', subject: 'right', text: 'left', treatment: 'Clean premium photographic portrait, generous negative space, and precise modern sans-serif headline. No arrows, brush marks, props, stickers, or badges. Understated accent and natural skin texture.' },
] as const

export const STUDIO_BACKGROUNDS = [
  { id: 'dark', name: 'Dark studio', colors: ['#07111f', '#163755'], prompt: 'Deep navy-to-charcoal studio gradient with a subtle luminous sweep, rich clean shadows, and separation around the subject.' },
  { id: 'light', name: 'Light studio', colors: ['#e8e6df', '#c5d5dc'], prompt: 'Warm white photographic studio with soft architectural daylight, natural shadows, and dark headline lettering for contrast.' },
  { id: 'contrast', name: 'Color contrast', colors: ['#194b85', '#872832'], prompt: 'Two deeply saturated contrasting color fields, carefully balanced to support the chosen accent. Strong subject separation without neon bloom.' },
  { id: 'original', name: 'Keep original', colors: ['#423e36', '#252c2e'], prompt: 'Preserve the actual setting of the video frame. Refine the lighting and depth with a subtle background defocus; do not replace the location.' },
] as const

export const STUDIO_ACCENTS = [
  { name: 'Electric blue', color: '#00B9F2' },
  { name: 'Violet', color: '#A47AFF' },
  { name: 'Coral', color: '#FF6259' },
  { name: 'Golden yellow', color: '#FFCA58' },
  { name: 'Mint', color: '#7FF2D4' },
] as const

export type StudioLayout = typeof STUDIO_LAYOUTS[number]['id']
export type StudioBackground = typeof STUDIO_BACKGROUNDS[number]['id']
export type StudioQuality = 'fast' | 'pro'
export type StudioDesign = { layout: StudioLayout; background: StudioBackground; accent: string; quality: StudioQuality; textScale: number }

export const DEFAULT_STUDIO_DESIGN: StudioDesign = { layout: 'hero', background: 'dark', accent: '#00B9F2', quality: 'fast', textScale: 1 }

/** Validate the studio's optional art direction before it enters a paid image request. */
export function parseStudioDesign(value: unknown): StudioDesign {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a valid thumbnail design.')
  const input = value as Record<string, unknown>
  if (!STUDIO_LAYOUTS.some((layout) => layout.id === input.layout)) throw new Error('Choose a supported layout.')
  if (!STUDIO_BACKGROUNDS.some((background) => background.id === input.background)) throw new Error('Choose a supported background.')
  if (typeof input.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.accent)) throw new Error('Choose a valid accent color.')
  if (input.quality !== 'fast' && input.quality !== 'pro') throw new Error('Choose a supported quality mode.')
  if (typeof input.textScale !== 'number' || !Number.isFinite(input.textScale) || input.textScale < 0.7 || input.textScale > 1.3) throw new Error('Headline size must be between 70% and 130%.')
  return { layout: input.layout as StudioLayout, background: input.background as StudioBackground, accent: input.accent, quality: input.quality, textScale: input.textScale }
}

export function buildStudioArtDirection(design: StudioDesign, headline: string, emphasis: string): string {
  const layout = STUDIO_LAYOUTS.find((item) => item.id === design.layout)!
  const background = STUDIO_BACKGROUNDS.find((item) => item.id === design.background)!
  return [
    'FINAL STUDIO ART DIRECTION: These explicit user selections take priority over recipe defaults and any inferred reference style.',
    'LAYOUT: ' + layout.treatment,
    'BACKGROUND: ' + background.prompt,
    'ACCENT: Use exactly ' + design.accent + ' as the dominant color accent. Do not substitute a recipe color.',
    'HEADLINE: Render only the exact supplied headline ' + JSON.stringify(headline.trim()) + '. Never add a sample slogan, signature, subtitle, fake proof card, number, logo, or extra words.',
    emphasis.trim() ? 'EMPHASIS: Highlight only the supplied word or phrase ' + JSON.stringify(emphasis.trim()) + '.' : 'EMPHASIS: Use a clean, consistent headline treatment without choosing an arbitrary highlighted word.',
    'SCALE: Headline scale ' + Math.round(design.textScale * 100) + '% of this layout’s baseline. Fit the entire headline within the available negative space.',
    'CRAFT: Preserve the anchor subject’s identity and authentic expression. If the frame has no person, preserve its main object. Clean hair and shoulder edges, convincing contact shadows, natural skin detail, controlled rim light, and crisp typography. No artificial glow halo.',
    'COMPOSITION CHECK: One clear focal subject, one headline, a deliberate reading order. Keep a 6% safe margin around all text. Headline must read at 320 pixels wide; do not cover eyes, mouth, or facial features. For portrait formats, reflow the layout vertically. Leave the lower-right corner clear for a platform duration badge.',
  ].join('\n\n')
}

export function resolveStudioImageModel(quality: StudioQuality): string {
  return quality === 'pro' ? 'gemini-3-pro-image' : 'gemini-3.1-flash-image'
}
