-- The legacy circular-reference migration removed this column while the
-- application continued to store the selected source asset on the project.
alter table public.projects
  add column if not exists source_asset_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_source_asset_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_source_asset_id_fkey
      foreign key (source_asset_id)
      references public.source_assets(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists projects_source_asset_id_idx
  on public.projects(source_asset_id);

alter table public.source_assets enable row level security;

drop policy if exists source_assets_select_own on public.source_assets;
create policy source_assets_select_own
  on public.source_assets
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists source_assets_insert_own on public.source_assets;
create policy source_assets_insert_own
  on public.source_assets
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists source_assets_update_own on public.source_assets;
create policy source_assets_update_own
  on public.source_assets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
