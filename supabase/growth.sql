-- Additive setup for the TinyMe growth loop. Run once in the intended Supabase
-- project's SQL editor. No existing room, wallet or music data is modified.
begin;
create table if not exists public.tinyme_growth_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"version":1,"skills":[],"goals":[],"tasks":[],"events":[]}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.tinyme_growth_profiles enable row level security;
revoke all on public.tinyme_growth_profiles from public, anon, authenticated;
-- Reads and mutations use one authenticated API; clients cannot write arbitrary XP.
-- SECURITY DEFINER is intentional: table writes are not granted to clients.
-- Every call verifies the actual user and locks only that user's row.
create or replace function public.tinyme_growth(p_command jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  s jsonb; before_state jsonb; kind text; item jsonb; skill jsonb; goal jsonb;
  item_id text; skill_id text; goal_id text; idx integer; reward integer;
  label text; stamp text; archived boolean;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from auth.users where id = owner_id and email_confirmed_at is not null) then raise exception 'EMAIL_UNCONFIRMED'; end if;
  if not exists(select 1 from auth.sessions where user_id = owner_id and id::text = (auth.jwt()->>'session_id') and (not_after is null or not_after > now())) then raise exception 'SESSION_REVOKED'; end if;
  insert into public.tinyme_growth_profiles(user_id) values(owner_id) on conflict(user_id) do nothing;
  select state into s from public.tinyme_growth_profiles where user_id = owner_id for update;
  before_state := s;
  if p_command is null then return jsonb_build_object('state',s,'changed',false); end if;
  if jsonb_typeof(p_command) <> 'object' then raise exception 'INVALID_COMMAND'; end if;
  kind := p_command->>'type';
  if kind in ('skill','goal','task') then
    item_id := (p_command->>'id')::uuid::text;
    if item_id is null then raise exception 'INVALID_ID'; end if;
    label := btrim(case when kind = 'skill' then p_command->>'name' else p_command->>'title' end);
    if label is null or char_length(label) < 1 or char_length(label) > (case kind when 'skill' then 60 when 'goal' then 120 else 200 end) then raise exception 'INVALID_TITLE'; end if;
  end if;
  if kind = 'skill' then
    if exists(select 1 from jsonb_array_elements(s->'skills') v where v->>'id' = item_id) then return jsonb_build_object('state',s,'changed',false); end if;
    if jsonb_array_length(s->'skills') >= 100 then raise exception 'SKILL_LIMIT'; end if;
    if coalesce(p_command->>'category','') not in ('study','work','movement','music','care') or coalesce(p_command->>'color','') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'INVALID_SKILL'; end if;
    item := jsonb_build_object('id',item_id,'name',label,'color',p_command->>'color','category',p_command->>'category','archived',false);
    s := jsonb_set(s,'{skills}',(s->'skills') || jsonb_build_array(item));
  elsif kind = 'archive' then
    skill_id := (p_command->>'skillId')::uuid::text;
    if jsonb_typeof(p_command->'archived') is distinct from 'boolean' then raise exception 'INVALID_STATUS'; end if;
    archived := (p_command->>'archived')::boolean;
    select (ordinality - 1)::integer, value into idx, skill from jsonb_array_elements(s->'skills') with ordinality where value->>'id' = skill_id;
    if skill is null then raise exception 'SKILL_NOT_FOUND'; end if;
    s := jsonb_set(s,array['skills',idx::text,'archived'],to_jsonb(archived));
  elsif kind in ('goal','task') then
    if kind = 'task' then
      if exists(select 1 from jsonb_array_elements(s->'tasks') v where v->>'id' = item_id) then return jsonb_build_object('state',s,'changed',false); end if;
      if jsonb_array_length(s->'tasks') >= 5000 then raise exception 'TASK_LIMIT'; end if;
      goal_id := nullif(p_command->>'goalId','');
      if goal_id is not null then
        goal_id := goal_id::uuid::text;
        select value into goal from jsonb_array_elements(s->'goals') where value->>'id' = goal_id;
        if goal is null then raise exception 'GOAL_NOT_FOUND'; end if;
      end if;
    else
      if exists(select 1 from jsonb_array_elements(s->'goals') v where v->>'id' = item_id) then return jsonb_build_object('state',s,'changed',false); end if;
      if jsonb_array_length(s->'goals') >= 500 then raise exception 'GOAL_LIMIT'; end if;
    end if;
    skill_id := coalesce(goal->>'skillId',(p_command->>'skillId')::uuid::text);
    select value into skill from jsonb_array_elements(s->'skills') where value->>'id' = skill_id and value->>'archived' = 'false';
    if skill is null then raise exception 'SKILL_NOT_FOUND'; end if;
    if kind = 'goal' then
      item := jsonb_build_object('id',item_id,'skillId',skill_id,'title',label);
      s := jsonb_set(s,'{goals}',(s->'goals') || jsonb_build_array(item));
    else
      if coalesce(p_command->>'difficulty','') not in ('easy','medium','hard') then raise exception 'INVALID_DIFFICULTY'; end if;
      item := jsonb_build_object('id',item_id,'skillId',skill_id,'goalId',goal_id,'title',label,'difficulty',p_command->>'difficulty','completedAt',null);
      s := jsonb_set(s,'{tasks}',(s->'tasks') || jsonb_build_array(item));
    end if;
  elsif kind = 'complete' then
    item_id := (p_command->>'taskId')::uuid::text;
    select (ordinality - 1)::integer, value into idx, item from jsonb_array_elements(s->'tasks') with ordinality where value->>'id' = item_id;
    if item is null then raise exception 'TASK_NOT_FOUND'; end if;
    if item->>'completedAt' is not null then return jsonb_build_object('state',s,'changed',false); end if;
    skill_id := item->>'skillId';
    if not exists(select 1 from jsonb_array_elements(s->'skills') v where v->>'id' = skill_id and v->>'archived' = 'false') then raise exception 'SKILL_ARCHIVED'; end if;
    reward := case item->>'difficulty' when 'easy' then 10 when 'medium' then 25 when 'hard' then 50 end;
    if reward is null then raise exception 'INVALID_DIFFICULTY'; end if;
    stamp := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    s := jsonb_set(s,array['tasks',idx::text,'completedAt'],to_jsonb(stamp));
    s := jsonb_set(s,'{events}',(s->'events') || jsonb_build_array(jsonb_build_object('id',item_id,'taskId',item_id,'skillId',skill_id,'xp',reward,'at',stamp)));
  else raise exception 'INVALID_COMMAND';
  end if;
  if s is distinct from before_state then
    update public.tinyme_growth_profiles set state = s, revision = revision + 1, updated_at = now() where user_id = owner_id;
  end if;
  return jsonb_build_object('state',s,'changed',s is distinct from before_state);
end;
$$;
revoke all on function public.tinyme_growth(jsonb) from public, anon;
grant execute on function public.tinyme_growth(jsonb) to authenticated;
comment on function public.tinyme_growth(jsonb) is 'Owner-only TinyMe growth commands. XP is derived from one completion event per task; row lock serializes devices.';
commit;
