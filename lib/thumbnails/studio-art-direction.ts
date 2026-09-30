export const STUDIO_LAYOUTS = [
  { id: 'hero', name: 'Cinematic hook', description: 'Rim-lit portrait, oversized hook, one vivid accent.', subject: 'right', text: 'left', treatment: 'Compose a premium cinematic creator thumbnail: oversized condensed 1–4 word headline locked into the left negative space, sharp close portrait on the right, dramatic key light and subtle colored rim light separating the subject from a deep textured studio background. Treat the emphasized word with one clean painted accent stroke. Keep eyes unobstructed.' },
  { id: 'split', name: 'Concept canvas', description: 'A strong visual metaphor anchors the story.', subject: 'right', text: 'left', treatment: 'Build an editorial concept thumbnail around one unmistakable topic-related visual metaphor or prop beside the anchored subject. Use a quiet graph-paper or technical texture, controlled directional light, and a large black-or-white headline with one vivid accent. This is one unified image; never use before/after panels or divide the headline into fake competing claims.' },
  { id: 'badge', name: 'Proof card', description: 'One real idea in a bold editorial statement card.', subject: 'left', text: 'right', treatment: 'Place the anchored subject to the left and a large, crisp, high-contrast editorial statement card to the right. Use bold black typography on warm white or selected accent. Add a secondary proof card only when the user explicitly supplies a real figure or evidence; otherwise show only the exact headline. Natural shadow, clean edges, no invented facts.' },
  { id: 'reaction', name: 'Impact close-up', description: 'Tight face, urgent color, maximum small-screen clarity.', subject: 'right', text: 'left', treatment: 'Use a tightly framed, sharply detailed portrait on the right with authentic expression, dramatic directional light, and a bold concise headline stacked on the left. Add a single graphic directional accent only when it points to a real visual element. Preserve the real expression; never fabricate emotion or claims.' },
  { id: 'clean', name: 'Editorial light', description: 'Bright studio portrait with confident, spacious type.', subject: 'right', text: 'left', treatment: 'Create a bright editorial studio thumbnail with a sharply cut, naturally lit portrait, soft warm-white or subtle graph-paper background, and generous negative space. Use large precise modern sans-serif typography, dark headline lettering, and a single saturated accent mark. Preserve natural skin texture and keep the composition uncluttered.' },
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

export function buildStudioArtDirection(design: StudioDesign, headline: string, emphasis: string, referenceCue = ''): string {
  const background = STUDIO_BACKGROUNDS.find((item) => item.id === design.background)!
  return [
    'FINAL STUDIO ART DIRECTION: Follow the selected visual reference as the primary composition and craft direction. Avoid generic thumbnail templates and preserve the distinct visual idea of the reference.',
    'COMPOSITION: Build one cinematic, conversion-focused image around the selected subject and exact headline. Use intentional subject scale, strong negative space, depth, and a readable feed-size hierarchy. Recompose naturally for the selected aspect ratio.',
    'BACKGROUND: ' + background.prompt,
    referenceCue ? 'SELECTED THUMBNAIL REFERENCE: ' + referenceCue + '. Borrow its composition, scale, visual hierarchy, lighting, color balance, texture, and graphic treatment. Rebuild those ideas around the selected video subject and exact user headline; do not reproduce the reference people, logos, or words.' : '',
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
