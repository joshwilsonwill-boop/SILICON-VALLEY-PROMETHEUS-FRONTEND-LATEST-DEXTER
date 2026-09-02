/**
 * Short-Form Thumbnail Stylization Archetypes & Core Tenants
 *
 * Extracted from high-performing vertical (9:16 / 9:6) social video references.
 * Encapsulates:
 * - Depth separation (text behind principal speaker)
 * - Multi-typographic combinations (bold condensed sans + cursive script + telemetry)
 * - Floating contextual 3D/2D visual assets
 * - Glow treatments, rim lighting, and brand color palette
 * - Photo treatments: vignetting, film dust & grain, fringe blur, text ink bleed
 */

export interface ShortFormStyleConfig {
  id: string
  name: string
  category: 'behind_speaker' | 'script_hybrid' | '3d_assets' | 'editorial_collage'
  tagline: string
  primaryFont: string
  scriptFont?: string
  defaultBrandColor: string
  secondaryColor?: string
  textLayer: 'behind' | 'foreground' | 'split'
  hasRimLight: boolean
  hasVignette: boolean
  defaultVignetteIntensity: number // 0 to 1
  hasFilmGrain: boolean
  hasFringeBlur: boolean
  hasInkBleed: boolean
  defaultFloatingAssets: string[]
  backgroundGrid: boolean
  telemetryRuler: boolean
  sampleHeadline: string
  sampleScript?: string
  sampleSubtitle?: string
}

export const SHORT_FORM_ARCHETYPES: ShortFormStyleConfig[] = [
  {
    id: 'behind_subject_blueprint',
    name: 'Holographic Blueprint',
    category: 'behind_speaker',
    tagline: 'Giant background text behind speaker with glowing assets & telemetry ruler',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: 'monospace',
    defaultBrandColor: '#FF6B00',
    secondaryColor: '#FFFFFF',
    textLayer: 'behind',
    hasRimLight: true,
    hasVignette: true,
    defaultVignetteIntensity: 0.7,
    hasFilmGrain: true,
    hasFringeBlur: true,
    hasInkBleed: false,
    defaultFloatingAssets: ['hourglass', 'book', 'timer'],
    backgroundGrid: false,
    telemetryRuler: true,
    sampleHeadline: 'TIME MANAGEMENT',
    sampleSubtitle: 'READING\'DA PROTOCOL',
  },
  {
    id: 'confessional_gold',
    name: 'Podcast Confessional',
    category: 'behind_speaker',
    tagline: 'Deep darkroom vignette with glowing gold numbers & clean italic subtitle',
    primaryFont: '-apple-system, BlinkMacSystemFont, "Geist Sans", sans-serif',
    scriptFont: 'sans-serif',
    defaultBrandColor: '#FFE600',
    secondaryColor: '#FFFFFF',
    textLayer: 'foreground',
    hasRimLight: true,
    hasVignette: true,
    defaultVignetteIntensity: 0.85,
    hasFilmGrain: true,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: ['dollar', 'mic'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: '$ 1,000,000',
    sampleSubtitle: 'EVERY MONTH',
  },
  {
    id: 'script_sans_split',
    name: 'Script & Sans Split',
    category: 'script_hybrid',
    tagline: 'Two-column framing combining luxury cursive script with clean grotesque sans',
    primaryFont: '-apple-system, BlinkMacSystemFont, "Geist Sans", sans-serif',
    scriptFont: '"Dancing Script", "Playfair Display", cursive',
    defaultBrandColor: '#FFE600',
    secondaryColor: '#00E676',
    textLayer: 'split',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.5,
    hasFilmGrain: true,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: ['sparkle'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'DOESN\'T BELONG TO',
    sampleScript: 'The future',
    sampleSubtitle: 'PEOPLE WHO KNOW THE MOST',
  },
  {
    id: 'paper_collage_pinup',
    name: 'Paper Cutout Pin-Up',
    category: 'editorial_collage',
    tagline: 'Pinned paper banner behind speaker with handwritten chalk notes & arrows',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: 'sans-serif',
    defaultBrandColor: '#FF3B30',
    secondaryColor: '#FFE600',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.65,
    hasFilmGrain: true,
    hasFringeBlur: true,
    hasInkBleed: true,
    defaultFloatingAssets: ['pin', 'doodle_arrow', 'badge_star'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'FREE ANIMATION TOOL',
    sampleSubtitle: 'FROM DESIGN TO ANIMATION',
  },
  {
    id: 'creator_3d_icons',
    name: '3D Glossy Creator',
    category: '3d_assets',
    tagline: 'Giant headline behind head, 3D app icons & dual-color rim lighting',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: 'sans-serif',
    defaultBrandColor: '#00F0FF',
    secondaryColor: '#FF2D55',
    textLayer: 'behind',
    hasRimLight: true,
    hasVignette: true,
    defaultVignetteIntensity: 0.6,
    hasFilmGrain: true,
    hasFringeBlur: true,
    hasInkBleed: false,
    defaultFloatingAssets: ['notepad', 'camera', 'doodle_arrow'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'CONTENT CREATION',
    sampleSubtitle: 'CREATE SMARTER NOT HARDER',
  },
  {
    id: 'super_confident_script',
    name: 'Red Script Overlap',
    category: 'script_hybrid',
    tagline: 'Heavy white condensed block with flowing bright red cursive script across it',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: '"Dancing Script", cursive',
    defaultBrandColor: '#FF0033',
    secondaryColor: '#FFCC00',
    textLayer: 'foreground',
    hasRimLight: true,
    hasVignette: true,
    defaultVignetteIntensity: 0.75,
    hasFilmGrain: true,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: ['question_mark', 'note_paper'],
    backgroundGrid: false,
    telemetryRuler: true,
    sampleHeadline: 'SUPER CONFIDENT',
    sampleScript: 'bo\'lish uchun',
    sampleSubtitle: 'IMTIHONDA REVOLUTION',
  },
  {
    id: 'torn_edge_editorial',
    name: 'Torn Edge Streetwear',
    category: 'editorial_collage',
    tagline: 'Torn paper backdrop, giant tracked letters behind hoodie & lower editorial credits',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: '-apple-system, sans-serif',
    defaultBrandColor: '#FF2D55',
    secondaryColor: '#F7F6F2',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.6,
    hasFilmGrain: true,
    hasFringeBlur: false,
    hasInkBleed: true,
    defaultFloatingAssets: ['money_bill'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'MULTI MILLIONAIRE',
    sampleSubtitle: 'CREATIVE DIRECTOR EDITORIAL',
  },
  {
    id: 'mrbeast_grid_contrast',
    name: 'MrBeast Grid High-Contrast',
    category: '3d_assets',
    tagline: 'Grid backdrop, centered spotlight bloom, floating 3D calendar & rounded pill badge',
    primaryFont: 'Impact, -apple-system, sans-serif',
    scriptFont: 'sans-serif',
    defaultBrandColor: '#FFB800',
    secondaryColor: '#FFFFFF',
    textLayer: 'foreground',
    hasRimLight: true,
    hasVignette: true,
    defaultVignetteIntensity: 0.7,
    hasFilmGrain: true,
    hasFringeBlur: true,
    hasInkBleed: false,
    defaultFloatingAssets: ['calendar_x'],
    backgroundGrid: true,
    telemetryRuler: false,
    sampleHeadline: 'MR BEAST',
    sampleSubtitle: 'NO DAYS OFF',
  },
]
