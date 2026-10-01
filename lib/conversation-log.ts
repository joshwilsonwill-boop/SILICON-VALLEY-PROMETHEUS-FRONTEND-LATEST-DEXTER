export type ConversationLogTurn = {
  role: "user" | "assistant";
  text: string;
  timestamp?: string | number;
};

export function formatConversationLog(
  turns: ConversationLogTurn[],
  title = "Jarvis conversation",
  exportedAt = new Date(),
) {
  const entries = turns.filter((turn) => turn.text.trim().length > 0);
  const lines = [title, `Exported ${exportedAt.toLocaleString()}`, ""];

  for (const turn of entries) {
    const date = turn.timestamp === undefined ? null : new Date(turn.timestamp);
    const timestamp = date && Number.isFinite(date.getTime())
      ? `[${date.toLocaleString()}] `
      : "";
    lines.push(`${timestamp}${turn.role === "user" ? "You" : "Jarvis"}`, turn.text, "");
  }

  return lines.join("\n");
}

export function downloadConversationLog(
  turns: ConversationLogTurn[],
  filename = "jarvis-conversation",
  title = "Jarvis conversation",
) {
  if (!turns.some((turn) => turn.text.trim().length > 0)) return false;

  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "jarvis-conversation";
  const blob = new Blob([formatConversationLog(turns, title)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
