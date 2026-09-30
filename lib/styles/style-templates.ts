export type StyleTemplate = {
  id: string
  name: string
  description: string
  tags: string[]
  previewImages: string[] // public paths, e.g. "/style-previews/reels-heat-1.jpg"
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'style_iman_punchy',
    name: 'Alex Punchy',
    description: 'Aggressive pacing, strong captions, momentum-focused cut rhythm.',
    tags: ['Captions: High', 'Pacing: Aggressive', 'B-roll: Balanced'],
    previewImages: ['/style-previews/iman-1.jpg'],
  },
  {
    id: 'style_iman_clean',
    name: 'Alex Clean',
    description: 'Minimalist captions, crisp jump cuts, premium sound design slots.',
    tags: ['Captions: Medium', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/iman-2.jpg'],
  },
  {
    id: 'style_podcast_dynamic',
    name: 'Dan Long Form Typography V1',
    description: 'Long-form SVG typography, highlight markers, and smart punch-ins.',
    tags: ['Captions: High', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/podcast-1.jpg'],
  },
  {
    id: 'style_reels_heat',
    name: 'Reels Heat',
    description: 'Fast hook, high energy cuts, b-roll heavy overlays.',
    tags: ['Captions: High', 'Pacing: Aggressive', 'B-roll: Heavy'],
    previewImages: ['/style-previews/reels-heat-1.webp', '/style-previews/reels-heat-2.webp'],
  },
  {
    id: 'style_docs_story',
    name: 'Docs Story',
    description: 'Breathing room, cinematic pacing, tasteful captioning.',
    tags: ['Captions: Low', 'Pacing: Smooth', 'B-roll: Balanced'],
    previewImages: ['/style-previews/docs-story-1.jpg'],
  },
  {
    id: 'style_cinematic_noir',
    name: 'Cinematic Noir',
    description: 'Moody contrast, restrained captions, slow-burn pacing.',
    tags: ['Captions: Low', 'Pacing: Smooth', 'B-roll: Balanced'],
    previewImages: ['/style-previews/dark-cinematic-1.jpg'],
  },
  {
    id: 'style_stoic_red',
    name: 'Stoic Red',
    description: 'Bold accents, confident pacing, minimal distractions.',
    tags: ['Captions: Medium', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/red-statue-1.jpg'],
  },
  {
    id: 'style_minimal_subtle',
    name: 'Minimal Subtle',
    description: 'Bare captions and clean cuts for brand-first content.',
    tags: ['Captions: Low', 'Pacing: Smooth', 'B-roll: Rare'],
    previewImages: ['/style-previews/minimal-subtle-1.jpg'],
  },
]
