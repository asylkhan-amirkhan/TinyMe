alter table public.accounts add column balance_revision bigint not null default 0;
create or replace function public.room_snapshot() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('version',1,'revision',a.revision,'balance',a.balance,'balanceRevision',a.balance_revision,'activeMs',a.active_ms,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'x',i.x,'y',i.y,'rotation',i.rotation,'on',i.is_on)) from public.inventory_items i where i.user_id=auth.uid()),'[]'::jsonb)) from public.accounts a where a.user_id=auth.uid();
$$;
create or replace function public.room_command(p_operation uuid,p_kind text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.accounts;existing public.operations;p public.catalog_items;i public.inventory_items;result jsonb;xx int;yy int;rot int;ww int;hh int;
begin
 if u is null then raise exception 'UNAUTHORIZED';end if;
 select * into a from public.accounts where user_id=u for update;
 if not found then raise exception 'BOOTSTRAP_REQUIRED';end if;
 select * into existing from public.operations where user_id=u and id=p_operation;
 if found then if existing.kind<>p_kind or existing.payload<>p_payload then raise exception 'IDEMPOTENCY_MISMATCH';end if;return existing.result;end if;
 if p_kind='purchase' then
 select * into p from public.catalog_items where id=p_payload->>'productId';
 if not found then raise exception 'NOT_FOUND';end if;
 if (p_payload->>'price')::int is distinct from p.price then raise exception 'PRICE_CHANGED';end if;
 if a.balance<p.price then raise exception 'INSUFFICIENT_FUNDS';end if;
 if (select count(*) from public.inventory_items where user_id=u)>=10000 then raise exception 'INVENTORY_LIMIT';end if;
 insert into public.inventory_items(user_id,product_id) values(u,p.id);
 update public.accounts set balance=balance-p.price,balance_revision=balance_revision+1 where user_id=u;
 insert into public.wallet_ledger(user_id,operation_id,delta,balance_after) values(u,p_operation,-p.price,a.balance-p.price);
 elsif p_kind in ('place','remove','toggle') then
 if (p_payload->>'revision')::bigint is distinct from a.revision then raise exception 'ROOM_VERSION_CONFLICT';end if;
 select * into i from public.inventory_items where id=(p_payload->>'id')::uuid and user_id=u;
 if not found then raise exception 'NOT_FOUND';end if;
 select * into p from public.catalog_items where id=i.product_id;
 if p_kind='remove' then update public.inventory_items set x=null,y=null where id=i.id;
 elsif p_kind='toggle' then
 if i.product_id not like 'lamp-%' and i.product_id<>'record-warm' then raise exception 'NOT_INTERACTIVE';end if;
 update public.inventory_items set is_on=not is_on where id=i.id;
 else
 xx:=(p_payload->>'x')::int;yy:=(p_payload->>'y')::int;rot:=(p_payload->>'rotation')::int;
 if xx is null or yy is null or rot is null or rot not in(0,90,180,270) then raise exception 'INVALID_PLACEMENT';end if;
 ww:=case when rot%180=0 then p.w else p.h end;hh:=case when rot%180=0 then p.h else p.w end;
 if xx<0 or yy<0 or xx+ww>24 or yy+hh>16 or(p.surface='wall' and yy<>0) then raise exception 'OUT_OF_BOUNDS';end if;
 if i.x is null and (select count(*) from public.inventory_items where user_id=u and x is not null)>=200 then raise exception 'ROOM_LIMIT';end if;
 if exists(select 1 from public.inventory_items other join public.catalog_items cp on cp.id=other.product_id where other.user_id=u and other.id<>i.id and other.x is not null and cp.surface=p.surface and xx<other.x+(case when other.rotation%180=0 then cp.w else cp.h end) and xx+ww>other.x and yy<other.y+(case when other.rotation%180=0 then cp.h else cp.w end) and yy+hh>other.y) then raise exception 'COLLISION';end if;
 update public.inventory_items set x=xx,y=yy,rotation=rot where id=i.id;
 end if;
 else raise exception 'INVALID_COMMAND';end if;
 update public.accounts set revision=revision+1 where user_id=u;
 result:=public.room_snapshot();insert into public.operations(user_id,id,kind,payload,result)values(u,p_operation,p_kind,p_payload,result);return result;
end;$$;
create or replace function public.activity(p_operation uuid,p_session uuid,p_action text,p_seq bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a public.accounts;t timestamptz;delta bigint:=0;coins bigint:=0;result jsonb;existing public.operations;payload jsonb;
begin
 if u is null then raise exception 'UNAUTHORIZED';end if;
 select * into a from public.accounts where user_id=u for update;
 if not found then raise exception 'BOOTSTRAP_REQUIRED';end if;
 t:=clock_timestamp();payload:=jsonb_build_object('session',p_session,'action',p_action,'seq',p_seq);
 select * into existing from public.operations where user_id=u and id=p_operation;
 if found then if existing.kind<>'activity' or existing.payload<>payload then raise exception 'IDEMPOTENCY_MISMATCH';end if;return existing.result;end if;
 if p_action='start' or p_action='takeover' then
 if p_action='start' and a.session_id is not null and a.last_at>t-interval '25 seconds' then raise exception 'ACTIVE_ELSEWHERE';end if;
 if p_session is null then raise exception 'INVALID_SESSION';end if;
 update public.accounts set session_id=p_session,last_at=t,seq=0 where user_id=u;
 elsif p_action in('beat','pause') then
 if a.session_id is distinct from p_session or p_session is null or a.last_at<=t-interval '25 seconds' then raise exception 'SESSION_EXPIRED';end if;
 if p_seq<=a.seq then raise exception 'STALE_SEQUENCE';end if;
 if p_action='beat' and p_seq=a.seq+1 then delta:=greatest(0,floor(extract(epoch from(t-a.last_at))*1000))::bigint;if delta>20000 then delta:=0;end if;end if;
 coins:=floor((a.active_ms+delta)/60000.0)-floor(a.active_ms/60000.0);
 update public.accounts set active_ms=active_ms+delta,balance=balance+coins,balance_revision=balance_revision+1,last_at=t,seq=p_seq,session_id=case when p_action='pause' then null else p_session end where user_id=u;
 if coins>0 then insert into public.wallet_ledger(user_id,operation_id,delta,balance_after)values(u,p_operation,coins,a.balance+coins);end if;
 else raise exception 'INVALID_ACTION';end if;
 result:=jsonb_build_object('balance',a.balance+coins,'balanceRevision',a.balance_revision+case when p_action in('beat','pause') then 1 else 0 end,'activeMs',a.active_ms+delta,'seq',case when p_action in('start','takeover') then 0 else p_seq end);
 insert into public.operations(user_id,id,kind,payload,result)values(u,p_operation,'activity',payload,result);return result;
end;$$;