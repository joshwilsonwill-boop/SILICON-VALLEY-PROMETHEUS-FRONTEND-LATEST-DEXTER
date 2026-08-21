export type TasteDimensionId = 'mood' | 'palette' | 'type' | 'era' | 'texture' | 'energy'

export type TasteOption = {
  id: string
  label: string
  keywords: string[]
  hue?: number
  saturation?: number
  lightness?: number
  stack?: string
  display?: DisplayFontId
  motion?: string
}

export type DisplayFontId =
  | 'elegist'
  | 'migra'
  | 'grotesk'
  | 'mono'
  | 'serif'
  | 'script'

export type TasteDimension = {
  id: TasteDimensionId
  label: string
  blurb: string
  options: TasteOption[]
}

export type BrandTaste = Record<TasteDimensionId, string>

export type PaletteSwatch = { hex: string; name: string }

export type BrandTreatment = {
  name: string
  domain?: string
  source: 'taste' | 'url'
  stack: string
  display: DisplayFontId
  displayName: string
  palette: PaletteSwatch[]
  background: string
  surface: string
  ink: string
  accent: string
  keywords: string[]
  tagline: string
  motion: string
  era: string
  texture: string
  spec: string
}

export const FONT_STACKS: Record<DisplayFontId, { stack: string; name: string }> = {
  elegist: { stack: `var(--font-elegist), var(--font-ui), sans-serif`, name: 'Elegist Display' },
  migra: { stack: `var(--font-migra), var(--font-ui), serif`, name: 'Migra Editorial' },
  grotesk: { stack: `var(--font-space-grotesk), var(--font-ui), sans-serif`, name: 'Space Grotesk' },
  mono: { stack: `var(--font-mono), monospace`, name: 'Mono Utility' },
  serif: { stack: `var(--font-playfair-display), Georgia, serif`, name: 'Playfair Serif' },
  script: { stack: `var(--font-black-delights), var(--font-ui), cursive`, name: 'Black Delights Script' },
}

const DEFAULT_TAGLINES = [
  'Own the frame.',
  'Designed to be felt.',
  'Quiet power, loud results.',
  'Where taste meets intent.',
  'Considered. Deliberate. Alive.',
  'Made to leave an impression.',
  'Signal over noise.',
]

const DEFAULT_MOTION = [
  'Slow cinematic ease with soft parallax drift.',
  'Snappy spring reveals with a short linear settle.',
  'Glitch flash-cuts with hard horizontal chops.',
  'Fluid organic flow with long, curving settles.',
  'Persistent marquee ribbons and rolling counters.',
  'Pulse-and-sync motion locked to a 120bpm grid.',
]

