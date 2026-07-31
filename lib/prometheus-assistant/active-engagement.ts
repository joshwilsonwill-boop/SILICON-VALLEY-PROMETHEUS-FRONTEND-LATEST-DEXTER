export type ActiveEngagementKind = "cut" | "hook" | "sound" | "captions";

export type ActiveEngagementSuggestion = {
  id: string;
  kind: ActiveEngagementKind;
  label: string;
  detail: string;
  prompt: string;
  confidence: number;
};

const ENGAGEMENT_LIBRARY: Record<ActiveEngagementKind, ActiveEngagementSuggestion> = {
  cut: {
    id: "editorial-cut-pass",
    kind: "cut",
    label: "Stage a cut pass",
    detail: "Tighten the opening while protecting the strongest visual beat.",
    prompt:
      "Create an editorial cut pass: tighten the opening, lead with the strongest visual beat, and leave one deliberate breath before the proof point.",
    confidence: 94,
  },
  hook: {
    id: "opening-hook",
    kind: "hook",
    label: "Build the opening hook",
    detail: "Give the first three seconds a clear visual and verbal promise.",
    prompt:
      "Build a stronger opening hook for this video. Give me three action-focused options for the first three seconds using the current source footage.",
    confidence: 91,
  },
  sound: {
    id: "soundtrack-direction",
    kind: "sound",
    label: "Set the soundtrack direction",
    detail: "Match the cut with a restrained, premium rise and a clean release.",
    prompt:
      "Set a soundtrack direction for this cut: suggest a refined mood, where the track should enter, and one precise moment for the music to lift.",
    confidence: 89,
  },
  captions: {
    id: "caption-system",
    kind: "captions",
    label: "Shape the caption system",
    detail: "Prioritize hierarchy, timing, and a single clear reading rhythm.",
    prompt:
      "Shape a premium caption system for this edit. Recommend the caption hierarchy, timing rhythm, and the exact moments that need emphasis.",
    confidence: 88,
  },
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function rankKinds(draft: string, workspaceTab?: string | null): ActiveEngagementKind[] {
  const value = clean(draft);
  const ranked: ActiveEngagementKind[] = [];
  const add = (kind: ActiveEngagementKind) => {
    if (!ranked.includes(kind)) ranked.push(kind);
  };

  if (/\b(cut|trim|pace|pacing|edit|editing|sequence|intro|opening)\b/.test(value)) add("cut");
  if (/\b(hook|opening|intro|first|scroll|attention)\b/.test(value)) add("hook");
  if (/\b(music|sound|track|song|audio|beat|score)\b/.test(value)) add("sound");
  if (/\b(caption|subtitle|text|title|copy|typography)\b/.test(value)) add("captions");

  const workspace = workspaceTab?.trim().toLowerCase();
  if (workspace === "music") add("sound");
  if (workspace === "motion") add("captions");

  add("cut");
  add("hook");
  add("sound");
  add("captions");
  return ranked;
}

/**
 * Local, explainable engagement ranking used while a creator is composing.
 * A service can later provide the same suggestion shape from project metadata.
 */
export function resolveActiveEngagement(
  draft: string,
  workspaceTab?: string | null,
  max = 3,
): ActiveEngagementSuggestion[] {
  if (clean(draft).length < 3) return [];
  return rankKinds(draft, workspaceTab)
    .slice(0, Math.max(1, max))
    .map((kind, index) => ({
      ...ENGAGEMENT_LIBRARY[kind],
      confidence: Math.max(72, ENGAGEMENT_LIBRARY[kind].confidence - index * 3),
    }));
}
