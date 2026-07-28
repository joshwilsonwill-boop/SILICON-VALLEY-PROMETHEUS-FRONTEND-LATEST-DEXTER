export type PrometheusChatIntentKind =
  | "conversation"
  | "editing"
  | "editor-action"
  | "social-content";

export type PrometheusChatIntent = {
  kind: PrometheusChatIntentKind;
  allowTools: boolean;
  useKnowledge: boolean;
  useSocialStrategist: boolean;
};

const GREETING_PATTERN =
  /^(?:hi|hello|hey|hiya|yo|good\s+(?:morning|afternoon|evening)|hi\s+there|hello\s+there)[!,.?\s]*$/i;
const THANKS_PATTERN = /^(?:thanks?|thank\s+you|much\s+appreciated)[!,.?\s]*$/i;
const SOCIAL_PATTERN =
  /\b(?:instagram|tiktok|linkedin|youtube|twitter|x\s+thread|caption|hashtags?|social\s+(?:post|content)|content\s+calendar)\b/i;
const EDITING_PATTERN =
  /\b(?:edit|editing|cut|cuts|timeline|montage|scene|shot|frame|transition|pace|pacing|b-?roll|caption|subtitle|color\s+grade|audio|soundtrack|opening|hook|export|render)\b/i;
const ACTION_PATTERN =
  /^(?:please\s+)?(?:add|apply|change|cut|delete|draft|insert|make|move|remove|replace|shorten|split|tighten|trim)\b/i;
const CONVERSATIONAL_FOLLOW_UP_PATTERN =
  /^(?:can|could|would)\s+you\s+(?:explain|expand|clarify|rephrase|say)\b/i;

export function classifyPrometheusChatIntent(
  message: string,
): PrometheusChatIntent {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (
    GREETING_PATTERN.test(normalized) ||
    THANKS_PATTERN.test(normalized) ||
    CONVERSATIONAL_FOLLOW_UP_PATTERN.test(normalized)
  ) {
    return {
      kind: "conversation",
      allowTools: false,
      useKnowledge: false,
      useSocialStrategist: false,
    };
  }

  if (SOCIAL_PATTERN.test(normalized)) {
    return {
      kind: "social-content",
      allowTools: false,
      useKnowledge: false,
      useSocialStrategist: true,
    };
  }

  if (EDITING_PATTERN.test(normalized) && ACTION_PATTERN.test(normalized)) {
    return {
      kind: "editor-action",
      allowTools: true,
      useKnowledge: true,
      useSocialStrategist: false,
    };
  }

  if (EDITING_PATTERN.test(normalized)) {
    return {
      kind: "editing",
      allowTools: false,
      useKnowledge: true,
      useSocialStrategist: false,
    };
  }

  return {
    kind: "conversation",
    allowTools: false,
    useKnowledge: false,
    useSocialStrategist: false,
  };
}

export function createDirectPrometheusReply(
  message: string,
  intent = classifyPrometheusChatIntent(message),
) {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (intent.kind !== "conversation") return null;

  if (GREETING_PATTERN.test(normalized)) {
    return "Hi — what would you like to create today?";
  }

  if (THANKS_PATTERN.test(normalized)) {
    return "You’re welcome. What should we shape next?";
  }

  return null;
}

export function getPrometheusIntentInstruction(intent: PrometheusChatIntent) {
  if (intent.useSocialStrategist) {
    return "Act as a social media content strategist for video creators. Tailor hooks, calls to action, captions, and hashtags to the platform the user names.";
  }

  if (intent.kind === "editor-action") {
    return "Interpret the request as a proposed editor change. Draft only non-destructive actions and ask for approval before claiming anything was applied.";
  }

  if (intent.kind === "editing") {
    return "Answer as a concise professional video-editing copilot using the supplied project and knowledge context.";
  }

  return "Respond naturally and concisely. Do not force video-editing advice into casual conversation.";
}
