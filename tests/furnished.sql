begin;
do $$
declare u uuid:=gen_random_uuid(); legacy uuid:=gen_random_uuid(); item_id uuid; snap jsonb; rev bigint;
begin
 insert into auth.users(id,email)values(u,'furnished-test@example.invalid'),(legacy,'legacy-layout-test@example.invalid');
 perform set_config('request.jwt.claim.sub',u::text,true);
 snap:=public.bootstrap();assert jsonb_array_length(snap->'items')=10,'ten furnishings';
 select id into item_id from public.inventory_items where user_id=u and product_id='bed-cloud';
 rev:=(snap->>'revision')::bigint;
 snap:=public.room_command(gen_random_uuid(),'place',jsonb_build_object('id',item_id,'x',3,'y',7,'rotation',0,'revision',rev));
 perform public.bootstrap();assert (select x from public.inventory_items where id=item_id)=3,'bootstrap retains drag';
 assert (select count(*) from public.inventory_items where user_id=u)=10,'no duplicate grants';
 begin
  perform public.room_command(gen_random_uuid(),'place',jsonb_build_object('id',item_id,'x',11,'y',1,'rotation',0,'revision',(snap->>'revision')::bigint));
  raise exception 'expected collision';
 exception when others then if sqlerrm<>'COLLISION' then raise;end if;end;
 assert (select x from public.inventory_items where id=item_id)=3,'invalid move preserves position';
 insert into public.accounts(user_id,balance,active_ms)values(legacy,27,123456);
 insert into public.inventory_items(user_id,product_id,x,y)values(legacy,'desk-oak',6,3);
 perform set_config('request.jwt.claim.sub',legacy::text,true);snap:=public.bootstrap();
 assert jsonb_array_length(snap->'items')=1,'existing cloud inventory preserved';
 assert (snap->>'balance')::bigint=27 and (snap->>'activeMs')::bigint=123456,'wallet and time preserved';
 assert (select x from public.inventory_items where user_id=legacy)=6,'existing cloud arrangement untouched';
 raise notice 'Furnishing, drag persistence, collision and legacy-account checks passed';
end;$$;
rollback;
