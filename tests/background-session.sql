begin;
do $$
declare u uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); op uuid; before_ms bigint; result jsonb; again jsonb;
begin
 insert into auth.users(id,email) values(u,'myroom-background-test@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform public.bootstrap();
 perform public.activity(gen_random_uuid(),sid,'start',0);
 update public.accounts set last_at=clock_timestamp()-interval '61 seconds' where user_id=u;
 op:=gen_random_uuid();
 result:=public.activity(op,sid,'beat',1);
 assert (result->>'activeMs')::bigint between 61000 and 62000,'background minute counted';
 assert (result->>'balance')::bigint=1,'one coin for full minute';
 again:=public.activity(op,sid,'beat',1);
 assert again=result,'retry cannot duplicate coin';
 begin
   perform public.activity(gen_random_uuid(),gen_random_uuid(),'start',0);
   raise exception 'expected lease rejection';
 exception when others then if sqlerrm<>'ACTIVE_ELSEWHERE' then raise;end if;end;
 before_ms:=(result->>'activeMs')::bigint;
 update public.accounts set last_at=clock_timestamp()-interval '5 seconds' where user_id=u;
 result:=public.activity(gen_random_uuid(),sid,'pause',2);
 assert (result->>'activeMs')::bigint between before_ms+5000 and before_ms+6000,'pause settles final seconds';
 assert (select session_id is null from public.accounts where user_id=u),'pause releases session';
 perform public.activity(gen_random_uuid(),sid,'start',0);
 before_ms:=(result->>'activeMs')::bigint;
 update public.accounts set last_at=clock_timestamp()-interval '61 seconds' where user_id=u;
 result:=public.activity(gen_random_uuid(),sid,'cancel',1);
 assert (result->>'activeMs')::bigint=before_ms,'disconnect discards pending gap';
 perform public.activity(gen_random_uuid(),sid,'start',0);
 update public.accounts set last_at=clock_timestamp()-interval '91 seconds' where user_id=u;
 result:=public.activity(gen_random_uuid(),sid,'beat',1);
 assert (result->>'activeMs')::bigint=before_ms,'frozen gap is not rewarded';
 assert not has_function_privilege('anon','public.activity(uuid,uuid,text,bigint)','EXECUTE'),'anonymous cannot earn';
 assert not has_table_privilege('authenticated','public.accounts','UPDATE'),'no direct balance writes';
end;$$;
rollback;
