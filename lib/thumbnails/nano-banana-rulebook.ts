/**
 * Nano Banana Cinematic Thumbnail Prompt Rulebook & Snippet Engine
 *
 * Formalized prompt engineering system for synthesizing viral, high-conversion
 * thumbnails (9:16 vertical shorts and 16:9 horizontal YouTube) using Nano Banana.
 *
 * Derived directly from empirical top-creator benchmarks:
 * - Highlighter brush strokes behind key power words
 * - Floating proof artifacts (analytics dashboards with up-arrows, tweet cards, calendar blocks)
 * - Directional chalk/doodle arrows guiding viewer gaze
 * - Textured studio backgrounds (isometric grids, chalkboard grit, dark gradients)
 * - High-contrast lighting with crisp subject rim-light separation
 */

export interface PromptSnippet {
  id: string
  label: string
  category: 'background' | 'text_treatment' | 'proof_artifact' | 'directional' | 'lighting'
  promptFragment: string
}

export interface ThumbnailRecipe {
  id: string
  name: string
  description: string
  aspectRatio: '9:16' | '16:9' | '1:1'
  backgroundStyle: string
  textTreatmentStyle: string
  proofArtifact: string
  directionalStyle: string
  lightingStyle: string
  subjectPosition: 'center' | 'left' | 'right'
  exampleHeadline: string
  highlightWord?: string
}

/**
 * 1. BACKGROUND TEXTURE SNIPPETS
 */
export const BACKGROUND_SNIPPETS: Record<string, PromptSnippet> = {
  dark_isometric_grid: {
    id: 'dark_isometric_grid',
    label: 'Dark Technical Isometric Grid',
    category: 'background',
    promptFragment:
      'Background is a sophisticated deep charcoal and matte black studio space with subtle, razor-sharp technical isometric grid lines fading into a gentle ambient dark vignette.',
  },
  light_graph_grid: {
    id: 'light_graph_grid',
    label: 'Clean Minimal White Graph Paper',
    category: 'background',
    promptFragment:
      'Background is an immaculate, bright high-key architectural white studio wall with faint, precise technical graph paper grid lines and soft ambient daylight.',
  },
  chalkboard_grunge: {
    id: 'chalkboard_grunge',
    label: 'Classroom Chalkboard Grit',
    category: 'background',
    promptFragment:
      'Background features a textured dark slate green-black chalkboard surface with authentic subtle chalk dust smears, faint erasure marks, and tactile classroom workshop ambiance.',
  },
  studio_gradient_sweep: {
    id: 'studio_gradient_sweep',
    label: 'Cinematic Studio Gradient Sweep',
    category: 'background',
    promptFragment:
      'Background is a clean, seamless photography studio cyclorama wall with an intentional radial gradient falloff, subtle film grain, and high-end commercial editorial contrast.',
  },
  warm_film_vignette: {
    id: 'warm_film_vignette',
    label: 'Warm Analog Film Halftone',
    category: 'background',
    promptFragment:
      'Background has rich vintage film grain, warm amber and mahogany dark vignette around the perimeter, with subtle collage textures and authentic retro print halftone dots.',
  },
}

/**
 * 2. TEXT TREATMENT & TYPOGRAPHY SNIPPETS
 */
export const TEXT_TREATMENT_SNIPPETS: Record<string, PromptSnippet> = {
  highlighter_power_word: {
    id: 'highlighter_power_word',
    label: 'Highlighter Stroke Behind Power Word',
    category: 'text_treatment',
    promptFragment:
      'Ultra-bold condensed sans-serif typography. The primary headline has an authentic, vibrant painterly highlighter brush stroke (bright safety yellow or neon lime) layered directly behind the single high-impact power word, making it leap off the canvas with extreme contrast.',
  },
  solid_pill_badge: {
    id: 'solid_pill_badge',
    label: 'Solid Pill Badge / Chip Behind Phrase',
    category: 'text_treatment',
    promptFragment:
      'Bold modern grotesque headline where key phrases are encapsulated inside solid high-contrast rounded rectangular pill badges (electric cobalt blue or crimson red) with crisp white text inside.',
  },
  ransom_paper_cutout: {
    id: 'ransom_paper_cutout',
    label: 'Ransom Cut-Paper Collage Letters',
    category: 'text_treatment',
    promptFragment:
      'Editorial scrapbook ransom-note typography featuring cutout textured white paper slips with bold black printed serif and slab numbers, with authentic drop shadows and torn paper edges.',
  },
  dual_contrast_split: {
    id: 'dual_contrast_split',
    label: 'Dual-Tone Split Comparison Badges',
    category: 'text_treatment',
    promptFragment:
      'Split contrast comparison badges with bold white typography set against contrasting vibrant red and deep electric blue rectangular blocks, communicating before-and-after disparity.',
  },
  luxury_script_overlay: {
    id: 'luxury_script_overlay',
    label: 'Flowing Cursive Signature Script Behind/Over',
    category: 'text_treatment',
    promptFragment:
      'Giant expressive handwritten cursive signature script dynamically masked partially behind the subject’s head and shoulders in ivory bone or warm chalk, paired with ultra-clean modern sans text.',
  },
}

