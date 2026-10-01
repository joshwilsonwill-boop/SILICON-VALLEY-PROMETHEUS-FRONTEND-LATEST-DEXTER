export type LiveTranscript = { role: "user" | "assistant"; text: string };

export function getLiveTranscripts(serverContent: unknown): LiveTranscript[] {
  if (!serverContent || typeof serverContent !== "object") return [];

  const content = serverContent as {
    inputTranscription?: { text?: unknown };
    outputTranscription?: { text?: unknown };
    modelTurn?: { parts?: Array<{ text?: unknown }> };
  };
  const transcripts: LiveTranscript[] = [];

  if (typeof content.inputTranscription?.text === "string" && content.inputTranscription.text.trim()) {
    transcripts.push({ role: "user", text: content.inputTranscription.text });
  }

  if (typeof content.outputTranscription?.text === "string" && content.outputTranscription.text.trim()) {
    transcripts.push({ role: "assistant", text: content.outputTranscription.text });
  } else {
    for (const part of content.modelTurn?.parts ?? []) {
      if (typeof part.text === "string" && part.text.trim()) {
        transcripts.push({ role: "assistant", text: part.text });
      }
    }
  }

  return transcripts;
}
