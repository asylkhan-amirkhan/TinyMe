-- Gaming collection: original fan-art miniatures and posters. Existing layouts unchanged.
insert into public.catalog_items(id,name,price,w,h,surface) values
('figure-alexander','Александр · Elden Ring',28,1,1,'floor'),
('figure-ranni','Ранни · Elden Ring',35,1,1,'floor'),
('relic-rune','Золотая руна · Elden Ring',18,1,1,'floor'),
('figure-wolf','Волк · Sekiro',35,1,1,'floor'),
('figure-idol','Идол резчика · Sekiro',24,1,1,'floor'),
('relic-katana','Катана на подставке · Sekiro',22,1,1,'floor'),
('figure-agent','Агент CT · CS2',32,1,1,'floor'),
('relic-trophy','Турнирный кубок · CS2',28,1,1,'floor'),
('relic-headset','Игровая гарнитура · CS2',18,1,1,'floor'),
('poster-erdtree','Древо Эрд · Elden Ring',18,3,1,'wall'),
('poster-malenia','Алая гниль · Elden Ring',20,3,1,'wall'),
('poster-ashina','Замок Асина · Sekiro',18,3,1,'wall'),
('poster-moon','Лунный поединок · Sekiro',20,3,1,'wall'),
('poster-cs2','Counter-Strike 2 · постер',16,3,1,'wall'),
('poster-dust','Dust II · CS2',18,3,1,'wall')
on conflict(id) do nothing;

