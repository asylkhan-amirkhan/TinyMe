begin;
do $$
declare u uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();op uuid;sid uuid:=gen_random_uuid();snap jsonb;first_result jsonb;count_items int;v_active bigint;v_balance bigint;
begin
 insert into auth.users(id,email)values(u,'myroom-rollback-test@example.invalid'),(u2,'myroom-rollback-test2@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);
 snap:=public.bootstrap();assert (snap->>'balance')::bigint=0,'initial balance';assert jsonb_array_length(snap->'items')=10,'starter items';
 perform public.bootstrap();select count(*) into count_items from public.inventory_items where user_id=u;assert count_items=10,'idempotent bootstrap';
 op:=gen_random_uuid();begin perform public.room_command(op,'purchase','{"productId":"plant-monstera","price":10}');raise exception 'expected insufficient funds';exception when others then if sqlerrm<>'INSUFFICIENT_FUNDS' then raise;end if;end;
 perform public.activity(gen_random_uuid(),sid,'start',0);
 update public.accounts set active_ms=59999,last_at=clock_timestamp()-interval '0.1 second' where user_id=u;
 op:=gen_random_uuid();first_result:=public.activity(op,sid,'beat',1);assert (first_result->>'balance')::bigint=1,'minute boundary';
 snap:=public.activity(op,sid,'beat',1);assert snap=first_result,'duplicate heartbeat';
 select active_ms into v_active from public.accounts where user_id=u;
 update public.accounts set last_at=clock_timestamp()-interval '91 seconds' where user_id=u;
 perform public.activity(gen_random_uuid(),sid,'beat',2);assert (select active_ms from public.accounts where user_id=u)=v_active,'no gap reward';
 begin perform public.activity(gen_random_uuid(),gen_random_uuid(),'start',0);raise exception 'expected lease rejection';exception when others then if sqlerrm<>'ACTIVE_ELSEWHERE' then raise;end if;end;
 update public.accounts set balance=40 where user_id=u;
 op:=gen_random_uuid();first_result:=public.room_command(op,'purchase','{"productId":"desk-oak","price":30}');assert (first_result->>'balance')::int=10,'purchase amount';
 snap:=public.room_command(op,'purchase','{"productId":"desk-oak","price":30}');assert snap=first_result,'idempotent purchase';
 assert (select count(*) from public.inventory_items where user_id=u)=11,'one acquired item';
 begin perform public.room_command(op,'purchase','{"productId":"chair-sage","price":20}');raise exception 'expected key mismatch';exception when others then if sqlerrm<>'IDEMPOTENCY_MISMATCH' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',u2::text,true);snap:=public.bootstrap();assert (snap->>'balance')::int=0,'owner isolation';
 assert not has_table_privilege('authenticated','public.accounts','UPDATE'),'no balance update grant';
 assert not has_function_privilege('anon','public.room_command(uuid,text,jsonb)','EXECUTE'),'no anonymous mutation';
 raise notice 'Core transaction checks passed; all test records will be rolled back';
end;$$;
rollback;
