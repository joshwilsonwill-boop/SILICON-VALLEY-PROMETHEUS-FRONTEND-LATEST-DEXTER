export type ChatSessionRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessageRecord = {
  id: string;
  client_message_id: string | null;
  session_id: string;
  role: ChatMessageRole;
  content: string;
  platform: string | null;
  post_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ChatMessageInsert = {
  client_message_id?: string | null;
  role: ChatMessageRole;
  content: string;
  platform?: string | null;
  post_type?: string | null;
  metadata?: Record<string, unknown>;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type LocalChatHistoryState = {
  version: 1;
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
};

const LOCAL_CHAT_HISTORY_KEY = "prometheus.local-chat-history.v1";
const LOCAL_SESSION_PREFIX = "local-chat-";
function cloneEmptyState(): LocalChatHistoryState {
  return { version: 1, sessions: [], messages: [] };
}

function createId(prefix: string) {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}${value}`;
}

function normalizeState(value: unknown): LocalChatHistoryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return cloneEmptyState();
  const candidate = value as Partial<LocalChatHistoryState>;
  return {
    version: 1,
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions : [],
    messages: Array.isArray(candidate.messages) ? candidate.messages : [],
  };
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isLocalChatSessionId(sessionId: string) {
  return sessionId.startsWith(LOCAL_SESSION_PREFIX);
}

export function createLocalChatHistoryStore(
  storage: StorageLike | null = browserStorage(),
  scopeId = "anonymous",
) {
  const storageKey = `${LOCAL_CHAT_HISTORY_KEY}.${encodeURIComponent(scopeId)}`;
  const read = () => {
    if (!storage) return cloneEmptyState();
    try {
      const raw = storage.getItem(storageKey);
      return raw ? normalizeState(JSON.parse(raw)) : cloneEmptyState();
    } catch {
      return cloneEmptyState();
    }
  };

  const write = (state: LocalChatHistoryState) => {
    if (!storage) throw new Error("Local chat history could not be saved because browser storage is unavailable.");
    try {
      storage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      throw new Error("Local chat history could not be saved.", { cause: error });
    }
  };

  const getSessions = () =>
    [...read().sessions].sort((left, right) => right.updated_at.localeCompare(left.updated_at));

  const getProjectSessions = (projectId: string) =>
    getSessions().filter((session) => session.project_id === projectId);

  const getSession = (sessionId: string) =>
    read().sessions.find((session) => session.id === sessionId) ?? null;

  const createSession = (projectId?: string | null, title = "New Chat") => {
    const state = read();
    const now = new Date().toISOString();
    const session: ChatSessionRecord = {
      id: createId(LOCAL_SESSION_PREFIX),
      user_id: scopeId,
      project_id: projectId ?? null,
      title: title.trim() || "New Chat",
      created_at: now,
      updated_at: now,
    };
    write({ ...state, sessions: [session, ...state.sessions] });
    return session;
  };

  const updateSessionTitle = (sessionId: string, title: string) => {
    const state = read();
    const nextTitle = title.trim() || "New Chat";
    const updatedAt = new Date().toISOString();
    let updated: ChatSessionRecord | null = null;
    const sessions = state.sessions.map((session) => {
      if (session.id !== sessionId) return session;
      updated = { ...session, title: nextTitle, updated_at: updatedAt };
      return updated;
    });
    write({ ...state, sessions });
    return updated;
  };

  const deleteSession = (sessionId: string) => {
    const state = read();
    write({
      ...state,
      sessions: state.sessions.filter((session) => session.id !== sessionId),
      messages: state.messages.filter((message) => message.session_id !== sessionId),
    });
  };

  const upsertSessions = (incoming: ChatSessionRecord[]) => {
    if (!incoming.length) return getSessions();
    const state = read();
    const sessions = new Map(state.sessions.map((session) => [session.id, session]));
    for (const session of incoming) sessions.set(session.id, session);
    const nextSessions = [...sessions.values()];
    write({ ...state, sessions: nextSessions });
    return nextSessions.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  };

  const upsertMessages = (incoming: ChatMessageRecord[]) => {
    if (!incoming.length) return read().messages;
    const state = read();
    const messages = new Map(state.messages.map((message) => [message.id, message]));
    for (const message of incoming) messages.set(message.id, message);
    const nextMessages = [...messages.values()];
    write({ ...state, messages: nextMessages });
    return nextMessages.sort((left, right) => left.created_at.localeCompare(right.created_at));
  };

  const getMessages = (sessionId: string) =>
    read().messages
      .filter((message) => message.session_id === sessionId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));

  const insertMessage = (sessionId: string, payload: ChatMessageInsert) => {
    const state = read();
    const clientMessageId = payload.client_message_id ?? null;
    const duplicate = clientMessageId
      ? state.messages.find(
          (message) => message.session_id === sessionId && message.client_message_id === clientMessageId,
        )
      : null;
    if (duplicate) return duplicate;

    const now = new Date().toISOString();
    const message: ChatMessageRecord = {
      id: createId("local-message-"),
      client_message_id: clientMessageId,
      session_id: sessionId,
      role: payload.role,
      content: payload.content,
      platform: payload.platform ?? null,
      post_type: payload.post_type ?? null,
      metadata: payload.metadata ?? {},
      created_at: now,
    };
    const sessions = state.sessions.map((session) => {
      if (session.id !== sessionId) return session;
      const title = payload.role === "user" && session.title === "New Chat"
        ? payload.content.length > 40
          ? `${payload.content.slice(0, 37)}...`
          : payload.content
        : session.title;
      return { ...session, title, updated_at: now };
    });
    write({ ...state, sessions, messages: [...state.messages, message] });
    return message;
  };

  const insertMessages = (sessionId: string, payloads: ChatMessageInsert[]) =>
    payloads.map((payload) => insertMessage(sessionId, payload));

  const deleteMessages = (sessionId: string) => {
    const state = read();
    write({ ...state, messages: state.messages.filter((message) => message.session_id !== sessionId) });
  };

  return {
    createSession,
    deleteMessages,
    deleteSession,
    getMessages,
    getProjectSessions,
    getSession,
    getSessions,
    insertMessage,
    insertMessages,
    upsertMessages,
    upsertSessions,
    updateSessionTitle,
  };
}
