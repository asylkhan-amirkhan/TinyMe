begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); item_id uuid; duplicate_id uuid; snap jsonb; result jsonb; body jsonb; op uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email)values(u,'furniture-color-test@example.invalid'),(other_user,'furniture-color-other@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);snap:=public.bootstrap();
 select id into item_id from public.inventory_items where user_id=u and product_id='bed-cloud';
 insert into public.inventory_items(user_id,product_id)values(u,'bed-cloud') returning id into duplicate_id;
 body:=jsonb_build_object('id',item_id,'color','#ABCDEF','revision',(snap->>'revision')::bigint);
 result:=public.room_command(op,'color',body);
 assert (select color from public.inventory_items where id=item_id)='#abcdef','color saved';
 assert (select color from public.inventory_items where id=duplicate_id) is null,'only selected copy changed';
 assert result->>'balance'=snap->>'balance','free change preserves balance';
 assert public.room_command(op,'color',body)=result,'idempotent color';
 assert public.bootstrap()->'items'=result->'items','reload keeps color';
 begin perform public.room_command(gen_random_uuid(),'color',jsonb_build_object('id',item_id,'color','red','revision',(result->>'revision')::bigint));raise exception 'expected invalid';exception when others then if sqlerrm<>'INVALID_FURNITURE_COLOR' then raise;end if;end;
 begin perform public.room_command(gen_random_uuid(),'color',jsonb_build_object('id',item_id,'revision',(result->>'revision')::bigint));raise exception 'expected missing';exception when others then if sqlerrm<>'INVALID_FURNITURE_COLOR' then raise;end if;end;
 result:=public.room_command(gen_random_uuid(),'place',jsonb_build_object('id',item_id,'x',3,'y',7,'rotation',90,'revision',(result->>'revision')::bigint));
 assert (select color from public.inventory_items where id=item_id)='#abcdef','move and rotate retain color';
 result:=public.room_command(gen_random_uuid(),'remove',jsonb_build_object('id',item_id,'revision',(result->>'revision')::bigint));
 assert (select color from public.inventory_items where id=item_id)='#abcdef','inventory retains color';
 result:=public.room_command(gen_random_uuid(),'color',jsonb_build_object('id',item_id,'color',null,'revision',(result->>'revision')::bigint));
 assert (select color from public.inventory_items where id=item_id) is null,'reset works in inventory';
 perform set_config('request.jwt.claim.sub',other_user::text,true);snap:=public.bootstrap();
 begin perform public.room_command(gen_random_uuid(),'color',jsonb_build_object('id',item_id,'color','#112233','revision',(snap->>'revision')::bigint));raise exception 'expected owner denial';exception when others then if sqlerrm<>'NOT_FOUND' then raise;end if;end;
 assert not has_table_privilege('authenticated','public.inventory_items','UPDATE'),'direct writes denied';
end;$$;
rollback;