export const DIMENSIONS: TasteDimension[] = [
  {
    id: 'mood',
    label: 'Mood',
    blurb: 'The emotional temperature of the brand.',
    options: [
      { id: 'noir', label: 'Cinematic Noir', keywords: ['cinematic', 'shadowed', 'premium', 'moody'], hue: 240, saturation: 42, lightness: 40 },
      { id: 'editorial-light', label: 'Editorial Light', keywords: ['clean', 'open', 'editorial', 'airy'], hue: 46, saturation: 74, lightness: 66 },
      { id: 'luxury-dark', label: 'Luxury Dark', keywords: ['luxury', 'dark', 'quiet', 'expensive'], hue: 260, saturation: 34, lightness: 26 },
      { id: 'acid-pulse', label: 'Acid Pulse', keywords: ['electric', 'energy', 'bold', 'neon'], hue: 96, saturation: 88, lightness: 54 },
      { id: 'earthy', label: 'Earthy Organic', keywords: ['natural', 'warm', 'grounded', 'soft'], hue: 32, saturation: 58, lightness: 48 },
      { id: 'brutalist', label: 'Brutalist Edge', keywords: ['raw', 'sharp', 'graphic', 'strict'], hue: 0, saturation: 12, lightness: 22 },
      { id: 'pastel', label: 'Soft Pastel', keywords: ['gentle', 'friendly', 'calm', 'soft'], hue: 300, saturation: 54, lightness: 72 },
      { id: 'mono-minimal', label: 'Mono Minimal', keywords: ['minimal', 'mono', 'quiet', 'utilitarian'], hue: 220, saturation: 6, lightness: 18 },
    ],
  },
  {
    id: 'palette',
    label: 'Palette',
    blurb: 'The color temperature driving the treatment.',
    options: [
      { id: 'mono', label: 'Monochrome', keywords: ['black', 'white', 'grey', 'mono'], hue: 220, saturation: 6, lightness: 20 },
      { id: 'ember', label: 'Duotone Ember', keywords: ['ember', 'fire', 'orange', 'heat'], hue: 18, saturation: 86, lightness: 52 },
      { id: 'acid', label: 'Acid Lime', keywords: ['lime', 'acid', 'green', 'signal'], hue: 88, saturation: 74, lightness: 54 },
      { id: 'cobalt', label: 'Cobalt Clean', keywords: ['cobalt', 'blue', 'clean', 'tech'], hue: 214, saturation: 90, lightness: 56 },
      { id: 'sand', label: 'Warm Sand', keywords: ['sand', 'warm', 'beige', 'natural'], hue: 34, saturation: 52, lightness: 58 },
      { id: 'violet', label: 'Violet Haze', keywords: ['violet', 'haze', 'dreamy', 'lavender'], hue: 264, saturation: 56, lightness: 58 },
      { id: 'cyan-ink', label: 'Ink & Cyan', keywords: ['cyan', 'ink', 'electric', 'cold'], hue: 188, saturation: 84, lightness: 48 },
      { id: 'rose', label: 'Rose Dust', keywords: ['rose', 'dust', 'romantic', 'warm'], hue: 346, saturation: 62, lightness: 60 },
    ],
  },
  {
    id: 'type',
    label: 'Type Voice',
    blurb: 'The letterforms carrying the wordmark.',
    options: [
      { id: 'elegist', label: 'Editorial Display', keywords: ['elegant', 'editorial', 'serif', 'high-fashion'], display: 'elegist' },
      { id: 'migra', label: 'Migra Editorial', keywords: ['editorial', 'modern', 'fashion', 'expressive'], display: 'migra' },
      { id: 'grotesk', label: 'Space Grotesk', keywords: ['engineered', 'geometric', 'modern', 'clean'], display: 'grotesk' },
      { id: 'mono', label: 'Monospaced Utility', keywords: ['technical', 'mono', 'system', 'precise'], display: 'mono' },
      { id: 'serif', label: 'Playfair Serif', keywords: ['classic', 'serif', 'luxury', 'timeless'], display: 'serif' },
      { id: 'script', label: 'Black Delights Script', keywords: ['script', 'hand', 'playful', 'bold'], display: 'script' },
    ],
  },
  {
    id: 'era',
    label: 'Era',
    blurb: 'The era the aesthetic is pulled from.',
    options: [
      { id: 'neo-2026', label: 'Neo 2026', keywords: ['current', 'futuristic', 'clean', 'modern'] },
      { id: 'swiss', label: 'Swiss 1960', keywords: ['swiss', 'grid', 'rational', 'poster'] },
      { id: 'deco', label: 'Art Deco', keywords: ['deco', 'gold', 'geometric', 'glamour'] },
      { id: 'y2k', label: 'Y2K Glitch', keywords: ['y2k', 'glitch', 'chrome', 'futurist'] },
      { id: 'studio54', label: 'Studio 54', keywords: ['disco', 'glam', 'night', 'party'] },
      { id: 'brutal', label: 'Brutalist', keywords: ['brutal', 'raw', 'concrete', 'graphic'] },
      { id: 'renaissance', label: 'Renaissance', keywords: ['renaissance', 'classic', 'oil', 'period'] },
    ],
  },
  {
    id: 'texture',
    label: 'Texture',
    blurb: 'The material finish on the surface.',
    options: [
      { id: 'grain', label: 'Grain & Film', keywords: ['grain', 'film', 'analog', 'organic'] },
      { id: 'glass', label: 'Glassmorphism', keywords: ['glass', 'translucent', 'blur', 'layered'] },
      { id: 'flat', label: 'Flat Gradient', keywords: ['flat', 'gradient', 'clean', 'modern'] },
      { id: 'dither', label: 'Dither & Pixel', keywords: ['dither', 'pixel', 'retro', 'digital'] },
      { id: 'paper', label: 'Paper & Ink', keywords: ['paper', 'ink', 'print', 'tactile'] },
      { id: 'chrome', label: 'Liquid Chrome', keywords: ['chrome', 'liquid', 'metallic', 'shiny'] },
    ],
  },
  {
    id: 'energy',
    label: 'Motion',
    blurb: 'The movement language of the brand.',
    options: [
      { id: 'slow-cine', label: 'Slow Cinematic', keywords: ['slow', 'cinematic', 'drift', 'filmic'], motion: 'Slow cinematic easing with drifting parallax and long, deliberate settles.' },
      { id: 'springy', label: 'Snappy Spring', keywords: ['spring', 'snappy', 'fast', 'bouncy'], motion: 'Snappy spring reveals with a quick linear settle and elastic overshoot.' },
      { id: 'glitch', label: 'Glitch Cut', keywords: ['glitch', 'flash', 'cut', 'disrupt'], motion: 'Glitch flash-cuts with hard horizontal chops and stutter holds.' },
      { id: 'fluid', label: 'Fluid Organic', keywords: ['fluid', 'organic', 'flow', 'curved'], motion: 'Fluid organic flow with long, curving settles and drifting layers.' },
      { id: 'marquee', label: 'Marquee', keywords: ['marquee', 'ribbon', 'scroll', 'repeat'], motion: 'Persistent marquee ribbons plus rolling counters and tickers.' },
      { id: 'pulse', label: 'Pulse & Sync', keywords: ['pulse', 'sync', 'beat', 'rhythm'], motion: 'Pulse-and-sync motion locked to a tight beat grid.' },
    ],
  },
]

