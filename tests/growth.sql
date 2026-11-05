-- Rollback-only integration checks. Run after installing supabase/growth.sql.
begin;
do $$
declare
  u uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); session uuid := gen_random_uuid();
  skill uuid := gen_random_uuid(); other_skill uuid := gen_random_uuid(); goal uuid := gen_random_uuid(); task uuid := gen_random_uuid();
  result jsonb; repeated jsonb; total integer;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (u,'growth-' || u::text || '@example.invalid',now()),
    (u2,'growth-' || u2::text || '@example.invalid',now());
  insert into auth.sessions(id,user_id) values(session,u);
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',session)::text,true);
  result := public.tinyme_growth();
  assert jsonb_array_length(result->'state'->'skills') = 0, 'empty profile';
  perform public.tinyme_growth(jsonb_build_object('type','skill','id',skill,'name','Japanese','category','study','color','#b6a2d4'));
  perform public.tinyme_growth(jsonb_build_object('type','skill','id',other_skill,'name','Sport','category','movement','color','#aacc88'));
  perform public.tinyme_growth(jsonb_build_object('type','goal','id',goal,'skillId',skill,'title','First story'));
  perform public.tinyme_growth(jsonb_build_object('type','task','id',task,'skillId',other_skill,'goalId',goal,'title','Five sentences','difficulty','medium'));
  result := public.tinyme_growth(jsonb_build_object('type','complete','taskId',task));
  assert (result->>'changed')::boolean, 'first completion changes state';
  assert result->'state'->'tasks'->0->>'skillId' = skill::text, 'goal skill inherited';
  assert (result->'state'->'events'->0->>'xp')::integer = 25, 'medium task awards 25 XP';
  repeated := public.tinyme_growth(jsonb_build_object('type','complete','taskId',task));
  assert not (repeated->>'changed')::boolean, 'duplicate completion unchanged';
  assert repeated->'state' = result->'state', 'same completion cannot duplicate XP';
  perform public.tinyme_growth(jsonb_build_object('type','archive','skillId',skill,'archived',true));
  repeated := public.tinyme_growth(jsonb_build_object('type','archive','skillId',skill,'archived',true));
  assert not (repeated->>'changed')::boolean, 'archive retry is idempotent';
  begin
    perform public.tinyme_growth(jsonb_build_object('type','task','id',gen_random_uuid(),'skillId',skill,'title','Blocked','difficulty','easy'));
    raise exception 'EXPECTED_ARCHIVE_REJECTION';
  exception when others then if sqlerrm <> 'SKILL_NOT_FOUND' then raise; end if; end;
  perform public.tinyme_growth(jsonb_build_object('type','archive','skillId',skill,'archived',false));
  begin
    perform public.tinyme_growth(jsonb_build_object('type','task','id',gen_random_uuid(),'skillId',skill,'title','Invalid','difficulty','infinite'));
    raise exception 'EXPECTED_DIFFICULTY_REJECTION';
  exception when others then if sqlerrm <> 'INVALID_DIFFICULTY' then raise; end if; end;
  assert not has_table_privilege('authenticated','public.tinyme_growth_profiles','UPDATE'), 'no direct XP updates';
  assert not has_table_privilege('authenticated','public.tinyme_growth_profiles','INSERT'), 'no direct state inserts';
  assert not has_table_privilege('authenticated','public.tinyme_growth_profiles','SELECT'), 'no direct state reads';
  assert not has_function_privilege('anon','public.tinyme_growth(jsonb)','EXECUTE'), 'anonymous RPC forbidden';
  perform set_config('request.jwt.claim.sub',u2::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u2,'role','authenticated','session_id',session)::text,true);
  begin
    perform public.tinyme_growth(); raise exception 'EXPECTED_SESSION_REJECTION';
  exception when others then if sqlerrm <> 'SESSION_REVOKED' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',session)::text,true);
  update auth.sessions set not_after = now() - interval '1 minute' where id = session;
  begin
    perform public.tinyme_growth(); raise exception 'EXPECTED_EXPIRED_SESSION_REJECTION';
  exception when others then if sqlerrm <> 'SESSION_REVOKED' then raise; end if; end;
  assert not exists(select 1 from public.tinyme_growth_profiles where user_id = u2), 'no cross-account profile';
end;
$$;
select 'Growth SQL checks passed; fixtures rolled back' as result;
rollback;
