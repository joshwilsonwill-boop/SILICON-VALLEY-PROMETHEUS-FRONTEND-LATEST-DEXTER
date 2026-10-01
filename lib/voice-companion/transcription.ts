export type LiveTranscript = { role: "user" | "assistant"; text: string; finished?: boolean };

export function getLiveTranscripts(serverContent: unknown): LiveTranscript[] {
  if (!serverContent || typeof serverContent !== "object") return [];

  const content = serverContent as {
    inputTranscription?: { text?: unknown; finished?: boolean };
    outputTranscription?: { text?: unknown; finished?: boolean };
    modelTurn?: { parts?: Array<{ text?: unknown }> };
  };
  const transcripts: LiveTranscript[] = [];

  if (typeof content.inputTranscription?.text === "string" && (content.inputTranscription.text.length || content.inputTranscription.finished)) {
    transcripts.push({
      role: "user",
      text: content.inputTranscription.text,
      ...(typeof content.inputTranscription.finished === "boolean" ? { finished: content.inputTranscription.finished } : {}),
    });
  }

  if (typeof content.outputTranscription?.text === "string" && (content.outputTranscription.text.length || content.outputTranscription.finished)) {
    transcripts.push({
      role: "assistant",
      text: content.outputTranscription.text,
      ...(typeof content.outputTranscription.finished === "boolean" ? { finished: content.outputTranscription.finished } : {}),
    });
  } else {
    for (const part of content.modelTurn?.parts ?? []) {
      if (typeof part.text === "string" && part.text.length) {
        transcripts.push({ role: "assistant", text: part.text });
      }
    }
  }

  return transcripts;
}

// Live transcription text is a sequence of deltas. Repetition and whitespace
// are evidence: preserve them rather than guessing word separators or deduping.
export function appendTranscriptText(current: string, next: string): string {
  return current + next;
}
