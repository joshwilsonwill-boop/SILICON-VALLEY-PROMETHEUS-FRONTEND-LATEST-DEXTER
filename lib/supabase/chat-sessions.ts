"use client";

import { createClient } from "@/lib/supabase/client";
import {
  type ChatSessionRecord,
  isLocalChatSessionId,
} from "@/lib/prometheus-assistant/local-chat-history";
import { getScopedLocalChatHistoryStore } from "@/lib/supabase/chat-local-history";

export type ChatSession = ChatSessionRecord;

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("Sign in to save chat history.");
  return { supabase, userId: user.id };
}

async function getRemoteUserChatSessions(limit = 20) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ChatSession[];
}

async function getRemoteProjectChatSessions(projectId: string, limit = 20) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ChatSession[];
}

async function getRemoteChatSession(sessionId: string) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, user_id, project_id, title, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as ChatSession | null;
}

async function createRemoteChatSession(projectId?: string | null, title = "New Chat") {
  const { supabase, userId } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, project_id: projectId ?? null, title })
    .select("id, user_id, project_id, title, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as ChatSession;
}

async function updateRemoteChatSessionTitle(sessionId: string, title: string) {
  const { supabase } = await getCurrentUserId();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({ title: title.trim() || "New Chat", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("id, user_id, project_id, title, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as ChatSession;
}

async function deleteRemoteChatSession(sessionId: string) {
  const { supabase } = await getCurrentUserId();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

function mergeSessions(remote: ChatSession[], local: ChatSession[], limit: number) {
  const sessions = new Map<string, ChatSession>();
  for (const session of [...remote, ...local]) sessions.set(session.id, session);
  return [...sessions.values()]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .slice(0, limit);
}

function mirrorRemoteSessions(
  localHistory: Awaited<ReturnType<typeof getScopedLocalChatHistoryStore>>,
  sessions: ChatSession[],
) {
  try {
    localHistory.upsertSessions(sessions);
  } catch (error) {
    console.warn("[chat-sessions] local history mirror unavailable", error);
  }
}

export async function getUserChatSessions(limit = 20) {
  const localHistory = await getScopedLocalChatHistoryStore();
  const local = localHistory.getSessions();
  try {
    const remote = await getRemoteUserChatSessions(limit);
    mirrorRemoteSessions(localHistory, remote);
    return mergeSessions(remote, local, limit);
  } catch (error) {
    console.warn("[chat-sessions] remote history unavailable; using local history", error);
    return local.slice(0, limit);
  }
}

export async function getProjectChatSessions(projectId: string, limit = 20) {
  const localHistory = await getScopedLocalChatHistoryStore();
  const local = localHistory.getProjectSessions(projectId);
  try {
    const remote = await getRemoteProjectChatSessions(projectId, limit);
    mirrorRemoteSessions(localHistory, remote);
    return mergeSessions(remote, local, limit);
  } catch (error) {
    console.warn("[chat-sessions] remote project history unavailable; using local history", error);
    return local.slice(0, limit);
  }
}

export async function getChatSession(sessionId: string) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) return localHistory.getSession(sessionId) as ChatSession | null;
  try {
    return await getRemoteChatSession(sessionId);
  } catch (error) {
    console.warn("[chat-sessions] remote session unavailable; checking local history", error);
    return localHistory.getSession(sessionId) as ChatSession | null;
  }
}

export async function createChatSession(projectId?: string | null, title = "New Chat") {
  const localHistory = await getScopedLocalChatHistoryStore();
  try {
    const session = await createRemoteChatSession(projectId, title);
    mirrorRemoteSessions(localHistory, [session]);
    return session;
  } catch (error) {
    console.warn("[chat-sessions] remote session creation unavailable; saving locally", error);
    return localHistory.createSession(projectId, title);
  }
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) {
    const session = localHistory.updateSessionTitle(sessionId, title);
    if (!session) throw new Error("Chat session not found.");
    return session as ChatSession;
  }
  const session = await updateRemoteChatSessionTitle(sessionId, title);
  mirrorRemoteSessions(localHistory, [session]);
  return session;
}

export async function deleteChatSession(sessionId: string) {
  const localHistory = await getScopedLocalChatHistoryStore();
  if (isLocalChatSessionId(sessionId)) {
    localHistory.deleteSession(sessionId);
    return;
  }
  await deleteRemoteChatSession(sessionId);
  localHistory.deleteSession(sessionId);
}