export const DEFAULT_TASTE: BrandTaste = {
  mood: 'noir',
  palette: 'ember',
  type: 'elegist',
  era: 'neo-2026',
  texture: 'grain',
  energy: 'slow-cine',
}

export const DIMENSION_BY_ID: Record<TasteDimensionId, TasteDimension> = DIMENSIONS.reduce(
  (acc, dimension) => {
    acc[dimension.id] = dimension
    return acc
  },
  {} as Record<TasteDimensionId, TasteDimension>,
)

export function optionFor(dimensionId: TasteDimensionId, optionId: string): TasteOption {
  const dimension = DIMENSION_BY_ID[dimensionId]
  return dimension.options.find((option) => option.id === optionId) ?? dimension.options[0]
}

export function deriveTreatment(taste: BrandTaste, brandName?: string): BrandTreatment {
  const mood = optionFor('mood', taste.mood)
  const palette = optionFor('palette', taste.palette)
  const type = optionFor('type', taste.type)
  const era = optionFor('era', taste.era)
  const texture = optionFor('texture', taste.texture)
  const energy = optionFor('energy', taste.energy)

  const baseHue = palette.hue ?? mood.hue ?? 230
  const baseSat = palette.saturation ?? mood.saturation ?? 80
  const baseLight = palette.lightness ?? mood.lightness ?? 52
  const font = FONT_STACKS[type.display ?? 'elegist']

  const accent = hslToHex(baseHue, clamp(baseSat, 0, 100), clamp(baseLight, 0, 100))
  const secondary = hslToHex((baseHue + 32) % 360, clamp(baseSat, 0, 100), clamp(baseLight - 8, 0, 100))
  const tertiary = hslToHex((baseHue + 178) % 360, clamp(baseSat - 24, 0, 100), clamp(baseLight + 20, 0, 100))
  const background = hslToHex(clamp(baseHue, 0, 360), clamp(baseSat - 48, 0, 100), clamp(moodLightness(mood.lightness), 4, 18))
  const surface = hslToHex(clamp(baseHue, 0, 360), clamp(baseSat - 44, 0, 100), clamp(moodLightness(mood.lightness) + 4, 6, 24))
  const ink = hslToHex(clamp(baseHue, 0, 360), 10, clamp(96 - (mood.lightness ?? 50) / 8, 72, 98))

  const keywords = dedupe([...mood.keywords, ...palette.keywords, ...era.keywords, ...texture.keywords, ...energy.keywords])

  const paletteSwatches: PaletteSwatch[] = [
    { hex: accent, name: 'Accent' },
    { hex: secondary, name: 'Tone' },
    { hex: tertiary, name: 'Highlight' },
    { hex: background, name: 'Base' },
    { hex: ink, name: 'Ink' },
  ]

  const name = cleanBrandName(brandName)
  const tagline = makeTagline(name, keywords, mood.lightness)
  const stackTitle = cleanBrandName(name).toUpperCase()

  return {
    name,
    source: 'taste',
    stack: font.stack,
    display: type.display ?? 'elegist',
    displayName: font.name,
    palette: paletteSwatches,
    background,
    surface,
    ink,
    accent,
    keywords,
    tagline,
    motion: energy.motion ?? DEFAULT_MOTION[0],
    era: era.label,
    texture: texture.label,
    spec: buildSpec({ name: stackTitle, mood: mood.label, palette: palette.label, type: font.name, era: era.label, texture: texture.label, accent, keywords, tagline, motion: energy.motion ?? DEFAULT_MOTION[0] }),
  }
}

