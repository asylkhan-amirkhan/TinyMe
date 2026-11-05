create or replace function public.music_reserve(p_user uuid,p_id uuid,p_title text,p_bytes bigint,p_mime text)
returns public.music_tracks language plpgsql set search_path='' as $$
declare t public.music_tracks;used_bytes bigint;pending int;total int;
begin
 if p_user is null then raise exception 'UNAUTHORIZED';end if;
 insert into public.music_libraries(user_id) values(p_user) on conflict do nothing;
 perform 1 from public.music_libraries where user_id=p_user for update;
 select * into t from public.music_tracks where id=p_id;
 if found then
  if t.user_id<>p_user or t.bytes<>p_bytes or t.title<>p_title or t.mime<>p_mime then raise exception 'IDEMPOTENCY_MISMATCH';end if;
  return t;
 end if;
 if p_bytes is null or p_bytes<1 or p_bytes>52428800 or p_mime is null or p_mime not in('audio/mpeg','audio/wav') then raise exception 'INVALID_FILE';end if;
 select coalesce(sum(case when status='ready' and expires_at<now() then bytes else 52428800 end),0),count(*),count(*) filter(where status in('uploading','validating')) into used_bytes,total,pending
 from public.music_tracks where user_id=p_user;
 if used_bytes+52428800>1073741824 or total>=200 then raise exception 'QUOTA_EXCEEDED';end if;
 if pending>=2 then raise exception 'TOO_MANY_UPLOADS';end if;
 insert into public.music_tracks(id,user_id,title,storage_key,bytes,mime)
 values(p_id,p_user,p_title,p_user::text||'/'||p_id::text,p_bytes,p_mime) returning * into t;
 return t;
end;$$;



