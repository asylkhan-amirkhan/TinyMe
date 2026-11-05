-- Permit browser background timer batching; all elapsed time still comes from the server.
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
 if p_action='start' and a.session_id is not null and a.last_at>t-interval '120 seconds' then raise exception 'ACTIVE_ELSEWHERE';end if;
 if p_session is null then raise exception 'INVALID_SESSION';end if;
 update public.accounts set session_id=p_session,last_at=t,seq=0 where user_id=u;
 elsif p_action in('beat','pause','cancel') then
 if a.session_id is distinct from p_session or p_session is null or a.last_at<=t-interval '120 seconds' then raise exception 'SESSION_EXPIRED';end if;
 if p_seq<=a.seq then raise exception 'STALE_SEQUENCE';end if;
 if p_action in('beat','pause') and p_seq=a.seq+1 then delta:=greatest(0,floor(extract(epoch from(t-a.last_at))*1000))::bigint;if delta>90000 then delta:=0;end if;end if;
 coins:=floor((a.active_ms+delta)/60000.0)-floor(a.active_ms/60000.0);
 update public.accounts set active_ms=active_ms+delta,balance=balance+coins,balance_revision=balance_revision+1,last_at=t,seq=p_seq,session_id=case when p_action in('pause','cancel') then null else p_session end where user_id=u;
 if coins>0 then insert into public.wallet_ledger(user_id,operation_id,delta,balance_after)values(u,p_operation,coins,a.balance+coins);end if;
 else raise exception 'INVALID_ACTION';end if;
 result:=jsonb_build_object('balance',a.balance+coins,'balanceRevision',a.balance_revision+case when p_action in('beat','pause','cancel') then 1 else 0 end,'activeMs',a.active_ms+delta,'seq',case when p_action in('start','takeover') then 0 else p_seq end);
 insert into public.operations(user_id,id,kind,payload,result)values(u,p_operation,'activity',payload,result);return result;
end;$$;
revoke all on function public.activity(uuid,uuid,text,bigint) from public,anon;
grant execute on function public.activity(uuid,uuid,text,bigint) to authenticated;
