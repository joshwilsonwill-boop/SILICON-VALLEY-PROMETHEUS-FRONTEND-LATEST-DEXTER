-- Harden the auth.users insert trigger so it can never block signups.
-- The API-side ensureProfile() already handles profile creation idempotently,
-- so the trigger is a safety net — not a gate.
--
-- 2026-08-24 (root cause): profiles.username is NOT NULL DEFAULT '' UNIQUE
-- (dashboard-added constraint). The old trigger inserted without a username,
-- so every user after the first collided on username='' -> 23505 -> GoTrue
-- rolled the whole signup back ("Database error saving new user").
--
-- Fix: assign every new user a unique username derived from their email
-- (lowercased email local-part, sanitized to [a-z0-9_.-], suffixed _N on
-- collision), and wrap the insert in an exception block so a profile failure
-- is logged but never blocks the signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  attempt int := 1;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_.-]', '', 'g'));
  if base_username is null or base_username = '' then
    base_username := 'user_' || substr(md5(new.email), 1, 8);
  end if;

  candidate_username := base_username;
  while exists (select 1 from public.profiles where username = candidate_username) loop
    candidate_username := base_username || '_' || attempt;
    attempt := attempt + 1;
  end loop;

  begin
    insert into public.profiles (id, email, full_name, name, display_name, first_name, last_name, avatar_url, username)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(new.raw_user_meta_data ->> 'last_name', ''),
      coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', '')),
      candidate_username
    )
    on conflict (id) do nothing;
  exception
    when others then
      raise warning '[auth-trigger] handle_new_user insert failed: % %', sqlstate, sqlerrm;
  end;

  return new;
end;
$$;