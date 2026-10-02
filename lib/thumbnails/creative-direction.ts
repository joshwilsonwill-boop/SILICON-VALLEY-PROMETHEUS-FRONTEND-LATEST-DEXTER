/** Apply this after presets and planner output for either image provider. */
export function applyThumbnailCreativeDirection(prompt: string, direction: string): string {
  const brief = direction.trim().slice(0, 500)
  if (!brief) return prompt
  return `${prompt}\n\nFINAL CREATOR BRIEF (highest priority for visual style): ${JSON.stringify(brief)}\nFollow this explicit mood, lighting, color, composition and graphic treatment wherever it conflicts with the preset, reference, channel DNA or planned concept above. Those are fallback inspiration only. For an aggressive look, use forceful composition, hard directional lighting, strong contrast and bold graphic energy. Preserve the source subject's identity and the exact supplied headline; do not invent claims or extra text. Do not render the brief as text in the image.`
}
