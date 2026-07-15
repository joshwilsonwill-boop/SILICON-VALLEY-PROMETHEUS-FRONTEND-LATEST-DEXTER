alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_idx
  on public.profiles (username)
  where username is not null and username <> '';
