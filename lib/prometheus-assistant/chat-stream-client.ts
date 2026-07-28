import {
  PrometheusChatStreamDecoder,
  type PrometheusChatStreamEvent,
} from "./chat-stream";

export async function consumePrometheusChatStream(
  response: Response,
  onEvent: (event: PrometheusChatStreamEvent) => void,
) {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Prometheus could not generate a response.",
    );
  }
  if (!response.body) {
    throw new Error("Prometheus returned an empty response.");
  }

  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  const eventDecoder = new PrometheusChatStreamDecoder();
  let terminalEventReceived = false;

  const dispatch = (event: PrometheusChatStreamEvent) => {
    if (event.type === "done" || event.type === "error") {
      terminalEventReceived = true;
    }
    onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const event of eventDecoder.push(
      textDecoder.decode(value, { stream: true }),
    )) {
      dispatch(event);
    }
  }

  for (const event of eventDecoder.push(textDecoder.decode())) {
    dispatch(event);
  }
  for (const event of eventDecoder.flush()) {
    dispatch(event);
  }

  if (!terminalEventReceived) {
    throw new Error("Prometheus stream was interrupted before completion.");
  }
}
