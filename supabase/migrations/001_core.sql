create table public.catalog_items(id text primary key,name text not null,price integer not null check(price>=0),w integer not null,h integer not null,surface text not null);
create table public.accounts(user_id uuid primary key references auth.users on delete cascade,balance bigint not null default 0 check(balance>=0),active_ms bigint not null default 0,revision bigint not null default 0,session_id uuid,last_at timestamptz,seq bigint not null default 0);
create table public.inventory_items(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,product_id text not null references public.catalog_items,x integer,y integer,rotation integer not null default 0 check(rotation in(0,90,180,270)),is_on boolean not null default false,check((x is null)=(y is null)));
create index inventory_user on public.inventory_items(user_id);
create table public.operations(user_id uuid not null references auth.users on delete cascade,id uuid not null,kind text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(user_id,id));
create table public.wallet_ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,operation_id uuid not null,delta bigint not null,balance_after bigint not null,created_at timestamptz not null default now(),unique(user_id,operation_id));
create index ledger_user on public.wallet_ledger(user_id,created_at);
alter table public.catalog_items enable row level security;
alter table public.accounts enable row level security;
alter table public.inventory_items enable row level security;
alter table public.operations enable row level security;
alter table public.wallet_ledger enable row level security;
create policy catalog_read on public.catalog_items for select to authenticated using(true);
create policy account_read on public.accounts for select to authenticated using(user_id=(select auth.uid()));
create policy inventory_read on public.inventory_items for select to authenticated using(user_id=(select auth.uid()));
create policy operations_read on public.operations for select to authenticated using(user_id=(select auth.uid()));
create policy ledger_read on public.wallet_ledger for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.accounts,public.inventory_items,public.operations,public.wallet_ledger,public.catalog_items from anon,authenticated;
grant select on public.accounts,public.inventory_items,public.operations,public.wallet_ledger,public.catalog_items to authenticated;

create function public.room_snapshot() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('version',1,'revision',a.revision,'balance',a.balance,'activeMs',a.active_ms,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'x',i.x,'y',i.y,'rotation',i.rotation,'on',i.is_on)) from public.inventory_items i where i.user_id=auth.uid()),'[]'::jsonb)) from public.accounts a where a.user_id=auth.uid();
$$;
create function public.bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); inserted_count int;
begin
 if u is null then raise exception 'UNAUTHORIZED';end if;
 insert into public.accounts(user_id) values(u) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 if inserted_count=1 then insert into public.inventory_items(user_id,product_id,x,y) values(u,'desk-oak',7,4),(u,'chair-sage',8,7),(u,'plant-monstera',17,3);end if;
 return public.room_snapshot();
end;$$;

create function public.room_command(p_operation uuid,p_kind text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 update public.accounts set balance=balance-p.price where user_id=u;
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

create function public.activity(p_operation uuid,p_session uuid,p_action text,p_seq bigint) returns jsonb language plpgsql security definer set search_path='' as $$
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
 update public.accounts set active_ms=active_ms+delta,balance=balance+coins,last_at=t,seq=p_seq,session_id=case when p_action='pause' then null else p_session end where user_id=u;
 if coins>0 then insert into public.wallet_ledger(user_id,operation_id,delta,balance_after)values(u,p_operation,coins,a.balance+coins);end if;
 else raise exception 'INVALID_ACTION';end if;
 result:=jsonb_build_object('balance',a.balance+coins,'activeMs',a.active_ms+delta,'seq',case when p_action in('start','takeover') then 0 else p_seq end);
 insert into public.operations(user_id,id,kind,payload,result)values(u,p_operation,'activity',payload,result);return result;
end;$$;

revoke all on function public.room_snapshot(),public.bootstrap(),public.room_command(uuid,text,jsonb),public.activity(uuid,uuid,text,bigint) from public,anon;
grant execute on function public.room_snapshot(),public.bootstrap(),public.room_command(uuid,text,jsonb),public.activity(uuid,uuid,text,bigint) to authenticated;

insert into public.catalog_items(id,name,price,w,h,surface)values
('desk-oak','Дубовый стол',30,4,2,'floor'),('chair-sage','Стул «Шалфей»',20,2,2,'floor'),('bed-cloud','Кровать «Облако»',60,4,5,'floor'),('lamp-honey','Лампа «Мёд»',20,1,1,'floor'),('plant-monstera','Монстера',10,2,2,'floor'),('rug-sunset','Ковёр «Закат»',15,6,4,'rug'),('shelf-books','Книжная полка',45,4,2,'floor'),('art-sun','Солнечный день',5,2,1,'wall'),('sofa-moss','Диван «Мох»',70,5,3,'floor'),('record-warm','Проигрыватель',25,2,2,'floor'),('desk-walnut','Ореховый стол',40,4,2,'floor'),('chair-clay','Стул «Глина»',25,2,2,'floor'),('bed-sage','Кровать «Лён»',80,4,5,'floor'),('lamp-cream','Лампа «Ваниль»',30,1,1,'floor'),('plant-olive','Олива',20,2,2,'floor'),('plant-fern','Папоротник',15,2,2,'floor'),('rug-oat','Ковёр «Овёс»',20,6,4,'rug'),('rug-sage','Ковёр «Сад»',25,5,3,'rug'),('art-moon','Тихая луна',10,2,1,'wall'),('shelf-light','Светлая полка',55,3,2,'floor');
