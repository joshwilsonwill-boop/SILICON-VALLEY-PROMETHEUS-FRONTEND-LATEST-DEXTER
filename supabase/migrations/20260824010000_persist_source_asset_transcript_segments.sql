-- User edits are stored separately from the raw AssemblyAI response in R2.
-- This keeps the editable transcript available on every signed-in device.
alter table public.source_assets
  add column if not exists transcript_segments jsonb;

comment on column public.source_assets.transcript_segments is
  'Normalized, user-editable transcript segments for the source asset.';