export function deriveTreatmentFromUrl(url: string): BrandTreatment {
  const { domain, name } = parseUrl(url)
  const seed = hashString(url)
  const mood = pick('mood', seed)
  const palette = pick('palette', seed >> 3)
  const type = pick('type', seed >> 6)
  const era = pick('era', seed >> 9)
  const texture = pick('texture', seed >> 12)
  const energy = pick('energy', seed >> 15)

  const taste: BrandTaste = { mood, palette, type, era, texture, energy }
  const treatment = deriveTreatment(taste, name)
  treatment.source = 'url'
  treatment.domain = domain
  return treatment
}

export function buildTastePrompt(taste: BrandTaste, brandName?: string, prompt?: string): string {
  const t = deriveTreatment(taste, brandName)
  const lines = [
    `Act as a senior brand strategist and art director for Prometheus Studio.`,
    `I am shaping a personal brand. My validated taste direction is:`,
    ``,
    `- Mood: ${t.era} // ${textureFrom(t.texture)}`,
    `- Palette: ${t.palette.slice(0, 3).map((swatch) => `${swatch.name} ${swatch.hex}`).join(', ')}`,
    `- Type voice: ${t.displayName}`,
    `- Motion language: ${t.motion}`,
    `- Core keywords: ${t.keywords.slice(0, 8).join(', ')}`,
    ``,
  ]
  if (prompt && prompt.trim()) lines.push(`The specific brief I want you to expand on: ${prompt.trim()}`, ``)
  lines.push(`Give me a crisp brand treatment: a refined tagline, three signature moves, and a short positioning statement. Be decisive, not generic. Leave out intro filler.`)
  return lines.join('\n')
}

function textureFrom(label: string) {
  return label
}

function pick(dimensionId: TasteDimensionId, seed: number): string {
  const dimension = DIMENSION_BY_ID[dimensionId]
  const index = Math.abs(seed) % dimension.options.length
  return dimension.options[index].id
}

function parseUrl(url: string): { domain: string; name: string } {
  const cleaned = url.trim()
  const withoutScheme = cleaned.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  const domain = withoutScheme.split('/')[0].split('?')[0].split('#')[0]
  const segments = domain.split('.')
  const root = segments.length > 1 ? segments[segments.length - 2] : segments[0]
  const pretty = root
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  const name = pretty ? titleCase(pretty) : 'Mono Studio'
  return { domain, name }
}

function cleanBrandName(value?: string): string {
  if (!value || !value.trim()) return 'Mono Studio'
  return value.trim().slice(0, 28)
}

function makeTagline(name: string, keywords: string[], lightness?: number): string {
  const light = (lightness ?? 50) > 54
  const pool = light
    ? ['Made to feel effortless.', 'Considered, bright, and clear.', 'Quietly confident, openly warm.', 'Taste made tangible.']
    : DEFAULT_TAGLINES
  const kw = keywords[0] ?? 'taste'
  return `A ${kw} take on ${name}. ${pool[hashString(name) % pool.length]}`
}

function buildSpec(input: {
  name: string
  mood: string
  palette: string
  type: string
  era: string
  texture: string
  accent: string
  keywords: string[]
  tagline: string
  motion: string
}): string {
  return [
    `# ${input.name} — Brand Treatment`,
    ``,
    `**Positioning.** ${input.tagline}`,
    ``,
    `**Direction.** A ${input.mood.toLowerCase()} brand pulled through a ${input.palette.toLowerCase()} palette, set in ${input.type.toLowerCase()} with a ${input.era.toLowerCase()} sensibility and a ${input.texture.toLowerCase()} finish.`,
    ``,
    `**Signature accents.**`,
    `- Key: ${input.keywords.slice(0, 4).join(' · ')}`,
    `- Accent: ${input.accent} · Type voice: ${input.type}`,
    `- Motion: ${input.motion}`,
    ``,
    `**Three signature moves.**`,
    `1. Establish a single hero mood (${input.mood}) and let every surface echo it.`,
    `2. Keep the palette disciplined — one accent, one tone, one ink.`,
    `3. Move with ${input.motion.toLowerCase().split('.')[0]} everywhere it counts.`,
  ].join('\n')
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 100) / 100
  const light = clamp(l, 0, 100) / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - chroma / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) [r, g, b] = [chroma, x, 0]
  else if (hue < 120) [r, g, b] = [x, chroma, 0]
  else if (hue < 180) [r, g, b] = [0, chroma, x]
  else if (hue < 240) [r, g, b] = [0, x, chroma]
  else if (hue < 300) [r, g, b] = [x, 0, chroma]
  else [r, g, b] = [chroma, 0, x]
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function moodLightness(lightness?: number) {
  const base = 12
  return lightness !== undefined ? Math.max(4, base + Math.round((lightness - 50) / 14)) : base
}

function dedupe(values: string[]) {
  return Array.from(new Set(values))
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
