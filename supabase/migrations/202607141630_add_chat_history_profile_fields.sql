alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists avatar_url text;

update public.profiles
set
  first_name = coalesce(nullif(first_name, ''), nullif(split_part(trim(coalesce(full_name, name, '')), ' ', 1), '')),
  last_name = coalesce(nullif(last_name, ''), nullif(regexp_replace(trim(coalesce(full_name, name, '')), E'^\\S+\\s*', ''), ''))
where first_name is null or last_name is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    name,
    display_name,
    first_name,
    last_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', ''))
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    name = coalesce(public.profiles.name, excluded.name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, full_name, name, first_name, last_name, avatar_url)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
  coalesce(users.raw_user_meta_data ->> 'name', users.raw_user_meta_data ->> 'full_name'),
  nullif(users.raw_user_meta_data ->> 'first_name', ''),
  nullif(users.raw_user_meta_data ->> 'last_name', ''),
  coalesce(nullif(users.raw_user_meta_data ->> 'avatar_url', ''), nullif(users.raw_user_meta_data ->> 'picture', ''))
from auth.users as users
on conflict (id) do nothing;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null default 'New Chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  platform text,
  post_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can manage their own chat sessions" on public.chat_sessions;
create policy "Users can manage their own chat sessions"
  on public.chat_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own chat messages" on public.chat_messages;
create policy "Users can manage their own chat messages"
  on public.chat_messages for all
  to authenticated
  using (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = (select auth.uid())
    )
  );

create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id, updated_at desc);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id, created_at asc);

create or replace function public.auto_set_chat_title()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'user' then
    update public.chat_sessions
    set
      title = case
        when length(new.content) > 40 then substring(new.content from 1 for 37) || '...'
        else new.content
      end,
      updated_at = now()
    where id = new.session_id
      and title = 'New Chat';
  end if;
  return new;
end;
$$;

create or replace function public.touch_chat_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists set_chat_title_on_first_message on public.chat_messages;
create trigger set_chat_title_on_first_message
  after insert on public.chat_messages
  for each row execute procedure public.auto_set_chat_title();

drop trigger if exists touch_chat_session_on_message on public.chat_messages;
create trigger touch_chat_session_on_message
  after insert on public.chat_messages
  for each row execute procedure public.touch_chat_session();
