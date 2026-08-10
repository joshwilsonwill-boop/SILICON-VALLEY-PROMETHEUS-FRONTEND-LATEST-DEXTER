"use client";

import { createLocalChatHistoryStore } from "@/lib/prometheus-assistant/local-chat-history";
import { createClient } from "@/lib/supabase/client";

const ANONYMOUS_CHAT_SCOPE = "anonymous";

export async function getScopedLocalChatHistoryStore() {
  let scopeId = ANONYMOUS_CHAT_SCOPE;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) scopeId = session.user.id;
  } catch {
    // Anonymous storage remains isolated from every authenticated user's cache.
  }
  return createLocalChatHistoryStore(undefined, scopeId);
}
