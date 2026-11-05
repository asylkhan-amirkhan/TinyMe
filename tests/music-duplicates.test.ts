import { test } from "node:test";
import assert from "node:assert/strict";
import { audioFingerprint, findDuplicateAudio, duplicateNotice } from "../lib/music-duplicates";
import { mergeCloudMusic } from "../lib/music-cloud";
import { initialMusic, type Track } from "../lib/music-storage";

const original = new File(["original audio bytes"], "Bruno Mars.mp3");
const renamed = new File(["original audio bytes"], "evening.mp3");
const different = new File(["different song data"], "Bruno Mars.mp3");
const track: Track = { id: "existing", title: "Bruno Mars", duration: 204, size: original.size };

test("identical bytes match after renaming; identical names or sizes do not prove a duplicate", async () => {
  const hash = await audioFingerprint(await original.arrayBuffer());
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, await audioFingerprint(await renamed.arrayBuffer()));
  assert.notEqual(hash, await audioFingerprint(await different.arrayBuffer()));
  const known = { ...track, contentHash: hash };
  const noRead = async () => { throw Error("Hashed files must not be read again"); };
  assert.equal(await findDuplicateAudio([known], hash, original.size, noRead, () => {}), known);
  assert.equal(await findDuplicateAudio([known], await audioFingerprint(await different.arrayBuffer()),
    different.size, noRead, () => {}), undefined);
});

test("old local uploads are checked by bytes and their fingerprints survive saving", async () => {
  const hash = await audioFingerprint(await original.arrayBuffer());
  const tracks = [{ ...track }];
  let reads = 0;
  const found = await findDuplicateAudio(tracks, hash, original.size,
    async () => { reads++; return original; },
    (id, value) => { tracks.find(t => t.id === id)!.contentHash = value; });
  assert.equal(found?.id, track.id);
  const restored: Track[] = JSON.parse(JSON.stringify(tracks));
  assert.equal((await findDuplicateAudio(restored, hash, original.size,
    async () => { reads++; return original; }, () => {}))?.id, track.id);
  assert.equal(reads, 1);
});

test("batch duplicates are rejected and deleting the original permits uploading again", async () => {
  const hash = await audioFingerprint(await original.arrayBuffer());
  const batch: Track[] = [];
  const lookup = () => findDuplicateAudio(batch, hash, original.size, async () => undefined, () => {});
  assert.equal(await lookup(), undefined);
  batch.push({ ...track, contentHash: hash });
  assert.equal((await lookup())?.id, track.id);
  batch.splice(0);
  assert.equal(await lookup(), undefined);
  assert.match(duplicateNotice([track.title]), /Этот трек уже есть в коллекции/);
  assert.match(duplicateNotice([track.title, track.title]), /повторов: 2/);
  assert.equal(duplicateNotice([]), "");
});

test("server-verified hashes survive cloud refreshes and missing legacy blobs are tolerated", async () => {
  const hash = await audioFingerprint(await original.arrayBuffer());
  const restored = mergeCloudMusic(initialMusic(), {
    library: { revision: 0, playlists: [], selected_playlist: "all" },
    tracks: [{ id: track.id, title: track.title, bytes: track.size, duration: track.duration, content_hash: hash }],
  });
  assert.equal(restored.tracks[1].contentHash, hash);
  assert.equal(await findDuplicateAudio([track], hash, track.size, async () => undefined, () => {}), undefined);
});