/**
 * 3. PROOF ARTIFACTS & PROP SNIPPETS
 */
export const PROOF_ARTIFACT_SNIPPETS: Record<string, PromptSnippet> = {
  metric_growth_card: {
    id: 'metric_growth_card',
    label: 'Floating Metric Dashboard with Green Up-Arrows',
    category: 'proof_artifact',
    promptFragment:
      'A single restrained analytics proof card with a clean ascending chart and one green up-arrow sits behind the creator. Use only values supplied in the creative notes; otherwise keep the chart free of numeric claims.',
  },
  tweet_social_card: {
    id: 'tweet_social_card',
    label: 'Floating Social / Tweet Verification Card',
    category: 'proof_artifact',
    promptFragment:
      'A floating high-fidelity verified social media post card with rounded corners, realistic avatar badge, creator handle, and bold high-contrast quote text with clean drop shadow.',
  },
  calendar_schedule_card: {
    id: 'calendar_schedule_card',
    label: 'Floating Google Calendar Schedule Block',
    category: 'proof_artifact',
    promptFragment:
      'A floating weekly calendar grid UI showing busy orange, yellow, and purple time-blocks with date headers ("MON 13", "FRI 17"), suspended in space directly behind the speaker.',
  },
  money_pile_bed: {
    id: 'money_pile_bed',
    label: 'Foreground Bed of Cash Stacks',
    category: 'proof_artifact',
    promptFragment:
      'A tactile, volumetric bed of crisp US one-hundred-dollar bills piled in the foreground around the speaker’s lower torso, with bills fanning out with realistic paper depth and focal blur.',
  },
  conceptual_3d_prop: {
    id: 'conceptual_3d_prop',
    label: 'Hyper-Realistic Conceptual Prop (Brain/Hardware)',
    category: 'proof_artifact',
    promptFragment:
      'The subject holds a hyper-detailed, photorealistic physical prop (such as a 3D brain model or open laptop display) integrated naturally into the hands with realistic shadows, skin contact, and physical weight.',
  },
}

/**
 * 4. DIRECTIONAL ANNOTATIONS & GAZE GUIDES
 */
export const DIRECTIONAL_SNIPPETS: Record<string, PromptSnippet> = {
  chalk_doodle_arrows: {
    id: 'chalk_doodle_arrows',
    label: 'Hand-Drawn Chalk / Marker Doodle Arrows',
    category: 'directional',
    promptFragment:
      'Curved, hand-drawn white chalk doodle arrows with informal sketched arrowheads and playful organic trajectory arcs pointing viewer attention directly toward key focal points and annotations.',
  },
  bold_indicator_arrow: {
    id: 'bold_indicator_arrow',
    label: 'Bold Crimson / White Trend Direction Arrow',
    category: 'directional',
    promptFragment:
      'Thick, bold 3D directional arrow in high-visibility crimson red or solid white with a crisp drop shadow, cutting across the frame to establish immediate visual velocity and focus.',
  },
  dotted_comparison_path: {
    id: 'dotted_comparison_path',
    label: 'Dotted Arch Comparison Line',
    category: 'directional',
    promptFragment:
      'A clean dotted white trajectory arch curving from the low-value indicator badge over the subject’s head to the high-value breakthrough badge, ending in a crisp white arrowhead.',
  },
  none: {
    id: 'none',
    label: 'Clean / No Directional Arrows',
    category: 'directional',
    promptFragment: 'Clean composition with no arrows, relying entirely on lighting and eye-line to guide viewer gaze.',
  },
}

