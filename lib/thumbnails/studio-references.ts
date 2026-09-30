export const STUDIO_REFERENCES = [
  { id: 'ideas', name: 'Ideas', src: '/thumbnail-references/ideas.webp', cue: 'bright graph-paper field, oversized black headline, surreal 3D brain, and glowing social-platform symbols around a close portrait' },
  { id: 'control-mind', name: 'Control your mind', src: '/thumbnail-references/control-mind.webp', cue: 'clean pale grid, left-aligned black headline with a vivid yellow paint accent, sharply lit creator portrait and tactile brain prop' },
  { id: 'cmo-brain', name: "Inside a CMO's brain", src: '/thumbnail-references/cmo-brain.webp', cue: 'charcoal technical grid, large white headline with a saturated blue statement block, and a dramatic close portrait with a clear pointing cue' },
  { id: 'rewind-2025', name: '2025 rewind', src: '/thumbnail-references/rewind-2025.webp', cue: 'cinematic black-to-ember collage, monumental metallic numerals, warm creator portrait, handwritten annotations and layered paper detail' },
  { id: 'three-ways', name: '3 ways', src: '/thumbnail-references/three-ways.webp', cue: 'high-contrast creator composition, giant yellow headline, crisp white evidence card, blue screen light, and one bold red directional arrow' },
  { id: 'time-ticking', name: 'Time is ticking', src: '/thumbnail-references/time-ticking.webp', cue: 'dark dramatic close-up, oversized red diagonal arrow, and a clean white rounded headline card with one yellow highlighted phrase' },
  { id: '300-to-100k', name: '$300 vs $100K', src: '/thumbnail-references/300-to-100k.webp', cue: 'clean transformation story, bright red and blue number blocks, expressive creator pointing toward a clear contrast, and a rich money-texture foreground' },
  { id: 'easy-mode', name: 'Easy mode', src: '/thumbnail-references/easy-mode.webp', cue: 'premium rounded white frame, bold black editorial headline, dark analytics panel, electric blue graph, green proof badges and centered creator portrait' },
  { id: 'perfect-logo', name: 'Perfect logo', src: '/thumbnail-references/perfect-logo.webp', cue: 'moody warm studio portrait, oversized condensed lime and ivory typography, hand-drawn annotations and tactile rebrand details' },
] as const

export type StudioReferenceId = typeof STUDIO_REFERENCES[number]['id']

export function getStudioReference(id: string) {
  return STUDIO_REFERENCES.find(reference => reference.id === id) ?? STUDIO_REFERENCES[0]
}
