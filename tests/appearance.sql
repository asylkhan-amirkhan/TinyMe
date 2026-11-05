begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); op uuid:=gen_random_uuid(); snap jsonb; body jsonb; result jsonb; rev bigint;
begin
 insert into auth.users(id,email)values(u,'colors-test@example.invalid'),(other_user,'colors-other-test@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);snap:=public.bootstrap();rev:=(snap->>'revision')::bigint;
 body:=jsonb_build_object('revision',rev,'appearance',jsonb_build_object('wallLeft','#AABBCC','wallRight','#445566','floor','#123456'));
 result:=public.room_command(op,'appearance',body);
 assert result->'appearance'->>'wallLeft'='#aabbcc','normalized palette';
 assert result->'items'=snap->'items','furniture preserved';assert result->>'balance'=snap->>'balance','wallet preserved';
 assert public.room_command(op,'appearance',body)=result,'idempotent colors';
 assert public.bootstrap()->'appearance'=result->'appearance','colors survive reload';
 begin perform public.room_command(gen_random_uuid(),'appearance',body);raise exception 'expected stale revision';exception when others then if sqlerrm<>'ROOM_VERSION_CONFLICT' then raise;end if;end;
 body:=jsonb_build_object('revision',(result->>'revision')::bigint,'appearance',jsonb_build_object('wallLeft','#123456','wallRight','red','floor','#abcdef'));
 begin perform public.room_command(gen_random_uuid(),'appearance',body);raise exception 'expected invalid colors';exception when others then if sqlerrm<>'INVALID_COLORS' then raise;end if;end;
 body:=jsonb_build_object('revision',(result->>'revision')::bigint,'appearance','{}'::jsonb);
 begin perform public.room_command(gen_random_uuid(),'appearance',body);raise exception 'expected missing colors';exception when others then if sqlerrm<>'INVALID_COLORS' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',other_user::text,true);snap:=public.bootstrap();assert snap->'appearance'='null'::jsonb,'owner isolation';
 assert not has_function_privilege('anon','public.room_command(uuid,text,jsonb)','EXECUTE'),'anonymous denied';
end;$$;
rollback;
