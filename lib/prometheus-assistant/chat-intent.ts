export type PrometheusChatIntentKind =
  | "conversation"
  | "research"
  | "comparison"
  | "review"
  | "planning"
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
  /^(?:(?:please\s+)?(?:add|apply|change|cut|delete|draft|edit|insert|make|move|remove|replace|shorten|split|tighten|trim)|i\s+(?:want|need|would\s+like)\s+(?:you\s+to\s+|to\s+)?(?:add|apply|change|cut|delete|draft|edit|insert|make|move|remove|replace|shorten|split|tighten|trim))\b/i;
const CONVERSATIONAL_FOLLOW_UP_PATTERN =
  /^(?:can|could|would)\s+you\s+(?:explain|expand|clarify|rephrase|say)\b/i;
const RESEARCH_PATTERN =
  /\b(?:research|find|look\s+up|what(?:'s|\s+is)\s+the|why|how\s+does|best\s+(?:way|practice)|examples?|references?)\b/i;
const COMPARISON_PATTERN =
  /\b(?:compare|comparison|versus|vs\.?|difference\s+between|which\s+(?:is|would|one))\b/i;
const REVIEW_PATTERN =
  /\b(?:review|evaluate|assess|critique|feedback|what(?:'s|\s+is)\s+working|audit)\b/i;
const PLANNING_PATTERN =
  /\b(?:plan|outline|strategy|approach|direction|roadmap|sequence|structure)\b/i;

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

  if (COMPARISON_PATTERN.test(normalized)) {
    return { kind: "comparison", allowTools: false, useKnowledge: true, useSocialStrategist: false };
  }

  if (REVIEW_PATTERN.test(normalized)) {
    return { kind: "review", allowTools: false, useKnowledge: true, useSocialStrategist: false };
  }

  if (PLANNING_PATTERN.test(normalized)) {
    return { kind: "planning", allowTools: false, useKnowledge: true, useSocialStrategist: false };
  }

  if (RESEARCH_PATTERN.test(normalized)) {
    return { kind: "research", allowTools: false, useKnowledge: true, useSocialStrategist: false };
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
    return "Interpret the request as an editor change. Use the supplied project and live editor context to propose a concrete first pass; do not ask a broad follow-up when the requested outcome is already clear. Draft only non-destructive actions and ask for approval before claiming anything was applied.";
  }

  if (intent.kind === "editing") {
    return "Answer as a concise professional video-editing copilot using the supplied project and knowledge context.";
  }

  if (intent.kind === "research") {
    return "Research the request using the supplied project and knowledge context. State the finding first, then explain only the evidence or trade-offs that matter.";
  }

  if (intent.kind === "comparison") {
    return "Compare the relevant options against the user's creative goal. Lead with a recommendation, then give the few trade-offs that would change the decision.";
  }

  if (intent.kind === "review") {
    return "Evaluate the material against a clear editorial standard. Identify what is working, what is holding the result back, and the strongest next move.";
  }

  if (intent.kind === "planning") {
    return "Turn the request into a concrete editorial plan. Make the sequence actionable and account for the available project context before proposing a change.";
  }

  return "Respond naturally and concisely. Do not force video-editing advice into casual conversation.";
}

export function getPrometheusIntentLabel(intent: PrometheusChatIntent | PrometheusChatIntentKind) {
  const kind = typeof intent === "string" ? intent : intent.kind;
  const labels: Record<PrometheusChatIntentKind, string> = {
    conversation: "Conversation",
    research: "Researching",
    comparison: "Comparing options",
    review: "Evaluating",
    planning: "Planning direction",
    editing: "Editorial guidance",
    "editor-action": "Preparing an edit",
    "social-content": "Developing social content",
  };
  return labels[kind];
}
