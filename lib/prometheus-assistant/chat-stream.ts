export type PrometheusChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "thought"; content: string }
  | { type: "delta"; content: string }
  | {
      type: "tool";
      toolCall: {
        id: string;
        name: string;
        label: string;
        status: "completed" | "needs_approval" | "failed";
        summary: string;
      };
    }
  | {
      type: "metadata";
      sources?: unknown[];
      frames?: unknown[];
      toolCalls?: unknown[];
      actionDrafts?: unknown[];
      carousel?: unknown[];
      suggestions?: unknown[];
    }
  | { type: "done"; persisted: boolean }
  | { type: "error"; message: string };

export function encodePrometheusChatStreamEvent(
  event: PrometheusChatStreamEvent,
) {
  return `${JSON.stringify(event)}\n`;
}

export class PrometheusChatStreamDecoder {
  private buffered = "";

  push(chunk: string) {
    this.buffered += chunk;
    const lines = this.buffered.split("\n");
    this.buffered = lines.pop() ?? "";
    return lines.flatMap(parsePrometheusChatStreamLine);
  }

  flush() {
    const trailing = this.buffered;
    this.buffered = "";
    return trailing ? parsePrometheusChatStreamLine(trailing) : [];
  }
}

function parsePrometheusChatStreamLine(
  line: string,
): PrometheusChatStreamEvent[] {
  const normalized = line.trim();
  if (!normalized) return [];

  try {
    const value = JSON.parse(normalized) as Record<string, unknown>;
    if (value.type === "status" && typeof value.message === "string") {
      return [{ type: "status", message: value.message }];
    }
    if (value.type === "thought" && typeof value.content === "string") {
      return [{ type: "thought", content: value.content }];
    }
    if (value.type === "delta" && typeof value.content === "string") {
      return [{ type: "delta", content: value.content }];
    }
    if (value.type === "tool" && isStreamToolCall(value.toolCall)) {
      return [{ type: "tool", toolCall: value.toolCall }];
    }
    if (value.type === "metadata") {
      // Unknown/absent keys are tolerated: only array-shaped fields pass
      // through, anything else (or nothing at all) stays undefined.
      return [
        {
          type: "metadata",
          sources: Array.isArray(value.sources) ? value.sources : undefined,
          frames: Array.isArray(value.frames) ? value.frames : undefined,
          toolCalls: Array.isArray(value.toolCalls)
            ? value.toolCalls
            : undefined,
          actionDrafts: Array.isArray(value.actionDrafts)
            ? value.actionDrafts
            : undefined,
          carousel: Array.isArray(value.carousel) ? value.carousel : undefined,
          suggestions: Array.isArray(value.suggestions)
            ? value.suggestions
            : undefined,
        },
      ];
    }
    if (value.type === "done" && typeof value.persisted === "boolean") {
      return [{ type: "done", persisted: value.persisted }];
    }
    if (value.type === "error" && typeof value.message === "string") {
      return [{ type: "error", message: value.message }];
    }
  } catch {
    return [];
  }

  return [];
}

function isStreamToolCall(
  value: unknown,
): value is Extract<PrometheusChatStreamEvent, { type: "tool" }>["toolCall"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const toolCall = value as Record<string, unknown>;
  return (
    typeof toolCall.id === "string" &&
    typeof toolCall.name === "string" &&
    typeof toolCall.label === "string" &&
    typeof toolCall.summary === "string" &&
    (toolCall.status === "completed" ||
      toolCall.status === "needs_approval" ||
      toolCall.status === "failed")
  );
}
