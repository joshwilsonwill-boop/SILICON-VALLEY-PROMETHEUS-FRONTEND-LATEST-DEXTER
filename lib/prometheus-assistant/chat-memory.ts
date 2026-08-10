export type PrometheusChatMemoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Produces the stable dialogue contract sent back to Prometheus after a
 * persisted session is restored. Presentation metadata stays out of model
 * history while the exact user question and last discussed point survive.
 */
export function buildPrometheusChatMemory(
  messages: ReadonlyArray<PrometheusChatMemoryMessage>,
): PrometheusChatMemoryMessage[] {
  return messages.flatMap((message) => {
    const content = message.content.trim();
    return content ? [{ role: message.role, content }] : [];
  });
}
