alter table public.chat_messages
  add column if not exists client_message_id text;

create unique index if not exists idx_chat_messages_session_client_message
  on public.chat_messages(session_id, client_message_id)
  where client_message_id is not null;
