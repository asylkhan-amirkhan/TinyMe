-- Server-verified SHA-256. Old files are fingerprinted lazily, without deleting
-- existing copies or changing playlists/listening history.
alter table public.music_tracks add column content_hash text
  check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');

-- Concurrent uploads can validate together, but only one can become playable.
-- Deleting a track releases its fingerprint so the file can be uploaded again.
create unique index music_tracks_ready_content_hash
  on public.music_tracks(user_id, content_hash)
  where status = 'ready' and content_hash is not null;
