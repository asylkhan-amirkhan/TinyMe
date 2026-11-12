-- Separate roles and immutable logins from user-editable Auth metadata.
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  role text not null default 'user' check (role in ('user', 'admin'))
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;
create policy own_profile on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()));

-- Existing accounts keep email login and receive a unique login without modifying their metadata.
insert into public.user_profiles(user_id, username)
select id, 'u_' || substr(replace(id::text, '-', ''), 1, 28) from auth.users;

create function public.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare login text; display_name text;
begin
  login := lower(btrim(new.raw_user_meta_data->>'username'));
  display_name := btrim(new.raw_user_meta_data->>'display_name');
  -- OAuth / legacy Auth clients can omit a login; they still receive a regular user role.
  if login is null then login := 'u_' || substr(replace(new.id::text, '-', ''), 1, 28); end if;
  if login !~ '^[a-z0-9_]{3,30}$' then raise exception 'INVALID_USERNAME'; end if;
  if display_name is not null and length(display_name) not between 1 and 40 then
    raise exception 'INVALID_NAME';
  end if;
  insert into public.user_profiles(user_id, username) values (new.id, login);
  return new;
end; $$;
revoke all on function public.create_user_profile() from public, anon, authenticated;
create trigger create_user_profile after insert on auth.users
  for each row execute function public.create_user_profile();

-- Only the Next.js server may resolve a login. No public email directory.
create function public.login_email(p_username text) returns text
language sql security definer set search_path = '' as $$
  select u.email::text from auth.users u join public.user_profiles p on p.user_id = u.id
  where p.username = lower(btrim(p_username));
$$;
revoke all on function public.login_email(text) from public, anon, authenticated;
grant execute on function public.login_email(text) to service_role;

create table public.auth_attempts (
  key text primary key,
  started_at timestamptz not null,
  attempts integer not null
);
alter table public.auth_attempts enable row level security;
revoke all on public.auth_attempts from public, anon, authenticated;
create function public.auth_attempt(p_key text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer; total integer;
begin
  delete from public.auth_attempts where started_at < now() - interval '1 day';
  insert into public.auth_attempts as a values ('global', now(), 1)
    on conflict (key) do update set
      attempts = case when a.started_at < now() - interval '1 minute' then 1 else a.attempts + 1 end,
      started_at = case when a.started_at < now() - interval '1 minute' then now() else a.started_at end
    returning attempts into total;
  if total > 200 then return false; end if;
  insert into public.auth_attempts as a values (p_key, now(), 1)
    on conflict (key) do update set
      attempts = case when a.started_at < now() - interval '15 minutes' then 1 else a.attempts + 1 end,
      started_at = case when a.started_at < now() - interval '15 minutes' then now() else a.started_at end
    returning attempts into n;
  return n <= 10;
end; $$;
revoke all on function public.auth_attempt(text) from public, anon, authenticated;
grant execute on function public.auth_attempt(text) to service_role;

-- Reject a signed-out JWT immediately in the Data API, including existing room RPCs.
create function public.check_session() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated' and not exists (
    select 1 from auth.sessions where id = (auth.jwt()->>'session_id')::uuid and user_id = auth.uid()
      and (not_after is null or not_after > now())
  ) then raise sqlstate 'PT401' using message = 'SESSION_EXPIRED'; end if;
end; $$;
revoke all on function public.check_session() from public;
grant execute on function public.check_session() to anon, authenticated, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.check_session';
notify pgrst, 'reload config';

create function public.my_profile() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_session();
  return (select jsonb_build_object('username', username, 'role', role)
    from public.user_profiles where user_id = auth.uid());
end; $$;

create function public.admin_users(p_offset integer default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_session();
  if not exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin') then
    raise sqlstate '42501' using message = 'FORBIDDEN';
  end if;
  return (select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select p.user_id, p.username, p.role, u.email, u.created_at
    from public.user_profiles p join auth.users u on u.id = p.user_id
    order by u.created_at desc, p.user_id limit 50 offset greatest(p_offset, 0)
  ) t);
end; $$;

create function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_session();
  -- Serialize role changes, including concurrent demotions.
  lock table public.user_profiles in share row exclusive mode;
  if not exists (select 1 from public.user_profiles where user_id = auth.uid() and role = 'admin') then
    raise sqlstate '42501' using message = 'FORBIDDEN';
  end if;
  if p_role is null or p_role not in ('user', 'admin') then raise exception 'INVALID_ROLE'; end if;
  if p_user = auth.uid() then raise exception 'SELF_ROLE_CHANGE'; end if;
  update public.user_profiles set role = p_role where user_id = p_user;
  if not found then raise exception 'NOT_FOUND'; end if;
end; $$;
revoke all on function public.my_profile(), public.admin_users(integer), public.admin_set_role(uuid,text) from public, anon;
grant execute on function public.my_profile(), public.admin_users(integer), public.admin_set_role(uuid,text) to authenticated;
