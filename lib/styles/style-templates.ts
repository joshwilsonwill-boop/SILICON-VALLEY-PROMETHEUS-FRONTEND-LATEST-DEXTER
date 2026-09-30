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
    name: 'Iman Punchy',
    description: 'Aggressive pacing, strong captions, momentum-focused cut rhythm.',
    tags: ['Captions: High', 'Pacing: Aggressive', 'B-roll: Balanced'],
    previewImages: ['/style-previews/iman-punchy-card.jpg'],
  },
  {
    id: 'style_iman_clean',
    name: 'Iman Clean',
    description: 'Minimalist captions, crisp jump cuts, premium sound design slots.',
    tags: ['Captions: Medium', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/iman-clean-card.jpg'],
  },
  {
    id: 'style_podcast_dynamic',
    name: 'Long Form Typography V1',
    description: 'Robert Kiyosaki quote treatment with oversized portrait typography and highlighted phrases.',
    tags: ['Captions: High', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/long-form-typography.jpg'],
  },
  {
    id: 'style_reels_heat',
    name: 'Reels Heat',
    description: '“I’m Impossible” statement card, bold red typography, and high-energy cuts.',
    tags: ['Captions: High', 'Pacing: Aggressive', 'B-roll: Heavy'],
    previewImages: ['/style-previews/reels-heat-quote.jpg', '/style-previews/reels-heat-1.webp'],
  },
  {
    id: 'style_docs_story',
    name: 'Docs Story',
    description: '“Evolve” portrait treatment with story-led typography and cinematic pacing.',
    tags: ['Captions: Low', 'Pacing: Smooth', 'B-roll: Balanced'],
    previewImages: ['/style-previews/docs-story-evolve.jpg'],
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
    description: 'Stoic sculpture, “Your brand deserves better content” grid, and bold editorial accents.',
    tags: ['Captions: Medium', 'Pacing: Snappy', 'B-roll: Rare'],
    previewImages: ['/style-previews/stoic-red-statue.jpg'],
  },
  {
    id: 'style_minimal_subtle',
    name: 'Minimal Subtle',
    description: 'Jeff Bezos quote card, restrained color, and brand-first typography.',
    tags: ['Captions: Low', 'Pacing: Smooth', 'B-roll: Rare'],
    previewImages: ['/style-previews/minimal-subtle-bezos.jpg'],
  },
]