/**
 * 5. CINEMATIC LIGHTING & SUBJECT CROP SNIPPETS
 */
export const LIGHTING_SNIPPETS: Record<string, PromptSnippet> = {
  high_contrast_rim: {
    id: 'high_contrast_rim',
    label: 'High-Contrast Studio Key + Colored Rim Light',
    category: 'lighting',
    promptFragment:
      'Professional cinematic key lighting illuminating the creator’s face with razor-sharp catchlights in the eyes, paired with an intense, razor-thin rim light (cyan, cobalt blue, or neon lime) tracing the silhouette of the head and shoulders for complete separation from the background.',
  },
  podcast_warm_studio: {
    id: 'podcast_warm_studio',
    label: 'Intimate Dark Podcast Studio Lighting',
    category: 'lighting',
    promptFragment:
      'Intimate podcast studio ambiance with moody chiaroscuro key lighting, high dynamic range skin texture, crisp podcast microphone (Shure SM7B) slightly in frame, and deep velvety shadows.',
  },
  commercial_bright: {
    id: 'commercial_bright',
    label: 'Commercial High-Key Crisp Portrait',
    category: 'lighting',
    promptFragment:
      'Even, ultra-clean commercial studio lighting with soft diffused fill, vibrant skin tones, razor-sharp facial details, and immaculate edge definition.',
  },
}

/**
 * CURATED VIRAL RECIPES (Derived from real references)
 */
export const VIRAL_THUMBNAIL_RECIPES: ThumbnailRecipe[] = [
  {
    id: 'metric_growth_dashboard',
    name: 'Metric Growth Dashboard',
    description: 'Floating glass analytics card behind speaker with green up-arrows and punchy headline',
    aspectRatio: '16:9',
    backgroundStyle: 'dark_isometric_grid',
    textTreatmentStyle: 'highlighter_power_word',
    proofArtifact: 'metric_growth_card',
    directionalStyle: 'chalk_doodle_arrows',
    lightingStyle: 'high_contrast_rim',
    subjectPosition: 'center',
    exampleHeadline: 'EASY MODE',
    highlightWord: 'EASY',
  },
  {
    id: 'highlighter_power_callout',
    name: 'Highlighter Power Callout',
    description: 'Bold text with a vivid highlighter brush stroke behind the hook word + prop pose',
    aspectRatio: '16:9',
    backgroundStyle: 'light_graph_grid',
    textTreatmentStyle: 'highlighter_power_word',
    proofArtifact: 'conceptual_3d_prop',
    directionalStyle: 'none',
    lightingStyle: 'commercial_bright',
    subjectPosition: 'right',
    exampleHeadline: 'Control your MIND',
    highlightWord: 'MIND',
  },
  {
    id: 'solid_pill_podcast',
    name: 'Solid Pill & Podcast Hook',
    description: 'White text with an electric cobalt pill badge around the topic + curved white arrow',
    aspectRatio: '16:9',
    backgroundStyle: 'dark_isometric_grid',
    textTreatmentStyle: 'solid_pill_badge',
    proofArtifact: 'tweet_social_card',
    directionalStyle: 'chalk_doodle_arrows',
    lightingStyle: 'podcast_warm_studio',
    subjectPosition: 'right',
    exampleHeadline: 'Inside a CMO’s Brain',
    highlightWord: 'Brain',
  },
  {
    id: 'split_comparison_scale',
    name: 'Split Comparison $300 vs $100K',
    description: 'Red vs Blue contrast badges with dotted trajectory arrow and foreground cash pile',
    aspectRatio: '16:9',
    backgroundStyle: 'studio_gradient_sweep',
    textTreatmentStyle: 'dual_contrast_split',
    proofArtifact: 'money_pile_bed',
    directionalStyle: 'dotted_comparison_path',
    lightingStyle: 'high_contrast_rim',
    subjectPosition: 'center',
    exampleHeadline: '$300 to $100K',
    highlightWord: '$100K',
  },
  {
    id: 'vertical_reel_ransom_chalk',
    name: '9:16 Vertical Reel Ransom & Chalk',
    description: 'Cut-paper collage typography, masked script behind head, chalkboard grit & annotations',
    aspectRatio: '9:16',
    backgroundStyle: 'chalkboard_grunge',
    textTreatmentStyle: 'ransom_paper_cutout',
    proofArtifact: 'conceptual_3d_prop',
    directionalStyle: 'chalk_doodle_arrows',
    lightingStyle: 'high_contrast_rim',
    subjectPosition: 'center',
    exampleHeadline: 'PERFECT LOGO',
    highlightWord: 'LOGO',
  },
  {
    id: 'calendar_time_pressure',
    name: 'Calendar Time Pressure',
    description: 'Floating busy calendar block behind tired creator with downward trend arrows',
    aspectRatio: '16:9',
    backgroundStyle: 'studio_gradient_sweep',
    textTreatmentStyle: 'highlighter_power_word',
    proofArtifact: 'calendar_schedule_card',
    directionalStyle: 'bold_indicator_arrow',
    lightingStyle: 'podcast_warm_studio',
    subjectPosition: 'left',
    exampleHeadline: 'Time is ticking.',
    highlightWord: 'ticking.',
  },
  {
    id: 'ideas_concept',
    name: 'Ideas Concept',
    description: 'One oversized idea word, a tactile concept prop, and a portrait anchored to the video',
    aspectRatio: '16:9',
    backgroundStyle: 'light_graph_grid',
    textTreatmentStyle: 'highlighter_power_word',
    proofArtifact: 'conceptual_3d_prop',
    directionalStyle: 'none',
    lightingStyle: 'commercial_bright',
    subjectPosition: 'center',
    exampleHeadline: 'IDEAS THAT WORK',
    highlightWord: 'IDEAS',
  },
]