create or replace function public.room_command(p_operation uuid,p_kind text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.accounts;existing public.operations;p public.catalog_items;i public.inventory_items;result jsonb;xx int;yy int;rot int;ww int;hh int;parent uuid;support public.inventory_items;support_product public.catalog_items;bound_w int;bound_h int;surface_level int;item_height int;
begin
 if u is null then raise exception 'UNAUTHORIZED';end if;
 select * into a from public.accounts where user_id=u for update;
 if not found then raise exception 'BOOTSTRAP_REQUIRED';end if;
 select * into existing from public.operations where user_id=u and id=p_operation;
 if found then if existing.kind<>p_kind or existing.payload<>p_payload then raise exception 'IDEMPOTENCY_MISMATCH';end if;return existing.result;end if;
 if p_kind='appearance' then
 if (p_payload->>'revision')::bigint is distinct from a.revision then raise exception 'ROOM_VERSION_CONFLICT';end if;
 if not coalesce(jsonb_typeof(p_payload->'appearance')='object'
   and (p_payload->'appearance'->>'wallLeft') ~ '^#[0-9a-fA-F]{6}$'
   and (p_payload->'appearance'->>'wallRight') ~ '^#[0-9a-fA-F]{6}$'
   and (p_payload->'appearance'->>'floor') ~ '^#[0-9a-fA-F]{6}$',false) then raise exception 'INVALID_COLORS';end if;
 update public.accounts set appearance=jsonb_build_object(
 'wallLeft',lower(p_payload->'appearance'->>'wallLeft'),
 'wallRight',lower(p_payload->'appearance'->>'wallRight'),
 'floor',lower(p_payload->'appearance'->>'floor')) where user_id=u;
 elsif p_kind='purchase' then
 select * into p from public.catalog_items where id=p_payload->>'productId';
 if not found then raise exception 'NOT_FOUND';end if;
 if (p_payload->>'price')::int is distinct from p.price then raise exception 'PRICE_CHANGED';end if;
 if a.balance<p.price then raise exception 'INSUFFICIENT_FUNDS';end if;
 if (select count(*) from public.inventory_items where user_id=u)>=10000 then raise exception 'INVENTORY_LIMIT';end if;
 insert into public.inventory_items(user_id,product_id) values(u,p.id);
 update public.accounts set balance=balance-p.price,balance_revision=balance_revision+1 where user_id=u;
 insert into public.wallet_ledger(user_id,operation_id,delta,balance_after) values(u,p_operation,-p.price,a.balance-p.price);
 elsif p_kind in ('place','remove','toggle','color') then
 if (p_payload->>'revision')::bigint is distinct from a.revision then raise exception 'ROOM_VERSION_CONFLICT';end if;
 select * into i from public.inventory_items where id=(p_payload->>'id')::uuid and user_id=u;
 if not found then raise exception 'NOT_FOUND';end if;
 select * into p from public.catalog_items where id=i.product_id;
 if p_kind='color' then
 if not (p_payload ? 'color') or not coalesce(p_payload->'color'='null'::jsonb or (jsonb_typeof(p_payload->'color')='string' and (p_payload->>'color') ~ '^#[0-9a-fA-F]{6}$'),false) then raise exception 'INVALID_FURNITURE_COLOR';end if;
 update public.inventory_items set color=lower(p_payload->>'color') where id=i.id and user_id=u;
 elsif p_kind='remove' then update public.inventory_items set x=null,y=null,parent_id=null,support_level=0 where user_id=u and (id=i.id or parent_id=i.id);
 elsif p_kind='toggle' then
 if i.product_id not like 'lamp-%' and i.product_id<>'record-warm' then raise exception 'NOT_INTERACTIVE';end if;
 update public.inventory_items set is_on=not is_on where id=i.id;
 else
 xx:=(p_payload->>'x')::int;yy:=(p_payload->>'y')::int;rot:=(p_payload->>'rotation')::int;
 if xx is null or yy is null or rot is null or rot not in(0,90,180,270) then raise exception 'INVALID_PLACEMENT';end if;
 ww:=case when rot%180=0 then p.w else p.h end;hh:=case when rot%180=0 then p.h else p.w end;
 parent:=case when p_payload ? 'parentId' then (p_payload->>'parentId')::uuid else i.parent_id end;
 surface_level:=case when p_payload ? 'supportLevel' then (p_payload->>'supportLevel')::int when parent is distinct from i.parent_id then 0 else i.support_level end;
 if surface_level is null or surface_level not between 0 and 3 or (parent is null and surface_level<>0) then raise exception 'INVALID_LEVEL';end if;
 bound_w:=24;bound_h:=16;
 if parent is not null then
   if i.product_id not in ('vase-branches','books-stories','lamp-table','plant-succulent','vase-mini','figure-alexander','figure-ranni','relic-rune','figure-wolf','figure-idol','relic-katana','figure-agent','relic-trophy','relic-headset') or parent=i.id then raise exception 'INVALID_SUPPORT';end if;
   select * into support from public.inventory_items where id=parent and user_id=u;
   if not found then raise exception 'INVALID_SUPPORT';end if;
   if support.parent_id is not null or support.x is null or support.product_id not in ('table-tea','dresser-walnut','shelf-books','shelf-light') then raise exception 'INVALID_SUPPORT';end if;
   select * into support_product from public.catalog_items where id=support.product_id;
   bound_w:=support_product.w;bound_h:=support_product.h;
   if support.product_id in ('shelf-books','shelf-light') then
     bound_w:=support_product.w-1;bound_h:=1;
     item_height:=case i.product_id when 'vase-branches' then 72 when 'books-stories' then 12 when 'lamp-table' then 42 when 'plant-succulent' then 26 when 'vase-mini' then 24 when 'figure-alexander' then 28 when 'figure-ranni' then 29 when 'relic-rune' then 25 when 'figure-wolf' then 29 when 'figure-idol' then 26 when 'relic-katana' then 19 when 'figure-agent' then 29 when 'relic-trophy' then 27 when 'relic-headset' then 25 end;
     if surface_level<3 and item_height>(case when surface_level=0 then 29 else 30 end) then raise exception 'TOO_TALL';end if;
   elsif surface_level<>0 then raise exception 'INVALID_LEVEL';end if;
 end if;
 if xx<0 or yy<0 or xx+ww>bound_w or yy+hh>bound_h or(p.surface='wall' and yy<>0) then raise exception 'OUT_OF_BOUNDS';end if;
 if i.x is null and (select count(*) from public.inventory_items where user_id=u and x is not null)>=200 then raise exception 'ROOM_LIMIT';end if;
 if exists(select 1 from public.inventory_items other join public.catalog_items cp on cp.id=other.product_id where other.user_id=u and other.id<>i.id and other.x is not null and other.parent_id is not distinct from parent and other.support_level=surface_level and cp.surface=p.surface and xx<other.x+(case when other.rotation%180=0 then cp.w else cp.h end) and xx+ww>other.x and yy<other.y+(case when other.rotation%180=0 then cp.h else cp.w end) and yy+hh>other.y) then raise exception 'COLLISION';end if;
 update public.inventory_items set x=xx,y=yy,rotation=rot,parent_id=parent,support_level=surface_level where id=i.id;
 end if;
 else raise exception 'INVALID_COMMAND';end if;
 update public.accounts set revision=revision+1 where user_id=u;
 result:=public.room_snapshot();insert into public.operations(user_id,id,kind,payload,result)values(u,p_operation,p_kind,p_payload,result);return result;
end;$$;
revoke all on function public.room_snapshot(),public.room_command(uuid,text,jsonb) from public,anon;
grant execute on function public.room_snapshot(),public.room_command(uuid,text,jsonb) to authenticated;
