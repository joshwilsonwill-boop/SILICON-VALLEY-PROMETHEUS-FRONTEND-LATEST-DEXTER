create table if not exists public.user_music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  storage_path text not null unique check (split_part(storage_path, '/', 1) = user_id::text),
  mime_type text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  title text,
  artist text,
  genre text,
  folder_name text not null default 'Unsorted',
  created_at timestamptz not null default now()
);

create index if not exists user_music_tracks_owner_created_idx
  on public.user_music_tracks (user_id, created_at desc);

create or replace function public.enforce_user_music_storage_quota()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_bytes bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 9101));
  select coalesce(sum(size_bytes), 0) into current_bytes
  from public.user_music_tracks
  where user_id = new.user_id;
  if current_bytes + new.size_bytes > 262144000 then
    raise exception 'Your music library is limited to 250 MB. Remove tracks to add more.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_music_storage_quota on public.user_music_tracks;
create trigger enforce_user_music_storage_quota
  before insert on public.user_music_tracks
  for each row execute function public.enforce_user_music_storage_quota();

create table if not exists public.user_music_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists user_music_folders_owner_idx
  on public.user_music_folders (user_id, name);

alter table public.user_music_tracks enable row level security;
alter table public.user_music_folders enable row level security;

drop policy if exists "Users can read their own music folders" on public.user_music_folders;
create policy "Users can read their own music folders"
  on public.user_music_folders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own music folders" on public.user_music_folders;
create policy "Users can add their own music folders"
  on public.user_music_folders for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own music folders" on public.user_music_folders;
create policy "Users can delete their own music folders"
  on public.user_music_folders for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own music tracks" on public.user_music_tracks;
create policy "Users can read their own music tracks"
  on public.user_music_tracks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own music tracks" on public.user_music_tracks;
create policy "Users can add their own music tracks"
  on public.user_music_tracks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own music tracks" on public.user_music_tracks;
create policy "Users can update their own music tracks"
  on public.user_music_tracks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own music tracks" on public.user_music_tracks;
create policy "Users can delete their own music tracks"
  on public.user_music_tracks for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-music',
  'user-music',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/webm', 'audio/x-m4a']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own music objects" on storage.objects;
create policy "Users can read their own music objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'user-music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own music objects" on storage.objects;
create policy "Users can upload their own music objects"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'user-music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own music objects" on storage.objects;
create policy "Users can update their own music objects"
  on storage.objects for update to authenticated
  using (bucket_id = 'user-music' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-music' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own music objects" on storage.objects;
create policy "Users can delete their own music objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'user-music' and (storage.foldername(name))[1] = auth.uid()::text);
