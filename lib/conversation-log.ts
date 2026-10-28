export type ConversationLogTurn = {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp?: string | number;
  statusNote?: string;
  failureNotice?: string;
};

export function formatConversationLog(
  turns: ConversationLogTurn[],
  title = "Prometheus Editorial Conversation",
  exportedAt = new Date(),
  options?: {
    assistantLabel?: string;
  },
) {
  const assistantLabel =
    options?.assistantLabel || (title.toLowerCase().includes("jarvis") ? "Jarvis" : "Prometheus Assistant");
  const entries = turns.filter(
    (turn) => turn.text.trim().length > 0 || Boolean(turn.statusNote || turn.failureNotice),
  );
  const lines = [title, `Exported ${exportedAt.toLocaleString()}`, ""];

  for (const turn of entries) {
    const date = turn.timestamp === undefined ? null : new Date(turn.timestamp);
    const timestamp = date && Number.isFinite(date.getTime())
      ? `[${date.toLocaleString()}] `
      : "";
    const sender = turn.role === "user" ? "You" : turn.role === "assistant" ? assistantLabel : "System";
    lines.push(`${timestamp}${sender}`, turn.text);
    const note = turn.statusNote || turn.failureNotice;
    if (note) {
      lines.push(`[Status: ${note}]`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadConversationLog(
  turns: ConversationLogTurn[],
  filename = "prometheus-editorial-chat",
  title = "Prometheus Editorial Conversation",
  options?: {
    assistantLabel?: string;
  },
) {
  if (!turns.some((turn) => turn.text.trim().length > 0 || Boolean(turn.statusNote || turn.failureNotice))) {
    return false;
  }

  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prometheus-conversation";
  const blob = new Blob([formatConversationLog(turns, title, new Date(), options)], {
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
