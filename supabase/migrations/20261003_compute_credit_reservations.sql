create table if not exists public.compute_credit_reservations (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_id uuid references public.dodo_credits(id),
  operation text not null,
  resource_id text not null,
  cost integer not null check (cost > 0),
  status text not null default 'reserved' check (status in ('reserved','completed','refunded')),
  external_job_id text,
  created_at timestamptz not null default now(), settled_at timestamptz
);
alter table public.compute_credit_reservations enable row level security;
create index if not exists compute_credit_external_job_idx on public.compute_credit_reservations(user_id,external_job_id);
alter table public.source_assets add column if not exists transcript_credit_request_id uuid references public.compute_credit_reservations(request_id);
create policy "Read own compute reservations" on public.compute_credit_reservations
  for select to authenticated using (auth.uid()=user_id);

create or replace function public.reserve_compute_credits(p_user_id uuid,p_request_id uuid,p_operation text,p_resource_id text,p_cost integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare credit_row public.dodo_credits%rowtype;
begin
  if p_cost<>1 or p_operation not in ('transcribe','export','enhance') then raise exception 'Invalid credit cost'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  if exists(select 1 from public.compute_credit_reservations where request_id=p_request_id) then raise exception 'Request already used'; end if;
  select * into credit_row from public.dodo_credits
    where user_id=p_user_id and credit_type='ai_generation' and total_remaining>=p_cost
      and (period_start is null or period_start<=now()) and (period_end is null or period_end>now())
    order by period_end asc nulls last,created_at desc limit 1 for update;
  if not found then raise exception 'Insufficient credits'; end if;
  update public.dodo_credits set total_used=total_used+p_cost,updated_at=now() where id=credit_row.id;
  insert into public.compute_credit_reservations(request_id,user_id,credit_id,operation,resource_id,cost)
    values(p_request_id,p_user_id,credit_row.id,p_operation,p_resource_id,p_cost);
  return true;
end $$;
create or replace function public.settle_compute_credits(p_user_id uuid,p_request_id uuid,p_outcome text)
returns void language plpgsql security definer set search_path=public as $$
declare reservation public.compute_credit_reservations%rowtype;
begin
  if p_outcome not in ('completed','refunded') then raise exception 'Invalid outcome'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select * into reservation from public.compute_credit_reservations where request_id=p_request_id and user_id=p_user_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if reservation.status<>'reserved' then return; end if;
  if p_outcome='refunded' then
    update public.dodo_credits set total_used=greatest(0,total_used-reservation.cost),updated_at=now() where id=reservation.credit_id;
  end if;
  update public.compute_credit_reservations set status=p_outcome,settled_at=now() where request_id=p_request_id;
end $$;
create or replace function public.deduct_credits(p_user_id uuid,p_cost integer)
returns void language plpgsql security definer set search_path=public as $$
declare credit_id uuid;
begin
  if p_cost<=0 then raise exception 'Invalid credit cost'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select id into credit_id from public.dodo_credits where user_id=p_user_id and credit_type='ai_generation'
    and total_remaining>=p_cost and (period_start is null or period_start<=now()) and (period_end is null or period_end>now())
    order by period_end asc nulls last,created_at desc limit 1 for update;
  if not found then raise exception 'Insufficient credits'; end if;
  update public.dodo_credits set total_used=total_used+p_cost,updated_at=now() where id=credit_id;
end $$;
revoke all on function public.reserve_compute_credits(uuid,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.settle_compute_credits(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.deduct_credits(uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_compute_credits(uuid,uuid,text,text,integer) to service_role;
grant execute on function public.settle_compute_credits(uuid,uuid,text) to service_role;
grant execute on function public.deduct_credits(uuid,integer) to service_role;
