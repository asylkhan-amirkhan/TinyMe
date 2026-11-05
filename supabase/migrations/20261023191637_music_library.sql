create table public.music_libraries (
 user_id uuid primary key references auth.users on delete cascade,
 revision bigint not null default 0,
 playlists jsonb not null default '[]',
 selected_playlist text not null default 'all'
);
create table public.music_tracks (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 title text not null check(length(title) between 1 and 160),
 storage_key text not null unique,
 bytes bigint not null check(bytes between 1 and 52428800),
 duration double precision,
 mime text,
 status text not null default 'uploading' check(status in('uploading','validating','ready','failed','deleting')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '3 hours'
);
create index music_tracks_owner on public.music_tracks(user_id,status);
create index music_tracks_cleanup on public.music_tracks(expires_at) where status in('uploading','validating','deleting','failed');
alter table public.music_libraries enable row level security;
alter table public.music_tracks enable row level security;
revoke all on public.music_libraries,public.music_tracks from anon,authenticated;
grant select on public.music_libraries,public.music_tracks to authenticated;
grant all on public.music_libraries,public.music_tracks to service_role;
create policy music_library_read on public.music_libraries for select to authenticated using(user_id=(select auth.uid()));
create policy music_tracks_read on public.music_tracks for select to authenticated using(user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('myroom-music','myroom-music',false,52428800,array['audio/mpeg','audio/wav'])
on conflict(id) do nothing;
-- No authenticated writes to Storage. The server issues one-path upload tokens.
-- No client SELECT policy: playback links are issued only for ready tracks by the authenticated Edge Function.

create function public.music_reserve(p_user uuid,p_id uuid,p_title text,p_bytes bigint,p_mime text)
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
 select coalesce(sum(bytes),0),count(*),count(*) filter(where status in('uploading','validating')) into used_bytes,total,pending
 from public.music_tracks where user_id=p_user and status<>'failed';
 if used_bytes+p_bytes>1073741824 or total>=200 then raise exception 'QUOTA_EXCEEDED';end if;
 if pending>=2 then raise exception 'TOO_MANY_UPLOADS';end if;
 insert into public.music_tracks(id,user_id,title,storage_key,bytes,mime)
 values(p_id,p_user,p_title,p_user::text||'/'||p_id::text,p_bytes,p_mime) returning * into t;
 return t;
end;$$;

create function public.music_save_library(p_user uuid,p_revision bigint,p_playlists jsonb,p_selected text)
returns public.music_libraries language plpgsql set search_path='' as $$
declare l public.music_libraries;p jsonb;track text;ids text[]:='{}';seen text[];
begin
 select * into l from public.music_libraries where user_id=p_user for update;
 if not found then raise exception 'NOT_FOUND';end if;
 if l.revision<>p_revision then raise exception 'LIBRARY_CONFLICT';end if;
 if jsonb_typeof(p_playlists)<>'array' or jsonb_array_length(p_playlists)>30 then raise exception 'INVALID_PLAYLISTS';end if;
 for p in select value from jsonb_array_elements(p_playlists) loop
  if coalesce(length(p->>'id'),0) not between 1 and 60 or p->>'id'='all' or (p->>'id')=any(ids) or coalesce(length(p->>'name'),0) not between 1 and 60 or jsonb_typeof(p->'trackIds') is distinct from 'array' then raise exception 'INVALID_PLAYLIST';end if;
  ids:=array_append(ids,p->>'id');seen:='{}';
  if jsonb_array_length(p->'trackIds')>200 then raise exception 'INVALID_PLAYLIST';end if;
  for track in select jsonb_array_elements_text(p->'trackIds') loop
   if track=any(seen) then raise exception 'DUPLICATE_TRACK';end if;
   if track<>'builtin-evening' and not exists(select 1 from public.music_tracks where id::text=track and user_id=p_user and status='ready') then raise exception 'TRACK_NOT_FOUND';end if;
   seen:=array_append(seen,track);
  end loop;
 end loop;
 if p_selected<>'all' and not(p_selected=any(ids)) then raise exception 'INVALID_SELECTION';end if;
 update public.music_libraries set playlists=p_playlists,selected_playlist=p_selected,revision=revision+1 where user_id=p_user returning * into l;
 return l;
end;$$;

create function public.music_remove_track(p_user uuid,p_id uuid)
returns text language plpgsql set search_path='' as $$
declare path text;
begin
 perform 1 from public.music_libraries where user_id=p_user for update;
 select storage_key into path from public.music_tracks where user_id=p_user and id=p_id for update;
 if not found then raise exception 'NOT_FOUND';end if;
 update public.music_tracks set status='deleting' where id=p_id;
 update public.music_libraries set revision=revision+1,playlists=(select coalesce(jsonb_agg(jsonb_set(p,'{trackIds}',(select coalesce(jsonb_agg(t),'[]'::jsonb) from jsonb_array_elements(p->'trackIds')t where t#>>'{}'<>p_id::text))),'[]'::jsonb) from jsonb_array_elements(playlists)p) where user_id=p_user;
 return path;
end;$$;
revoke all on function public.music_reserve(uuid,uuid,text,bigint,text),public.music_save_library(uuid,bigint,jsonb,text),public.music_remove_track(uuid,uuid) from public,anon,authenticated;
grant execute on function public.music_reserve(uuid,uuid,text,bigint,text),public.music_save_library(uuid,bigint,jsonb,text),public.music_remove_track(uuid,uuid) to service_role;
