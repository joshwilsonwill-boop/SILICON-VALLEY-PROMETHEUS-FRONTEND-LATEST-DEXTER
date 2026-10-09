export type ExtractedBrandDna = {
  id: string
  url: string
  sourceUrls: string[]
  analyzedAt: string
  brandName: string
  industry: string
  tagline: string
  valueProposition: string
  targetAudience: string
  logoText: string
  primaryColors: {
    surface: string
    primary: string
    accent: string
    text: string
    muted: string
    border: string
  }
  fonts: { display: string; body: string; mono: string }
  kineticStyle: {
    curveName: string
    pacing: 'rapid_dynamic' | 'cinematic_deliberate' | 'balanced'
    captionStyle: string
  }
  toneOfVoice: string[]
  personality: { visionary: number; polish: number; intensity: number }
  keyMessages: { title: string; body: string }[]
  aiPhotoPreset: string
  evidence: {
    pagesRead: number
    colorsObserved: string[]
    fontsObserved: string[]
  }
}