/**
 * Prompt Assembler for Nano Banana
 */
export function buildNanoBananaPrompt(params: {
  headline: string
  highlightWord?: string
  aspectRatio: '9:16' | '2:3' | '16:9' | '1:1'
  backgroundId?: string
  textTreatmentId?: string
  proofArtifactId?: string
  directionalId?: string
  lightingId?: string
  userCreativeDirection?: string
  subjectPosition?: 'center' | 'left' | 'right'
}): string {
  const bg = BACKGROUND_SNIPPETS[params.backgroundId || 'dark_isometric_grid'] || BACKGROUND_SNIPPETS.dark_isometric_grid
  const text =
    TEXT_TREATMENT_SNIPPETS[params.textTreatmentId || 'highlighter_power_word'] ||
    TEXT_TREATMENT_SNIPPETS.highlighter_power_word
  const proof =
    PROOF_ARTIFACT_SNIPPETS[params.proofArtifactId || 'metric_growth_card'] ||
    PROOF_ARTIFACT_SNIPPETS.metric_growth_card
  const dir =
    DIRECTIONAL_SNIPPETS[params.directionalId || 'chalk_doodle_arrows'] ||
    DIRECTIONAL_SNIPPETS.chalk_doodle_arrows
  const light =
    LIGHTING_SNIPPETS[params.lightingId || 'high_contrast_rim'] ||
    LIGHTING_SNIPPETS.high_contrast_rim

  const highlightClause = params.highlightWord
    ? `Emphasize the exact word "${params.highlightWord.toUpperCase()}" using the selected text treatment, without covering its letterforms.`
    : ''

  return [
    `Create a viral, ultra-high-resolution, conversion-optimized YouTube/Shorts cover image (${params.aspectRatio} aspect ratio).`,
    `MAIN SUBJECT: Preserve the primary visible subject from the anchor keyframe. If a person is present, keep their recognizable facial features and authentic skin texture; do not invent a new person. Place the subject ${params.subjectPosition || 'center'} with clear negative space for the headline.`,
    `LIGHTING & DEPTH: ${light.promptFragment}`,
    `BACKGROUND: ${bg.promptFragment}`,
    `HEADLINE & TEXT: The headline reads "${params.headline.toUpperCase()}". ${text.promptFragment} ${highlightClause}`,
    `PROOF ARTIFACT & UI: ${proof.promptFragment}`,
    `DIRECTIONAL GUIDANCE: ${dir.promptFragment}`,
    `QUALITY STANDARD: Cinematic commercial quality, authentic skin texture, controlled contrast, legible typography, and a clear focal hierarchy. Use one dominant prop or proof cue at most. Avoid invented numbers, unrelated logos, clutter, muddy gradients, and cartoonish rendering.`,
    params.userCreativeDirection ? `ADDITIONAL CREATIVE NOTES: ${params.userCreativeDirection}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
