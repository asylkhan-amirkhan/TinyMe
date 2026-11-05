alter table public.accounts add column layout_version integer not null default 0;

create or replace function public.room_snapshot() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('version',1,'layoutVersion',a.layout_version,'revision',a.revision,'balance',a.balance,'balanceRevision',a.balance_revision,'activeMs',a.active_ms,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'x',i.x,'y',i.y,'rotation',i.rotation,'on',i.is_on)) from public.inventory_items i where i.user_id=auth.uid()),'[]'::jsonb)) from public.accounts a where a.user_id=auth.uid();
$$;

create or replace function public.bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); inserted_count integer;
begin
 if u is null then raise exception 'UNAUTHORIZED'; end if;
 insert into public.accounts(user_id,layout_version) values(u,1) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 -- Only a newly created account receives this starter layout. Existing accounts are untouched.
 if inserted_count=1 then
  insert into public.inventory_items(user_id,product_id,x,y,rotation,is_on) values
   (u,'desk-oak',11,1,0,true),(u,'chair-sage',12,4,180,true),(u,'bed-cloud',1,7,0,true),
   (u,'plant-monstera',21,2,0,true),(u,'shelf-books',1,1,90,true),(u,'rug-sunset',10,5,0,true),
   (u,'sofa-moss',17,10,0,true),(u,'record-warm',18,7,0,true),(u,'lamp-honey',22,9,0,true),(u,'plant-fern',6,13,0,true);
 end if;
 return public.room_snapshot();
end;$$;
revoke all on function public.bootstrap(),public.room_snapshot() from public,anon;
grant execute on function public.bootstrap(),public.room_snapshot() to authenticated;
