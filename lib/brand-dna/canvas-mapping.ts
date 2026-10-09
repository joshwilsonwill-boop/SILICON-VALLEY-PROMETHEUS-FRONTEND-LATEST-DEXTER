export type BrandCanvasCard = {
  id: string
  title: string
  index: string
  lines: string[]
  accent: string
  rotation: number
  x: string
  y: string
  depth: number
}

export type BrandDirection = {
  id: string
  name: string
  subtitle: string
  sourceUrl: string
  headline: string
  colors: { start: string; middle: string; end: string; accent: string; soft: string }
  cards: BrandCanvasCard[]
}

type SavedBrandDna = {
  brandName?: string
  url?: string
  tagline?: string
  valueProposition?: string
  industry?: string
  targetAudience?: string
  logoText?: string
  primaryColors?: { surface?: string; primary?: string; accent?: string; text?: string; muted?: string; border?: string }
  fonts?: { display?: string; body?: string; mono?: string }
  kineticStyle?: { pacing?: string; captionStyle?: string }
  toneOfVoice?: string[]
  evidence?: { pagesRead?: number; colorsObserved?: string[]; fontsObserved?: string[] }
  keyMessages?: { title?: string }[]
  aiPhotoPreset?: string
}

function websiteHost(value: string | undefined) {
  try {
    return new URL(value ?? '').hostname.replace(/^www\./, '') || 'website'
  } catch {
    return 'website'
  }
}

function short(value: string | undefined, fallback: string, max = 35) {
  const clean = value?.replace(/\s+/g, ' ').trim() || fallback
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function mapSavedBrandDnaToCanvas(raw: string | null): BrandDirection | null {
  if (!raw) return null
  try {
    const dna = JSON.parse(raw) as SavedBrandDna
    if (!dna.brandName || !dna.primaryColors) return null
    const colors = dna.primaryColors
    const tone = dna.toneOfVoice?.slice(0, 4) ?? []
    const messageTitles = dna.keyMessages?.map((message) => message.title).filter((title): title is string => Boolean(title)).slice(0, 4) ?? []
    const observedFonts = dna.evidence?.fontsObserved ?? []
    const displayFont = dna.fonts?.display ?? 'system-ui'
    const hasObservedFont = observedFonts.some((font) => font.toLowerCase() === displayFont.toLowerCase())
    const paletteTitle = dna.evidence?.colorsObserved?.length ? 'Observed palette' : 'Suggested palette'
    const sourceUrl = dna.url && /^https?:\/\//i.test(dna.url) ? dna.url : ''

    return {
      id: 'saved-brand-dna',
      name: dna.brandName,
      subtitle: `${dna.evidence?.pagesRead ? 'Analyzed' : 'Saved'} from ${websiteHost(dna.url)}${dna.evidence?.pagesRead ? ` · ${dna.evidence.pagesRead} pages` : ''}`,
      sourceUrl,
      headline: `${short(dna.tagline, 'A direction shaped by your brand', 29)}\nbrand direction.`,
      colors: {
        start: colors.surface ?? '#111827',
        middle: colors.primary ?? '#334155',
        end: colors.accent ?? '#475569',
        accent: colors.accent ?? '#a3e635',
        soft: '#f8fafc',
      },
      cards: [
        { id: 'strategy', title: 'Brand position', index: '01', lines: [short(dna.tagline, 'Core promise'), short(dna.valueProposition, 'Value proposition'), short(dna.targetAudience, 'Audience'), short(dna.industry, 'Category')], accent: '↗', rotation: -8, x: '5%', y: '23%', depth: 0.45 },
        { id: 'creative', title: 'Voice & motion', index: '02', lines: [...tone.slice(0, 2), `${hasObservedFont ? 'Type' : 'Type fallback'}: ${short(displayFont, 'system-ui', 25)}`, short(dna.kineticStyle?.captionStyle, 'Caption direction')].slice(0, 4), accent: '✳', rotation: 4, x: '25%', y: '16%', depth: 0.78 },
        { id: 'palette', title: paletteTitle, index: '03', lines: [`Primary ${colors.primary ?? '—'}`, `Accent ${colors.accent ?? '—'}`, `Surface ${colors.surface ?? '—'}`, `Text ${colors.text ?? '—'}`], accent: '◉', rotation: -2, x: '49%', y: '20%', depth: 1 },
        { id: 'assets', title: 'Brand anchors', index: '04', lines: [short(dna.logoText, dna.brandName), ...messageTitles.slice(0, 2), short(dna.aiPhotoPreset, 'Image direction')].slice(0, 4).map((item) => short(item, 'Brand anchor')), accent: '▣', rotation: 7, x: '73%', y: '15%', depth: 0.62 },
      ],
    }
  } catch {
    return null
  }
}
