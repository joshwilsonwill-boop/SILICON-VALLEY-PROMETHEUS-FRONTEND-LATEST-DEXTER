create table if not exists public.video_platform_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  export_id uuid references public.project_exports(id) on delete set null,
  platform text not null,
  external_video_id text,
  title text,
  thumbnail_url text,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  watch_time_seconds bigint not null default 0,
  retention_rate numeric not null default 0,
  engagement_rate numeric not null default 0,
  published_url text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, platform, external_video_id, captured_at)
);

alter table public.video_platform_metrics enable row level security;

drop policy if exists "Users can read their video metrics" on public.video_platform_metrics;
drop policy if exists "Users can insert their video metrics" on public.video_platform_metrics;
drop policy if exists "Users can update their video metrics" on public.video_platform_metrics;

create policy "Users can read their video metrics"
  on public.video_platform_metrics for select
  using (auth.uid() = user_id);

create policy "Users can insert their video metrics"
  on public.video_platform_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can update their video metrics"
  on public.video_platform_metrics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists video_platform_metrics_user_captured_at_idx
  on public.video_platform_metrics (user_id, captured_at desc);

create index if not exists video_platform_metrics_project_captured_at_idx
  on public.video_platform_metrics (project_id, captured_at desc);
