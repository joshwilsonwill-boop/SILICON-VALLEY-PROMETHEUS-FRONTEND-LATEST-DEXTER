/** Apply this after presets and planner output for either image provider. */
export function applyThumbnailCreativeDirection(prompt: string, direction: string): string {
  const brief = direction.trim().slice(0, 500)
  if (!brief) return prompt
  return `${prompt}\n\nFINAL CREATOR BRIEF (highest priority): ${JSON.stringify(brief)}\nTreat the creator brief as an ordered list of requirements: follow each explicit request in the order written, preserve requested sequence, placement, and emphasis, and do not drop later details. These requests take priority over conflicting presets, references, channel DNA, or planned concepts; those are fallback inspiration only. If the brief describes multiple moments but asks for one image, represent them together in the requested order and composition rather than generating extra images. Preserve the source subject's identity and the exact supplied headline; do not invent claims, objects, or extra text. Do not render the brief itself as text in the image.`
}

/** Apply targeted iterative modification instructions over an existing thumbnail design. */
export function applyThumbnailIterationDirection(prompt: string, iterationPrompt: string): string {
  const brief = iterationPrompt.trim().slice(0, 500)
  if (!brief) return prompt
  return `${prompt}\n\nITERATIVE REVISION REQUEST (HIGHEST PRIORITY): ${JSON.stringify(brief)}\nCRITICAL INSTRUCTION: You are making an ITERATIVE CHANGE to an existing thumbnail design. DO NOT recreate the scene from scratch. Keep the existing composition, background atmosphere, subject pose, framing, and typography style intact EXCEPT for the specific feature(s) requested above. Apply the targeted modification precisely while preserving overall visual continuity with the base thumbnail.`
}

