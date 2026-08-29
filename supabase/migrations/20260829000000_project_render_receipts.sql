-- Durable association between a project source revision and its asynchronous
-- Lambda/Mini-Run render result.
create table if not exists public.project_render_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_asset_id uuid references public.source_assets(id) on delete cascade not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  pipeline_job_id text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  output_url text,
  r2_key text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source_asset_id, job_id)
);

alter table public.project_render_receipts enable row level security;

drop policy if exists project_render_receipts_select_own on public.project_render_receipts;
create policy project_render_receipts_select_own
on public.project_render_receipts for select
using (auth.uid() = user_id);

drop policy if exists project_render_receipts_insert_own on public.project_render_receipts;
create policy project_render_receipts_insert_own
on public.project_render_receipts for insert
with check (auth.uid() = user_id);

drop policy if exists project_render_receipts_update_own on public.project_render_receipts;
create policy project_render_receipts_update_own
on public.project_render_receipts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists project_render_receipts_delete_own on public.project_render_receipts;
create policy project_render_receipts_delete_own
on public.project_render_receipts for delete
using (auth.uid() = user_id);

create index if not exists project_render_receipts_project_source_created_idx
  on public.project_render_receipts(project_id, source_asset_id, created_at desc);
create index if not exists project_render_receipts_job_id_idx
  on public.project_render_receipts(job_id);

drop trigger if exists set_project_render_receipts_updated_at on public.project_render_receipts;
create trigger set_project_render_receipts_updated_at
before update on public.project_render_receipts
for each row execute function public.handle_updated_at();
