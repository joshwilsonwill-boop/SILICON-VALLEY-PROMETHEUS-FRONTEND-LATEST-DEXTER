import type { TemplateStyle } from '@/lib/types'

export const TEMPLATE_STYLES: TemplateStyle[] = [
  {
    id: 'style_iman_punchy',
    name: 'Alex Punchy',
    description: 'Aggressive pacing, strong captions, momentum-focused cut rhythm.',
    category: 'Iman',
    tags: { captionIntensity: 'High', pacing: 'Aggressive', broll: 'Balanced' },
  },
  {
    id: 'style_iman_clean',
    name: 'Alex Clean',
    description: 'Minimalist captions, crisp jump cuts, premium sound design slots.',
    category: 'Iman',
    tags: { captionIntensity: 'Medium', pacing: 'Snappy', broll: 'Rare' },
  },
  {
    id: 'style_podcast_dynamic',
    name: 'Dan Long Form Typography V1',
    description: 'Long-form SVG typography, highlight markers, and smart punch-ins.',
    category: 'Podcast',
    tags: { captionIntensity: 'High', pacing: 'Snappy', broll: 'Rare' },
  },
  {
    id: 'style_reels_heat',
    name: 'Reels Heat',
    description: 'Fast hook, high energy cuts, b-roll heavy overlays.',
    category: 'Reels',
    tags: { captionIntensity: 'High', pacing: 'Aggressive', broll: 'Heavy' },
  },
  {
    id: 'style_docs_story',
    name: 'Docs Story',
    description: 'Breathing room, cinematic pacing, tasteful captioning.',
    category: 'Docs',
    tags: { captionIntensity: 'Low', pacing: 'Smooth', broll: 'Balanced' },
  },
  {
    id: 'style_minimal_subtle',
    name: 'Minimal Subtle',
    description: 'Bare captions and clean cuts for brand-first content.',
    category: 'Minimal',
    tags: { captionIntensity: 'Low', pacing: 'Smooth', broll: 'Rare' },
  },
]

export const TEMPLATE_CATEGORIES: Array<TemplateStyle['category']> = [
  'Iman',
  'Podcast',
  'Reels',
  'Docs',
  'Minimal',
]
