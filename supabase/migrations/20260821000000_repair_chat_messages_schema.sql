-- Fix chat_messages schema drift: the idempotency column added by
-- 202607280001_chat_message_idempotency.sql was never applied to the
-- live project, which broke persisted-chat message reads (sessions were
-- listed but individual conversations could not be opened).

alter table public.chat_messages
  add column if not exists client_message_id text;

create unique index if not exists idx_chat_messages_session_client_message
  on public.chat_messages(session_id, client_message_id);
