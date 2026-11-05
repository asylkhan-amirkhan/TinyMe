begin;
do $$
declare u uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();t uuid:=gen_random_uuid();t2 uuid:=gen_random_uuid();l public.music_libraries;
begin
 insert into auth.users(id,email) values(u,'music-test@example.invalid'),(u2,'music-test2@example.invalid');
 perform public.music_reserve(u,t,'Test',1024,'audio/wav');
 perform public.music_reserve(u,t,'Test',1024,'audio/wav');
 assert (select count(*) from public.music_tracks where user_id=u)=1,'idempotent reservation';
 begin perform public.music_reserve(u2,t,'Test',1024,'audio/wav');raise exception 'expected mismatch';exception when others then if sqlerrm<>'IDEMPOTENCY_MISMATCH' then raise;end if;end;
 update public.music_tracks set status='ready',duration=48 where id=t;
 l:=public.music_save_library(u,0,jsonb_build_array(jsonb_build_object('id','evening','name','Вечер','trackIds',jsonb_build_array(t::text))),'evening');
 assert l.revision=1,'revision increments';
 begin perform public.music_save_library(u,0,'[]','all');raise exception 'expected conflict';exception when others then if sqlerrm<>'LIBRARY_CONFLICT' then raise;end if;end;
 perform public.music_reserve(u2,t2,'Other',1024,'audio/wav');
 update public.music_tracks set status='ready',duration=48 where id=t2;
 begin perform public.music_save_library(u,1,jsonb_build_array(jsonb_build_object('id','x','name','x','trackIds',jsonb_build_array(t2::text))),'x');raise exception 'expected foreign track rejection';exception when others then if sqlerrm<>'TRACK_NOT_FOUND' then raise;end if;end;
 perform public.music_remove_track(u,t);
 assert (select playlists->0->'trackIds' from public.music_libraries where user_id=u)='[]'::jsonb,'delete removes playlist membership';
 assert (select status from public.music_tracks where id=t)='deleting','tombstone retains quota until token expiry';
 assert not has_table_privilege('authenticated','public.music_tracks','INSERT'),'no client writes';
 assert not has_function_privilege('authenticated','public.music_reserve(uuid,uuid,text,bigint,text)','EXECUTE'),'service only reservation';
 assert not (select public from storage.buckets where id='myroom-music'),'private bucket';
 update public.music_tracks set expires_at=now()-interval '1 second' where id=t2;
 insert into public.music_tracks(id,user_id,title,storage_key,bytes,mime,status)
 select id,u2,'Pending quota test',u2::text||'/'||id::text,1,'audio/wav','deleting' from (select gen_random_uuid() id from generate_series(1,20)) s;
 begin perform public.music_reserve(u2,gen_random_uuid(),'One-byte claim',1,'audio/wav');raise exception 'expected quota rejection';exception when others then if sqlerrm<>'QUOTA_EXCEEDED' then raise;end if;end;
 raise notice 'Music transaction checks passed';
end;$$;
rollback;
