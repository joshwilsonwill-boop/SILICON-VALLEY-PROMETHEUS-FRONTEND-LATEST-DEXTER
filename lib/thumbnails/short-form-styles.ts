/**
 * Short-Form Thumbnail Stylization Archetypes & Core Tenants
 *
 * A restrained editorial system tuned for Prometheus Studio's minimalist direction:
 * - Editorial serif display type set in bone/ivory or charcoal ink (no neon clichés)
 * - Depth separation (text behind principal speaker) with a muted, single accent
 * - A quiet photo treatment set by default: deep vignette only, decor off by default
 * - Floating assets are opt-in signatures, never the default
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
    name: 'Masthead Behind',
    category: 'behind_speaker',
    tagline: 'Oversized editorial serif rising behind the speaker, quiet contrast',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'cursive',
    defaultBrandColor: '#3E5C76',
    secondaryColor: '#E8E1D2',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.5,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'A QUIET MONSTER',
    sampleScript: 'so it goes',
    sampleSubtitle: 'MASTER CLASS',
  },
  {
    id: 'confessional_gold',
    name: 'Statement Portrait',
    category: 'behind_speaker',
    tagline: 'Deep charcoal field with a single bone accent and editorial subtitle',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'cursive',
    defaultBrandColor: '#E8E1D2',
    secondaryColor: '#2B2D33',
    textLayer: 'foreground',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.7,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'STILL, I WIN',
    sampleScript: 'a field note',
    sampleSubtitle: 'ON HOLDING ON',
  },
  {
    id: 'script_sans_split',
    name: 'Script & Sans Split',
    category: 'script_hybrid',
    tagline: 'Two-column pairing: an editorial serif face against a grotesque sans',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: '"Black Delights", cursive',
    defaultBrandColor: '#3A4B38',
    secondaryColor: '#E8E1D2',
    textLayer: 'split',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.5,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'WHAT IS OWED',
    sampleScript: 'the quiet part',
    sampleSubtitle: 'THE RULES OF RENAMING',
  },
  {
    id: 'paper_collage_pinup',
    name: 'Loose-Width Paper Cut',
    category: 'editorial_collage',
    tagline: 'Pinned paper note with a single doodle arrow; quiet texture',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'cursive',
    defaultBrandColor: '#E8E1D2',
    secondaryColor: '#2B2D33',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.55,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: ['doodle_arrow'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'PRINT THE POINT',
    sampleScript: 'from design',
    sampleSubtitle: 'CREATIVE DIRECTOR',
  },
  {
    id: 'creator_3d_icons',
    name: 'Studio Still',
    category: '3d_assets',
    tagline: 'One readable headline, a single small icon, neutral negative space',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'cursive',
    defaultBrandColor: '#4C6E9E',
    secondaryColor: '#E8E1D2',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.5,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: ['camera'],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'MAKE IT ON PURPOSE',
    sampleScript: 'content studio',
    sampleSubtitle: 'ON THE SHOT',
  },
  {
    id: 'super_confident_script',
    name: 'Serif Overlap',
    category: 'script_hybrid',
    tagline: 'Heavy editorial serif with a single overlapping accent line',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: '"Black Delights", cursive',
    defaultBrandColor: '#2B2D33',
    secondaryColor: '#E8E1D2',
    textLayer: 'foreground',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.6,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'HOLD THE CENTER',
    sampleScript: 'so be it',
    sampleSubtitle: 'WITHIN THE ROOM',
  },
  {
    id: 'torn_edge_editorial',
    name: 'Marginalia Editorial',
    category: 'editorial_collage',
    tagline: 'Cropped photo texture with a ruled margin-note strip',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'cursive',
    defaultBrandColor: '#77787B',
    secondaryColor: '#E8E1D2',
    textLayer: 'behind',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.5,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'MARGINS NOTED',
    sampleScript: 'to the side',
    sampleSubtitle: 'STREETWEAR EDIT',
  },
  {
    id: 'mrbeast_grid_contrast',
    name: 'Grid Still',
    category: '3d_assets',
    tagline: 'Fine hairline grid, centered subject, restrained contrast',
    primaryFont: 'Georgia, "Times New Roman", serif',
    scriptFont: 'sans-serif',
    defaultBrandColor: '#3E5C76',
    secondaryColor: '#E8E1D2',
    textLayer: 'foreground',
    hasRimLight: false,
    hasVignette: true,
    defaultVignetteIntensity: 0.55,
    hasFilmGrain: false,
    hasFringeBlur: false,
    hasInkBleed: false,
    defaultFloatingAssets: [],
    backgroundGrid: false,
    telemetryRuler: false,
    sampleHeadline: 'WEEK 1',
    sampleScript: 'no shortcuts',
    sampleSubtitle: 'THE EIGHTEEN MONTHS',
  },
]
