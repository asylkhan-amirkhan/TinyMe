-- Run after music_content_hash migration. Uses a temporary copy of the real
-- schema and indexes; never changes user music or requires a real account.
begin;
create temporary table music_dedup_probe
  (like public.music_tracks including all) on commit drop;
do $$
declare
  owner_a uuid := gen_random_uuid();
  owner_b uuid := gen_random_uuid();
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
begin
  insert into music_dedup_probe(id,user_id,title,storage_key,bytes,status,content_hash)
    values(first_id,owner_a,'Original','a',10,'ready',repeat('a',64));
  begin
    insert into music_dedup_probe(id,user_id,title,storage_key,bytes,status,content_hash)
      values(second_id,owner_a,'Renamed','b',10,'ready',repeat('a',64));
    raise exception 'duplicate was accepted';
  exception when unique_violation then null;
  end;
  insert into music_dedup_probe(id,user_id,title,storage_key,bytes,status,content_hash)
    values(gen_random_uuid(),owner_b,'Other owner','c',10,'ready',repeat('a',64));
  update music_dedup_probe set status='deleting' where id=first_id;
  insert into music_dedup_probe(id,user_id,title,storage_key,bytes,status,content_hash)
    values(second_id,owner_a,'Upload again','b',10,'ready',repeat('a',64));
end $$;
select 'PASS: duplicate rejected, owners isolated, deleted file can be re-uploaded' as result;
rollback;
