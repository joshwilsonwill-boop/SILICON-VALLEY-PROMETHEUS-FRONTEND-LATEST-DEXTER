import type { PrometheusChatIntentKind } from "./chat-intent";

type LocalFallbackInput = {
  intentKind: PrometheusChatIntentKind;
  knowledgeAnswer?: string | null;
  projectTitle?: string | null;
  filename?: string | null;
  durationSec?: number | null;
  playheadSec?: number | null;
  recommendation?: { title: string; rationale: string } | null;
};

function formatTimecode(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export function createLocalPrometheusFallback({
  intentKind,
  knowledgeAnswer,
  projectTitle,
  filename,
  durationSec,
  playheadSec,
  recommendation,
}: LocalFallbackInput) {
  if (intentKind === "editor-action" || intentKind === "editing") {
    const subject = filename || projectTitle || "the current video";
    const duration = typeof durationSec === "number" && Number.isFinite(durationSec)
      ? ` (${formatTimecode(durationSec)})`
      : "";
    const position = typeof playheadSec === "number" && Number.isFinite(playheadSec)
      ? ` from ${formatTimecode(playheadSec)}`
      : "";

    if (recommendation) {
      return `I can work directly from ${subject}${duration}. First pass${position}: ${recommendation.title}. ${recommendation.rationale}`;
    }

    return `I can work directly from ${subject}${duration}. First pass${position}: establish the strongest opening beat, tighten obvious dead air, and preserve one clean breath before the main idea. I’ll keep the changes non-destructive and present them for approval before anything is applied.`;
  }

  if (knowledgeAnswer?.trim()) return knowledgeAnswer.trim();

  return "Tell me what you’re creating and the result you want. I’ll turn it into a concrete next move.";
}
