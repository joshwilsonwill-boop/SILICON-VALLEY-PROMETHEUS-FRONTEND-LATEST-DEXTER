-- Private user-uploaded music. Object paths are user-scoped so Storage and table
-- policies can enforce ownership independently.
create table if not exists public.user_music_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null check (char_length(trim(original_filename)) > 0),
  storage_bucket text not null default 'user-music' check (storage_bucket = 'user-music'),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists user_music_tracks_user_created_at_idx
  on public.user_music_tracks (user_id, created_at desc);

alter table public.user_music_tracks enable row level security;

drop policy if exists "Users can view their own music tracks" on public.user_music_tracks;
create policy "Users can view their own music tracks"
  on public.user_music_tracks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own music tracks" on public.user_music_tracks;
create policy "Users can insert their own music tracks"
  on public.user_music_tracks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own music tracks" on public.user_music_tracks;
create policy "Users can delete their own music tracks"
  on public.user_music_tracks for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('user-music', 'user-music', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can read their own music objects" on storage.objects;
create policy "Users can read their own music objects"
  on storage.objects for select
  using (
    bucket_id = 'user-music'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their own music objects" on storage.objects;
create policy "Users can upload their own music objects"
  on storage.objects for insert
  with check (
    bucket_id = 'user-music'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own music objects" on storage.objects;
create policy "Users can delete their own music objects"
  on storage.objects for delete
  using (
    bucket_id = 'user-music'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
